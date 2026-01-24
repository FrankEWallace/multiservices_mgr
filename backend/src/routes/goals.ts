import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { goals, services, goalHistory } from "../db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { authMiddleware, type AuthUser } from "../middleware/auth";

const goalsRouter = new Hono<{ Variables: { user: AuthUser } }>();

// Validation schemas
const createGoalSchema = z.object({
  serviceId: z.number().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  goalType: z.enum(["revenue", "profit", "expense"]),
  period: z.enum(["daily", "weekly", "monthly", "yearly"]),
  targetAmount: z.number().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const updateGoalSchema = createGoalSchema.partial().extend({
  currentAmount: z.number().optional(),
  status: z.enum(["active", "completed", "missed"]).optional(),
});

// Get all goals
goalsRouter.get("/", async (c) => {
  const { status, serviceId } = c.req.query();

  const allGoals = await db
    .select({
      goal: goals,
      serviceName: services.name,
    })
    .from(goals)
    .leftJoin(services, eq(goals.serviceId, services.id))
    .orderBy(desc(goals.createdAt));

  let result = allGoals.map((g) => ({
    ...g.goal,
    serviceName: g.serviceName || "All Services",
    progress: Math.round(((g.goal.currentAmount || 0) / g.goal.targetAmount) * 100),
  }));

  if (status) {
    result = result.filter((g) => g.status === status);
  }

  if (serviceId) {
    result = result.filter((g) => g.serviceId === parseInt(serviceId));
  }

  return c.json({ goals: result });
});

// Get goal progress summary
goalsRouter.get("/progress", async (c) => {
  const activeGoals = await db
    .select({
      goal: goals,
      serviceName: services.name,
    })
    .from(goals)
    .leftJoin(services, eq(goals.serviceId, services.id))
    .where(eq(goals.status, "active"));

  const progress = activeGoals.map((g) => {
    const progressPercent = Math.round(
      ((g.goal.currentAmount || 0) / g.goal.targetAmount) * 100
    );

    return {
      id: g.goal.id,
      title: g.goal.title,
      serviceName: g.serviceName || "All Services",
      type: g.goal.goalType,
      period: g.goal.period,
      target: g.goal.targetAmount,
      current: g.goal.currentAmount,
      progress: progressPercent,
      status: progressPercent >= 100 ? "achieved" : progressPercent >= 80 ? "on-track" : "behind",
      endDate: g.goal.endDate,
    };
  });

  // Summary stats
  const achieved = progress.filter((p) => p.progress >= 100).length;
  const onTrack = progress.filter((p) => p.progress >= 80 && p.progress < 100).length;
  const behind = progress.filter((p) => p.progress < 80).length;

  return c.json({
    goals: progress,
    summary: {
      total: progress.length,
      achieved,
      onTrack,
      behind,
      overallProgress: progress.length > 0
        ? Math.round(progress.reduce((sum, p) => sum + p.progress, 0) / progress.length)
        : 0,
    },
  });
});

// Get single goal
goalsRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const goalResult = await db
    .select({
      goal: goals,
      serviceName: services.name,
    })
    .from(goals)
    .leftJoin(services, eq(goals.serviceId, services.id))
    .where(eq(goals.id, id));

  const goal = goalResult[0];

  if (!goal) {
    return c.json({ error: "Goal not found" }, 404);
  }

  return c.json({
    goal: {
      ...goal.goal,
      serviceName: goal.serviceName || "All Services",
      progress: Math.round(((goal.goal.currentAmount || 0) / goal.goal.targetAmount) * 100),
    },
  });
});

// Create goal (protected)
goalsRouter.post("/", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const data = createGoalSchema.parse(body);

    // Verify service exists if provided
    if (data.serviceId) {
      const serviceResult = await db
        .select()
        .from(services)
        .where(eq(services.id, data.serviceId));

      if (serviceResult.length === 0) {
        return c.json({ error: "Service not found" }, 404);
      }
    }

    const newGoals = await db
      .insert(goals)
      .values({
        ...data,
        currentAmount: 0,
        status: "active",
      })
      .returning();

    return c.json({ goal: newGoals[0] }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    throw error;
  }
});

// Update goal (protected)
goalsRouter.put("/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const data = updateGoalSchema.parse(body);

    const existingResult = await db.select().from(goals).where(eq(goals.id, id));
    const existing = existingResult[0];
    if (!existing) {
      return c.json({ error: "Goal not found" }, 404);
    }

    // Auto-update status if currentAmount meets target
    if (data.currentAmount !== undefined && data.currentAmount >= existing.targetAmount) {
      data.status = "completed";
    }

    const updatedGoals = await db
      .update(goals)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(goals.id, id))
      .returning();

    return c.json({ goal: updatedGoals[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation error", details: error.errors }, 400);
    }
    throw error;
  }
});

// Update goal progress (protected)
goalsRouter.patch("/:id/progress", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { currentAmount } = await c.req.json();

    if (typeof currentAmount !== "number") {
      return c.json({ error: "currentAmount is required and must be a number" }, 400);
    }

    const existingResult = await db.select().from(goals).where(eq(goals.id, id));
    const existing = existingResult[0];
    if (!existing) {
      return c.json({ error: "Goal not found" }, 404);
    }

    const status = currentAmount >= existing.targetAmount ? "completed" : existing.status;

    const updatedGoals = await db
      .update(goals)
      .set({
        currentAmount,
        status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(goals.id, id))
      .returning();

    return c.json({
      goal: updatedGoals[0],
      progress: Math.round((currentAmount / existing.targetAmount) * 100),
    });
  } catch (error) {
    throw error;
  }
});

// Delete goal (protected)
goalsRouter.delete("/:id", authMiddleware, async (c) => {
  const id = parseInt(c.req.param("id"));

  // Get goal details before deletion
  const goalResult = await db
    .select({
      goal: goals,
      serviceName: services.name,
    })
    .from(goals)
    .leftJoin(services, eq(goals.serviceId, services.id))
    .where(eq(goals.id, id));

  const goal = goalResult[0];

  if (!goal) {
    return c.json({ error: "Goal not found" }, 404);
  }

  // Archive to history if it was active/completed
  if (goal.goal.status !== "cancelled") {
    const achievementRate = ((goal.goal.currentAmount || 0) / goal.goal.targetAmount) * 100;
    await db.insert(goalHistory).values({
      goalId: id,
      serviceId: goal.goal.serviceId,
      title: goal.goal.title,
      goalType: goal.goal.goalType,
      period: goal.goal.period,
      targetAmount: goal.goal.targetAmount,
      achievedAmount: goal.goal.currentAmount || 0,
      achievementRate,
      status: achievementRate >= 100 ? "completed" : "cancelled",
      startDate: goal.goal.startDate,
      endDate: goal.goal.endDate,
      completedAt: new Date().toISOString(),
    });
  }

  const deletedGoals = await db.delete(goals).where(eq(goals.id, id)).returning();

  return c.json({ message: "Goal deleted and archived" });
});

// Get goal achievement history
goalsRouter.get("/history", async (c) => {
  const { serviceId, status, limit = "50" } = c.req.query();

  let query = db
    .select({
      history: goalHistory,
      serviceName: services.name,
    })
    .from(goalHistory)
    .leftJoin(services, eq(goalHistory.serviceId, services.id))
    .orderBy(desc(goalHistory.completedAt))
    .limit(parseInt(limit));

  const results = await query;

  let history = results.map((r) => ({
    ...r.history,
    serviceName: r.serviceName || "All Services",
  }));

  // Filter by status if provided
  if (status) {
    history = history.filter((h) => h.status === status);
  }

  // Filter by service if provided
  if (serviceId) {
    history = history.filter((h) => h.serviceId === parseInt(serviceId));
  }

  // Calculate summary stats
  const totalGoals = history.length;
  const completedGoals = history.filter((h) => h.status === "completed").length;
  const missedGoals = history.filter((h) => h.status === "missed").length;
  const avgAchievementRate = history.length > 0
    ? history.reduce((sum, h) => sum + h.achievementRate, 0) / history.length
    : 0;

  return c.json({
    history,
    summary: {
      totalGoals,
      completedGoals,
      missedGoals,
      avgAchievementRate: Math.round(avgAchievementRate * 10) / 10,
      successRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
    },
  });
});

// Mark goal as complete (moves to history)
goalsRouter.post("/:id/complete", authMiddleware, async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();
  const { notes } = body;

  const goalResult = await db
    .select({
      goal: goals,
      serviceName: services.name,
    })
    .from(goals)
    .leftJoin(services, eq(goals.serviceId, services.id))
    .where(eq(goals.id, id));

  const goal = goalResult[0];

  if (!goal) {
    return c.json({ error: "Goal not found" }, 404);
  }

  const achievementRate = ((goal.goal.currentAmount || 0) / goal.goal.targetAmount) * 100;
  const status = achievementRate >= 100 ? "completed" : "missed";

  // Archive to history
  const historyEntry = await db.insert(goalHistory).values({
    goalId: id,
    serviceId: goal.goal.serviceId,
    title: goal.goal.title,
    goalType: goal.goal.goalType,
    period: goal.goal.period,
    targetAmount: goal.goal.targetAmount,
    achievedAmount: goal.goal.currentAmount || 0,
    achievementRate,
    status,
    startDate: goal.goal.startDate,
    endDate: goal.goal.endDate,
    completedAt: new Date().toISOString(),
    notes,
  }).returning();

  // Update goal status
  await db
    .update(goals)
    .set({
      status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(goals.id, id));

  return c.json({
    success: true,
    message: `Goal marked as ${status}`,
    historyEntry: historyEntry[0],
    achievementRate,
  });
});

export default goalsRouter;
