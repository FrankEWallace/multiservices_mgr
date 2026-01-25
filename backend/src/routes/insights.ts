import { Hono } from "hono";
import { db } from "../db";
import { revenues, expenses, services, goals, madenis } from "../db/schema";
import { sql, eq, gte, lte, and, desc } from "drizzle-orm";

const app = new Hono();

// ============== HELPER FUNCTIONS ==============

// Get date range for different periods
function getDateRange(period: "day" | "week" | "month" | "quarter" | "year") {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: string;

  switch (period) {
    case "day":
      start = end;
      break;
    case "week":
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      start = weekAgo.toISOString().split("T")[0];
      break;
    case "month":
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      start = monthAgo.toISOString().split("T")[0];
      break;
    case "quarter":
      const quarterAgo = new Date(now);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      start = quarterAgo.toISOString().split("T")[0];
      break;
    case "year":
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      start = yearAgo.toISOString().split("T")[0];
      break;
  }

  return { start, end };
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format percentage
function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

// Calculate percentage change
function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Determine insight severity
type Severity = "critical" | "warning" | "info" | "success";
type Category = "revenue" | "expense" | "profit" | "debt" | "goal" | "service" | "trend" | "anomaly";

interface Insight {
  id: string;
  title: string;
  description: string;
  category: Category;
  severity: Severity;
  metric?: string;
  value?: number | string;
  change?: number;
  recommendation?: string;
  actionUrl?: string;
  timestamp: string;
}

interface Alert {
  id: string;
  type: "threshold" | "anomaly" | "trend" | "deadline" | "reminder";
  title: string;
  message: string;
  severity: Severity;
  triggered: boolean;
  triggeredAt?: string;
  condition: string;
  value?: number | string;
  threshold?: number | string;
}

// ============== AI-GENERATED INSIGHTS ==============
app.get("/insights", async (c) => {
  const period = (c.req.query("period") as "week" | "month" | "quarter") || "month";
  const { start, end } = getDateRange(period);
  
  // Get previous period for comparison
  const prevPeriodDays = period === "week" ? 7 : period === "month" ? 30 : 90;
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - prevPeriodDays);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const insights: Insight[] = [];

  // Fetch current period data
  const [currentRevenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(${revenues.amount}), 0)` })
    .from(revenues)
    .where(and(gte(revenues.date, start), lte(revenues.date, end)));

  const [currentExpenses] = await db
    .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(gte(expenses.date, start), lte(expenses.date, end)));

  // Fetch previous period data
  const [prevRevenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(${revenues.amount}), 0)` })
    .from(revenues)
    .where(and(gte(revenues.date, prevStart.toISOString().split("T")[0]), lte(revenues.date, prevEnd.toISOString().split("T")[0])));

  const [prevExpenses] = await db
    .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(gte(expenses.date, prevStart.toISOString().split("T")[0]), lte(expenses.date, prevEnd.toISOString().split("T")[0])));

  const currentProfit = currentRevenue.total - currentExpenses.total;
  const prevProfit = prevRevenue.total - prevExpenses.total;
  const currentMargin = currentRevenue.total > 0 ? (currentProfit / currentRevenue.total) * 100 : 0;
  const prevMargin = prevRevenue.total > 0 ? (prevProfit / prevRevenue.total) * 100 : 0;

  const revenueChange = percentChange(currentRevenue.total, prevRevenue.total);
  const expenseChange = percentChange(currentExpenses.total, prevExpenses.total);
  const profitChange = percentChange(currentProfit, prevProfit);

  // 1. Revenue Insight
  if (revenueChange > 20) {
    insights.push({
      id: "rev-surge",
      title: "Revenue Surge Detected",
      description: `Revenue has increased by ${formatPercent(revenueChange)} compared to the previous ${period}. Your business is showing strong growth momentum.`,
      category: "revenue",
      severity: "success",
      metric: "Revenue",
      value: formatCurrency(currentRevenue.total),
      change: revenueChange,
      recommendation: "Consider reinvesting profits into scaling operations or marketing to maintain this growth trajectory.",
      actionUrl: "/revenue",
      timestamp: new Date().toISOString(),
    });
  } else if (revenueChange < -20) {
    insights.push({
      id: "rev-decline",
      title: "Revenue Decline Alert",
      description: `Revenue has dropped by ${formatPercent(Math.abs(revenueChange))} compared to the previous ${period}. This requires immediate attention.`,
      category: "revenue",
      severity: "critical",
      metric: "Revenue",
      value: formatCurrency(currentRevenue.total),
      change: revenueChange,
      recommendation: "Analyze which services or products are underperforming. Consider promotional campaigns or customer outreach.",
      actionUrl: "/revenue",
      timestamp: new Date().toISOString(),
    });
  } else if (revenueChange < -5) {
    insights.push({
      id: "rev-slight-decline",
      title: "Slight Revenue Dip",
      description: `Revenue decreased by ${formatPercent(Math.abs(revenueChange))} this ${period}. Monitor closely for trends.`,
      category: "revenue",
      severity: "warning",
      metric: "Revenue",
      value: formatCurrency(currentRevenue.total),
      change: revenueChange,
      recommendation: "Review recent market conditions and competitor activities. Consider customer feedback surveys.",
      actionUrl: "/revenue",
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Expense Insight
  if (expenseChange > 25) {
    insights.push({
      id: "exp-spike",
      title: "Expense Spike Warning",
      description: `Expenses have increased by ${formatPercent(expenseChange)} compared to the previous ${period}. This is significantly higher than expected.`,
      category: "expense",
      severity: expenseChange > 40 ? "critical" : "warning",
      metric: "Expenses",
      value: formatCurrency(currentExpenses.total),
      change: expenseChange,
      recommendation: "Review all expense categories to identify the main drivers. Look for cost optimization opportunities.",
      actionUrl: "/reports",
      timestamp: new Date().toISOString(),
    });
  } else if (expenseChange < -15) {
    insights.push({
      id: "exp-reduction",
      title: "Cost Reduction Success",
      description: `Expenses decreased by ${formatPercent(Math.abs(expenseChange))} this ${period}. Great job on cost management!`,
      category: "expense",
      severity: "success",
      metric: "Expenses",
      value: formatCurrency(currentExpenses.total),
      change: expenseChange,
      recommendation: "Document the cost-saving measures that worked for future reference.",
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Profit Margin Insight
  if (currentMargin < 10 && currentRevenue.total > 0) {
    insights.push({
      id: "margin-low",
      title: "Low Profit Margin",
      description: `Your current profit margin is only ${currentMargin.toFixed(1)}%. This is below healthy business standards.`,
      category: "profit",
      severity: currentMargin < 5 ? "critical" : "warning",
      metric: "Profit Margin",
      value: `${currentMargin.toFixed(1)}%`,
      recommendation: "Focus on reducing variable costs or increasing prices where market allows. Review supplier contracts.",
      actionUrl: "/services",
      timestamp: new Date().toISOString(),
    });
  } else if (currentMargin > 30) {
    insights.push({
      id: "margin-excellent",
      title: "Excellent Profit Margins",
      description: `Your profit margin of ${currentMargin.toFixed(1)}% is outstanding! You're running a highly efficient operation.`,
      category: "profit",
      severity: "success",
      metric: "Profit Margin",
      value: `${currentMargin.toFixed(1)}%`,
      recommendation: "Consider strategic investments in growth areas while maintaining operational efficiency.",
      timestamp: new Date().toISOString(),
    });
  }

  // 4. Profit Trend Insight
  if (profitChange > 30) {
    insights.push({
      id: "profit-growth",
      title: "Strong Profit Growth",
      description: `Profit has grown by ${formatPercent(profitChange)} this ${period}. Your business strategy is paying off.`,
      category: "profit",
      severity: "success",
      metric: "Profit",
      value: formatCurrency(currentProfit),
      change: profitChange,
      timestamp: new Date().toISOString(),
    });
  } else if (profitChange < -30) {
    insights.push({
      id: "profit-decline",
      title: "Significant Profit Decline",
      description: `Profit has dropped by ${formatPercent(Math.abs(profitChange))} compared to the previous ${period}. Urgent review needed.`,
      category: "profit",
      severity: "critical",
      metric: "Profit",
      value: formatCurrency(currentProfit),
      change: profitChange,
      recommendation: "Conduct a detailed P&L analysis. Identify which services are most affected and take corrective action.",
      actionUrl: "/services",
      timestamp: new Date().toISOString(),
    });
  }

  // 5. Service Performance Insights
  const servicePerformance = await db
    .select({
      serviceId: services.id,
      serviceName: services.name,
      revenue: sql<number>`COALESCE(SUM(${revenues.amount}), 0)`,
    })
    .from(services)
    .leftJoin(revenues, and(
      eq(revenues.serviceId, services.id),
      gte(revenues.date, start),
      lte(revenues.date, end)
    ))
    .groupBy(services.id, services.name);

  const topService = servicePerformance.reduce((max, s) => s.revenue > max.revenue ? s : max, servicePerformance[0]);
  const bottomService = servicePerformance.filter(s => s.revenue > 0).reduce((min, s) => s.revenue < min.revenue ? s : min, servicePerformance[0]);

  if (topService && topService.revenue > 0) {
    const percentage = currentRevenue.total > 0 ? ((topService.revenue / currentRevenue.total) * 100).toFixed(1) : 0;
    insights.push({
      id: "top-service",
      title: "Top Performing Service",
      description: `${topService.serviceName} is your best performer, contributing ${percentage}% of total revenue (${formatCurrency(topService.revenue)}).`,
      category: "service",
      severity: "info",
      metric: topService.serviceName,
      value: formatCurrency(topService.revenue),
      recommendation: "Analyze what makes this service successful and apply learnings to other services.",
      actionUrl: `/services`,
      timestamp: new Date().toISOString(),
    });
  }

  if (bottomService && bottomService !== topService && bottomService.revenue > 0 && servicePerformance.length > 1) {
    const percentage = currentRevenue.total > 0 ? ((bottomService.revenue / currentRevenue.total) * 100).toFixed(1) : 0;
    if (Number(percentage) < 5) {
      insights.push({
        id: "underperforming-service",
        title: "Underperforming Service",
        description: `${bottomService.serviceName} contributes only ${percentage}% of revenues. Consider strategies to boost performance or reallocate resources.`,
        category: "service",
        severity: "warning",
        metric: bottomService.serviceName,
        value: formatCurrency(bottomService.revenue),
        recommendation: "Evaluate if this service needs more investment, restructuring, or should be phased out.",
        actionUrl: `/services`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 6. Debt Insights
  const outstandingDebts = await db
    .select({
      totalOwed: sql<number>`COALESCE(SUM(${madenis.originalAmount}), 0)`,
      totalPaid: sql<number>`COALESCE(SUM(${madenis.amountPaid}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(madenis)
    .where(eq(madenis.status, "pending"));

  const overdueDebts = await db
    .select({
      total: sql<number>`COALESCE(SUM(${madenis.originalAmount} - ${madenis.amountPaid}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(madenis)
    .where(and(
      eq(madenis.status, "pending"),
      lte(madenis.dueDate, end)
    ));

  const totalOutstanding = outstandingDebts[0].totalOwed - outstandingDebts[0].totalPaid;
  
  if (overdueDebts[0].count > 0) {
    insights.push({
      id: "overdue-debts",
      title: "Overdue Payments",
      description: `You have ${overdueDebts[0].count} overdue payments totaling ${formatCurrency(overdueDebts[0].total)}. This affects your cash flow.`,
      category: "debt",
      severity: overdueDebts[0].total > currentRevenue.total * 0.1 ? "critical" : "warning",
      metric: "Overdue Amount",
      value: formatCurrency(overdueDebts[0].total),
      recommendation: "Follow up with debtors immediately. Consider offering payment plans or escalating collection efforts.",
      actionUrl: "/madeni",
      timestamp: new Date().toISOString(),
    });
  }

  if (totalOutstanding > currentRevenue.total * 0.5) {
    insights.push({
      id: "high-receivables",
      title: "High Accounts Receivable",
      description: `Outstanding debts (${formatCurrency(totalOutstanding)}) represent over 50% of your ${period}ly revenues. This is a liquidity risk.`,
      category: "debt",
      severity: "warning",
      metric: "Receivables",
      value: formatCurrency(totalOutstanding),
      recommendation: "Implement stricter payment terms for new clients. Consider invoice factoring for immediate cash.",
      actionUrl: "/madeni",
      timestamp: new Date().toISOString(),
    });
  }

  // 7. Goal Insights
  const activeGoals = await db
    .select()
    .from(goals)
    .where(eq(goals.status, "active"));

  for (const goal of activeGoals) {
    const progress = goal.targetAmount > 0 ? ((goal.currentAmount ?? 0) / goal.targetAmount) * 100 : 0;
    const daysRemaining = Math.ceil((new Date(goal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((new Date(goal.endDate).getTime() - new Date(goal.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = totalDays - daysRemaining;
    const expectedProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

    if (daysRemaining <= 7 && progress < 80) {
      insights.push({
        id: `goal-risk-${goal.id}`,
        title: "Goal at Risk",
        description: `"${goal.title}" is only ${progress.toFixed(0)}% complete with ${daysRemaining} days remaining. Unlikely to meet target.`,
        category: "goal",
        severity: "critical",
        metric: goal.title,
        value: `${progress.toFixed(0)}%`,
        recommendation: "Either accelerate efforts or adjust the goal to be more realistic.",
        actionUrl: "/goals",
        timestamp: new Date().toISOString(),
      });
    } else if (progress >= 100) {
      insights.push({
        id: `goal-achieved-${goal.id}`,
        title: "Goal Achieved!",
        description: `Congratulations! You've achieved your goal "${goal.title}" with ${progress.toFixed(0)}% completion.`,
        category: "goal",
        severity: "success",
        metric: goal.title,
        value: `${progress.toFixed(0)}%`,
        recommendation: "Set a new stretch goal to maintain momentum.",
        actionUrl: "/goals",
        timestamp: new Date().toISOString(),
      });
    } else if (progress > expectedProgress + 20) {
      insights.push({
        id: `goal-ahead-${goal.id}`,
        title: "Ahead of Schedule",
        description: `"${goal.title}" is ${(progress - expectedProgress).toFixed(0)}% ahead of schedule. Great progress!`,
        category: "goal",
        severity: "success",
        metric: goal.title,
        value: `${progress.toFixed(0)}%`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Sort insights by severity
  const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, success: 2, info: 3 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return c.json({
    period,
    dateRange: { start, end },
    totalInsights: insights.length,
    bySeverity: {
      critical: insights.filter(i => i.severity === "critical").length,
      warning: insights.filter(i => i.severity === "warning").length,
      success: insights.filter(i => i.severity === "success").length,
      info: insights.filter(i => i.severity === "info").length,
    },
    insights,
  });
});

// ============== PERFORMANCE RECOMMENDATIONS ==============
app.get("/recommendations", async (c) => {
  const { start, end } = getDateRange("month");
  
  interface Recommendation {
    id: string;
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    effort: "high" | "medium" | "low";
    category: Category;
    priority: number;
    expectedBenefit?: string;
    steps?: string[];
  }

  const recommendations: Recommendation[] = [];

  // Fetch financial data
  const [totalRevenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(${revenues.amount}), 0)` })
    .from(revenues)
    .where(and(gte(revenues.date, start), lte(revenues.date, end)));

  const [totalExpenses] = await db
    .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(gte(expenses.date, start), lte(expenses.date, end)));

  const profit = totalRevenue.total - totalExpenses.total;
  const margin = totalRevenue.total > 0 ? (profit / totalRevenue.total) * 100 : 0;

  // Service performance
  const serviceStats = await db
    .select({
      serviceId: services.id,
      serviceName: services.name,
      revenue: sql<number>`COALESCE(SUM(${revenues.amount}), 0)`,
    })
    .from(services)
    .leftJoin(revenues, and(
      eq(revenues.serviceId, services.id),
      gte(revenues.date, start),
      lte(revenues.date, end)
    ))
    .groupBy(services.id, services.name);

  const activeServices = serviceStats.filter(s => s.revenue > 0);
  const inactiveServices = serviceStats.filter(s => s.revenue === 0);

  // Expense categories
  const expenseByCategory = await db
    .select({
      category: expenses.category,
      total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(and(gte(expenses.date, start), lte(expenses.date, end)))
    .groupBy(expenses.category)
    .orderBy(desc(sql`SUM(${expenses.amount})`));

  // Debt data
  const [debtStats] = await db
    .select({
      totalOwed: sql<number>`COALESCE(SUM(${madenis.originalAmount} - ${madenis.amountPaid}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(madenis)
    .where(eq(madenis.status, "pending"));

  // 1. Margin Recommendations
  if (margin < 15) {
    recommendations.push({
      id: "improve-margin",
      title: "Improve Profit Margins",
      description: `Your profit margin of ${margin.toFixed(1)}% is below industry standards. Focus on increasing revenue or reducing costs.`,
      impact: "high",
      effort: "medium",
      category: "profit",
      priority: 1,
      expectedBenefit: "Increasing margin by 5% would add " + formatCurrency(totalRevenue.total * 0.05) + " to profit",
      steps: [
        "Review pricing strategy for all services",
        "Negotiate better rates with suppliers",
        "Identify and eliminate unnecessary expenses",
        "Focus on high-margin services",
      ],
    });
  }

  // 2. Service Diversification
  if (activeServices.length > 0) {
    const topServiceShare = activeServices.length > 0 
      ? (activeServices[0].revenue / totalRevenue.total) * 100 
      : 0;
    
    if (topServiceShare > 60) {
      recommendations.push({
        id: "diversify-services",
        title: "Diversify Revenue Streams",
        description: `${activeServices[0].serviceName} accounts for ${topServiceShare.toFixed(0)}% of revenues. This concentration is risky.`,
        impact: "high",
        effort: "high",
        category: "service",
        priority: 2,
        expectedBenefit: "Reduced business risk and more stable revenue",
        steps: [
          "Identify growth opportunities in other services",
          "Allocate marketing budget to underperforming services",
          "Consider launching complementary services",
          "Analyze why other services aren't performing",
        ],
      });
    }
  }

  // 3. Inactive Services
  if (inactiveServices.length > 0) {
    recommendations.push({
      id: "activate-services",
      title: "Activate Dormant Services",
      description: `You have ${inactiveServices.length} service(s) with no revenue this month: ${inactiveServices.map(s => s.serviceName).join(", ")}`,
      impact: "medium",
      effort: "medium",
      category: "service",
      priority: 3,
      steps: [
        "Evaluate if these services are still viable",
        "Create targeted marketing campaigns",
        "Consider seasonal factors",
        "Decide whether to invest or discontinue",
      ],
    });
  }

  // 4. Expense Optimization
  if (expenseByCategory.length > 0) {
    const topExpense = expenseByCategory[0];
    const expenseShare = totalExpenses.total > 0 ? (topExpense.total / totalExpenses.total) * 100 : 0;
    
    if (expenseShare > 40) {
      recommendations.push({
        id: "reduce-top-expense",
        title: `Optimize ${topExpense.category} Costs`,
        description: `${topExpense.category} expenses represent ${expenseShare.toFixed(0)}% of total costs (${formatCurrency(topExpense.total)}).`,
        impact: "high",
        effort: "medium",
        category: "expense",
        priority: 2,
        expectedBenefit: "10% reduction would save " + formatCurrency(topExpense.total * 0.1),
        steps: [
          "Audit all expenses in this category",
          "Research alternative vendors or solutions",
          "Negotiate volume discounts",
          "Implement approval workflows for large expenses",
        ],
      });
    }
  }

  // 5. Debt Collection
  if (debtStats.totalOwed > totalRevenue.total * 0.2) {
    recommendations.push({
      id: "improve-collections",
      title: "Improve Debt Collection",
      description: `Outstanding receivables (${formatCurrency(debtStats.totalOwed)}) are high relative to revenues.`,
      impact: "high",
      effort: "low",
      category: "debt",
      priority: 1,
      expectedBenefit: "Better cash flow and reduced bad debt risk",
      steps: [
        "Send reminders to all overdue accounts",
        "Offer early payment discounts",
        "Implement stricter payment terms",
        "Consider collection agency for long overdue accounts",
      ],
    });
  }

  // 6. Goal Setting
  const [goalCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(goals)
    .where(eq(goals.status, "active"));

  if (goalCount.count === 0) {
    recommendations.push({
      id: "set-goals",
      title: "Set Business Goals",
      description: "You have no active goals. Setting targets helps drive performance and track progress.",
      impact: "medium",
      effort: "low",
      category: "goal",
      priority: 3,
      steps: [
        "Set monthly revenue targets",
        "Define expense budgets",
        "Create service-specific growth goals",
        "Track progress weekly",
      ],
    });
  }

  // Sort by priority
  recommendations.sort((a, b) => a.priority - b.priority);

  return c.json({
    totalRecommendations: recommendations.length,
    byImpact: {
      high: recommendations.filter(r => r.impact === "high").length,
      medium: recommendations.filter(r => r.impact === "medium").length,
      low: recommendations.filter(r => r.impact === "low").length,
    },
    recommendations,
  });
});

// ============== ALERT TRIGGERS ==============
app.get("/alerts", async (c) => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const { start: weekStart, end: weekEnd } = getDateRange("week");
  const { start: monthStart, end: monthEnd } = getDateRange("month");

  const alerts: Alert[] = [];

  // 1. Revenue Threshold Alerts
  const [dailyRevenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(${revenues.amount}), 0)` })
    .from(revenues)
    .where(eq(revenues.date, today));

  const [avgDailyRevenue] = await db
    .select({ avg: sql<number>`COALESCE(AVG(daily_total), 0)` })
    .from(
      db
        .select({ daily_total: sql<number>`SUM(${revenues.amount})` })
        .from(revenues)
        .where(gte(revenues.date, monthStart))
        .groupBy(revenues.date)
        .as("daily")
    );

  const dailyThreshold = avgDailyRevenue.avg * 0.5;
  if (dailyRevenue.total < dailyThreshold && dailyRevenue.total > 0) {
    alerts.push({
      id: "low-daily-revenue",
      type: "threshold",
      title: "Low Daily Revenue",
      message: `Today's revenue (${formatCurrency(dailyRevenue.total)}) is below 50% of your daily average.`,
      severity: "warning",
      triggered: true,
      triggeredAt: now.toISOString(),
      condition: "Daily revenue < 50% of average",
      value: formatCurrency(dailyRevenue.total),
      threshold: formatCurrency(dailyThreshold),
    });
  }

  // 2. Expense Spike Alert
  const [weeklyExpenses] = await db
    .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(gte(expenses.date, weekStart), lte(expenses.date, weekEnd)));

  const [avgWeeklyExpenses] = await db
    .select({ avg: sql<number>`COALESCE(AVG(weekly_total), 0)` })
    .from(
      db
        .select({ 
          weekly_total: sql<number>`SUM(${expenses.amount})`,
          week: sql`strftime('%W', ${expenses.date})`
        })
        .from(expenses)
        .groupBy(sql`strftime('%W', ${expenses.date})`)
        .as("weekly")
    );

  if (weeklyExpenses.total > avgWeeklyExpenses.avg * 1.5) {
    alerts.push({
      id: "expense-spike",
      type: "anomaly",
      title: "Expense Spike Detected",
      message: `This week's expenses (${formatCurrency(weeklyExpenses.total)}) are 50% above your weekly average.`,
      severity: "warning",
      triggered: true,
      triggeredAt: now.toISOString(),
      condition: "Weekly expenses > 150% of average",
      value: formatCurrency(weeklyExpenses.total),
      threshold: formatCurrency(avgWeeklyExpenses.avg * 1.5),
    });
  }

  // 3. Overdue Debt Alerts
  const overdueDebts = await db
    .select({
      id: madenis.id,
      debtorName: madenis.debtorName,
      originalAmount: madenis.originalAmount,
      amountPaid: madenis.amountPaid,
      dueDate: madenis.dueDate,
    })
    .from(madenis)
    .where(and(
      eq(madenis.status, "pending"),
      lte(madenis.dueDate, today)
    ))
    .limit(5);

  for (const debt of overdueDebts) {
    const daysOverdue = Math.ceil((now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    const outstanding = debt.originalAmount - (debt.amountPaid ?? 0);
    
    alerts.push({
      id: `overdue-${debt.id}`,
      type: "deadline",
      title: "Payment Overdue",
      message: `${debt.debtorName} owes ${formatCurrency(outstanding)} - ${daysOverdue} days overdue`,
      severity: daysOverdue > 30 ? "critical" : "warning",
      triggered: true,
      triggeredAt: now.toISOString(),
      condition: `Due date passed (${debt.dueDate})`,
      value: formatCurrency(outstanding),
    });
  }

  // 4. Goal Deadline Alerts
  const upcomingGoals = await db
    .select()
    .from(goals)
    .where(and(
      eq(goals.status, "active"),
      lte(goals.endDate, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    ));

  for (const goal of upcomingGoals) {
    const progress = goal.targetAmount > 0 ? ((goal.currentAmount ?? 0) / goal.targetAmount) * 100 : 0;
    const daysLeft = Math.ceil((new Date(goal.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (progress < 80) {
      alerts.push({
        id: `goal-deadline-${goal.id}`,
        type: "deadline",
        title: "Goal Deadline Approaching",
        message: `"${goal.title}" is at ${progress.toFixed(0)}% with ${daysLeft} days remaining`,
        severity: progress < 50 ? "critical" : "warning",
        triggered: true,
        triggeredAt: now.toISOString(),
        condition: `Goal ending on ${goal.endDate}`,
        value: `${progress.toFixed(0)}%`,
        threshold: "100%",
      });
    }
  }

  // 5. Cash Flow Alert (if expenses approaching revenue)
  const [monthlyRevenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(${revenues.amount}), 0)` })
    .from(revenues)
    .where(and(gte(revenues.date, monthStart), lte(revenues.date, monthEnd)));

  const [monthlyExpenses] = await db
    .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(gte(expenses.date, monthStart), lte(expenses.date, monthEnd)));

  if (monthlyExpenses.total > monthlyRevenue.total * 0.9 && monthlyRevenue.total > 0) {
    alerts.push({
      id: "cash-flow-warning",
      type: "threshold",
      title: "Cash Flow Warning",
      message: `Expenses (${formatCurrency(monthlyExpenses.total)}) are approaching revenue (${formatCurrency(monthlyRevenue.total)}). Profit margins are thin.`,
      severity: monthlyExpenses.total > monthlyRevenue.total ? "critical" : "warning",
      triggered: true,
      triggeredAt: now.toISOString(),
      condition: "Expenses > 90% of revenue",
      value: formatCurrency(monthlyExpenses.total),
      threshold: formatCurrency(monthlyRevenue.total * 0.9),
    });
  }

  // Sort by severity
  const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2, success: 3 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return c.json({
    totalAlerts: alerts.length,
    bySeverity: {
      critical: alerts.filter(a => a.severity === "critical").length,
      warning: alerts.filter(a => a.severity === "warning").length,
      info: alerts.filter(a => a.severity === "info").length,
    },
    byType: {
      threshold: alerts.filter(a => a.type === "threshold").length,
      anomaly: alerts.filter(a => a.type === "anomaly").length,
      deadline: alerts.filter(a => a.type === "deadline").length,
      reminder: alerts.filter(a => a.type === "reminder").length,
    },
    alerts,
  });
});

// ============== WEEKLY SUMMARY ==============
app.get("/weekly-summary", async (c) => {
  const now = new Date();
  const { start, end } = getDateRange("week");
  
  // Previous week for comparison
  const prevWeekEnd = new Date(start);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
  const prevWeekStart = new Date(prevWeekEnd);
  prevWeekStart.setDate(prevWeekStart.getDate() - 6);

  // Current week metrics
  const [currentRevenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(${revenues.amount}), 0)` })
    .from(revenues)
    .where(and(gte(revenues.date, start), lte(revenues.date, end)));

  const [currentExpenses] = await db
    .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(gte(expenses.date, start), lte(expenses.date, end)));

  // Previous week metrics
  const [prevRevenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(${revenues.amount}), 0)` })
    .from(revenues)
    .where(and(
      gte(revenues.date, prevWeekStart.toISOString().split("T")[0]),
      lte(revenues.date, prevWeekEnd.toISOString().split("T")[0])
    ));

  const [prevExpenses] = await db
    .select({ total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(
      gte(expenses.date, prevWeekStart.toISOString().split("T")[0]),
      lte(revenues.date, prevWeekEnd.toISOString().split("T")[0])
    ));

  const currentProfit = currentRevenue.total - currentExpenses.total;
  const prevProfit = prevRevenue.total - prevExpenses.total;

  // Daily breakdown
  const dailyRevenue = await db
    .select({
      date: revenues.date,
      total: sql<number>`COALESCE(SUM(${revenues.amount}), 0)`,
    })
    .from(revenues)
    .where(and(gte(revenues.date, start), lte(revenues.date, end)))
    .groupBy(revenues.date)
    .orderBy(revenues.date);

  const dailyExpenses = await db
    .select({
      date: expenses.date,
      total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(and(gte(expenses.date, start), lte(expenses.date, end)))
    .groupBy(expenses.date)
    .orderBy(expenses.date);

  // Service breakdown
  const serviceBreakdown = await db
    .select({
      serviceName: services.name,
      serviceColor: services.color,
      revenue: sql<number>`COALESCE(SUM(${revenues.amount}), 0)`,
    })
    .from(services)
    .leftJoin(revenues, and(
      eq(revenues.serviceId, services.id),
      gte(revenues.date, start),
      lte(revenues.date, end)
    ))
    .groupBy(services.id, services.name, services.color)
    .orderBy(desc(sql`SUM(${revenues.amount})`));

  // Top transactions
  const topRevenue = await db
    .select({
      amount: revenues.amount,
      description: revenues.description,
      date: revenues.date,
      serviceName: services.name,
    })
    .from(revenues)
    .leftJoin(services, eq(revenues.serviceId, services.id))
    .where(and(gte(revenues.date, start), lte(revenues.date, end)))
    .orderBy(desc(revenues.amount))
    .limit(5);

  const topExpenses = await db
    .select({
      amount: expenses.amount,
      description: expenses.description,
      category: expenses.category,
      date: expenses.date,
    })
    .from(expenses)
    .where(and(gte(expenses.date, start), lte(expenses.date, end)))
    .orderBy(desc(expenses.amount))
    .limit(5);

  // Goals progress
  const goalsProgress = await db
    .select({
      name: goals.title,
      currentValue: goals.currentAmount,
      targetValue: goals.targetAmount,
      type: goals.period,
    })
    .from(goals)
    .where(eq(goals.status, "active"))
    .limit(5);

  // Debt collections this week
  const [debtCollections] = await db
    .select({
      collected: sql<number>`COALESCE(SUM(${madenis.amountPaid}), 0)`,
    })
    .from(madenis)
    .where(and(
      gte(madenis.updatedAt, start),
      lte(madenis.updatedAt, end)
    ));

  // Generate summary text
  const revenueChange = percentChange(currentRevenue.total, prevRevenue.total);
  const profitChange = percentChange(currentProfit, prevProfit);
  const margin = currentRevenue.total > 0 ? (currentProfit / currentRevenue.total) * 100 : 0;

  const highlights: string[] = [];
  
  if (revenueChange > 10) {
    highlights.push(`Revenue grew ${revenueChange.toFixed(1)}% compared to last week`);
  } else if (revenueChange < -10) {
    highlights.push(`Revenue declined ${Math.abs(revenueChange).toFixed(1)}% from last week`);
  }

  if (profitChange > 15) {
    highlights.push(`Profit increased by ${profitChange.toFixed(1)}%`);
  } else if (profitChange < -15) {
    highlights.push(`Profit decreased by ${Math.abs(profitChange).toFixed(1)}%`);
  }

  if (serviceBreakdown[0]?.revenue > 0) {
    const topShare = ((serviceBreakdown[0].revenue / currentRevenue.total) * 100).toFixed(0);
    highlights.push(`${serviceBreakdown[0].serviceName} was the top performer with ${topShare}% of revenue`);
  }

  const bestDay = dailyRevenue.reduce((max, d) => d.total > max.total ? d : max, dailyRevenue[0] || { date: "", total: 0 });
  if (bestDay.date) {
    highlights.push(`Best day: ${new Date(bestDay.date).toLocaleDateString("en-US", { weekday: "long" })} with ${formatCurrency(bestDay.total)}`);
  }

  return c.json({
    period: {
      start,
      end,
      weekNumber: Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
    },
    summary: {
      revenue: {
        current: currentRevenue.total,
        previous: prevRevenue.total,
        change: revenueChange,
        formatted: formatCurrency(currentRevenue.total),
      },
      expenses: {
        current: currentExpenses.total,
        previous: prevExpenses.total,
        change: percentChange(currentExpenses.total, prevExpenses.total),
        formatted: formatCurrency(currentExpenses.total),
      },
      profit: {
        current: currentProfit,
        previous: prevProfit,
        change: profitChange,
        formatted: formatCurrency(currentProfit),
        margin: margin,
      },
      debtCollected: {
        amount: debtCollections.collected,
        formatted: formatCurrency(debtCollections.collected),
      },
    },
    dailyBreakdown: {
      revenue: dailyRevenue.map(d => ({
        date: d.date,
        dayName: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
        amount: d.total,
      })),
      expenses: dailyExpenses.map(d => ({
        date: d.date,
        dayName: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
        amount: d.total,
      })),
    },
    servicePerformance: serviceBreakdown.map(s => ({
      name: s.serviceName,
      color: s.serviceColor,
      revenue: s.revenue,
      share: currentRevenue.total > 0 ? ((s.revenue / currentRevenue.total) * 100).toFixed(1) : 0,
    })),
    topTransactions: {
      revenue: topRevenue.map(r => ({
        amount: r.amount,
        description: r.description,
        date: r.date,
        service: r.serviceName,
      })),
      expenses: topExpenses.map(e => ({
        amount: e.amount,
        description: e.description,
        category: e.category,
        date: e.date,
      })),
    },
    goalsProgress: goalsProgress.map(g => ({
      name: g.name,
      progress: g.targetValue > 0 ? (((g.currentValue ?? 0) / g.targetValue) * 100).toFixed(0) : 0,
      type: g.type,
    })),
    highlights,
    generatedAt: now.toISOString(),
  });
});

export default app;
