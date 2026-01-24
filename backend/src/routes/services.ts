import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { services, revenues, expenses } from "../db/schema";
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

  // Get revenue and expenses for each service
  const servicesWithStats = await Promise.all(
    allServices.map(async (service) => {
      const revenueResult = await db
        .select({ total: sum(revenues.amount) })
        .from(revenues)
        .where(and(eq(revenues.serviceId, service.id), gte(revenues.date, startOfMonth)));

      const expenseResult = await db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(and(eq(expenses.serviceId, service.id), gte(expenses.date, startOfMonth)));

      const revenue = Number(revenueResult[0]?.total) || 0;
      const expense = Number(expenseResult[0]?.total) || 0;
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

  // Monthly revenue
  const monthlyRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(and(eq(revenues.serviceId, id), gte(revenues.date, startOfMonth)));
  const monthlyRevenue = monthlyRevenueResult[0];

  // Yearly revenue
  const yearlyRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(and(eq(revenues.serviceId, id), gte(revenues.date, startOfYear)));
  const yearlyRevenue = yearlyRevenueResult[0];

  // Monthly expenses
  const monthlyExpensesResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(and(eq(expenses.serviceId, id), gte(expenses.date, startOfMonth)));
  const monthlyExpenses = monthlyExpensesResult[0];

  // Weekly trend
  const weeklyTrend = await db.all(sql`
    SELECT 
      strftime('%W', ${revenues.date}) as week,
      SUM(${revenues.amount}) as revenue
    FROM ${revenues}
    WHERE ${revenues.serviceId} = ${id}
    AND ${revenues.date} >= date('now', '-4 weeks')
    GROUP BY strftime('%W', ${revenues.date})
    ORDER BY week ASC
  `);

  return c.json({
    service,
    stats: {
      monthlyRevenue: Number(monthlyRevenue?.total) || 0,
      yearlyRevenue: Number(yearlyRevenue?.total) || 0,
      monthlyExpenses: Number(monthlyExpenses?.total) || 0,
      monthlyProfit: (Number(monthlyRevenue?.total) || 0) - (Number(monthlyExpenses?.total) || 0),
      weeklyTrend: weeklyTrend.map((w: any) => ({
        week: `Week ${w.week}`,
        revenue: Math.round(w.revenue),
      })),
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
