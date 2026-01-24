import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { expenses, services } from "../db/schema";
import { eq, sql, gte, lte, and, desc, sum } from "drizzle-orm";
import { authMiddleware, type AuthUser } from "../middleware/auth";

const expensesRouter = new Hono<{ Variables: { user: AuthUser } }>();

// Expense categories
const expenseCategories = [
  "operating",
  "salaries",
  "utilities",
  "rent",
  "supplies",
  "marketing",
  "maintenance",
  "transport",
  "insurance",
  "taxes",
  "other",
] as const;

// Validation schemas
const createExpenseSchema = z.object({
  serviceId: z.number().optional(),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(expenseCategories),
  description: z.string().optional(),
  vendor: z.string().optional(),
  isRecurring: z.boolean().default(false),
});

// Get all expense entries
expensesRouter.get("/", async (c) => {
  const { limit = "100", category, serviceId } = c.req.query();

  let query = db
    .select({
      expense: expenses,
      serviceName: services.name,
    })
    .from(expenses)
    .leftJoin(services, eq(expenses.serviceId, services.id))
    .orderBy(desc(expenses.date))
    .limit(parseInt(limit));

  const allExpenses = await query;

  let filteredExpenses = allExpenses.map((e) => ({
    ...e.expense,
    serviceName: e.serviceName,
  }));

  // Apply filters
  if (category) {
    filteredExpenses = filteredExpenses.filter((e) => e.category === category);
  }
  if (serviceId) {
    filteredExpenses = filteredExpenses.filter((e) => e.serviceId === parseInt(serviceId));
  }

  return c.json({ expenses: filteredExpenses });
});

// Get expense summary
expensesRouter.get("/summary", async (c) => {
  const today = new Date().toISOString().split("T")[0];
  const startOfMonth = today.slice(0, 7) + "-01";
  const startOfYear = today.slice(0, 4) + "-01-01";

  // Calculate last month range
  const thisMonth = new Date();
  const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
  const lastMonthStart = lastMonth.toISOString().split("T")[0].slice(0, 7) + "-01";
  const lastMonthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 0)
    .toISOString()
    .split("T")[0];

  // Today's expenses
  const todayExpenseResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(eq(expenses.date, today));
  const todayExpense = todayExpenseResult[0];

  // This month
  const monthlyExpenseResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(gte(expenses.date, startOfMonth));
  const monthlyExpense = monthlyExpenseResult[0];

  // Last month
  const lastMonthExpenseResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(and(gte(expenses.date, lastMonthStart), lte(expenses.date, lastMonthEnd)));
  const lastMonthExpense = lastMonthExpenseResult[0];

  // This year
  const yearlyExpenseResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(gte(expenses.date, startOfYear));
  const yearlyExpense = yearlyExpenseResult[0];

  // By category this month
  const byCategory = await db.all(sql`
    SELECT 
      category,
      SUM(amount) as total,
      COUNT(*) as count
    FROM ${expenses}
    WHERE date >= ${startOfMonth}
    GROUP BY category
    ORDER BY total DESC
  `);

  // Recurring expenses
  const recurringResult = await db
    .select({ total: sum(expenses.amount), count: sql<number>`COUNT(*)` })
    .from(expenses)
    .where(eq(expenses.isRecurring, true));
  const recurring = recurringResult[0];

  const thisMonthTotal = Number(monthlyExpense?.total) || 0;
  const lastMonthTotal = Number(lastMonthExpense?.total) || 1;
  const changePercent = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;

  return c.json({
    summary: {
      today: Number(todayExpense?.total) || 0,
      thisMonth: thisMonthTotal,
      lastMonth: lastMonthTotal,
      thisYear: Number(yearlyExpense?.total) || 0,
      changePercent: Math.round(changePercent * 10) / 10,
      recurring: {
        total: Number(recurring?.total) || 0,
        count: Number(recurring?.count) || 0,
      },
      byCategory: byCategory.map((c: any) => ({
        category: c.category,
        total: c.total,
        count: c.count,
      })),
    },
  });
});

// Get expenses by category
expensesRouter.get("/by-category", async (c) => {
  const { period = "month" } = c.req.query();
  const today = new Date().toISOString().split("T")[0];

  let startDate: string;
  switch (period) {
    case "week":
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split("T")[0];
      break;
    case "year":
      startDate = today.slice(0, 4) + "-01-01";
      break;
    default:
      startDate = today.slice(0, 7) + "-01";
  }

  const byCategory = await db.all(sql`
    SELECT 
      category,
      SUM(amount) as total,
      COUNT(*) as count
    FROM ${expenses}
    WHERE date >= ${startDate}
    GROUP BY category
    ORDER BY total DESC
  `);

  return c.json({ byCategory });
});

// Get expenses by service
expensesRouter.get("/by-service", async (c) => {
  const { period = "month" } = c.req.query();
  const today = new Date().toISOString().split("T")[0];

  let startDate: string;
  switch (period) {
    case "week":
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split("T")[0];
      break;
    case "year":
      startDate = today.slice(0, 4) + "-01-01";
      break;
    default:
      startDate = today.slice(0, 7) + "-01";
  }

  const byService = await db.all(sql`
    SELECT 
      s.id,
      s.name,
      s.color,
      COALESCE(SUM(e.amount), 0) as expense
    FROM ${services} s
    LEFT JOIN ${expenses} e ON e.service_id = s.id AND e.date >= ${startDate}
    WHERE s.is_active = 1
    GROUP BY s.id
    ORDER BY expense DESC
  `);

  return c.json({ byService });
});

// Get expense trend
expensesRouter.get("/trend", async (c) => {
  const { period = "daily", days = "30" } = c.req.query();
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(days));
  const startDate = daysAgo.toISOString().split("T")[0];

  let groupBy: string;
  switch (period) {
    case "weekly":
      groupBy = "strftime('%Y-%W', date)";
      break;
    case "monthly":
      groupBy = "strftime('%Y-%m', date)";
      break;
    default:
      groupBy = "date";
  }

  const trend = await db.all(sql.raw(`
    SELECT 
      ${groupBy} as period,
      SUM(amount) as expense,
      COUNT(*) as count
    FROM expenses
    WHERE date >= '${startDate}'
    GROUP BY ${groupBy}
    ORDER BY period ASC
  `));

  return c.json({ trend });
});

// Get categories list
expensesRouter.get("/categories", async (c) => {
  return c.json({
    categories: expenseCategories.map((cat) => ({
      value: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
    })),
  });
});

// Get single expense
expensesRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const result = await db
    .select({
      expense: expenses,
      serviceName: services.name,
    })
    .from(expenses)
    .leftJoin(services, eq(expenses.serviceId, services.id))
    .where(eq(expenses.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: "Expense not found" }, 404);
  }

  return c.json({
    expense: {
      ...result[0].expense,
      serviceName: result[0].serviceName,
    },
  });
});

// Create expense (protected)
expensesRouter.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const data = createExpenseSchema.parse(body);
    const user = c.get("user");

    const result = await db
      .insert(expenses)
      .values({
        serviceId: data.serviceId,
        amount: data.amount,
        date: data.date,
        category: data.category,
        description: data.description,
        vendor: data.vendor,
        isRecurring: data.isRecurring,
        createdBy: user.id,
      })
      .returning();

    return c.json({ expense: result[0], message: "Expense created successfully" }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    throw error;
  }
});

// Bulk import expenses
expensesRouter.post("/bulk", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    if (!Array.isArray(body.expenses)) {
      return c.json({ error: "expenses array is required" }, 400);
    }

    const validExpenses: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < body.expenses.length; i++) {
      try {
        const data = createExpenseSchema.parse(body.expenses[i]);
        validExpenses.push({
          serviceId: data.serviceId,
          amount: data.amount,
          date: data.date,
          category: data.category,
          description: data.description,
          vendor: data.vendor,
          isRecurring: data.isRecurring,
          createdBy: user.id,
        });
      } catch (error) {
        errors.push({ row: i + 1, error: error instanceof z.ZodError ? error.errors : "Invalid data" });
      }
    }

    if (validExpenses.length > 0) {
      await db.insert(expenses).values(validExpenses);
    }

    return c.json({
      message: `Imported ${validExpenses.length} expenses`,
      imported: validExpenses.length,
      failed: errors.length,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    throw error;
  }
});

// Update expense (protected)
expensesRouter.put("/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const data = createExpenseSchema.partial().parse(body);

    const existing = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    if (existing.length === 0) {
      return c.json({ error: "Expense not found" }, 404);
    }

    const result = await db
      .update(expenses)
      .set({
        ...(data.serviceId !== undefined && { serviceId: data.serviceId }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.date !== undefined && { date: data.date }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.vendor !== undefined && { vendor: data.vendor }),
        ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
      })
      .where(eq(expenses.id, id))
      .returning();

    return c.json({ expense: result[0], message: "Expense updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.errors }, 400);
    }
    throw error;
  }
});

// Delete expense (protected)
expensesRouter.delete("/:id", authMiddleware, async (c) => {
  const id = parseInt(c.req.param("id"));

  const existing = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  if (existing.length === 0) {
    return c.json({ error: "Expense not found" }, 404);
  }

  await db.delete(expenses).where(eq(expenses.id, id));

  return c.json({ message: "Expense deleted successfully" });
});

export default expensesRouter;
