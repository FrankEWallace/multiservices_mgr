import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { revenues, services } from "../db/schema";
import { eq, sql, gte, lte, and, desc, sum } from "drizzle-orm";
import { authMiddleware, type AuthUser } from "../middleware/auth";

const revenueRouter = new Hono<{ Variables: { user: AuthUser } }>();

// Validation schemas
const createRevenueSchema = z.object({
  serviceId: z.number(),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().optional(),
  paymentMethod: z.enum(["cash", "bank", "mobile"]).default("cash"),
  reference: z.string().optional(),
});

// Get all revenue entries
revenueRouter.get("/", async (c) => {
  const { limit = "100" } = c.req.query();

  const allRevenues = await db
    .select({
      revenue: revenues,
      serviceName: services.name,
    })
    .from(revenues)
    .leftJoin(services, eq(revenues.serviceId, services.id))
    .orderBy(desc(revenues.date))
    .limit(parseInt(limit));

  return c.json({
    revenues: allRevenues.map((r) => ({
      ...r.revenue,
      serviceName: r.serviceName,
    })),
  });
});

// Get revenue summary
revenueRouter.get("/summary", async (c) => {
  const today = new Date().toISOString().split("T")[0];
  const startOfMonth = today.slice(0, 7) + "-01";
  const startOfYear = today.slice(0, 4) + "-01-01";

  // Today's revenue
  const todayRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(eq(revenues.date, today));
  const todayRevenue = todayRevenueResult[0];

  // This month
  const monthlyRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(gte(revenues.date, startOfMonth));
  const monthlyRevenue = monthlyRevenueResult[0];

  // This year
  const yearlyRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(gte(revenues.date, startOfYear));
  const yearlyRevenue = yearlyRevenueResult[0];

  // By payment method
  const byPaymentMethod = await db.all(sql`
    SELECT 
      payment_method,
      SUM(amount) as total,
      COUNT(*) as count
    FROM ${revenues}
    WHERE date >= ${startOfMonth}
    GROUP BY payment_method
  `);

  return c.json({
    summary: {
      today: Number(todayRevenue?.total) || 0,
      thisMonth: Number(monthlyRevenue?.total) || 0,
      thisYear: Number(yearlyRevenue?.total) || 0,
      byPaymentMethod: byPaymentMethod.map((p: any) => ({
        method: p.payment_method,
        total: p.total,
        count: p.count,
      })),
    },
  });
});

// Get revenue by service
revenueRouter.get("/by-service", async (c) => {
  const { period = "month" } = c.req.query();

  let startDate: string;
  const today = new Date().toISOString().split("T")[0];

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
      COALESCE(SUM(r.amount), 0) as revenue
    FROM ${services} s
    LEFT JOIN ${revenues} r ON r.service_id = s.id AND r.date >= ${startDate}
    WHERE s.is_active = 1
    GROUP BY s.id
    ORDER BY revenue DESC
  `);

  return c.json({ byService });
});

// Get revenue trend
revenueRouter.get("/trend", async (c) => {
  const { period = "daily", days = "30" } = c.req.query();

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
      SUM(amount) as revenue,
      COUNT(*) as transactions
    FROM revenues
    WHERE date >= date('now', '-${parseInt(days)} days')
    GROUP BY ${groupBy}
    ORDER BY period ASC
  `));

  return c.json({ trend });
});

// Create revenue entry (protected)
revenueRouter.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const data = createRevenueSchema.parse(body);

    // Verify service exists
    const serviceResult = await db.select().from(services).where(eq(services.id, data.serviceId));
    if (serviceResult.length === 0) {
      return c.json({ error: "Service not found" }, 404);
    }

    const newRevenues = await db.insert(revenues).values(data).returning();

    return c.json({ revenue: newRevenues[0] }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    throw error;
  }
});

// Bulk import revenue entries (protected)
revenueRouter.post("/bulk", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    if (!Array.isArray(body.revenues)) {
      return c.json({ error: "revenues array is required" }, 400);
    }

    const validRevenues: any[] = [];
    const errors: any[] = [];

    // Get all service IDs for validation
    const allServices = await db.select({ id: services.id }).from(services);
    const serviceIds = new Set(allServices.map((s) => s.id));

    for (let i = 0; i < body.revenues.length; i++) {
      try {
        const data = createRevenueSchema.parse(body.revenues[i]);
        if (!serviceIds.has(data.serviceId)) {
          errors.push({ row: i + 1, error: `Service ID ${data.serviceId} not found` });
          continue;
        }
        validRevenues.push({
          ...data,
          createdBy: user.id,
        });
      } catch (error) {
        errors.push({ row: i + 1, error: error instanceof z.ZodError ? error.errors : "Invalid data" });
      }
    }

    if (validRevenues.length > 0) {
      await db.insert(revenues).values(validRevenues);
    }

    return c.json({
      message: `Imported ${validRevenues.length} revenue entries`,
      imported: validRevenues.length,
      failed: errors.length,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    throw error;
  }
});

// Update revenue entry (protected)
revenueRouter.put("/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const data = createRevenueSchema.partial().parse(body);

    const updatedRevenues = await db
      .update(revenues)
      .set(data)
      .where(eq(revenues.id, id))
      .returning();

    if (updatedRevenues.length === 0) {
      return c.json({ error: "Revenue entry not found" }, 404);
    }

    return c.json({ revenue: updatedRevenues[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    throw error;
  }
});

// Delete revenue entry (protected)
revenueRouter.delete("/:id", authMiddleware, async (c) => {
  const id = parseInt(c.req.param("id"));

  const deletedRevenues = await db.delete(revenues).where(eq(revenues.id, id)).returning();

  if (deletedRevenues.length === 0) {
    return c.json({ error: "Revenue entry not found" }, 404);
  }

  return c.json({ message: "Revenue entry deleted" });
});

export default revenueRouter;
