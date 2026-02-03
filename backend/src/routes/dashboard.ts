import { Hono } from "hono";
import { db } from "../db";
import { services, revenues, expenses, madenis, goals, entries } from "../db/schema";
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

  // Current month revenue (from both revenues and entries tables)
  const currentMonthRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(gte(revenues.date, startOfMonth));
  
  const currentMonthEntriesIncomeResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(and(eq(entries.type, "income"), gte(entries.date, startOfMonth)));
  
  const currentMonthRevenue = {
    total: (Number(currentMonthRevenueResult[0]?.total) || 0) + (Number(currentMonthEntriesIncomeResult[0]?.total) || 0)
  };

  // Last month revenue (from both revenues and entries tables)
  const lastMonthRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(and(gte(revenues.date, lastMonthStart), lte(revenues.date, lastMonthEnd)));
  
  const lastMonthEntriesIncomeResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(and(eq(entries.type, "income"), gte(entries.date, lastMonthStart), lte(entries.date, lastMonthEnd)));
  
  const lastMonthRevenue = {
    total: (Number(lastMonthRevenueResult[0]?.total) || 0) + (Number(lastMonthEntriesIncomeResult[0]?.total) || 0)
  };

  // Current month expenses (from both expenses and entries tables)
  const currentMonthExpensesResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(gte(expenses.date, startOfMonth));
  
  const currentMonthEntriesExpenseResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(and(eq(entries.type, "expense"), gte(entries.date, startOfMonth)));
  
  const currentMonthExpenses = {
    total: (Number(currentMonthExpensesResult[0]?.total) || 0) + (Number(currentMonthEntriesExpenseResult[0]?.total) || 0)
  };

  // Last month expenses (from both expenses and entries tables)
  const lastMonthExpensesResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(and(gte(expenses.date, lastMonthStart), lte(expenses.date, lastMonthEnd)));
  
  const lastMonthEntriesExpenseResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(and(eq(entries.type, "expense"), gte(entries.date, lastMonthStart), lte(entries.date, lastMonthEnd)));
  
  const lastMonthExpenses = {
    total: (Number(lastMonthExpensesResult[0]?.total) || 0) + (Number(lastMonthEntriesExpenseResult[0]?.total) || 0)
  };

  // Outstanding madeni
  const outstandingMadeniResult = await db
    .select({ total: sum(madenis.balance) })
    .from(madenis)
    .where(sql`${madenis.status} != 'paid'`);
  const outstandingMadeni = outstandingMadeniResult[0];

  // Today's revenue (cash collected from both revenues and entries)
  const todayRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(eq(revenues.date, today));
  
  const todayEntriesIncomeResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(and(eq(entries.type, "income"), eq(entries.date, today)));
  
  const todayRevenue = {
    total: (Number(todayRevenueResult[0]?.total) || 0) + (Number(todayEntriesIncomeResult[0]?.total) || 0)
  };

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

  // Get revenue from revenues table
  const chartData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', ${revenues.date}) as month,
      SUM(${revenues.amount}) as revenue
    FROM ${revenues}
    WHERE ${revenues.date} >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', ${revenues.date})
    ORDER BY month ASC
  `);

  // Get income from entries table
  const entriesIncomeData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', ${entries.date}) as month,
      SUM(${entries.amount}) as revenue
    FROM ${entries}
    WHERE ${entries.date} >= date('now', '-12 months')
      AND ${entries.type} = 'income'
    GROUP BY strftime('%Y-%m', ${entries.date})
    ORDER BY month ASC
  `);

  // Get expenses for the same period (from both tables)
  const expenseData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', ${expenses.date}) as month,
      SUM(${expenses.amount}) as expenses
    FROM ${expenses}
    WHERE ${expenses.date} >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', ${expenses.date})
    ORDER BY month ASC
  `);

  const entriesExpenseData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', ${entries.date}) as month,
      SUM(${entries.amount}) as expenses
    FROM ${entries}
    WHERE ${entries.date} >= date('now', '-12 months')
      AND ${entries.type} = 'expense'
    GROUP BY strftime('%Y-%m', ${entries.date})
    ORDER BY month ASC
  `);

  // Merge all data sources
  const revenueMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();

  // Add revenues from revenues table
  chartData.forEach((r: any) => {
    revenueMap.set(r.month, (revenueMap.get(r.month) || 0) + (r.revenue || 0));
  });

  // Add income from entries table
  entriesIncomeData.forEach((r: any) => {
    revenueMap.set(r.month, (revenueMap.get(r.month) || 0) + (r.revenue || 0));
  });

  // Add expenses from expenses table
  expenseData.forEach((e: any) => {
    expenseMap.set(e.month, (expenseMap.get(e.month) || 0) + (e.expenses || 0));
  });

  // Add expenses from entries table
  entriesExpenseData.forEach((e: any) => {
    expenseMap.set(e.month, (expenseMap.get(e.month) || 0) + (e.expenses || 0));
  });

  // Create merged result
  const allMonths = new Set([...revenueMap.keys(), ...expenseMap.keys()]);
  const merged = Array.from(allMonths).sort().map((month) => ({
    month,
    revenue: Math.round(revenueMap.get(month) || 0),
    expenses: Math.round(expenseMap.get(month) || 0),
    profit: Math.round((revenueMap.get(month) || 0) - (expenseMap.get(month) || 0)),
  }));

  return c.json({ chartData: merged });
});

// Get service comparison
dashboard.get("/service-comparison", async (c) => {
  const startOfMonth = new Date().toISOString().slice(0, 7) + "-01";

  // Get revenue from both revenues table and entries table (unified system)
  const comparison = await db.all(sql`
    SELECT 
      s.id,
      s.name,
      s.color,
      s.monthly_target as target,
      COALESCE(SUM(r.amount), 0) + COALESCE(SUM(e.amount), 0) as actual
    FROM ${services} s
    LEFT JOIN ${revenues} r ON r.service_id = s.id AND r.date >= ${startOfMonth}
    LEFT JOIN ${entries} e ON e.service_id = s.id AND e.type = 'income' AND e.date >= ${startOfMonth}
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

// Get comparison data (MoM, YoY, WoW)
dashboard.get("/comparison", async (c) => {
  const { period = "mom" } = c.req.query();
  
  let currentStart: string;
  let currentEnd: string;
  let previousStart: string;
  let previousEnd: string;
  
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  
  if (period === "wow") {
    // Week over Week
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
    
    currentStart = startOfThisWeek.toISOString().split("T")[0];
    currentEnd = today;
    previousStart = startOfLastWeek.toISOString().split("T")[0];
    previousEnd = endOfLastWeek.toISOString().split("T")[0];
  } else if (period === "yoy") {
    // Year over Year
    const startOfThisYear = `${now.getFullYear()}-01-01`;
    const startOfLastYear = `${now.getFullYear() - 1}-01-01`;
    const endOfLastYear = `${now.getFullYear() - 1}-12-31`;
    
    currentStart = startOfThisYear;
    currentEnd = today;
    previousStart = startOfLastYear;
    previousEnd = endOfLastYear;
  } else {
    // Month over Month (default)
    const startOfThisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfLastMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;
    const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split("T")[0];
    
    currentStart = startOfThisMonth;
    currentEnd = today;
    previousStart = startOfLastMonth;
    previousEnd = endOfLastMonth;
  }
  
  // Current period revenue
  const currentRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(and(gte(revenues.date, currentStart), lte(revenues.date, currentEnd)));
  
  // Previous period revenue
  const previousRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(and(gte(revenues.date, previousStart), lte(revenues.date, previousEnd)));
  
  // Current period expenses
  const currentExpensesResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(and(gte(expenses.date, currentStart), lte(expenses.date, currentEnd)));
  
  // Previous period expenses
  const previousExpensesResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(and(gte(expenses.date, previousStart), lte(expenses.date, previousEnd)));
  
  // Current period transactions count
  const currentTxCount = await db
    .select({ count: sql`COUNT(*)` })
    .from(revenues)
    .where(and(gte(revenues.date, currentStart), lte(revenues.date, currentEnd)));
  
  // Previous period transactions count
  const previousTxCount = await db
    .select({ count: sql`COUNT(*)` })
    .from(revenues)
    .where(and(gte(revenues.date, previousStart), lte(revenues.date, previousEnd)));
  
  // Calculate values
  const currentRevenue = Number(currentRevenueResult[0]?.total) || 0;
  const previousRevenue = Number(previousRevenueResult[0]?.total) || 0;
  const currentExpense = Number(currentExpensesResult[0]?.total) || 0;
  const previousExpense = Number(previousExpensesResult[0]?.total) || 0;
  const currentProfit = currentRevenue - currentExpense;
  const previousProfit = previousRevenue - previousExpense;
  const currentCount = Number(currentTxCount[0]?.count) || 0;
  const previousCount = Number(previousTxCount[0]?.count) || 0;
  
  const calcChange = (current: number, previous: number) => 
    previous !== 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
  
  return c.json({
    period,
    dateRange: {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd },
    },
    comparison: [
      {
        label: "Revenue",
        current: currentRevenue,
        previous: previousRevenue,
        change: currentRevenue - previousRevenue,
        changePercent: calcChange(currentRevenue, previousRevenue),
      },
      {
        label: "Expenses",
        current: currentExpense,
        previous: previousExpense,
        change: currentExpense - previousExpense,
        changePercent: calcChange(currentExpense, previousExpense),
      },
      {
        label: "Profit",
        current: currentProfit,
        previous: previousProfit,
        change: currentProfit - previousProfit,
        changePercent: calcChange(currentProfit, previousProfit),
      },
      {
        label: "Transactions",
        current: currentCount,
        previous: previousCount,
        change: currentCount - previousCount,
        changePercent: calcChange(currentCount, previousCount),
      },
    ],
  });
});

export default dashboard;
