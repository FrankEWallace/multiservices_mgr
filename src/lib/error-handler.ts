/**
 * Enhanced Error Handling Utility
 * Provides user-friendly error messages with actionable descriptions
 * Implements Shneiderman's Rule 3: Offer Informative Feedback
 */

import { toast } from "@/hooks/use-toast";
import { ApiError } from "./api";

export interface ErrorDetails {
  title: string;
  description: string;
  duration?: number;
}

/**
 * Error message templates with user-friendly descriptions
 */
const ERROR_MESSAGES: Record<string, (context?: any) => ErrorDetails> = {
  // Network Errors
  NETWORK_ERROR: () => ({
    title: "Connection Error",
    description: "Unable to reach the server. Please check your internet connection and try again.",
    duration: 5000,
  }),

  // Authentication Errors
  UNAUTHORIZED: () => ({
    title: "Session Expired",
    description: "Your session has expired for security reasons. Please log in again to continue.",
    duration: 5000,
  }),

  INVALID_CREDENTIALS: () => ({
    title: "Invalid Credentials",
    description: "The email or password you entered is incorrect. Please double-check and try again.",
    duration: 5000,
  }),

  // Validation Errors
  VALIDATION_ERROR: (context) => ({
    title: "Invalid Input",
    description: context?.field 
      ? `${context.field} is required or contains invalid data. Please check your input.`
      : "Please check that all required fields are filled in correctly.",
    duration: 5000,
  }),

  MISSING_REQUIRED_FIELDS: (context) => ({
    title: "Missing Information",
    description: context?.fields
      ? `Please fill in the following required fields: ${context.fields.join(", ")}`
      : "Please fill in all required fields marked with an asterisk (*).",
    duration: 5000,
  }),

  AMOUNT_TOO_LOW: (context) => ({
    title: "Amount Too Low",
    description: `The amount must be greater than ${context?.minimum || 0}. Please enter a valid amount.`,
    duration: 5000,
  }),

  AMOUNT_TOO_HIGH: (context) => ({
    title: "Amount Too High",
    description: `The amount cannot exceed ${context?.maximum || '∞'}. Please enter a lower amount.`,
    duration: 5000,
  }),

  INVALID_DATE: () => ({
    title: "Invalid Date",
    description: "The date you selected is invalid. Please choose a valid date.",
    duration: 5000,
  }),

  FUTURE_DATE_NOT_ALLOWED: () => ({
    title: "Future Date Not Allowed",
    description: "You cannot select a future date. Please choose today or an earlier date.",
    duration: 5000,
  }),

  // Data Errors
  NOT_FOUND: (context) => ({
    title: `${context?.resource || 'Item'} Not Found`,
    description: `The ${context?.resource?.toLowerCase() || 'item'} you're looking for doesn't exist or has been deleted.`,
    duration: 5000,
  }),

  DUPLICATE_ENTRY: (context) => ({
    title: "Duplicate Entry",
    description: context?.field
      ? `A record with this ${context.field} already exists. Please use a different value.`
      : "This entry already exists in the system.",
    duration: 5000,
  }),

  // Payment Errors
  INSUFFICIENT_BALANCE: (context) => ({
    title: "Insufficient Balance",
    description: context?.balance
      ? `Payment amount cannot exceed the current balance of ${context.balance}.`
      : "The payment amount exceeds the available balance.",
    duration: 5000,
  }),

  PAYMENT_ALREADY_PROCESSED: () => ({
    title: "Payment Already Processed",
    description: "This payment has already been recorded. Please refresh the page to see the latest data.",
    duration: 5000,
  }),

  // Service Errors
  SERVICE_INACTIVE: (context) => ({
    title: "Service Inactive",
    description: `The service "${context?.serviceName || 'selected service'}" is currently inactive. Please select an active service.`,
    duration: 5000,
  }),

  // Goal Errors
  GOAL_ALREADY_COMPLETED: () => ({
    title: "Goal Already Completed",
    description: "This goal has already been marked as completed. You can view it in the completed goals section.",
    duration: 5000,
  }),

  TARGET_NOT_MET: (context) => ({
    title: "Target Not Yet Met",
    description: context?.current && context?.target
      ? `Current progress (${context.current}) has not reached the target (${context.target}) yet.`
      : "The goal target has not been met yet.",
    duration: 5000,
  }),

  // Rate Limiting
  RATE_LIMITED: (context) => ({
    title: "Too Many Requests",
    description: context?.retryAfter
      ? `You've made too many requests. Please wait ${context.retryAfter} seconds before trying again.`
      : "You've made too many requests. Please wait a moment before trying again.",
    duration: 6000,
  }),

  // Server Errors
  SERVER_ERROR: () => ({
    title: "Server Error",
    description: "Something went wrong on our end. Our team has been notified. Please try again in a few moments or refresh the page.",
    duration: 7000,
  }),

  DATABASE_ERROR: () => ({
    title: "Database Error",
    description: "We're having trouble saving your data. Please try again. If the problem persists, contact support.",
    duration: 6000,
  }),

  // File/Export Errors
  EXPORT_FAILED: (context) => ({
    title: "Export Failed",
    description: context?.format
      ? `Failed to export data to ${context.format}. Please try again or choose a different format.`
      : "Failed to export data. Please try again.",
    duration: 5000,
  }),

  FILE_TOO_LARGE: (context) => ({
    title: "File Too Large",
    description: context?.maxSize
      ? `The file size exceeds the maximum allowed size of ${context.maxSize}MB. Please choose a smaller file.`
      : "The file you're trying to upload is too large.",
    duration: 5000,
  }),

  INVALID_FILE_TYPE: (context) => ({
    title: "Invalid File Type",
    description: context?.allowedTypes
      ? `Only ${context.allowedTypes.join(", ")} files are allowed. Please select a valid file.`
      : "The file type you selected is not supported.",
    duration: 5000,
  }),

  // Delete Errors
  DELETE_FAILED: (context) => ({
    title: "Delete Failed",
    description: context?.resource
      ? `Failed to delete ${context.resource}. It may be in use by other records. Please try removing those references first.`
      : "Failed to delete the item. It may be referenced by other records.",
    duration: 6000,
  }),

  CANNOT_DELETE_ACTIVE: (context) => ({
    title: "Cannot Delete Active Item",
    description: context?.resource
      ? `Cannot delete an active ${context.resource}. Please deactivate it first, then try deleting.`
      : "Cannot delete an active item. Please deactivate it first.",
    duration: 5000,
  }),

  // Generic fallback
  UNKNOWN_ERROR: () => ({
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please try again. If the problem persists, contact support.",
    duration: 5000,
  }),
};

/**
 * Success message templates with informative descriptions
 */
const SUCCESS_MESSAGES: Record<string, (context?: any) => ErrorDetails> = {
  // CRUD Operations
  CREATED: (context) => ({
    title: `${context?.resource || 'Item'} Created`,
    description: context?.name
      ? `${context.resource} "${context.name}" has been successfully created.`
      : `${context?.resource || 'Item'} has been successfully created.`,
    duration: 3000,
  }),

  UPDATED: (context) => ({
    title: `${context?.resource || 'Item'} Updated`,
    description: context?.name
      ? `${context.resource} "${context.name}" has been successfully updated.`
      : `Your changes have been saved successfully.`,
    duration: 3000,
  }),

  DELETED: (context) => ({
    title: `${context?.resource || 'Item'} Deleted`,
    description: context?.name
      ? `${context.resource} "${context.name}" has been permanently deleted.`
      : `${context?.resource || 'Item'} has been successfully deleted.`,
    duration: 3000,
  }),

  // Payment Operations
  PAYMENT_RECORDED: (context) => ({
    title: "Payment Recorded",
    description: context?.amount && context?.newBalance
      ? `Payment of ${context.amount} recorded successfully. New balance: ${context.newBalance}.`
      : "Payment has been successfully recorded.",
    duration: 4000,
  }),

  PAYMENT_RECEIVED: (context) => ({
    title: "Payment Received",
    description: context?.amount && context?.from
      ? `Received ${context.amount} from ${context.from}.`
      : "Payment has been successfully received.",
    duration: 3000,
  }),

  // Goal Operations
  GOAL_COMPLETED: (context) => ({
    title: "Goal Completed! 🎉",
    description: context?.name
      ? `Congratulations! You've completed the goal "${context.name}".`
      : "Congratulations! You've successfully completed your goal.",
    duration: 5000,
  }),

  // Export Operations
  EXPORT_SUCCESS: (context) => ({
    title: "Export Successful",
    description: context?.format && context?.records
      ? `Successfully exported ${context.records} records to ${context.format}.`
      : "Your data has been successfully exported.",
    duration: 3000,
  }),

  // Import Operations
  IMPORT_SUCCESS: (context) => ({
    title: "Import Successful",
    description: context?.records
      ? `Successfully imported ${context.records} records.`
      : "Your data has been successfully imported.",
    duration: 3000,
  }),

  // Settings
  SETTINGS_SAVED: () => ({
    title: "Settings Saved",
    description: "Your preferences have been saved and will take effect immediately.",
    duration: 3000,
  }),
};

/**
 * Show error toast with enhanced details
 */
export function showError(error: unknown, customContext?: any): void {
  let errorDetails: ErrorDetails;

  if (error instanceof ApiError) {
    // Map API error codes to user-friendly messages
    const errorCode = error.code || 'UNKNOWN_ERROR';
    const messageGenerator = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
    
    errorDetails = messageGenerator({
      ...customContext,
      status: error.status,
      retryAfter: error.retryAfter,
    });
  } else if (error instanceof Error) {
    // Check if error message matches known patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      errorDetails = ERROR_MESSAGES.NETWORK_ERROR();
    } else if (message.includes('required')) {
      errorDetails = ERROR_MESSAGES.MISSING_REQUIRED_FIELDS(customContext);
    } else {
      errorDetails = {
        title: "Error",
        description: error.message || ERROR_MESSAGES.UNKNOWN_ERROR().description,
        duration: 5000,
      };
    }
  } else {
    errorDetails = ERROR_MESSAGES.UNKNOWN_ERROR();
  }

  toast({
    variant: "destructive",
    title: errorDetails.title,
    description: errorDetails.description,
    duration: errorDetails.duration,
  });
}

/**
 * Show success toast with enhanced details
 */
export function showSuccess(
  messageType: keyof typeof SUCCESS_MESSAGES,
  context?: any
): void {
  const messageGenerator = SUCCESS_MESSAGES[messageType] || SUCCESS_MESSAGES.CREATED;
  const details = messageGenerator(context);

  toast({
    title: details.title,
    description: details.description,
    duration: details.duration,
  });
}

/**
 * Validate form fields and show specific error messages
 */
export function validateRequired(
  fields: Record<string, any>,
  fieldLabels: Record<string, string>
): boolean {
  const missingFields: string[] = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || 
        (Array.isArray(value) && value.length === 0)) {
      missingFields.push(fieldLabels[key] || key);
    }
  });

  if (missingFields.length > 0) {
    showError(new Error('MISSING_REQUIRED_FIELDS'), { fields: missingFields });
    return false;
  }

  return true;
}

/**
 * Show validation error for specific field
 */
export function showValidationError(field: string, message?: string): void {
  toast({
    variant: "destructive",
    title: "Invalid Input",
    description: message || `Please enter a valid ${field.toLowerCase()}.`,
    duration: 4000,
  });
}

/**
 * Show warning message
 */
export function showWarning(title: string, description: string): void {
  toast({
    title: `⚠️ ${title}`,
    description,
    duration: 5000,
  });
}

/**
 * Show info message
 */
export function showInfo(title: string, description: string): void {
  toast({
    title: `ℹ️ ${title}`,
    description,
    duration: 4000,
  });
}
