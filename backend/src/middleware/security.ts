import { Context, Next } from "hono";

/**
 * Security headers middleware
 * Adds various HTTP security headers to protect against common attacks
 */
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    await next();

    // Prevent MIME type sniffing
    c.header("X-Content-Type-Options", "nosniff");

    // Prevent clickjacking
    c.header("X-Frame-Options", "DENY");

    // XSS Protection (legacy, but still useful for older browsers)
    c.header("X-XSS-Protection", "1; mode=block");

    // Referrer Policy
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");

    // Content Security Policy (API-focused)
    c.header(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'"
    );

    // Permissions Policy
    c.header(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()"
    );

    // Remove server header to hide implementation details
    c.header("Server", "");

    // Strict Transport Security (for HTTPS)
    if (process.env.NODE_ENV === "production") {
      c.header(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }
  };
}

/**
 * Remove sensitive headers from responses
 */
export function removeSensitiveHeaders() {
  return async (c: Context, next: Next) => {
    await next();
    // Remove any accidentally exposed headers
    c.header("X-Powered-By", "");
  };
}
