import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { madenis, madeniPayments, services } from "../db/schema";
import { eq, sql, desc, sum, and } from "drizzle-orm";
import { authMiddleware, type AuthUser } from "../middleware/auth";

const madeniRouter = new Hono<{ Variables: { user: AuthUser } }>();

// Validation schemas
const createMadeniSchema = z.object({
  serviceId: z.number(),
  debtorName: z.string().min(1),
  debtorContact: z.string().optional(),
  debtorEmail: z.string().email().optional(),
  debtorAddress: z.string().optional(),
  originalAmount: z.number().positive(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.enum(["cash", "bank", "mobile"]).default("cash"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// Helper to calculate status
function calculateStatus(dueDate: string, balance: number): string {
  if (balance <= 0) return "paid";
  const today = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 30) return "overdue";
  if (diffDays > 0) return "pending";
  return "current";
}

// Get all madeni entries
madeniRouter.get("/", async (c) => {
  const { status, serviceId } = c.req.query();

  const allMadeni = await db
    .select({
      madeni: madenis,
      serviceName: services.name,
    })
    .from(madenis)
    .leftJoin(services, eq(madenis.serviceId, services.id))
    .orderBy(desc(madenis.dueDate));

  let result = allMadeni.map((m) => {
    const daysOverdue = Math.max(
      0,
      Math.floor(
        (new Date().getTime() - new Date(m.madeni.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    return {
      ...m.madeni,
      serviceName: m.serviceName,
      daysOverdue: m.madeni.status !== "paid" ? daysOverdue : 0,
    };
  });

  // Filter by status if provided
  if (status) {
    result = result.filter((m) => m.status === status);
  }

  // Filter by service if provided
  if (serviceId) {
    result = result.filter((m) => m.serviceId === parseInt(serviceId));
  }

  return c.json({ debts: result, madenis: result }); // Include both for backwards compatibility
});

// Get aging report
madeniRouter.get("/aging", async (c) => {
  const today = new Date().toISOString().split("T")[0];
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split("T")[0];

  // Current (not due yet)
  const current = await db.all(sql`
    SELECT SUM(balance) as total, COUNT(*) as count
    FROM ${madenis}
    WHERE status != 'paid' AND due_date >= ${today}
  `);

  // 1-30 days overdue
  const overdue30 = await db.all(sql`
    SELECT SUM(balance) as total, COUNT(*) as count
    FROM ${madenis}
    WHERE status != 'paid' 
      AND due_date < ${today}
      AND due_date >= ${thirtyDaysAgoStr}
  `);

  // 31-60 days overdue
  const overdue60 = await db.all(sql`
    SELECT SUM(balance) as total, COUNT(*) as count
    FROM ${madenis}
    WHERE status != 'paid' 
      AND due_date < ${thirtyDaysAgoStr}
      AND due_date >= ${sixtyDaysAgoStr}
  `);

  // 60+ days overdue
  const overdue90Plus = await db.all(sql`
    SELECT SUM(balance) as total, COUNT(*) as count
    FROM ${madenis}
    WHERE status != 'paid' AND due_date < ${sixtyDaysAgoStr}
  `);

  return c.json({
    aging: [
      { label: "Current", amount: (current[0] as any)?.total || 0, count: (current[0] as any)?.count || 0, color: "success" },
      { label: "1-30 Days", amount: (overdue30[0] as any)?.total || 0, count: (overdue30[0] as any)?.count || 0, color: "warning" },
      { label: "31-60 Days", amount: (overdue60[0] as any)?.total || 0, count: (overdue60[0] as any)?.count || 0, color: "orange" },
      { label: "60+ Days", amount: (overdue90Plus[0] as any)?.total || 0, count: (overdue90Plus[0] as any)?.count || 0, color: "danger" },
    ],
    total: {
      amount:
        ((current[0] as any)?.total || 0) +
        ((overdue30[0] as any)?.total || 0) +
        ((overdue60[0] as any)?.total || 0) +
        ((overdue90Plus[0] as any)?.total || 0),
      count:
        ((current[0] as any)?.count || 0) +
        ((overdue30[0] as any)?.count || 0) +
        ((overdue60[0] as any)?.count || 0) +
        ((overdue90Plus[0] as any)?.count || 0),
    },
  });
});

// Get single madeni with payments
madeniRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const madeniResult = await db
    .select({
      madeni: madenis,
      serviceName: services.name,
    })
    .from(madenis)
    .leftJoin(services, eq(madenis.serviceId, services.id))
    .where(eq(madenis.id, id));

  const madeni = madeniResult[0];

  if (!madeni) {
    return c.json({ error: "Madeni not found" }, 404);
  }

  // Get payment history
  const payments = await db
    .select()
    .from(madeniPayments)
    .where(eq(madeniPayments.madeniId, id))
    .orderBy(desc(madeniPayments.paymentDate));

  return c.json({
    madeni: {
      ...madeni.madeni,
      serviceName: madeni.serviceName,
    },
    payments,
  });
});

// Create madeni (protected)
madeniRouter.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const data = createMadeniSchema.parse(body);

    // Verify service exists
    const serviceResult = await db
      .select()
      .from(services)
      .where(eq(services.id, data.serviceId));

    if (serviceResult.length === 0) {
      return c.json({ error: "Service not found" }, 404);
    }

    const status = calculateStatus(data.dueDate, data.originalAmount);

    const newMadenis = await db
      .insert(madenis)
      .values({
        ...data,
        balance: data.originalAmount,
        status,
      })
      .returning();

    return c.json({ madeni: newMadenis[0] }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    throw error;
  }
});

// Record payment (protected)
madeniRouter.post("/:id/payments", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const data = paymentSchema.parse(body);

    // Get current madeni
    const madeniResult = await db.select().from(madenis).where(eq(madenis.id, id));
    const madeni = madeniResult[0];

    if (!madeni) {
      return c.json({ error: "Madeni not found" }, 404);
    }

    // Ensure payment doesn't exceed balance
    const paymentAmount = Math.min(data.amount, madeni.balance);
    const newBalance = madeni.balance - paymentAmount;
    const newStatus = calculateStatus(madeni.dueDate, newBalance);

    // Record payment
    const newPayments = await db
      .insert(madeniPayments)
      .values({
        madeniId: id,
        ...data,
        amount: paymentAmount,
      })
      .returning();

    // Update madeni balance and status
    await db
      .update(madenis)
      .set({
        balance: newBalance,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(madenis.id, id));

    return c.json({
      payment: newPayments[0],
      newBalance,
      newStatus,
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    throw error;
  }
});

// Update madeni (protected)
madeniRouter.put("/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const data = createMadeniSchema.partial().parse(body);

    const updatedMadenis = await db
      .update(madenis)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(madenis.id, id))
      .returning();

    if (updatedMadenis.length === 0) {
      return c.json({ error: "Madeni not found" }, 404);
    }

    return c.json({ madeni: updatedMadenis[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    throw error;
  }
});

// Delete madeni (protected) - marks as cancelled instead of deleting
madeniRouter.delete("/:id", authMiddleware, async (c) => {
  const id = parseInt(c.req.param("id"));

  const deletedMadenis = await db
    .update(madenis)
    .set({
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(madenis.id, id))
    .returning();

  if (deletedMadenis.length === 0) {
    return c.json({ error: "Madeni not found" }, 404);
  }

  return c.json({ message: "Madeni cancelled" });
});

export default madeniRouter;
