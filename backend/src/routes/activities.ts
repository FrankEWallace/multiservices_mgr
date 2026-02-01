import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { activities, services, users } from "../db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { authMiddleware, type AuthUser } from "../middleware/auth";

const activitiesRouter = new Hono<{ Variables: { user: AuthUser } }>();

// Apply auth middleware to all routes
activitiesRouter.use("*", authMiddleware);

// Validation schemas
const createActivitySchema = z.object({
  serviceId: z.number().optional(),
  action: z.enum(["create", "read", "update", "delete"]),
  entityType: z.enum(["revenue", "expense", "debt", "goal", "service", "payment"]),
  entityId: z.number().optional(),
  entityName: z.string().optional(),
  details: z.string().optional(), // JSON string
});

// Get all activities (with optional filters)
activitiesRouter.get("/", async (c) => {
  const { serviceId, action, entityType, limit = "50", offset = "0" } = c.req.query();
  
  let query = db.select({
    id: activities.id,
    serviceId: activities.serviceId,
    serviceName: services.name,
    userId: activities.userId,
    userName: users.fullName,
    userEmail: users.email,
    action: activities.action,
    entityType: activities.entityType,
    entityId: activities.entityId,
    entityName: activities.entityName,
    details: activities.details,
    createdAt: activities.createdAt,
  })
  .from(activities)
  .leftJoin(services, eq(activities.serviceId, services.id))
  .leftJoin(users, eq(activities.userId, users.id))
  .orderBy(desc(activities.createdAt))
  .limit(parseInt(limit))
  .offset(parseInt(offset));

  // Apply filters if provided
  const conditions = [];
  if (serviceId) {
    conditions.push(eq(activities.serviceId, parseInt(serviceId)));
  }
  if (action) {
    conditions.push(eq(activities.action, action));
  }
  if (entityType) {
    conditions.push(eq(activities.entityType, entityType));
  }

  const results = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(activities)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return c.json({
    activities: results,
    total: countResult[0]?.count || 0,
  });
});

// Get activities for a specific service
activitiesRouter.get("/service/:serviceId", async (c) => {
  const serviceId = parseInt(c.req.param("serviceId"));
  const { limit = "20", offset = "0" } = c.req.query();

  const results = await db.select({
    id: activities.id,
    serviceId: activities.serviceId,
    userId: activities.userId,
    userName: users.fullName,
    userEmail: users.email,
    action: activities.action,
    entityType: activities.entityType,
    entityId: activities.entityId,
    entityName: activities.entityName,
    details: activities.details,
    createdAt: activities.createdAt,
  })
  .from(activities)
  .leftJoin(users, eq(activities.userId, users.id))
  .where(eq(activities.serviceId, serviceId))
  .orderBy(desc(activities.createdAt))
  .limit(parseInt(limit))
  .offset(parseInt(offset));

  // Get count by action type
  const actionCounts = await db
    .select({
      action: activities.action,
      count: sql<number>`count(*)`,
    })
    .from(activities)
    .where(eq(activities.serviceId, serviceId))
    .groupBy(activities.action);

  // Get count by entity type
  const entityCounts = await db
    .select({
      entityType: activities.entityType,
      count: sql<number>`count(*)`,
    })
    .from(activities)
    .where(eq(activities.serviceId, serviceId))
    .groupBy(activities.entityType);

  // Get total count
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(activities)
    .where(eq(activities.serviceId, serviceId));

  return c.json({
    activities: results,
    total: totalResult[0]?.count || 0,
    summary: {
      byAction: actionCounts.reduce((acc, item) => {
        acc[item.action] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byEntityType: entityCounts.reduce((acc, item) => {
        acc[item.entityType] = item.count;
        return acc;
      }, {} as Record<string, number>),
    },
  });
});

// Get activity summary/stats
activitiesRouter.get("/summary", async (c) => {
  const { days = "30" } = c.req.query();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  const startDateStr = startDate.toISOString().split("T")[0];

  // Count by action
  const actionCounts = await db
    .select({
      action: activities.action,
      count: sql<number>`count(*)`,
    })
    .from(activities)
    .where(gte(activities.createdAt, startDateStr))
    .groupBy(activities.action);

  // Count by entity type
  const entityCounts = await db
    .select({
      entityType: activities.entityType,
      count: sql<number>`count(*)`,
    })
    .from(activities)
    .where(gte(activities.createdAt, startDateStr))
    .groupBy(activities.entityType);

  // Count by service
  const serviceCounts = await db
    .select({
      serviceId: activities.serviceId,
      serviceName: services.name,
      count: sql<number>`count(*)`,
    })
    .from(activities)
    .leftJoin(services, eq(activities.serviceId, services.id))
    .where(gte(activities.createdAt, startDateStr))
    .groupBy(activities.serviceId);

  // Daily activity trend
  const dailyTrend = await db
    .select({
      date: sql<string>`date(${activities.createdAt})`,
      count: sql<number>`count(*)`,
    })
    .from(activities)
    .where(gte(activities.createdAt, startDateStr))
    .groupBy(sql`date(${activities.createdAt})`)
    .orderBy(sql`date(${activities.createdAt})`);

  return c.json({
    summary: {
      byAction: actionCounts.reduce((acc, item) => {
        acc[item.action] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byEntityType: entityCounts.reduce((acc, item) => {
        acc[item.entityType] = item.count;
        return acc;
      }, {} as Record<string, number>),
      byService: serviceCounts.filter(s => s.serviceId).map(s => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        count: s.count,
      })),
      dailyTrend,
    },
  });
});

// Create activity (usually called internally by other routes)
activitiesRouter.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const data = createActivitySchema.parse(body);

  const result = await db.insert(activities).values({
    ...data,
    userId: user.id,
    createdAt: new Date().toISOString(),
  }).returning();

  return c.json({ activity: result[0] }, 201);
});

export default activitiesRouter;

// Helper function to log activities from other routes
export async function logActivity(
  userId: number,
  action: "create" | "read" | "update" | "delete",
  entityType: "revenue" | "expense" | "debt" | "goal" | "service" | "payment",
  options: {
    serviceId?: number;
    entityId?: number;
    entityName?: string;
    details?: Record<string, unknown>;
  } = {}
) {
  try {
    await db.insert(activities).values({
      userId,
      action,
      entityType,
      serviceId: options.serviceId,
      entityId: options.entityId,
      entityName: options.entityName,
      details: options.details ? JSON.stringify(options.details) : undefined,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
