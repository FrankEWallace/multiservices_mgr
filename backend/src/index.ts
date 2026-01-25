import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";

// Import middleware
import { securityHeaders, removeSensitiveHeaders } from "./middleware/security";
import { apiRateLimiter, authRateLimiter } from "./middleware/rate-limit";

// Import routes
import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboard";
import servicesRoutes from "./routes/services";
import revenueRoutes from "./routes/revenue";
import expensesRoutes from "./routes/expenses";
import debtsRoutes from "./routes/debts";
import goalsRoutes from "./routes/goals";
import settingsRoutes from "./routes/settings";
import analyticsRoutes from "./routes/analytics";
import forecastingRoutes from "./routes/forecasting";
import insightsRoutes from "./routes/insights";
import reportsRoutes from "./routes/reports";
import scheduledReportsRoutes from "./routes/scheduled-reports";

const app = new Hono();

// Logging (first for debugging)
app.use("*", logger());

// CORS configuration - MUST be before other middleware to handle preflight
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:8080", "http://localhost:5173", "http://localhost:8082"];

app.use(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    maxAge: 86400, // 24 hours
  })
);

// Security middleware (after CORS)
app.use("*", securityHeaders());
app.use("*", removeSensitiveHeaders());

// Rate limiting for auth endpoints
app.use("/api/auth/*", authRateLimiter);

// Rate limiting for all other API endpoints
app.use("/api/*", apiRateLimiter);

// Health check
app.get("/", (c) => {
  return c.json({
    name: "Meilleur Insights API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.route("/api/auth", authRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/services", servicesRoutes);
app.route("/api/revenue", revenueRoutes);
app.route("/api/expenses", expensesRoutes);
app.route("/api/debts", debtsRoutes);
app.route("/api/goals", goalsRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/analytics", analyticsRoutes);
app.route("/api/forecasting", forecastingRoutes);
app.route("/api/insights", insightsRoutes);
app.route("/api/reports", reportsRoutes);
app.route("/api/scheduled-reports", scheduledReportsRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Error:", err);
  return c.json({ error: err.message || "Internal Server Error" }, 500);
});

const port = Number(process.env.PORT) || 3000;

console.log(`🚀 Server running at http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
