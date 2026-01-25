import { Context, Next } from "hono";

interface CacheEntry {
  data: unknown;
  expiresAt: number;
  etag: string;
}

// In-memory cache store
// In production, use Redis or similar for distributed caching
const cacheStore = new Map<string, CacheEntry>();

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (c: Context) => string;
  condition?: (c: Context) => boolean;
}

const defaultOptions: Required<CacheOptions> = {
  ttl: 60, // 1 minute default
  keyGenerator: (c: Context) => {
    const url = new URL(c.req.url);
    const authHeader = c.req.header("Authorization");
    // Include auth in cache key for user-specific data
    const authPart = authHeader ? authHeader.slice(-8) : "anon";
    return `${authPart}:${url.pathname}${url.search}`;
  },
  condition: (c: Context) => c.req.method === "GET",
};

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt < now) {
      cacheStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Generate ETag from data
 */
function generateEtag(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `"${hash.toString(16)}"`;
}

/**
 * API response caching middleware
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  return async (c: Context, next: Next) => {
    // Only cache GET requests by default
    if (!opts.condition(c)) {
      return next();
    }

    const cacheKey = opts.keyGenerator(c);
    const now = Date.now();

    // Check for cached response
    const cached = cacheStore.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      // Check If-None-Match header for conditional requests
      const ifNoneMatch = c.req.header("If-None-Match");
      if (ifNoneMatch === cached.etag) {
        c.header("ETag", cached.etag);
        c.header("X-Cache", "HIT");
        return c.body(null, 304);
      }

      // Return cached response
      c.header("ETag", cached.etag);
      c.header("X-Cache", "HIT");
      c.header("Cache-Control", `max-age=${Math.ceil((cached.expiresAt - now) / 1000)}`);
      return c.json(cached.data as object);
    }

    // Execute the handler
    await next();

    // Cache the response if it was successful
    // Note: This is a simplified version - actual implementation would need
    // to intercept the response body
    c.header("X-Cache", "MISS");
  };
}

/**
 * Manual cache helpers for use in route handlers
 */
export const cache = {
  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = cacheStore.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }
    return null;
  },

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttlSeconds: number = 60): void {
    cacheStore.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      etag: generateEtag(data),
    });
  },

  /**
   * Delete cached data
   */
  delete(key: string): void {
    cacheStore.delete(key);
  },

  /**
   * Delete cached data by prefix
   */
  deleteByPrefix(prefix: string): void {
    for (const key of cacheStore.keys()) {
      if (key.startsWith(prefix) || key.includes(`:${prefix}`)) {
        cacheStore.delete(key);
      }
    }
  },

  /**
   * Clear all cache
   */
  clear(): void {
    cacheStore.clear();
  },

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: cacheStore.size,
      keys: Array.from(cacheStore.keys()),
    };
  },
};

/**
 * Cache invalidation helper - use after mutations
 */
export function invalidateCache(patterns: string[]): void {
  for (const pattern of patterns) {
    cache.deleteByPrefix(pattern);
  }
}

/**
 * Decorator for caching expensive computations
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const result = await fn();
  cache.set(key, result, ttlSeconds);
  return result;
}
