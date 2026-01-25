import { z } from "zod";

/**
 * Frontend validation schemas
 * Matches backend validation for consistent UX
 */

// ============================================
// Common validation patterns
// ============================================

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(255, "Email is too long");

/**
 * Password validation
 */
export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(100, "Password is too long");

/**
 * Strong password validation
 */
export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/**
 * Username validation
 */
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(50, "Username is too long")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

/**
 * Name validation (for full name, service name, etc.)
 */
export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name is too long")
  .trim();

/**
 * Description validation
 */
export const descriptionSchema = z
  .string()
  .max(1000, "Description is too long")
  .optional();

/**
 * Money/currency validation
 */
export const moneySchema = z
  .number({ invalid_type_error: "Please enter a valid amount" })
  .nonnegative("Amount cannot be negative")
  .multipleOf(0.01, "Amount can only have 2 decimal places")
  .max(999999999.99, "Amount is too large");

/**
 * Positive integer validation
 */
export const positiveIntegerSchema = z
  .number({ invalid_type_error: "Please enter a valid number" })
  .int("Must be a whole number")
  .positive("Must be greater than zero");

/**
 * Date string validation
 */
export const dateStringSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), "Please enter a valid date");

/**
 * Phone number validation (basic)
 */
export const phoneSchema = z
  .string()
  .regex(/^[+]?[\d\s()-]{7,20}$/, "Please enter a valid phone number")
  .optional()
  .or(z.literal(""));

// ============================================
// Form schemas
// ============================================

/**
 * Login form schema
 */
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/**
 * Registration form schema
 */
export const registerFormSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: nameSchema.optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Service form schema
 */
export const serviceFormSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  type: z.enum(["transport", "logistics", "real_estate", "agriculture", "retail", "construction", "other"]),
  isActive: z.boolean().default(true),
  color: z.string().optional(),
});

/**
 * Revenue form schema
 */
export const revenueFormSchema = z.object({
  serviceId: positiveIntegerSchema,
  amount: moneySchema,
  description: descriptionSchema,
  date: dateStringSchema,
  category: z.string().optional(),
});

/**
 * Expense form schema
 */
export const expenseFormSchema = z.object({
  serviceId: positiveIntegerSchema.optional(),
  amount: moneySchema,
  description: z.string().min(1, "Description is required").max(500),
  date: dateStringSchema,
  category: z.string().min(1, "Category is required"),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
});

/**
 * Debt/debtor form schema
 */
export const debtFormSchema = z.object({
  serviceId: positiveIntegerSchema.optional(),
  debtorName: nameSchema,
  debtorPhone: phoneSchema,
  debtorEmail: emailSchema.optional().or(z.literal("")),
  amount: moneySchema.positive("Debt amount must be greater than zero"),
  description: descriptionSchema,
  dueDate: dateStringSchema.optional(),
});

/**
 * Payment form schema
 */
export const paymentFormSchema = z.object({
  amount: moneySchema.positive("Payment amount must be greater than zero"),
  paymentMethod: z.string().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Goal form schema
 */
export const goalFormSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  serviceId: positiveIntegerSchema.optional(),
  targetAmount: moneySchema.positive("Target amount must be greater than zero"),
  currentAmount: moneySchema.default(0),
  goalType: z.enum(["revenue", "profit", "savings", "debt_reduction", "custom"]),
  period: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
  message: "End date must be after start date",
  path: ["endDate"],
});

/**
 * Settings form schema
 */
export const settingsFormSchema = z.object({
  currency: z.string().min(1),
  dateFormat: z.string().min(1),
  timezone: z.string().min(1),
  language: z.string().min(1),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
});

// ============================================
// Utility functions
// ============================================

/**
 * Sanitize string input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML/script tags
    .substring(0, 10000); // Limit length
}

/**
 * Format validation errors for display
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

/**
 * Validate form data with schema
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: formatZodErrors(result.error) };
}
