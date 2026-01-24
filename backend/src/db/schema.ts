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

export const goalsRelations = relations(goals, ({ one }) => ({
  service: one(services, {
    fields: [goals.serviceId],
    references: [services.id],
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
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
