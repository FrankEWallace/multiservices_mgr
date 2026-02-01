import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { entries, services, users } from "../db/schema";
import { eq, desc, and, gte, lte, sql, or, like } from "drizzle-orm";
import { authMiddleware, type AuthUser } from "../middleware/auth";

const entriesRouter = new Hono<{ Variables: { user: AuthUser } }>();

// Apply auth middleware to all routes
entriesRouter.use("*", authMiddleware);

// Validation schemas
const createEntrySchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  serviceId: z.number().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  date: z.string(), // ISO date string
});

const updateEntrySchema = createEntrySchema.partial();

// Get all entries with filters
entriesRouter.get("/", async (c) => {
  const user = c.get("user");
  const { 
    type, 
    serviceId, 
    startDate, 
    endDate, 
    search,
    limit = "50", 
    offset = "0" 
  } = c.req.query();

  const conditions = [];
  
  if (type && (type === "income" || type === "expense")) {
    conditions.push(eq(entries.type, type));
  }
  if (serviceId) {
    conditions.push(eq(entries.serviceId, parseInt(serviceId)));
  }
  if (startDate) {
    conditions.push(gte(entries.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(entries.date, endDate));
  }
  if (search) {
    conditions.push(
      or(
        like(entries.description, `%${search}%`),
        like(entries.category, `%${search}%`)
      )
    );
  }

  const results = await db
    .select({
      id: entries.id,
      type: entries.type,
      amount: entries.amount,
      serviceId: entries.serviceId,
      serviceName: services.name,
      category: entries.category,
      description: entries.description,
      images: entries.images,
      date: entries.date,
      userId: entries.userId,
      userName: users.fullName,
      createdAt: entries.createdAt,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .leftJoin(services, eq(entries.serviceId, services.id))
    .leftJoin(users, eq(entries.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(entries.date), desc(entries.createdAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  // Parse images JSON
  const entriesWithParsedImages = results.map(entry => ({
    ...entry,
    images: entry.images ? JSON.parse(entry.images) : [],
  }));

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(entries)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return c.json({
    entries: entriesWithParsedImages,
    total: countResult[0]?.count || 0,
  });
});

// Get summary statistics
entriesRouter.get("/summary", async (c) => {
  const { startDate, endDate, serviceId } = c.req.query();
  
  const conditions = [];
  if (startDate) conditions.push(gte(entries.date, startDate));
  if (endDate) conditions.push(lte(entries.date, endDate));
  if (serviceId) conditions.push(eq(entries.serviceId, parseInt(serviceId)));

  // Get totals by type
  const totals = await db
    .select({
      type: entries.type,
      total: sql<number>`sum(${entries.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(entries)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(entries.type);

  const income = totals.find(t => t.type === "income");
  const expense = totals.find(t => t.type === "expense");

  // Get by service
  const byService = await db
    .select({
      serviceId: entries.serviceId,
      serviceName: services.name,
      type: entries.type,
      total: sql<number>`sum(${entries.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(entries)
    .leftJoin(services, eq(entries.serviceId, services.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(entries.serviceId, entries.type);

  // Get by category (for expenses without service)
  const byCategory = await db
    .select({
      category: entries.category,
      total: sql<number>`sum(${entries.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(entries)
    .where(
      and(
        eq(entries.type, "expense"),
        ...(conditions.length > 0 ? conditions : [])
      )
    )
    .groupBy(entries.category);

  // Get daily trend (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const dailyTrend = await db
    .select({
      date: entries.date,
      type: entries.type,
      total: sql<number>`sum(${entries.amount})`,
    })
    .from(entries)
    .where(gte(entries.date, thirtyDaysAgoStr))
    .groupBy(entries.date, entries.type)
    .orderBy(entries.date);

  return c.json({
    totalIncome: income?.total || 0,
    totalExpense: expense?.total || 0,
    netProfit: (income?.total || 0) - (expense?.total || 0),
    incomeCount: income?.count || 0,
    expenseCount: expense?.count || 0,
    byService,
    byCategory: byCategory.filter(c => c.category),
    dailyTrend,
  });
});

// Get single entry
entriesRouter.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const result = await db
    .select({
      id: entries.id,
      type: entries.type,
      amount: entries.amount,
      serviceId: entries.serviceId,
      serviceName: services.name,
      category: entries.category,
      description: entries.description,
      images: entries.images,
      date: entries.date,
      userId: entries.userId,
      userName: users.fullName,
      createdAt: entries.createdAt,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .leftJoin(services, eq(entries.serviceId, services.id))
    .leftJoin(users, eq(entries.userId, users.id))
    .where(eq(entries.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: "Entry not found" }, 404);
  }

  const entry = {
    ...result[0],
    images: result[0].images ? JSON.parse(result[0].images) : [],
  };

  return c.json({ entry });
});

// Create new entry
entriesRouter.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  
  const validation = createEntrySchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: validation.error.errors }, 400);
  }

  const data = validation.data;

  const result = await db.insert(entries).values({
    type: data.type,
    amount: data.amount,
    serviceId: data.serviceId || null,
    category: data.category || null,
    description: data.description || null,
    images: data.images ? JSON.stringify(data.images) : null,
    date: data.date,
    userId: user.id,
    createdAt: new Date().toISOString(),
  }).returning();

  return c.json({ 
    entry: {
      ...result[0],
      images: result[0].images ? JSON.parse(result[0].images) : [],
    },
    message: "Entry created successfully" 
  }, 201);
});

// Update entry
entriesRouter.put("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();

  const validation = updateEntrySchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: validation.error.errors }, 400);
  }

  const data = validation.data;
  
  // Build update object
  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };
  
  if (data.type !== undefined) updateData.type = data.type;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.serviceId !== undefined) updateData.serviceId = data.serviceId;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.images !== undefined) updateData.images = JSON.stringify(data.images);
  if (data.date !== undefined) updateData.date = data.date;

  const result = await db
    .update(entries)
    .set(updateData)
    .where(eq(entries.id, id))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Entry not found" }, 404);
  }

  return c.json({ 
    entry: {
      ...result[0],
      images: result[0].images ? JSON.parse(result[0].images) : [],
    },
    message: "Entry updated successfully" 
  });
});

// Delete entry
entriesRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  const result = await db
    .delete(entries)
    .where(eq(entries.id, id))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Entry not found" }, 404);
  }

  return c.json({ message: "Entry deleted successfully" });
});

// Upload image (placeholder - in production, use cloud storage)
entriesRouter.post("/upload-image", async (c) => {
  // In a real app, you'd handle file uploads here
  // For now, we'll accept base64 or URLs
  const body = await c.req.json();
  const { image } = body;

  if (!image) {
    return c.json({ error: "No image provided" }, 400);
  }

  // In production, upload to S3/Cloudinary/etc and return URL
  // For now, just return the image as-is (assuming it's a URL or base64)
  return c.json({ 
    url: image,
    message: "Image uploaded successfully" 
  });
});

export default entriesRouter;
