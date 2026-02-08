import { Hono } from "hono";
import { db } from "../db";
import { services, revenues, expenses, madenis, goals, entries } from "../db/schema";
import { sql, eq, gte, lte, and, desc, sum } from "drizzle-orm";
import { buildRevenueConditions, buildEntriesConditions, buildExpensesConditions } from "../utils/filter-helpers";

const dashboard = new Hono();

// Get KPIs
dashboard.get("/kpis", async (c) => {
  // Get filter parameters
  const serviceId = c.req.query('serviceId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  
  const today = new Date().toISOString().split("T")[0];
  const currentStartDate = startDate || (today.slice(0, 7) + "-01");
  const currentEndDate = endDate || today;
  const startOfMonth = today.slice(0, 7) + "-01";
  const startOfYear = today.slice(0, 4) + "-01-01";

  // Get last month dates for comparison
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStart = lastMonth.toISOString().slice(0, 7) + "-01";
  const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Current period revenue (from both revenues and entries tables)
  const currentRevFilters = { serviceId, startDate: currentStartDate, endDate: currentEndDate };
  
  const currentMonthRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(buildRevenueConditions(currentRevFilters));
  
  const currentMonthEntriesIncomeResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(buildEntriesConditions({ ...currentRevFilters, type: 'income' }));
  
  const currentMonthRevenue = {
    total: (Number(currentMonthRevenueResult[0]?.total) || 0) + (Number(currentMonthEntriesIncomeResult[0]?.total) || 0)
  };

  // Last month revenue (from both revenues and entries tables)
  const lastRevFilters = { serviceId, startDate: lastMonthStart, endDate: lastMonthEnd };
  
  const lastMonthRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(buildRevenueConditions(lastRevFilters));
  
  const lastMonthEntriesIncomeResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(buildEntriesConditions({ ...lastRevFilters, type: 'income' }));
  
  const lastMonthRevenue = {
    total: (Number(lastMonthRevenueResult[0]?.total) || 0) + (Number(lastMonthEntriesIncomeResult[0]?.total) || 0)
  };

  // Current period expenses (from both expenses and entries tables)
  const currentMonthExpensesResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(buildExpensesConditions(currentRevFilters));
  
  const currentMonthEntriesExpenseResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(buildEntriesConditions({ ...currentRevFilters, type: 'expense' }));
  
  const currentMonthExpenses = {
    total: (Number(currentMonthExpensesResult[0]?.total) || 0) + (Number(currentMonthEntriesExpenseResult[0]?.total) || 0)
  };

  // Last month expenses (from both expenses and entries tables)
  const lastMonthExpensesResult = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(buildExpensesConditions(lastRevFilters));
  
  const lastMonthEntriesExpenseResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(buildEntriesConditions({ ...lastRevFilters, type: 'expense' }));
  
  const lastMonthExpenses = {
    total: (Number(lastMonthExpensesResult[0]?.total) || 0) + (Number(lastMonthEntriesExpenseResult[0]?.total) || 0)
  };

  // Outstanding madeni (not affected by service filter)
  const outstandingMadeniResult = await db
    .select({ total: sum(madenis.balance) })
    .from(madenis)
    .where(sql`${madenis.status} != 'paid'`);
  const outstandingMadeni = outstandingMadeniResult[0];

  // Today's revenue (cash collected from both revenues and entries)
  const todayFilters = { serviceId, startDate: today, endDate: today };
  
  const todayRevenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(buildRevenueConditions(todayFilters));
  
  const todayEntriesIncomeResult = await db
    .select({ total: sum(entries.amount) })
    .from(entries)
    .where(buildEntriesConditions({ ...todayFilters, type: 'income' }));
  
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
  const serviceFilter = serviceId ? eq(services.id, Number(serviceId)) : eq(services.isActive, true);
  const allServices = await db.select().from(services).where(serviceFilter);
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
  const serviceId = c.req.query('serviceId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  // Calculate date range (default to last 12 months)
  const dateRangeStart = startDate || new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split('T')[0];
  const dateRangeEnd = endDate || new Date().toISOString().split('T')[0];

  // Build WHERE conditions for SQL queries
  const serviceFilter = serviceId ? `AND service_id = ${Number(serviceId)}` : '';

  // Get revenue from revenues table
  const chartData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', ${revenues.date}) as month,
      SUM(${revenues.amount}) as revenue
    FROM ${revenues}
    WHERE ${revenues.date} >= ${dateRangeStart}
      AND ${revenues.date} <= ${dateRangeEnd}
      ${sql.raw(serviceFilter)}
    GROUP BY strftime('%Y-%m', ${revenues.date})
    ORDER BY month ASC
  `);

  // Get income from entries table
  const entriesIncomeData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', ${entries.date}) as month,
      SUM(${entries.amount}) as revenue
    FROM ${entries}
    WHERE ${entries.date} >= ${dateRangeStart}
      AND ${entries.date} <= ${dateRangeEnd}
      AND ${entries.type} = 'income'
      ${sql.raw(serviceFilter)}
    GROUP BY strftime('%Y-%m', ${entries.date})
    ORDER BY month ASC
  `);

  // Get expenses for the same period (from both tables)
  const expenseData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', ${expenses.date}) as month,
      SUM(${expenses.amount}) as expenses
    FROM ${expenses}
    WHERE ${expenses.date} >= ${dateRangeStart}
      AND ${expenses.date} <= ${dateRangeEnd}
      ${sql.raw(serviceFilter)}
    GROUP BY strftime('%Y-%m', ${expenses.date})
    ORDER BY month ASC
  `);

  const entriesExpenseData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', ${entries.date}) as month,
      SUM(${entries.amount}) as expenses
    FROM ${entries}
    WHERE ${entries.date} >= ${dateRangeStart}
      AND ${entries.date} <= ${dateRangeEnd}
      AND ${entries.type} = 'expense'
      ${sql.raw(serviceFilter)}
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
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  
  // Default to current month if no date range provided
  const startOfMonth = new Date().toISOString().slice(0, 7) + "-01";
  const today = new Date().toISOString().split('T')[0];
  const dateRangeStart = startDate || startOfMonth;
  const dateRangeEnd = endDate || today;

  // Get revenue from both revenues table and entries table (unified system)
  const comparison = await db.all(sql`
    SELECT 
      s.id,
      s.name,
      s.color,
      s.monthly_target as target,
      COALESCE(SUM(r.amount), 0) + COALESCE(SUM(e.amount), 0) as actual
    FROM ${services} s
    LEFT JOIN ${revenues} r ON r.service_id = s.id 
      AND r.date >= ${dateRangeStart} 
      AND r.date <= ${dateRangeEnd}
    LEFT JOIN ${entries} e ON e.service_id = s.id 
      AND e.type = 'income' 
      AND e.date >= ${dateRangeStart}
      AND e.date <= ${dateRangeEnd}
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
  const serviceId = c.req.query('serviceId');
  
  // Build WHERE clause based on filter
  const whereClause = serviceId 
    ? and(eq(goals.serviceId, Number(serviceId)), eq(goals.status, "active"))
    : eq(goals.status, "active");
  
  const activeGoals = await db
    .select()
    .from(goals)
    .where(whereClause)
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
