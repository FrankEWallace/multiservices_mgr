import { z } from "zod";

/**
 * Input sanitization utilities
 * Protects against XSS and injection attacks
 */

// HTML entity encoding map
const htmlEntities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
  "=": "&#x3D;",
};

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Remove potentially dangerous characters from input
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent DoS
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  return sanitized;
}

/**
 * Sanitize SQL-like patterns (defense in depth - Drizzle ORM handles this)
 */
export function sanitizeSqlPattern(input: string): string {
  // Remove common SQL injection patterns
  return input
    .replace(/(['";])/g, "") // Remove quotes and semicolons
    .replace(/(--)|(\/\*)|(\*\/)/g, "") // Remove SQL comment syntax
    .replace(/\b(union|select|insert|update|delete|drop|create|alter|truncate)\b/gi, "");
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeString(email).toLowerCase();
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : "";
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: unknown, defaultValue = 0): number {
  if (typeof input === "number" && !isNaN(input) && isFinite(input)) {
    return input;
  }
  if (typeof input === "string") {
    const parsed = parseFloat(input);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(input: unknown, defaultValue = 0): number {
  const num = sanitizeNumber(input, defaultValue);
  return Math.floor(num);
}

/**
 * Sanitize date input
 */
export function sanitizeDate(input: unknown): Date | null {
  if (input instanceof Date && !isNaN(input.getTime())) {
    return input;
  }
  if (typeof input === "string" || typeof input === "number") {
    const date = new Date(input);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

/**
 * Deep sanitize an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "number") {
      sanitized[key] = sanitizeNumber(value);
    } else if (value === null || value === undefined) {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => 
        typeof item === "object" && item !== null 
          ? sanitizeObject(item as Record<string, unknown>)
          : typeof item === "string" 
            ? sanitizeString(item)
            : item
      );
    } else if (typeof value === "object") {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// ============================================
// Zod schemas with built-in sanitization
// ============================================

/**
 * Safe string schema with sanitization
 */
export const safeString = (maxLength = 1000) =>
  z.string()
    .max(maxLength)
    .transform((val) => sanitizeString(val));

/**
 * Safe email schema
 */
export const safeEmail = z.string()
  .email()
  .max(255)
  .transform((val) => sanitizeEmail(val));

/**
 * Safe integer schema
 */
export const safeInteger = z.number()
  .int()
  .finite();

/**
 * Safe positive integer schema
 */
export const safePositiveInteger = z.number()
  .int()
  .positive()
  .finite();

/**
 * Safe decimal/money schema
 */
export const safeMoney = z.number()
  .finite()
  .multipleOf(0.01)
  .transform((val) => Math.round(val * 100) / 100);

/**
 * Safe date string schema
 */
export const safeDateString = z.string()
  .refine((val) => !isNaN(Date.parse(val)), "Invalid date format");

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * ID parameter schema
 */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Date range schema
 */
export const dateRangeSchema = z.object({
  startDate: safeDateString.optional(),
  endDate: safeDateString.optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: "Start date must be before or equal to end date" }
);
