import { Hono } from "hono";
import { db } from "../db";
import { services, revenues, expenses, madenis, goals } from "../db/schema";
import { sql, eq, gte, lte, and, desc, sum } from "drizzle-orm";

const dashboard = new Hono();

// Get KPIs
dashboard.get("/kpis", async (c) => {
  const today = new Date().toISOString().split("T")[0];
  const startOfMonth = today.slice(0, 7) + "-01";
  const startOfYear = today.slice(0, 4) + "-01-01";

  // Get last month dates for comparison
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStart = lastMonth.toISOString().slice(0, 7) + "-01";
  const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Current month revenue
  const currentMonthRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(gte(revenues.date, startOfMonth));
  const currentMonthRevenue = currentMonthRevenueResult[0];

  // Last month revenue
  const lastMonthRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(and(gte(revenues.date, lastMonthStart), lte(revenues.date, lastMonthEnd)));
  const lastMonthRevenue = lastMonthRevenueResult[0];

  // Current month expenses
  const currentMonthExpensesResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(gte(expenses.date, startOfMonth));
  const currentMonthExpenses = currentMonthExpensesResult[0];

  // Last month expenses
  const lastMonthExpensesResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(and(gte(expenses.date, lastMonthStart), lte(expenses.date, lastMonthEnd)));
  const lastMonthExpenses = lastMonthExpensesResult[0];

  // Outstanding madeni
  const outstandingMadeniResult = await db
    .select({ total: sum(madenis.balance) })
    .from(madenis)
    .where(sql`${madenis.status} != 'paid'`);
  const outstandingMadeni = outstandingMadeniResult[0];

  // Today's revenue (cash collected)
  const todayRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(eq(revenues.date, today));
  const todayRevenue = todayRevenueResult[0];

  // Calculate values
  const totalRevenue = Number(currentMonthRevenue?.total) || 0;
  const totalExpenses = Number(currentMonthExpenses?.total) || 0;
  const totalProfit = totalRevenue - totalExpenses;
  const lastRevenue = Number(lastMonthRevenue?.total) || 1;
  const lastExpensesVal = Number(lastMonthExpenses?.total) || 1;
  const lastProfit = lastRevenue - lastExpensesVal;

  // Revenue change %
  const revenueChange = ((totalRevenue - lastRevenue) / lastRevenue) * 100;
  const profitChange = ((totalProfit - lastProfit) / Math.abs(lastProfit || 1)) * 100;

  // Daily goal progress
  const allServices = await db.select().from(services).where(eq(services.isActive, true));
  const totalDailyTarget = allServices.reduce((sum, s) => sum + (s.dailyTarget || 0), 0);
  const todayTotal = Number(todayRevenue?.total) || 0;
  const dailyGoalProgress = totalDailyTarget > 0 ? (todayTotal / totalDailyTarget) * 100 : 0;

  return c.json({
    kpis: [
      {
        title: "Total Revenue",
        value: totalRevenue,
        formattedValue: `$${totalRevenue.toLocaleString()}`,
        change: Math.round(revenueChange * 10) / 10,
        icon: "dollar-sign",
        variant: revenueChange >= 0 ? "success" : "danger",
      },
      {
        title: "Total Profit",
        value: totalProfit,
        formattedValue: `$${totalProfit.toLocaleString()}`,
        change: Math.round(profitChange * 10) / 10,
        icon: "trending-up",
        variant: profitChange >= 0 ? "success" : "danger",
      },
      {
        title: "Outstanding Debt",
        value: Number(outstandingMadeni?.total) || 0,
        formattedValue: `$${(Number(outstandingMadeni?.total) || 0).toLocaleString()}`,
        change: 0,
        icon: "credit-card",
        variant: "warning",
      },
      {
        title: "Daily Goal",
        value: dailyGoalProgress,
        formattedValue: `${Math.round(dailyGoalProgress)}%`,
        change: 0,
        icon: "target",
        variant: dailyGoalProgress >= 80 ? "success" : "warning",
      },
    ],
  });
});

// Get revenue chart data
dashboard.get("/revenue-chart", async (c) => {
  const { period = "12months" } = c.req.query();

  const chartData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', ${revenues.date}) as month,
      SUM(${revenues.amount}) as revenue
    FROM ${revenues}
    WHERE ${revenues.date} >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', ${revenues.date})
    ORDER BY month ASC
  `);

  // Get expenses for the same period
  const expenseData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', ${expenses.date}) as month,
      SUM(${expenses.amount}) as expenses
    FROM ${expenses}
    WHERE ${expenses.date} >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', ${expenses.date})
    ORDER BY month ASC
  `);

  // Merge data
  const expenseMap = new Map(expenseData.map((e: any) => [e.month, e.expenses]));
  const merged = chartData.map((r: any) => ({
    month: r.month,
    revenue: Math.round(r.revenue),
    expenses: Math.round(expenseMap.get(r.month) || 0),
    profit: Math.round(r.revenue - (expenseMap.get(r.month) || 0)),
  }));

  return c.json({ chartData: merged });
});

// Get service comparison
dashboard.get("/service-comparison", async (c) => {
  const startOfMonth = new Date().toISOString().slice(0, 7) + "-01";

  const comparison = await db.all(sql`
    SELECT 
      s.id,
      s.name,
      s.color,
      s.monthly_target as target,
      COALESCE(SUM(r.amount), 0) as actual
    FROM ${services} s
    LEFT JOIN ${revenues} r ON r.service_id = s.id AND r.date >= ${startOfMonth}
    WHERE s.is_active = 1
    GROUP BY s.id
    ORDER BY actual DESC
  `);

  return c.json({
    comparison: comparison.map((s: any) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      target: s.target || 0,
      actual: Math.round(s.actual),
      progress: s.target > 0 ? Math.round((s.actual / s.target) * 100) : 0,
    })),
  });
});

// Get quick insights
dashboard.get("/insights", async (c) => {
  const insights: Array<{ type: string; title: string; description: string; value?: number }> = [];

  // Best performing service this month
  const startOfMonth = new Date().toISOString().slice(0, 7) + "-01";
  const bestService = await db.all(sql`
    SELECT s.name, SUM(r.amount) as revenue
    FROM ${services} s
    JOIN ${revenues} r ON r.service_id = s.id
    WHERE r.date >= ${startOfMonth}
    GROUP BY s.id
    ORDER BY revenue DESC
    LIMIT 1
  `);

  if (bestService.length > 0) {
    const best: any = bestService[0];
    insights.push({
      type: "success",
      title: "Top Performer",
      description: `${best.name} is leading with $${Math.round(best.revenue).toLocaleString()} this month`,
      value: best.revenue,
    });
  }

  // Overdue madeni
  const today = new Date().toISOString().split("T")[0];
  const overdueMadenis = await db
    .select()
    .from(madenis)
    .where(and(sql`${madenis.dueDate} < ${today}`, sql`${madenis.status} != 'paid'`));

  if (overdueMadenis.length > 0) {
    const totalOverdue = overdueMadenis.reduce((sum, m) => sum + m.balance, 0);
    insights.push({
      type: "warning",
      title: "Overdue Payments",
      description: `${overdueMadenis.length} overdue debts totaling $${totalOverdue.toLocaleString()}`,
      value: totalOverdue,
    });
  }

  // Goal progress
  const activeGoals = await db.select().from(goals).where(eq(goals.status, "active"));
  const completedGoals = activeGoals.filter((g) => (g.currentAmount || 0) >= g.targetAmount);

  if (activeGoals.length > 0) {
    insights.push({
      type: "info",
      title: "Goal Progress",
      description: `${completedGoals.length} of ${activeGoals.length} goals completed this period`,
    });
  }

  return c.json({ insights });
});

// Get debt summary
dashboard.get("/debt-summary", async (c) => {
  const today = new Date().toISOString().split("T")[0];

  const allDebts = await db.select().from(madenis).where(sql`${madenis.status} != 'paid'`);

  const summary = {
    total: allDebts.reduce((sum, m) => sum + m.balance, 0),
    count: allDebts.length,
    overdue: allDebts.filter((m) => m.dueDate && m.dueDate < today).length,
    dueSoon: allDebts.filter((m) => {
      if (!m.dueDate) return false;
      const dueDate = new Date(m.dueDate);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return dueDate >= new Date(today) && dueDate <= weekFromNow;
    }).length,
  };

  return c.json({ summary });
});

// Keep old endpoint for backwards compatibility
dashboard.get("/madeni-summary", async (c) => {
  const today = new Date().toISOString().split("T")[0];

  const allDebts = await db.select().from(madenis).where(sql`${madenis.status} != 'paid'`);

  const summary = {
    total: allDebts.reduce((sum, m) => sum + m.balance, 0),
    count: allDebts.length,
    overdue: allDebts.filter((m) => m.dueDate && m.dueDate < today).length,
    dueSoon: allDebts.filter((m) => {
      if (!m.dueDate) return false;
      const dueDate = new Date(m.dueDate);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return dueDate >= new Date(today) && dueDate <= weekFromNow;
    }).length,
  };

  return c.json({ summary });
});

// Get goal progress
dashboard.get("/goal-progress", async (c) => {
  const activeGoals = await db
    .select()
    .from(goals)
    .where(eq(goals.status, "active"))
    .orderBy(desc(goals.createdAt));

  const goalsWithProgress = activeGoals.map((goal) => ({
    ...goal,
    progress: goal.targetAmount > 0 ? Math.round(((goal.currentAmount || 0) / goal.targetAmount) * 100) : 0,
  }));

  return c.json({ goals: goalsWithProgress });
});

export default dashboard;
