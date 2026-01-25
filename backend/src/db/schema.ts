import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ============ USERS ============
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  isAdmin: integer("is_admin", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ============ SERVICES ============
export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon").default("building"),
  color: text("color").default("blue"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  dailyTarget: real("daily_target").default(0),
  monthlyTarget: real("monthly_target").default(0),
  yearlyTarget: real("yearly_target").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ============ REVENUE ============
export const revenues = sqliteTable("revenues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceId: integer("service_id").references(() => services.id),
  amount: real("amount").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  description: text("description"),
  paymentMethod: text("payment_method").default("cash"), // cash, bank, mobile
  reference: text("reference"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ============ EXPENSES ============
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceId: integer("service_id").references(() => services.id),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  category: text("category").notNull(), // fixed, variable, operating
  description: text("description"),
  vendor: text("vendor"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ============ MADENI (DEBTS) ============
export const madenis = sqliteTable("madenis", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceId: integer("service_id").references(() => services.id),
  debtorName: text("debtor_name").notNull(),
  debtorContact: text("debtor_contact"),
  debtorEmail: text("debtor_email"),
  debtorAddress: text("debtor_address"),
  originalAmount: real("original_amount").notNull(),
  amountPaid: real("amount_paid").default(0),
  balance: real("balance").notNull(),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").default("current"), // current, pending, overdue, paid
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ============ MADENI PAYMENTS ============
export const madeniPayments = sqliteTable("madeni_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  madeniId: integer("madeni_id").references(() => madenis.id),
  amount: real("amount").notNull(),
  paymentDate: text("payment_date").notNull(),
  paymentMethod: text("payment_method").default("cash"),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ============ GOALS ============
export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceId: integer("service_id").references(() => services.id),
  title: text("title").notNull(),
  description: text("description"),
  goalType: text("goal_type").notNull(), // revenue, profit, expense
  period: text("period").notNull(), // daily, weekly, monthly, yearly
  targetAmount: real("target_amount").notNull(),
  currentAmount: real("current_amount").default(0),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").default("active"), // active, completed, missed
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ============ GOAL HISTORY (Achievement Tracking) ============
export const goalHistory = sqliteTable("goal_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id").references(() => goals.id),
  serviceId: integer("service_id").references(() => services.id),
  title: text("title").notNull(),
  goalType: text("goal_type").notNull(),
  period: text("period").notNull(),
  targetAmount: real("target_amount").notNull(),
  achievedAmount: real("achieved_amount").notNull(),
  achievementRate: real("achievement_rate").notNull(), // percentage
  status: text("status").notNull(), // completed, missed, cancelled
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  completedAt: text("completed_at").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ============ TRANSACTIONS (Audit Log) ============
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceId: integer("service_id").references(() => services.id),
  type: text("type").notNull(), // income, expense, debt_payment
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  description: text("description"),
  referenceType: text("reference_type"), // revenue, expense, madeni_payment
  referenceId: integer("reference_id"),
  paymentMethod: text("payment_method"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
});

// ============ SETTINGS ============
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").notNull().default("general"), // general, appearance, notifications, currency, reports
  type: text("type").notNull().default("string"), // string, number, boolean, json
  label: text("label"), // Human-readable label
  description: text("description"),
  isPublic: integer("is_public", { mode: "boolean" }).default(false), // Can be accessed without auth
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ============ SCHEDULED REPORTS ============
export const scheduledReports = sqliteTable("scheduled_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  reportType: text("report_type").notNull(), // daily, weekly, monthly, service, debts, goals
  serviceId: integer("service_id").references(() => services.id), // For service-specific reports
  schedule: text("schedule").notNull(), // cron-like: daily, weekly, monthly, custom
  scheduleTime: text("schedule_time").default("09:00"), // HH:MM format
  scheduleDay: integer("schedule_day"), // Day of week (0-6) or day of month (1-31)
  exportFormat: text("export_format").default("pdf"), // pdf, excel, csv
  emailDelivery: integer("email_delivery", { mode: "boolean" }).default(false),
  emailRecipients: text("email_recipients"), // JSON array of email addresses
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastRunAt: text("last_run_at"),
  nextRunAt: text("next_run_at"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// ============ REPORT HISTORY ============
export const reportHistory = sqliteTable("report_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  scheduledReportId: integer("scheduled_report_id").references(() => scheduledReports.id),
  reportType: text("report_type").notNull(),
  reportName: text("report_name").notNull(),
  exportFormat: text("export_format").notNull(),
  parameters: text("parameters"), // JSON: date ranges, service ID, etc.
  status: text("status").default("completed"), // pending, generating, completed, failed
  errorMessage: text("error_message"),
  fileSize: integer("file_size"), // bytes
  filePath: text("file_path"), // Local path or URL
  emailSent: integer("email_sent", { mode: "boolean" }).default(false),
  emailSentTo: text("email_sent_to"), // JSON array
  generatedAt: text("generated_at").default("CURRENT_TIMESTAMP"),
  expiresAt: text("expires_at"), // When the report file will be deleted
});

// ============ RELATIONS ============
export const servicesRelations = relations(services, ({ many }) => ({
  revenues: many(revenues),
  expenses: many(expenses),
  madenis: many(madenis),
  goals: many(goals),
}));

export const revenuesRelations = relations(revenues, ({ one }) => ({
  service: one(services, {
    fields: [revenues.serviceId],
    references: [services.id],
  }),
  createdByUser: one(users, {
    fields: [revenues.createdBy],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  service: one(services, {
    fields: [expenses.serviceId],
    references: [services.id],
  }),
}));

export const madenisRelations = relations(madenis, ({ one, many }) => ({
  service: one(services, {
    fields: [madenis.serviceId],
    references: [services.id],
  }),
  payments: many(madeniPayments),
}));

export const madeniPaymentsRelations = relations(madeniPayments, ({ one }) => ({
  madeni: one(madenis, {
    fields: [madeniPayments.madeniId],
    references: [madenis.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  service: one(services, {
    fields: [goals.serviceId],
    references: [services.id],
  }),
  history: many(goalHistory),
}));

export const goalHistoryRelations = relations(goalHistory, ({ one }) => ({
  goal: one(goals, {
    fields: [goalHistory.goalId],
    references: [goals.id],
  }),
  service: one(services, {
    fields: [goalHistory.serviceId],
    references: [services.id],
  }),
}));

export const scheduledReportsRelations = relations(scheduledReports, ({ one, many }) => ({
  user: one(users, {
    fields: [scheduledReports.userId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [scheduledReports.serviceId],
    references: [services.id],
  }),
  history: many(reportHistory),
}));

export const reportHistoryRelations = relations(reportHistory, ({ one }) => ({
  user: one(users, {
    fields: [reportHistory.userId],
    references: [users.id],
  }),
  scheduledReport: one(scheduledReports, {
    fields: [reportHistory.scheduledReportId],
    references: [scheduledReports.id],
  }),
}));

// ============ TYPE EXPORTS ============
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Revenue = typeof revenues.$inferSelect;
export type NewRevenue = typeof revenues.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type Madeni = typeof madenis.$inferSelect;
export type NewMadeni = typeof madenis.$inferInsert;
export type MadeniPayment = typeof madeniPayments.$inferSelect;
export type NewMadeniPayment = typeof madeniPayments.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type GoalHistory = typeof goalHistory.$inferSelect;
export type NewGoalHistory = typeof goalHistory.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type NewScheduledReport = typeof scheduledReports.$inferInsert;
export type ReportHistory = typeof reportHistory.$inferSelect;
export type NewReportHistory = typeof reportHistory.$inferInsert;
