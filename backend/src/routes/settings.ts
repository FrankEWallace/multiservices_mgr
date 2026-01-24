import { Hono } from "hono";
import { eq, like } from "drizzle-orm";
import { db } from "../db/index.js";
import { settings } from "../db/schema.js";
import { z } from "zod";

const settingsRouter = new Hono();

// Get all settings (with optional category filter)
settingsRouter.get("/", async (c) => {
  const category = c.req.query("category");
  const publicOnly = c.req.query("public") === "true";
  
  try {
    let query = db.select().from(settings);
    
    if (category) {
      query = query.where(eq(settings.category, category)) as typeof query;
    }
    
    if (publicOnly) {
      query = query.where(eq(settings.isPublic, true)) as typeof query;
    }
    
    const allSettings = await query;
    
    // Group by category for easier frontend consumption
    const grouped = allSettings.reduce((acc, setting) => {
      const cat = setting.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        ...setting,
        // Parse JSON values
        value: setting.type === "json" ? JSON.parse(setting.value) : 
               setting.type === "boolean" ? setting.value === "true" :
               setting.type === "number" ? Number(setting.value) :
               setting.value
      });
      return acc;
    }, {} as Record<string, typeof allSettings>);
    
    return c.json(grouped);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

// Get a single setting by key
settingsRouter.get("/:key", async (c) => {
  const key = c.req.param("key");
  
  try {
    const setting = await db.select().from(settings).where(eq(settings.key, key)).get();
    
    if (!setting) {
      return c.json({ error: "Setting not found" }, 404);
    }
    
    // Parse value based on type
    const parsedValue = setting.type === "json" ? JSON.parse(setting.value) : 
                        setting.type === "boolean" ? setting.value === "true" :
                        setting.type === "number" ? Number(setting.value) :
                        setting.value;
    
    return c.json({ ...setting, value: parsedValue });
  } catch (error) {
    console.error("Error fetching setting:", error);
    return c.json({ error: "Failed to fetch setting" }, 500);
  }
});

// Create or update a setting (upsert)
const settingSchema = z.object({
  key: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.record(z.any())]),
  category: z.string().default("general"),
  type: z.enum(["string", "number", "boolean", "json"]).default("string"),
  label: z.string().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

settingsRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = settingSchema.parse(body);
    
    // Convert value to string for storage
    const stringValue = typeof parsed.value === "object" ? 
                        JSON.stringify(parsed.value) : 
                        String(parsed.value);
    
    // Check if setting exists
    const existing = await db.select().from(settings).where(eq(settings.key, parsed.key)).get();
    
    const now = new Date().toISOString();
    
    if (existing) {
      // Update existing setting
      const [updated] = await db.update(settings)
        .set({
          value: stringValue,
          category: parsed.category,
          type: parsed.type,
          label: parsed.label,
          description: parsed.description,
          isPublic: parsed.isPublic,
          updatedAt: now,
        })
        .where(eq(settings.key, parsed.key))
        .returning();
      
      return c.json(updated);
    } else {
      // Insert new setting
      const [created] = await db.insert(settings)
        .values({
          key: parsed.key,
          value: stringValue,
          category: parsed.category,
          type: parsed.type,
          label: parsed.label,
          description: parsed.description,
          isPublic: parsed.isPublic,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      
      return c.json(created, 201);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation failed", details: error.errors }, 400);
    }
    console.error("Error saving setting:", error);
    return c.json({ error: "Failed to save setting" }, 500);
  }
});

// Bulk update settings
settingsRouter.put("/bulk", async (c) => {
  try {
    const body = await c.req.json();
    const settingsArray = z.array(settingSchema).parse(body);
    
    const now = new Date().toISOString();
    const results = [];
    
    for (const setting of settingsArray) {
      const stringValue = typeof setting.value === "object" ? 
                          JSON.stringify(setting.value) : 
                          String(setting.value);
      
      const existing = await db.select().from(settings).where(eq(settings.key, setting.key)).get();
      
      if (existing) {
        const [updated] = await db.update(settings)
          .set({
            value: stringValue,
            category: setting.category,
            type: setting.type,
            label: setting.label,
            description: setting.description,
            isPublic: setting.isPublic,
            updatedAt: now,
          })
          .where(eq(settings.key, setting.key))
          .returning();
        results.push(updated);
      } else {
        const [created] = await db.insert(settings)
          .values({
            key: setting.key,
            value: stringValue,
            category: setting.category,
            type: setting.type,
            label: setting.label,
            description: setting.description,
            isPublic: setting.isPublic,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        results.push(created);
      }
    }
    
    return c.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Validation failed", details: error.errors }, 400);
    }
    console.error("Error bulk updating settings:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

// Delete a setting
settingsRouter.delete("/:key", async (c) => {
  const key = c.req.param("key");
  
  try {
    const deleted = await db.delete(settings).where(eq(settings.key, key)).returning();
    
    if (deleted.length === 0) {
      return c.json({ error: "Setting not found" }, 404);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting setting:", error);
    return c.json({ error: "Failed to delete setting" }, 500);
  }
});

export default settingsRouter;
