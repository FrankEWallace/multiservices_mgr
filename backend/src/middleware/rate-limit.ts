import { Context, Next } from "hono";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, use Redis or similar for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Max requests per window
  message?: string;
  keyGenerator?: (c: Context) => string;
  skip?: (c: Context) => boolean;
}

const defaultOptions: Required<RateLimitOptions> = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests, please try again later.",
  keyGenerator: (c: Context) => {
    // Use IP address or Authorization header as key
    const ip = c.req.header("x-forwarded-for") || 
               c.req.header("x-real-ip") || 
               "unknown";
    return ip;
  },
  skip: () => false,
};

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

export function rateLimiter(options: RateLimitOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  return async (c: Context, next: Next) => {
    // Skip rate limiting if configured
    if (opts.skip(c)) {
      return next();
    }

    const key = opts.keyGenerator(c);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + opts.windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      // Increment counter
      entry.count++;
    }

    // Set rate limit headers
    const remaining = Math.max(0, opts.max - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    c.header("X-RateLimit-Limit", opts.max.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());
    c.header("X-RateLimit-Reset", resetSeconds.toString());

    // Check if rate limit exceeded
    if (entry.count > opts.max) {
      c.header("Retry-After", resetSeconds.toString());
      return c.json(
        { 
          error: opts.message,
          retryAfter: resetSeconds,
        }, 
        429
      );
    }

    return next();
  };
}

// Stricter rate limiter for auth endpoints
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: "Too many login attempts. Please try again in 15 minutes.",
});

// Standard API rate limiter
export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});

// Stricter limiter for expensive operations
export const expensiveRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "Too many requests for this operation. Please wait.",
});
