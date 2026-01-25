import { Hono } from "hono";
import { db } from "../db";
import { 
  scheduledReports, 
  reportHistory, 
  services, 
  users,
  type ScheduledReport,
  type ReportHistory 
} from "../db/schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { format, addDays, addWeeks, addMonths, parseISO, startOfDay, endOfDay } from "date-fns";

const app = new Hono();

// Helper to calculate next run time
const calculateNextRunAt = (schedule: string, scheduleTime: string, scheduleDay?: number | null): string => {
  const now = new Date();
  const [hours, minutes] = scheduleTime.split(":").map(Number);
  
  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);
  
  // If today's run time has passed, start from tomorrow
  if (nextRun <= now) {
    nextRun = addDays(nextRun, 1);
  }
  
  switch (schedule) {
    case "daily":
      // Next day at scheduled time (already set above)
      break;
    case "weekly":
      // Find next occurrence of scheduleDay (0=Sunday)
      const currentDay = nextRun.getDay();
      const targetDay = scheduleDay ?? 1; // Default to Monday
      const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
      nextRun = addDays(nextRun, daysUntilTarget - 1);
      break;
    case "monthly":
      // Next month on scheduleDay (1-31)
      const targetDate = scheduleDay ?? 1;
      nextRun.setDate(targetDate);
      if (nextRun <= now) {
        nextRun = addMonths(nextRun, 1);
      }
      break;
    default:
      // Custom or unknown - default to daily
      break;
  }
  
  return nextRun.toISOString();
};

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ============ SCHEDULED REPORTS CRUD ============

// GET /api/scheduled-reports - List all scheduled reports
app.get("/", async (c) => {
  try {
    const results = await db
      .select({
        id: scheduledReports.id,
        userId: scheduledReports.userId,
        name: scheduledReports.name,
        reportType: scheduledReports.reportType,
        serviceId: scheduledReports.serviceId,
        serviceName: services.name,
        schedule: scheduledReports.schedule,
        scheduleTime: scheduledReports.scheduleTime,
        scheduleDay: scheduledReports.scheduleDay,
        exportFormat: scheduledReports.exportFormat,
        emailDelivery: scheduledReports.emailDelivery,
        emailRecipients: scheduledReports.emailRecipients,
        isActive: scheduledReports.isActive,
        lastRunAt: scheduledReports.lastRunAt,
        nextRunAt: scheduledReports.nextRunAt,
        createdAt: scheduledReports.createdAt,
      })
      .from(scheduledReports)
      .leftJoin(services, eq(scheduledReports.serviceId, services.id))
      .orderBy(desc(scheduledReports.createdAt));

    // Parse email recipients JSON
    const formattedResults = results.map((r) => ({
      ...r,
      emailRecipients: r.emailRecipients ? JSON.parse(r.emailRecipients) : [],
    }));

    return c.json({ schedules: formattedResults });
  } catch (error) {
    console.error("Error fetching scheduled reports:", error);
    return c.json({ error: "Failed to fetch scheduled reports" }, 500);
  }
});

// GET /api/scheduled-reports/:id - Get single scheduled report
app.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    
    const results = await db
      .select({
        id: scheduledReports.id,
        userId: scheduledReports.userId,
        name: scheduledReports.name,
        reportType: scheduledReports.reportType,
        serviceId: scheduledReports.serviceId,
        serviceName: services.name,
        schedule: scheduledReports.schedule,
        scheduleTime: scheduledReports.scheduleTime,
        scheduleDay: scheduledReports.scheduleDay,
        exportFormat: scheduledReports.exportFormat,
        emailDelivery: scheduledReports.emailDelivery,
        emailRecipients: scheduledReports.emailRecipients,
        isActive: scheduledReports.isActive,
        lastRunAt: scheduledReports.lastRunAt,
        nextRunAt: scheduledReports.nextRunAt,
        createdAt: scheduledReports.createdAt,
        updatedAt: scheduledReports.updatedAt,
      })
      .from(scheduledReports)
      .leftJoin(services, eq(scheduledReports.serviceId, services.id))
      .where(eq(scheduledReports.id, id))
      .limit(1);

    if (results.length === 0) {
      return c.json({ error: "Scheduled report not found" }, 404);
    }

    const schedule = {
      ...results[0],
      emailRecipients: results[0].emailRecipients ? JSON.parse(results[0].emailRecipients) : [],
    };

    return c.json({ schedule });
  } catch (error) {
    console.error("Error fetching scheduled report:", error);
    return c.json({ error: "Failed to fetch scheduled report" }, 500);
  }
});

// POST /api/scheduled-reports - Create new scheduled report
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      name,
      reportType,
      serviceId,
      schedule,
      scheduleTime,
      scheduleDay,
      exportFormat,
      emailDelivery,
      emailRecipients,
    } = body;

    // Validation
    if (!name || !reportType || !schedule) {
      return c.json({ error: "Name, report type, and schedule are required" }, 400);
    }

    const validReportTypes = ["daily", "weekly", "monthly", "service", "debts", "goals"];
    if (!validReportTypes.includes(reportType)) {
      return c.json({ error: "Invalid report type" }, 400);
    }

    const validSchedules = ["daily", "weekly", "monthly"];
    if (!validSchedules.includes(schedule)) {
      return c.json({ error: "Invalid schedule" }, 400);
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunAt(schedule, scheduleTime || "09:00", scheduleDay);

    const result = await db.insert(scheduledReports).values({
      userId: 1, // TODO: Get from auth context
      name,
      reportType,
      serviceId: serviceId || null,
      schedule,
      scheduleTime: scheduleTime || "09:00",
      scheduleDay: scheduleDay || null,
      exportFormat: exportFormat || "pdf",
      emailDelivery: emailDelivery || false,
      emailRecipients: emailRecipients ? JSON.stringify(emailRecipients) : null,
      isActive: true,
      nextRunAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    return c.json({ 
      schedule: {
        ...result[0],
        emailRecipients: emailRecipients || [],
      },
      message: "Scheduled report created successfully" 
    }, 201);
  } catch (error) {
    console.error("Error creating scheduled report:", error);
    return c.json({ error: "Failed to create scheduled report" }, 500);
  }
});

// PUT /api/scheduled-reports/:id - Update scheduled report
app.put("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const {
      name,
      reportType,
      serviceId,
      schedule,
      scheduleTime,
      scheduleDay,
      exportFormat,
      emailDelivery,
      emailRecipients,
      isActive,
    } = body;

    // Check if exists
    const existing = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.id, id))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ error: "Scheduled report not found" }, 404);
    }

    // Calculate next run time if schedule changed
    const nextRunAt = schedule 
      ? calculateNextRunAt(
          schedule || existing[0].schedule, 
          scheduleTime || existing[0].scheduleTime || "09:00", 
          scheduleDay ?? existing[0].scheduleDay
        )
      : existing[0].nextRunAt;

    const result = await db
      .update(scheduledReports)
      .set({
        name: name ?? existing[0].name,
        reportType: reportType ?? existing[0].reportType,
        serviceId: serviceId !== undefined ? serviceId : existing[0].serviceId,
        schedule: schedule ?? existing[0].schedule,
        scheduleTime: scheduleTime ?? existing[0].scheduleTime,
        scheduleDay: scheduleDay !== undefined ? scheduleDay : existing[0].scheduleDay,
        exportFormat: exportFormat ?? existing[0].exportFormat,
        emailDelivery: emailDelivery !== undefined ? emailDelivery : existing[0].emailDelivery,
        emailRecipients: emailRecipients !== undefined 
          ? JSON.stringify(emailRecipients) 
          : existing[0].emailRecipients,
        isActive: isActive !== undefined ? isActive : existing[0].isActive,
        nextRunAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(scheduledReports.id, id))
      .returning();

    return c.json({ 
      schedule: {
        ...result[0],
        emailRecipients: emailRecipients ?? (existing[0].emailRecipients ? JSON.parse(existing[0].emailRecipients) : []),
      },
      message: "Scheduled report updated successfully" 
    });
  } catch (error) {
    console.error("Error updating scheduled report:", error);
    return c.json({ error: "Failed to update scheduled report" }, 500);
  }
});

// DELETE /api/scheduled-reports/:id - Delete scheduled report
app.delete("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    // Check if exists
    const existing = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.id, id))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ error: "Scheduled report not found" }, 404);
    }

    // Delete associated history first
    await db.delete(reportHistory).where(eq(reportHistory.scheduledReportId, id));
    
    // Delete the schedule
    await db.delete(scheduledReports).where(eq(scheduledReports.id, id));

    return c.json({ message: "Scheduled report deleted successfully" });
  } catch (error) {
    console.error("Error deleting scheduled report:", error);
    return c.json({ error: "Failed to delete scheduled report" }, 500);
  }
});

// POST /api/scheduled-reports/:id/toggle - Toggle active status
app.post("/:id/toggle", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const existing = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.id, id))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ error: "Scheduled report not found" }, 404);
    }

    const newStatus = !existing[0].isActive;
    
    // If reactivating, recalculate next run time
    const nextRunAt = newStatus 
      ? calculateNextRunAt(
          existing[0].schedule, 
          existing[0].scheduleTime || "09:00", 
          existing[0].scheduleDay
        )
      : existing[0].nextRunAt;

    await db
      .update(scheduledReports)
      .set({ 
        isActive: newStatus,
        nextRunAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(scheduledReports.id, id));

    return c.json({ 
      isActive: newStatus,
      message: `Scheduled report ${newStatus ? "activated" : "deactivated"} successfully` 
    });
  } catch (error) {
    console.error("Error toggling scheduled report:", error);
    return c.json({ error: "Failed to toggle scheduled report" }, 500);
  }
});

// POST /api/scheduled-reports/:id/run - Manually trigger a scheduled report
app.post("/:id/run", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const schedules = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.id, id))
      .limit(1);

    if (schedules.length === 0) {
      return c.json({ error: "Scheduled report not found" }, 404);
    }

    const schedule = schedules[0];

    // Create a history entry for this manual run
    const historyEntry = await db.insert(reportHistory).values({
      userId: schedule.userId,
      scheduledReportId: schedule.id,
      reportType: schedule.reportType,
      reportName: schedule.name,
      exportFormat: schedule.exportFormat || "pdf",
      parameters: JSON.stringify({
        serviceId: schedule.serviceId,
        triggeredManually: true,
      }),
      status: "completed", // In real implementation, this would be "generating" then updated
      fileSize: Math.floor(Math.random() * 500000) + 10000, // Placeholder size
      filePath: `/reports/${schedule.reportType}-${new Date().toISOString().split("T")[0]}.${schedule.exportFormat}`,
      emailSent: schedule.emailDelivery,
      emailSentTo: schedule.emailDelivery ? schedule.emailRecipients : null,
      generatedAt: new Date().toISOString(),
      expiresAt: addDays(new Date(), 30).toISOString(), // Reports expire in 30 days
    }).returning();

    // Update last run time
    await db
      .update(scheduledReports)
      .set({
        lastRunAt: new Date().toISOString(),
        nextRunAt: calculateNextRunAt(
          schedule.schedule,
          schedule.scheduleTime || "09:00",
          schedule.scheduleDay
        ),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(scheduledReports.id, id));

    return c.json({ 
      historyEntry: historyEntry[0],
      message: "Report generated successfully" 
    });
  } catch (error) {
    console.error("Error running scheduled report:", error);
    return c.json({ error: "Failed to run scheduled report" }, 500);
  }
});

// ============ REPORT HISTORY ============

// GET /api/scheduled-reports/history - List all report history
app.get("/history/all", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");
    const reportType = c.req.query("reportType");
    const status = c.req.query("status");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    let query = db
      .select({
        id: reportHistory.id,
        userId: reportHistory.userId,
        scheduledReportId: reportHistory.scheduledReportId,
        scheduleName: scheduledReports.name,
        reportType: reportHistory.reportType,
        reportName: reportHistory.reportName,
        exportFormat: reportHistory.exportFormat,
        parameters: reportHistory.parameters,
        status: reportHistory.status,
        errorMessage: reportHistory.errorMessage,
        fileSize: reportHistory.fileSize,
        filePath: reportHistory.filePath,
        emailSent: reportHistory.emailSent,
        emailSentTo: reportHistory.emailSentTo,
        generatedAt: reportHistory.generatedAt,
        expiresAt: reportHistory.expiresAt,
      })
      .from(reportHistory)
      .leftJoin(scheduledReports, eq(reportHistory.scheduledReportId, scheduledReports.id))
      .orderBy(desc(reportHistory.generatedAt))
      .limit(limit)
      .offset(offset);

    const results = await query;

    // Format results
    const formattedResults = results.map((r) => ({
      ...r,
      parameters: r.parameters ? JSON.parse(r.parameters) : null,
      emailSentTo: r.emailSentTo ? JSON.parse(r.emailSentTo) : [],
      fileSizeFormatted: r.fileSize ? formatFileSize(r.fileSize) : null,
    }));

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(reportHistory);

    return c.json({ 
      history: formattedResults,
      total: countResult[0].count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching report history:", error);
    return c.json({ error: "Failed to fetch report history" }, 500);
  }
});

// GET /api/scheduled-reports/:id/history - Get history for specific schedule
app.get("/:id/history", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const limit = parseInt(c.req.query("limit") || "20");

    const results = await db
      .select()
      .from(reportHistory)
      .where(eq(reportHistory.scheduledReportId, id))
      .orderBy(desc(reportHistory.generatedAt))
      .limit(limit);

    const formattedResults = results.map((r) => ({
      ...r,
      parameters: r.parameters ? JSON.parse(r.parameters) : null,
      emailSentTo: r.emailSentTo ? JSON.parse(r.emailSentTo) : [],
      fileSizeFormatted: r.fileSize ? formatFileSize(r.fileSize) : null,
    }));

    return c.json({ history: formattedResults });
  } catch (error) {
    console.error("Error fetching schedule history:", error);
    return c.json({ error: "Failed to fetch schedule history" }, 500);
  }
});

// DELETE /api/scheduled-reports/history/:id - Delete a history entry
app.delete("/history/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));

    const existing = await db
      .select()
      .from(reportHistory)
      .where(eq(reportHistory.id, id))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ error: "History entry not found" }, 404);
    }

    // TODO: Delete actual file if exists
    // if (existing[0].filePath) {
    //   await deleteFile(existing[0].filePath);
    // }

    await db.delete(reportHistory).where(eq(reportHistory.id, id));

    return c.json({ message: "History entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting history entry:", error);
    return c.json({ error: "Failed to delete history entry" }, 500);
  }
});

// GET /api/scheduled-reports/stats - Get scheduling statistics
app.get("/stats/summary", async (c) => {
  try {
    // Count schedules by status
    const activeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(scheduledReports)
      .where(eq(scheduledReports.isActive, true));

    const inactiveCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(scheduledReports)
      .where(eq(scheduledReports.isActive, false));

    // Count by report type
    const byReportType = await db
      .select({
        reportType: scheduledReports.reportType,
        count: sql<number>`count(*)`,
      })
      .from(scheduledReports)
      .groupBy(scheduledReports.reportType);

    // Count by schedule frequency
    const bySchedule = await db
      .select({
        schedule: scheduledReports.schedule,
        count: sql<number>`count(*)`,
      })
      .from(scheduledReports)
      .groupBy(scheduledReports.schedule);

    // Recent history stats (last 30 days)
    const thirtyDaysAgo = addDays(new Date(), -30).toISOString();
    
    const recentReports = await db
      .select({ count: sql<number>`count(*)` })
      .from(reportHistory)
      .where(gte(reportHistory.generatedAt, thirtyDaysAgo));

    const failedReports = await db
      .select({ count: sql<number>`count(*)` })
      .from(reportHistory)
      .where(
        and(
          gte(reportHistory.generatedAt, thirtyDaysAgo),
          eq(reportHistory.status, "failed")
        )
      );

    // Upcoming schedules (next 7 days)
    const sevenDaysFromNow = addDays(new Date(), 7).toISOString();
    const upcomingSchedules = await db
      .select({
        id: scheduledReports.id,
        name: scheduledReports.name,
        reportType: scheduledReports.reportType,
        nextRunAt: scheduledReports.nextRunAt,
      })
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.isActive, true),
          lte(scheduledReports.nextRunAt, sevenDaysFromNow)
        )
      )
      .orderBy(scheduledReports.nextRunAt)
      .limit(10);

    return c.json({
      stats: {
        totalSchedules: activeCount[0].count + inactiveCount[0].count,
        activeSchedules: activeCount[0].count,
        inactiveSchedules: inactiveCount[0].count,
        byReportType: byReportType.reduce((acc, item) => {
          acc[item.reportType] = item.count;
          return acc;
        }, {} as Record<string, number>),
        bySchedule: bySchedule.reduce((acc, item) => {
          acc[item.schedule] = item.count;
          return acc;
        }, {} as Record<string, number>),
        last30Days: {
          totalReports: recentReports[0].count,
          failedReports: failedReports[0].count,
          successRate: recentReports[0].count > 0 
            ? `${(((recentReports[0].count - failedReports[0].count) / recentReports[0].count) * 100).toFixed(1)}%`
            : "N/A",
        },
      },
      upcomingSchedules,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "Failed to fetch statistics" }, 500);
  }
});

export default app;
