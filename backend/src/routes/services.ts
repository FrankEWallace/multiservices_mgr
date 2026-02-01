import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { services, revenues, expenses, entries } from "../db/schema";
import { eq, sql, gte, and, sum } from "drizzle-orm";
import { authMiddleware, type AuthUser } from "../middleware/auth";

const servicesRouter = new Hono<{ Variables: { user: AuthUser } }>();

// Validation schemas
const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  icon: z.string().default("building"),
  color: z.string().default("blue"),
  dailyTarget: z.number().default(0),
  monthlyTarget: z.number().default(0),
  yearlyTarget: z.number().default(0),
});

const updateServiceSchema = createServiceSchema.partial();

// Get all services with stats
servicesRouter.get("/", async (c) => {
  const startOfMonth = new Date().toISOString().slice(0, 7) + "-01";

  const allServices = await db.select().from(services);

  // Get revenue and expenses for each service (from both old and new tables)
  const servicesWithStats = await Promise.all(
    allServices.map(async (service) => {
      // Revenue from revenues table
      const revenueResult = await db
        .select({ total: sum(revenues.amount) })
        .from(revenues)
        .where(and(eq(revenues.serviceId, service.id), gte(revenues.date, startOfMonth)));

      // Income from entries table
      const entriesIncomeResult = await db
        .select({ total: sum(entries.amount) })
        .from(entries)
        .where(and(
          eq(entries.serviceId, service.id),
          eq(entries.type, "income"),
          gte(entries.date, startOfMonth)
        ));

      // Expenses from expenses table
      const expenseResult = await db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(and(eq(expenses.serviceId, service.id), gte(expenses.date, startOfMonth)));

      // Expenses from entries table
      const entriesExpenseResult = await db
        .select({ total: sum(entries.amount) })
        .from(entries)
        .where(and(
          eq(entries.serviceId, service.id),
          eq(entries.type, "expense"),
          gte(entries.date, startOfMonth)
        ));

      const revenue = (Number(revenueResult[0]?.total) || 0) + (Number(entriesIncomeResult[0]?.total) || 0);
      const expense = (Number(expenseResult[0]?.total) || 0) + (Number(entriesExpenseResult[0]?.total) || 0);
      const profit = revenue - expense;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const goalMet = revenue >= (service.monthlyTarget || 0) * 0.8;

      return {
        ...service,
        revenue,
        profit,
        margin: Math.round(margin * 10) / 10,
        goalMet,
      };
    })
  );

  return c.json({ services: servicesWithStats });
});

// Get single service
servicesRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const result = await db.select().from(services).where(eq(services.id, id));
  const service = result[0];

  if (!service) {
    return c.json({ error: "Service not found" }, 404);
  }

  return c.json({ service });
});

// Get service statistics
servicesRouter.get("/:id/stats", async (c) => {
  const id = parseInt(c.req.param("id"));
  const startOfMonth = new Date().toISOString().slice(0, 7) + "-01";
  const startOfYear = new Date().toISOString().slice(0, 4) + "-01-01";

  const serviceResult = await db.select().from(services).where(eq(services.id, id));
  const service = serviceResult[0];

  if (!service) {
    return c.json({ error: "Service not found" }, 404);
  }

  // Monthly revenue (from both revenues and entries tables)
  const monthlyRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(and(eq(revenues.serviceId, id), gte(revenues.date, startOfMonth)));

  const monthlyEntriesIncomeResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(and(eq(entries.serviceId, id), eq(entries.type, "income"), gte(entries.date, startOfMonth)));

  const monthlyRevenue = (Number(monthlyRevenueResult[0]?.total) || 0) + (Number(monthlyEntriesIncomeResult[0]?.total) || 0);

  // Yearly revenue (from both revenues and entries tables)
  const yearlyRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(and(eq(revenues.serviceId, id), gte(revenues.date, startOfYear)));

  const yearlyEntriesIncomeResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(and(eq(entries.serviceId, id), eq(entries.type, "income"), gte(entries.date, startOfYear)));

  const yearlyRevenue = (Number(yearlyRevenueResult[0]?.total) || 0) + (Number(yearlyEntriesIncomeResult[0]?.total) || 0);

  // Monthly expenses (from both expenses and entries tables)
  const monthlyExpensesResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(and(eq(expenses.serviceId, id), gte(expenses.date, startOfMonth)));

  const monthlyEntriesExpenseResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(and(eq(entries.serviceId, id), eq(entries.type, "expense"), gte(entries.date, startOfMonth)));

  const monthlyExpenses = (Number(monthlyExpensesResult[0]?.total) || 0) + (Number(monthlyEntriesExpenseResult[0]?.total) || 0);

  // Weekly trend (combining both data sources)
  const weeklyRevenuesTrend = await db.all(sql`
    SELECT 
      strftime('%W', ${revenues.date}) as week,
      SUM(${revenues.amount}) as revenue
    FROM ${revenues}
    WHERE ${revenues.serviceId} = ${id}
    AND ${revenues.date} >= date('now', '-4 weeks')
    GROUP BY strftime('%W', ${revenues.date})
    ORDER BY week ASC
  `);

  const weeklyEntriesTrend = await db.all(sql`
    SELECT 
      strftime('%W', ${entries.date}) as week,
      SUM(${entries.amount}) as revenue
    FROM ${entries}
    WHERE ${entries.serviceId} = ${id}
    AND ${entries.type} = 'income'
    AND ${entries.date} >= date('now', '-4 weeks')
    GROUP BY strftime('%W', ${entries.date})
    ORDER BY week ASC
  `);

  // Merge weekly trends
  const weeklyTrendMap = new Map<string, number>();
  weeklyRevenuesTrend.forEach((w: any) => {
    weeklyTrendMap.set(w.week, (weeklyTrendMap.get(w.week) || 0) + Number(w.revenue || 0));
  });
  weeklyEntriesTrend.forEach((w: any) => {
    weeklyTrendMap.set(w.week, (weeklyTrendMap.get(w.week) || 0) + Number(w.revenue || 0));
  });

  const weeklyTrend = Array.from(weeklyTrendMap.entries())
    .map(([week, revenue]) => ({ week: `Week ${week}`, revenue: Math.round(revenue) }))
    .sort((a, b) => parseInt(a.week.split(' ')[1]) - parseInt(b.week.split(' ')[1]));

  return c.json({
    service,
    stats: {
      monthlyRevenue,
      yearlyRevenue,
      monthlyExpenses,
      monthlyProfit: monthlyRevenue - monthlyExpenses,
      weeklyTrend,
    },
  });
});

// Create service (protected)
servicesRouter.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const data = createServiceSchema.parse(body);

    const newServices = await db.insert(services).values(data).returning();

    return c.json({ service: newServices[0] }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    throw error;
  }
});

// Update service (protected)
servicesRouter.put("/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const data = updateServiceSchema.parse(body);

    const updatedServices = await db
      .update(services)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(services.id, id))
      .returning();

    if (updatedServices.length === 0) {
      return c.json({ error: "Service not found" }, 404);
    }

    return c.json({ service: updatedServices[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    throw error;
  }
});

// Delete service (protected)
servicesRouter.delete("/:id", authMiddleware, async (c) => {
  const id = parseInt(c.req.param("id"));

  const deletedServices = await db
    .update(services)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(services.id, id))
    .returning();

  if (deletedServices.length === 0) {
    return c.json({ error: "Service not found" }, 404);
  }

  return c.json({ message: "Service deactivated" });
});

export default servicesRouter;
