import { Hono } from "hono";
import { db } from "../db";
import { revenues, expenses, madenis, madeniPayments, goals, goalHistory, services } from "../db/schema";
import { sql, eq, gte, lte, and, desc } from "drizzle-orm";

const reports = new Hono();

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "TSH",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper to get date range
const getDateRange = (period: string) => {
  const today = new Date();
  const startDate = new Date();
  const endDate = new Date();

  switch (period) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      startDate.setDate(today.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(today.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "this_week":
      const dayOfWeek = today.getDay();
      startDate.setDate(today.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "last_week":
      const lastWeekDay = today.getDay();
      startDate.setDate(today.getDate() - lastWeekDay - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(today.getDate() - lastWeekDay - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "this_month":
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "last_month":
      startDate.setMonth(today.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(0); // Last day of previous month
      endDate.setHours(23, 59, 59, 999);
      break;
    case "this_quarter":
      const quarter = Math.floor(today.getMonth() / 3);
      startDate.setMonth(quarter * 3, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "this_year":
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate.setDate(today.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
  }

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
};

// ============ DAILY SUMMARY REPORT ============
reports.get("/daily", async (c) => {
  const { date } = c.req.query();
  const reportDate = date || new Date().toISOString().split("T")[0];

  // Get daily revenue
  const dailyRevenue = await db.all<{ serviceId: number; serviceName: string; total: number; count: number }>(sql`
    SELECT 
      r.service_id as serviceId,
      s.name as serviceName,
      SUM(r.amount) as total,
      COUNT(*) as count
    FROM ${revenues} r
    LEFT JOIN ${services} s ON r.service_id = s.id
    WHERE r.date = ${reportDate}
    GROUP BY r.service_id
    ORDER BY total DESC
  `);

  // Get daily expenses
  const dailyExpenses = await db.all<{ category: string; total: number; count: number }>(sql`
    SELECT 
      category,
      SUM(amount) as total,
      COUNT(*) as count
    FROM ${expenses}
    WHERE date = ${reportDate}
    GROUP BY category
    ORDER BY total DESC
  `);

  // Get previous day for comparison
  const previousDate = new Date(reportDate);
  previousDate.setDate(previousDate.getDate() - 1);
  const prevDateStr = previousDate.toISOString().split("T")[0];

  const previousRevenue = await db.get<{ total: number }>(sql`
    SELECT COALESCE(SUM(amount), 0) as total FROM ${revenues} WHERE date = ${prevDateStr}
  `);

  const previousExpenses = await db.get<{ total: number }>(sql`
    SELECT COALESCE(SUM(amount), 0) as total FROM ${expenses} WHERE date = ${prevDateStr}
  `);

  // Get debt payments for the day
  const dailyDebtPayments = await db.all<{ debtorName: string; amount: number }>(sql`
    SELECT 
      m.debtor_name as debtorName,
      p.amount
    FROM ${madeniPayments} p
    JOIN ${madenis} m ON p.madeni_id = m.id
    WHERE p.payment_date = ${reportDate}
    ORDER BY p.amount DESC
  `);

  // Get new debts for the day
  const newDebts = await db.all<{ debtorName: string; originalAmount: number }>(sql`
    SELECT debtor_name as debtorName, original_amount as originalAmount
    FROM ${madenis}
    WHERE DATE(created_at) = ${reportDate}
  `);

  const totalRevenue = dailyRevenue.reduce((sum, r) => sum + Number(r.total), 0);
  const totalExpenses = dailyExpenses.reduce((sum, e) => sum + Number(e.total), 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalDebtPayments = dailyDebtPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalNewDebts = newDebts.reduce((sum, d) => sum + Number(d.originalAmount), 0);

  const prevTotalRevenue = Number(previousRevenue?.total || 0);
  const prevTotalExpenses = Number(previousExpenses?.total || 0);

  return c.json({
    reportType: "daily",
    reportDate,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRevenue,
      totalRevenueFormatted: formatCurrency(totalRevenue),
      totalExpenses,
      totalExpensesFormatted: formatCurrency(totalExpenses),
      netProfit,
      netProfitFormatted: formatCurrency(netProfit),
      profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0",
      totalDebtPayments,
      totalDebtPaymentsFormatted: formatCurrency(totalDebtPayments),
      totalNewDebts,
      totalNewDebtsFormatted: formatCurrency(totalNewDebts),
    },
    comparison: {
      revenueChange: prevTotalRevenue > 0 ? (((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100).toFixed(1) : "0.0",
      expenseChange: prevTotalExpenses > 0 ? (((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100).toFixed(1) : "0.0",
      previousRevenue: prevTotalRevenue,
      previousExpenses: prevTotalExpenses,
    },
    breakdown: {
      revenueByService: dailyRevenue.map(r => ({
        serviceId: r.serviceId,
        serviceName: r.serviceName || "Unknown",
        total: Number(r.total),
        totalFormatted: formatCurrency(Number(r.total)),
        transactionCount: Number(r.count),
        percentage: totalRevenue > 0 ? ((Number(r.total) / totalRevenue) * 100).toFixed(1) : "0.0",
      })),
      expensesByCategory: dailyExpenses.map(e => ({
        category: e.category,
        total: Number(e.total),
        totalFormatted: formatCurrency(Number(e.total)),
        transactionCount: Number(e.count),
        percentage: totalExpenses > 0 ? ((Number(e.total) / totalExpenses) * 100).toFixed(1) : "0.0",
      })),
      debtPayments: dailyDebtPayments.map(p => ({
        debtorName: p.debtorName,
        amount: Number(p.amount),
        amountFormatted: formatCurrency(Number(p.amount)),
      })),
      newDebts: newDebts.map(d => ({
        debtorName: d.debtorName,
        amount: Number(d.originalAmount),
        amountFormatted: formatCurrency(Number(d.originalAmount)),
      })),
    },
  });
});

// ============ WEEKLY PERFORMANCE REPORT ============
reports.get("/weekly", async (c) => {
  const { startDate: customStart, endDate: customEnd } = c.req.query();
  
  let startDate: string;
  let endDate: string;
  
  if (customStart && customEnd) {
    startDate = customStart;
    endDate = customEnd;
  } else {
    // Default to current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    startDate = weekStart.toISOString().split("T")[0];
    endDate = weekEnd.toISOString().split("T")[0];
  }

  // Daily breakdown for the week
  const dailyRevenue = await db.all<{ date: string; total: number }>(sql`
    SELECT date, SUM(amount) as total
    FROM ${revenues}
    WHERE date >= ${startDate} AND date <= ${endDate}
    GROUP BY date
    ORDER BY date ASC
  `);

  const dailyExpenses = await db.all<{ date: string; total: number }>(sql`
    SELECT date, SUM(amount) as total
    FROM ${expenses}
    WHERE date >= ${startDate} AND date <= ${endDate}
    GROUP BY date
    ORDER BY date ASC
  `);

  // Service performance for the week
  const servicePerformance = await db.all<{ serviceId: number; serviceName: string; revenue: number; expenses: number }>(sql`
    SELECT 
      s.id as serviceId,
      s.name as serviceName,
      COALESCE((SELECT SUM(amount) FROM ${revenues} WHERE service_id = s.id AND date >= ${startDate} AND date <= ${endDate}), 0) as revenue,
      COALESCE((SELECT SUM(amount) FROM ${expenses} WHERE service_id = s.id AND date >= ${startDate} AND date <= ${endDate}), 0) as expenses
    FROM ${services} s
    WHERE s.is_active = 1
    ORDER BY revenue DESC
  `);

  // Get previous week for comparison
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - 7);
  const prevEndDate = new Date(endDate);
  prevEndDate.setDate(prevEndDate.getDate() - 7);

  const prevWeekRevenue = await db.get<{ total: number }>(sql`
    SELECT COALESCE(SUM(amount), 0) as total FROM ${revenues} 
    WHERE date >= ${prevStartDate.toISOString().split("T")[0]} AND date <= ${prevEndDate.toISOString().split("T")[0]}
  `);

  const prevWeekExpenses = await db.get<{ total: number }>(sql`
    SELECT COALESCE(SUM(amount), 0) as total FROM ${expenses} 
    WHERE date >= ${prevStartDate.toISOString().split("T")[0]} AND date <= ${prevEndDate.toISOString().split("T")[0]}
  `);

  // Goal performance for the week
  const weeklyGoals = await db.all<{ id: number; title: string; targetAmount: number; currentAmount: number; status: string }>(sql`
    SELECT id, title, target_amount as targetAmount, current_amount as currentAmount, status
    FROM ${goals}
    WHERE period = 'weekly' AND start_date <= ${endDate} AND end_date >= ${startDate}
  `);

  // Debt collection performance
  const debtCollections = await db.get<{ collected: number; count: number }>(sql`
    SELECT COALESCE(SUM(amount), 0) as collected, COUNT(*) as count
    FROM ${madeniPayments}
    WHERE payment_date >= ${startDate} AND payment_date <= ${endDate}
  `);

  const totalRevenue = dailyRevenue.reduce((sum, d) => sum + Number(d.total), 0);
  const totalExpenses = dailyExpenses.reduce((sum, d) => sum + Number(d.total), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Calculate daily averages
  const daysInPeriod = Math.max(1, dailyRevenue.length);
  const avgDailyRevenue = totalRevenue / daysInPeriod;
  const avgDailyExpenses = totalExpenses / daysInPeriod;

  // Find best and worst days
  const revenueByDay = dailyRevenue.map(d => ({ date: d.date, total: Number(d.total) }));
  const bestDay = revenueByDay.length > 0 ? revenueByDay.reduce((a, b) => a.total > b.total ? a : b) : null;
  const worstDay = revenueByDay.length > 0 ? revenueByDay.reduce((a, b) => a.total < b.total ? a : b) : null;

  return c.json({
    reportType: "weekly",
    period: { startDate, endDate },
    generatedAt: new Date().toISOString(),
    summary: {
      totalRevenue,
      totalRevenueFormatted: formatCurrency(totalRevenue),
      totalExpenses,
      totalExpensesFormatted: formatCurrency(totalExpenses),
      netProfit,
      netProfitFormatted: formatCurrency(netProfit),
      profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0",
      avgDailyRevenue,
      avgDailyRevenueFormatted: formatCurrency(avgDailyRevenue),
      avgDailyExpenses,
      avgDailyExpensesFormatted: formatCurrency(avgDailyExpenses),
      debtCollected: Number(debtCollections?.collected || 0),
      debtCollectedFormatted: formatCurrency(Number(debtCollections?.collected || 0)),
      paymentsReceived: Number(debtCollections?.count || 0),
    },
    comparison: {
      prevWeekRevenue: Number(prevWeekRevenue?.total || 0),
      prevWeekExpenses: Number(prevWeekExpenses?.total || 0),
      revenueChange: Number(prevWeekRevenue?.total) > 0 
        ? (((totalRevenue - Number(prevWeekRevenue?.total)) / Number(prevWeekRevenue?.total)) * 100).toFixed(1) 
        : "0.0",
      expenseChange: Number(prevWeekExpenses?.total) > 0 
        ? (((totalExpenses - Number(prevWeekExpenses?.total)) / Number(prevWeekExpenses?.total)) * 100).toFixed(1) 
        : "0.0",
    },
    highlights: {
      bestDay: bestDay ? { date: bestDay.date, revenue: bestDay.total, revenueFormatted: formatCurrency(bestDay.total) } : null,
      worstDay: worstDay ? { date: worstDay.date, revenue: worstDay.total, revenueFormatted: formatCurrency(worstDay.total) } : null,
      topService: servicePerformance.length > 0 ? {
        name: servicePerformance[0].serviceName,
        revenue: Number(servicePerformance[0].revenue),
        revenueFormatted: formatCurrency(Number(servicePerformance[0].revenue)),
      } : null,
    },
    dailyBreakdown: dailyRevenue.map(r => {
      const dayExpenses = dailyExpenses.find(e => e.date === r.date);
      const expenseTotal = Number(dayExpenses?.total || 0);
      return {
        date: r.date,
        dayName: new Date(r.date).toLocaleDateString("en-US", { weekday: "long" }),
        revenue: Number(r.total),
        revenueFormatted: formatCurrency(Number(r.total)),
        expenses: expenseTotal,
        expensesFormatted: formatCurrency(expenseTotal),
        profit: Number(r.total) - expenseTotal,
        profitFormatted: formatCurrency(Number(r.total) - expenseTotal),
      };
    }),
    servicePerformance: servicePerformance.map(s => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      revenue: Number(s.revenue),
      revenueFormatted: formatCurrency(Number(s.revenue)),
      expenses: Number(s.expenses),
      expensesFormatted: formatCurrency(Number(s.expenses)),
      profit: Number(s.revenue) - Number(s.expenses),
      profitFormatted: formatCurrency(Number(s.revenue) - Number(s.expenses)),
      profitMargin: Number(s.revenue) > 0 
        ? (((Number(s.revenue) - Number(s.expenses)) / Number(s.revenue)) * 100).toFixed(1) 
        : "0.0",
    })),
    goalProgress: weeklyGoals.map(g => ({
      id: g.id,
      title: g.title,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount || 0),
      progress: Number(g.targetAmount) > 0 ? ((Number(g.currentAmount || 0) / Number(g.targetAmount)) * 100).toFixed(1) : "0.0",
      status: g.status,
    })),
  });
});

// ============ MONTHLY FINANCIAL REPORT ============
reports.get("/monthly", async (c) => {
  const { month, year } = c.req.query();
  
  const today = new Date();
  const reportMonth = month ? parseInt(month) - 1 : today.getMonth();
  const reportYear = year ? parseInt(year) : today.getFullYear();
  
  const startDate = new Date(reportYear, reportMonth, 1);
  const endDate = new Date(reportYear, reportMonth + 1, 0);
  
  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  // Revenue by week
  const weeklyRevenue = await db.all<{ week: string; total: number }>(sql`
    SELECT 
      strftime('%W', date) as week,
      SUM(amount) as total
    FROM ${revenues}
    WHERE date >= ${startDateStr} AND date <= ${endDateStr}
    GROUP BY week
    ORDER BY week ASC
  `);

  // Revenue by service
  const revenueByService = await db.all<{ serviceId: number; serviceName: string; total: number }>(sql`
    SELECT 
      r.service_id as serviceId,
      s.name as serviceName,
      SUM(r.amount) as total
    FROM ${revenues} r
    LEFT JOIN ${services} s ON r.service_id = s.id
    WHERE r.date >= ${startDateStr} AND r.date <= ${endDateStr}
    GROUP BY r.service_id
    ORDER BY total DESC
  `);

  // Expenses by category
  const expensesByCategory = await db.all<{ category: string; total: number; count: number }>(sql`
    SELECT 
      category,
      SUM(amount) as total,
      COUNT(*) as count
    FROM ${expenses}
    WHERE date >= ${startDateStr} AND date <= ${endDateStr}
    GROUP BY category
    ORDER BY total DESC
  `);

  // Expenses by service
  const expensesByService = await db.all<{ serviceId: number; serviceName: string; total: number }>(sql`
    SELECT 
      e.service_id as serviceId,
      s.name as serviceName,
      SUM(e.amount) as total
    FROM ${expenses} e
    LEFT JOIN ${services} s ON e.service_id = s.id
    WHERE e.date >= ${startDateStr} AND e.date <= ${endDateStr}
    GROUP BY e.service_id
    ORDER BY total DESC
  `);

  // Previous month comparison
  const prevStartDate = new Date(reportYear, reportMonth - 1, 1);
  const prevEndDate = new Date(reportYear, reportMonth, 0);
  
  const prevMonthRevenue = await db.get<{ total: number }>(sql`
    SELECT COALESCE(SUM(amount), 0) as total FROM ${revenues}
    WHERE date >= ${prevStartDate.toISOString().split("T")[0]} AND date <= ${prevEndDate.toISOString().split("T")[0]}
  `);

  const prevMonthExpenses = await db.get<{ total: number }>(sql`
    SELECT COALESCE(SUM(amount), 0) as total FROM ${expenses}
    WHERE date >= ${prevStartDate.toISOString().split("T")[0]} AND date <= ${prevEndDate.toISOString().split("T")[0]}
  `);

  // Debt summary for the month
  const debtSummary = await db.get<{ totalOutstanding: number; collected: number; newDebts: number }>(sql`
    SELECT 
      (SELECT COALESCE(SUM(balance), 0) FROM ${madenis} WHERE status != 'paid') as totalOutstanding,
      (SELECT COALESCE(SUM(amount), 0) FROM ${madeniPayments} WHERE payment_date >= ${startDateStr} AND payment_date <= ${endDateStr}) as collected,
      (SELECT COALESCE(SUM(original_amount), 0) FROM ${madenis} WHERE DATE(created_at) >= ${startDateStr} AND DATE(created_at) <= ${endDateStr}) as newDebts
  `);

  // Monthly goals performance
  const monthlyGoals = await db.all<{ id: number; title: string; goalType: string; targetAmount: number; currentAmount: number; status: string }>(sql`
    SELECT id, title, goal_type as goalType, target_amount as targetAmount, current_amount as currentAmount, status
    FROM ${goals}
    WHERE period = 'monthly' AND start_date <= ${endDateStr} AND end_date >= ${startDateStr}
  `);

  // Calculate totals
  const totalRevenue = revenueByService.reduce((sum, r) => sum + Number(r.total), 0);
  const totalExpenses = expensesByCategory.reduce((sum, e) => sum + Number(e.total), 0);
  const netProfit = totalRevenue - totalExpenses;
  const daysInMonth = endDate.getDate();
  const daysPassed = Math.min(today.getDate(), daysInMonth);

  return c.json({
    reportType: "monthly",
    period: {
      month: reportMonth + 1,
      monthName: startDate.toLocaleDateString("en-US", { month: "long" }),
      year: reportYear,
      startDate: startDateStr,
      endDate: endDateStr,
      daysInMonth,
      daysPassed,
    },
    generatedAt: new Date().toISOString(),
    summary: {
      totalRevenue,
      totalRevenueFormatted: formatCurrency(totalRevenue),
      totalExpenses,
      totalExpensesFormatted: formatCurrency(totalExpenses),
      netProfit,
      netProfitFormatted: formatCurrency(netProfit),
      grossProfitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0",
      avgDailyRevenue: totalRevenue / daysPassed,
      avgDailyRevenueFormatted: formatCurrency(totalRevenue / daysPassed),
      avgDailyExpenses: totalExpenses / daysPassed,
      avgDailyExpensesFormatted: formatCurrency(totalExpenses / daysPassed),
      projectedMonthlyRevenue: (totalRevenue / daysPassed) * daysInMonth,
      projectedMonthlyRevenueFormatted: formatCurrency((totalRevenue / daysPassed) * daysInMonth),
    },
    comparison: {
      prevMonthRevenue: Number(prevMonthRevenue?.total || 0),
      prevMonthRevenueFormatted: formatCurrency(Number(prevMonthRevenue?.total || 0)),
      prevMonthExpenses: Number(prevMonthExpenses?.total || 0),
      prevMonthExpensesFormatted: formatCurrency(Number(prevMonthExpenses?.total || 0)),
      revenueChange: Number(prevMonthRevenue?.total) > 0
        ? (((totalRevenue - Number(prevMonthRevenue?.total)) / Number(prevMonthRevenue?.total)) * 100).toFixed(1)
        : "0.0",
      expenseChange: Number(prevMonthExpenses?.total) > 0
        ? (((totalExpenses - Number(prevMonthExpenses?.total)) / Number(prevMonthExpenses?.total)) * 100).toFixed(1)
        : "0.0",
    },
    revenueBreakdown: {
      byService: revenueByService.map(r => ({
        serviceId: r.serviceId,
        serviceName: r.serviceName || "Unknown",
        total: Number(r.total),
        totalFormatted: formatCurrency(Number(r.total)),
        percentage: totalRevenue > 0 ? ((Number(r.total) / totalRevenue) * 100).toFixed(1) : "0.0",
      })),
      byWeek: weeklyRevenue.map(w => ({
        week: `Week ${w.week}`,
        total: Number(w.total),
        totalFormatted: formatCurrency(Number(w.total)),
      })),
    },
    expenseBreakdown: {
      byCategory: expensesByCategory.map(e => ({
        category: e.category,
        total: Number(e.total),
        totalFormatted: formatCurrency(Number(e.total)),
        count: Number(e.count),
        percentage: totalExpenses > 0 ? ((Number(e.total) / totalExpenses) * 100).toFixed(1) : "0.0",
      })),
      byService: expensesByService.map(e => ({
        serviceId: e.serviceId,
        serviceName: e.serviceName || "General",
        total: Number(e.total),
        totalFormatted: formatCurrency(Number(e.total)),
      })),
    },
    debtSummary: {
      totalOutstanding: Number(debtSummary?.totalOutstanding || 0),
      totalOutstandingFormatted: formatCurrency(Number(debtSummary?.totalOutstanding || 0)),
      collectedThisMonth: Number(debtSummary?.collected || 0),
      collectedThisMonthFormatted: formatCurrency(Number(debtSummary?.collected || 0)),
      newDebtsThisMonth: Number(debtSummary?.newDebts || 0),
      newDebtsThisMonthFormatted: formatCurrency(Number(debtSummary?.newDebts || 0)),
      netDebtChange: Number(debtSummary?.collected || 0) - Number(debtSummary?.newDebts || 0),
    },
    goalProgress: monthlyGoals.map(g => ({
      id: g.id,
      title: g.title,
      goalType: g.goalType,
      targetAmount: Number(g.targetAmount),
      targetAmountFormatted: formatCurrency(Number(g.targetAmount)),
      currentAmount: Number(g.currentAmount || 0),
      currentAmountFormatted: formatCurrency(Number(g.currentAmount || 0)),
      progress: Number(g.targetAmount) > 0 ? ((Number(g.currentAmount || 0) / Number(g.targetAmount)) * 100).toFixed(1) : "0.0",
      status: g.status,
    })),
  });
});

// ============ SERVICE-WISE REPORT ============
reports.get("/service/:serviceId", async (c) => {
  const serviceId = parseInt(c.req.param("serviceId"));
  const { period = "this_month" } = c.req.query();
  
  const { startDate, endDate } = getDateRange(period);

  // Get service details
  const service = await db.get<{ id: number; name: string; description: string; dailyTarget: number; monthlyTarget: number }>(sql`
    SELECT id, name, description, daily_target as dailyTarget, monthly_target as monthlyTarget
    FROM ${services}
    WHERE id = ${serviceId}
  `);

  if (!service) {
    return c.json({ error: "Service not found" }, 404);
  }

  // Revenue details
  const revenueDetails = await db.all<{ date: string; amount: number; description: string; paymentMethod: string }>(sql`
    SELECT date, amount, description, payment_method as paymentMethod
    FROM ${revenues}
    WHERE service_id = ${serviceId} AND date >= ${startDate} AND date <= ${endDate}
    ORDER BY date DESC
  `);

  // Expense details
  const expenseDetails = await db.all<{ date: string; amount: number; category: string; description: string }>(sql`
    SELECT date, amount, category, description
    FROM ${expenses}
    WHERE service_id = ${serviceId} AND date >= ${startDate} AND date <= ${endDate}
    ORDER BY date DESC
  `);

  // Daily breakdown
  const dailyBreakdown = await db.all<{ date: string; revenue: number; expenses: number }>(sql`
    SELECT 
      date,
      (SELECT COALESCE(SUM(amount), 0) FROM ${revenues} WHERE service_id = ${serviceId} AND date = r.date) as revenue,
      (SELECT COALESCE(SUM(amount), 0) FROM ${expenses} WHERE service_id = ${serviceId} AND date = r.date) as expenses
    FROM (
      SELECT DISTINCT date FROM ${revenues} WHERE service_id = ${serviceId} AND date >= ${startDate} AND date <= ${endDate}
      UNION
      SELECT DISTINCT date FROM ${expenses} WHERE service_id = ${serviceId} AND date >= ${startDate} AND date <= ${endDate}
    ) r
    ORDER BY date ASC
  `);

  // Service-specific debts
  const serviceDebts = await db.all<{ debtorName: string; originalAmount: number; balance: number; status: string; dueDate: string }>(sql`
    SELECT debtor_name as debtorName, original_amount as originalAmount, balance, status, due_date as dueDate
    FROM ${madenis}
    WHERE service_id = ${serviceId}
    ORDER BY balance DESC
  `);

  // Service-specific goals
  const serviceGoals = await db.all<{ id: number; title: string; targetAmount: number; currentAmount: number; period: string; status: string }>(sql`
    SELECT id, title, target_amount as targetAmount, current_amount as currentAmount, period, status
    FROM ${goals}
    WHERE service_id = ${serviceId}
    ORDER BY created_at DESC
    LIMIT 10
  `);

  // Calculate metrics
  const totalRevenue = revenueDetails.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpenses = expenseDetails.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalDebt = serviceDebts.reduce((sum, d) => sum + Number(d.balance), 0);

  // Revenue by payment method
  const revenueByMethod = await db.all<{ paymentMethod: string; total: number }>(sql`
    SELECT payment_method as paymentMethod, SUM(amount) as total
    FROM ${revenues}
    WHERE service_id = ${serviceId} AND date >= ${startDate} AND date <= ${endDate}
    GROUP BY payment_method
    ORDER BY total DESC
  `);

  // Expense by category
  const expenseByCategory = await db.all<{ category: string; total: number }>(sql`
    SELECT category, SUM(amount) as total
    FROM ${expenses}
    WHERE service_id = ${serviceId} AND date >= ${startDate} AND date <= ${endDate}
    GROUP BY category
    ORDER BY total DESC
  `);

  return c.json({
    reportType: "service",
    service: {
      id: service.id,
      name: service.name,
      description: service.description,
      dailyTarget: Number(service.dailyTarget),
      monthlyTarget: Number(service.monthlyTarget),
    },
    period: { startDate, endDate, periodName: period },
    generatedAt: new Date().toISOString(),
    summary: {
      totalRevenue,
      totalRevenueFormatted: formatCurrency(totalRevenue),
      totalExpenses,
      totalExpensesFormatted: formatCurrency(totalExpenses),
      netProfit,
      netProfitFormatted: formatCurrency(netProfit),
      profitMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0.0",
      totalDebt,
      totalDebtFormatted: formatCurrency(totalDebt),
      transactionCount: revenueDetails.length + expenseDetails.length,
    },
    revenueBreakdown: {
      byPaymentMethod: revenueByMethod.map(r => ({
        method: r.paymentMethod,
        total: Number(r.total),
        totalFormatted: formatCurrency(Number(r.total)),
        percentage: totalRevenue > 0 ? ((Number(r.total) / totalRevenue) * 100).toFixed(1) : "0.0",
      })),
      transactions: revenueDetails.slice(0, 50).map(r => ({
        date: r.date,
        amount: Number(r.amount),
        amountFormatted: formatCurrency(Number(r.amount)),
        description: r.description,
        paymentMethod: r.paymentMethod,
      })),
    },
    expenseBreakdown: {
      byCategory: expenseByCategory.map(e => ({
        category: e.category,
        total: Number(e.total),
        totalFormatted: formatCurrency(Number(e.total)),
        percentage: totalExpenses > 0 ? ((Number(e.total) / totalExpenses) * 100).toFixed(1) : "0.0",
      })),
      transactions: expenseDetails.slice(0, 50).map(e => ({
        date: e.date,
        amount: Number(e.amount),
        amountFormatted: formatCurrency(Number(e.amount)),
        category: e.category,
        description: e.description,
      })),
    },
    dailyBreakdown: dailyBreakdown.map(d => ({
      date: d.date,
      revenue: Number(d.revenue),
      revenueFormatted: formatCurrency(Number(d.revenue)),
      expenses: Number(d.expenses),
      expensesFormatted: formatCurrency(Number(d.expenses)),
      profit: Number(d.revenue) - Number(d.expenses),
      profitFormatted: formatCurrency(Number(d.revenue) - Number(d.expenses)),
    })),
    debts: serviceDebts.map(d => ({
      debtorName: d.debtorName,
      originalAmount: Number(d.originalAmount),
      originalAmountFormatted: formatCurrency(Number(d.originalAmount)),
      balance: Number(d.balance),
      balanceFormatted: formatCurrency(Number(d.balance)),
      status: d.status,
      dueDate: d.dueDate,
    })),
    goals: serviceGoals.map(g => ({
      id: g.id,
      title: g.title,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount || 0),
      progress: Number(g.targetAmount) > 0 ? ((Number(g.currentAmount || 0) / Number(g.targetAmount)) * 100).toFixed(1) : "0.0",
      period: g.period,
      status: g.status,
    })),
  });
});

// ============ DEBTS AGING REPORT ============
reports.get("/debts-aging", async (c) => {
  const today = new Date().toISOString().split("T")[0];

  // Get all active debts with aging
  const allDebts = await db.all<{
    id: number;
    debtorName: string;
    debtorContact: string;
    serviceId: number;
    serviceName: string;
    originalAmount: number;
    amountPaid: number;
    balance: number;
    issueDate: string;
    dueDate: string;
    status: string;
  }>(sql`
    SELECT 
      m.id,
      m.debtor_name as debtorName,
      m.debtor_contact as debtorContact,
      m.service_id as serviceId,
      s.name as serviceName,
      m.original_amount as originalAmount,
      m.amount_paid as amountPaid,
      m.balance,
      m.issue_date as issueDate,
      m.due_date as dueDate,
      m.status
    FROM ${madenis} m
    LEFT JOIN ${services} s ON m.service_id = s.id
    WHERE m.status != 'paid'
    ORDER BY m.due_date ASC
  `);

  // Categorize by aging buckets
  const agingBuckets = {
    current: [] as typeof allDebts,      // Not yet due
    days1to30: [] as typeof allDebts,    // 1-30 days overdue
    days31to60: [] as typeof allDebts,   // 31-60 days overdue
    days61to90: [] as typeof allDebts,   // 61-90 days overdue
    over90: [] as typeof allDebts,       // Over 90 days overdue
  };

  allDebts.forEach(debt => {
    const dueDate = new Date(debt.dueDate);
    const todayDate = new Date(today);
    const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) {
      agingBuckets.current.push(debt);
    } else if (daysOverdue <= 30) {
      agingBuckets.days1to30.push(debt);
    } else if (daysOverdue <= 60) {
      agingBuckets.days31to60.push(debt);
    } else if (daysOverdue <= 90) {
      agingBuckets.days61to90.push(debt);
    } else {
      agingBuckets.over90.push(debt);
    }
  });

  // Calculate totals for each bucket
  const calculateBucketTotal = (bucket: typeof allDebts) => 
    bucket.reduce((sum, d) => sum + Number(d.balance), 0);

  const bucketSummary = {
    current: {
      count: agingBuckets.current.length,
      total: calculateBucketTotal(agingBuckets.current),
      totalFormatted: formatCurrency(calculateBucketTotal(agingBuckets.current)),
    },
    days1to30: {
      count: agingBuckets.days1to30.length,
      total: calculateBucketTotal(agingBuckets.days1to30),
      totalFormatted: formatCurrency(calculateBucketTotal(agingBuckets.days1to30)),
    },
    days31to60: {
      count: agingBuckets.days31to60.length,
      total: calculateBucketTotal(agingBuckets.days31to60),
      totalFormatted: formatCurrency(calculateBucketTotal(agingBuckets.days31to60)),
    },
    days61to90: {
      count: agingBuckets.days61to90.length,
      total: calculateBucketTotal(agingBuckets.days61to90),
      totalFormatted: formatCurrency(calculateBucketTotal(agingBuckets.days61to90)),
    },
    over90: {
      count: agingBuckets.over90.length,
      total: calculateBucketTotal(agingBuckets.over90),
      totalFormatted: formatCurrency(calculateBucketTotal(agingBuckets.over90)),
    },
  };

  // Debt by service
  const debtByService = await db.all<{ serviceId: number; serviceName: string; totalBalance: number; count: number }>(sql`
    SELECT 
      m.service_id as serviceId,
      s.name as serviceName,
      SUM(m.balance) as totalBalance,
      COUNT(*) as count
    FROM ${madenis} m
    LEFT JOIN ${services} s ON m.service_id = s.id
    WHERE m.status != 'paid'
    GROUP BY m.service_id
    ORDER BY totalBalance DESC
  `);

  // Top debtors
  const topDebtors = allDebts
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .slice(0, 10);

  // Collection performance (last 6 months)
  const collectionHistory = await db.all<{ month: string; collected: number; issued: number }>(sql`
    SELECT 
      strftime('%Y-%m', payment_date) as month,
      SUM(amount) as collected,
      0 as issued
    FROM ${madeniPayments}
    WHERE payment_date >= date('now', '-6 months')
    GROUP BY month
    ORDER BY month ASC
  `);

  const totalOutstanding = allDebts.reduce((sum, d) => sum + Number(d.balance), 0);
  const totalOverdue = bucketSummary.days1to30.total + bucketSummary.days31to60.total + 
                       bucketSummary.days61to90.total + bucketSummary.over90.total;

  return c.json({
    reportType: "debts-aging",
    reportDate: today,
    generatedAt: new Date().toISOString(),
    summary: {
      totalOutstanding,
      totalOutstandingFormatted: formatCurrency(totalOutstanding),
      totalOverdue,
      totalOverdueFormatted: formatCurrency(totalOverdue),
      totalDebtors: allDebts.length,
      overduePercentage: totalOutstanding > 0 ? ((totalOverdue / totalOutstanding) * 100).toFixed(1) : "0.0",
      avgDebtAge: allDebts.length > 0 
        ? Math.round(allDebts.reduce((sum, d) => {
            const days = Math.floor((new Date().getTime() - new Date(d.issueDate).getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / allDebts.length)
        : 0,
    },
    agingBuckets: bucketSummary,
    agingDetails: {
      current: agingBuckets.current.map(formatDebtItem),
      days1to30: agingBuckets.days1to30.map(formatDebtItem),
      days31to60: agingBuckets.days31to60.map(formatDebtItem),
      days61to90: agingBuckets.days61to90.map(formatDebtItem),
      over90: agingBuckets.over90.map(formatDebtItem),
    },
    debtByService: debtByService.map(d => ({
      serviceId: d.serviceId,
      serviceName: d.serviceName || "General",
      totalBalance: Number(d.totalBalance),
      totalBalanceFormatted: formatCurrency(Number(d.totalBalance)),
      count: Number(d.count),
      percentage: totalOutstanding > 0 ? ((Number(d.totalBalance) / totalOutstanding) * 100).toFixed(1) : "0.0",
    })),
    topDebtors: topDebtors.map(formatDebtItem),
    collectionHistory: collectionHistory.map(c => ({
      month: c.month,
      monthName: new Date(c.month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      collected: Number(c.collected),
      collectedFormatted: formatCurrency(Number(c.collected)),
    })),
  });
});

// Helper function to format debt items
function formatDebtItem(d: any) {
  const dueDate = new Date(d.dueDate);
  const today = new Date();
  const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    id: d.id,
    debtorName: d.debtorName,
    debtorContact: d.debtorContact,
    serviceId: d.serviceId,
    serviceName: d.serviceName || "General",
    originalAmount: Number(d.originalAmount),
    originalAmountFormatted: formatCurrency(Number(d.originalAmount)),
    amountPaid: Number(d.amountPaid || 0),
    amountPaidFormatted: formatCurrency(Number(d.amountPaid || 0)),
    balance: Number(d.balance),
    balanceFormatted: formatCurrency(Number(d.balance)),
    issueDate: d.issueDate,
    dueDate: d.dueDate,
    daysOverdue: Math.max(0, daysOverdue),
    status: d.status,
  };
}

// ============ GOAL ACHIEVEMENT REPORT ============
reports.get("/goals", async (c) => {
  const { period = "all" } = c.req.query();

  // Get active goals
  const activeGoals = await db.all<{
    id: number;
    title: string;
    serviceId: number;
    serviceName: string;
    goalType: string;
    period: string;
    targetAmount: number;
    currentAmount: number;
    startDate: string;
    endDate: string;
    status: string;
  }>(sql`
    SELECT 
      g.id,
      g.title,
      g.service_id as serviceId,
      s.name as serviceName,
      g.goal_type as goalType,
      g.period,
      g.target_amount as targetAmount,
      g.current_amount as currentAmount,
      g.start_date as startDate,
      g.end_date as endDate,
      g.status
    FROM ${goals} g
    LEFT JOIN ${services} s ON g.service_id = s.id
    ${period !== "all" ? sql`WHERE g.period = ${period}` : sql``}
    ORDER BY g.created_at DESC
  `);

  // Get goal history (completed goals)
  const completedGoals = await db.all<{
    id: number;
    title: string;
    serviceName: string;
    goalType: string;
    period: string;
    targetAmount: number;
    achievedAmount: number;
    achievementRate: number;
    status: string;
    completedAt: string;
  }>(sql`
    SELECT 
      gh.id,
      gh.title,
      s.name as serviceName,
      gh.goal_type as goalType,
      gh.period,
      gh.target_amount as targetAmount,
      gh.achieved_amount as achievedAmount,
      gh.achievement_rate as achievementRate,
      gh.status,
      gh.completed_at as completedAt
    FROM ${goalHistory} gh
    LEFT JOIN ${services} s ON gh.service_id = s.id
    ORDER BY gh.completed_at DESC
    LIMIT 50
  `);

  // Calculate statistics
  const totalActiveGoals = activeGoals.length;
  const onTrackGoals = activeGoals.filter(g => {
    const progress = Number(g.targetAmount) > 0 ? (Number(g.currentAmount || 0) / Number(g.targetAmount)) * 100 : 0;
    const today = new Date();
    const startDate = new Date(g.startDate);
    const endDate = new Date(g.endDate);
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysPassed = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const expectedProgress = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;
    return progress >= expectedProgress * 0.9; // Within 90% of expected
  }).length;

  const completedCount = completedGoals.filter(g => g.status === "completed").length;
  const missedCount = completedGoals.filter(g => g.status === "missed").length;
  const avgAchievementRate = completedGoals.length > 0
    ? completedGoals.reduce((sum, g) => sum + Number(g.achievementRate), 0) / completedGoals.length
    : 0;

  // Goals by type
  const goalsByType = {
    revenue: activeGoals.filter(g => g.goalType === "revenue"),
    profit: activeGoals.filter(g => g.goalType === "profit"),
    expense: activeGoals.filter(g => g.goalType === "expense"),
  };

  // Goals by period
  const goalsByPeriod = {
    daily: activeGoals.filter(g => g.period === "daily"),
    weekly: activeGoals.filter(g => g.period === "weekly"),
    monthly: activeGoals.filter(g => g.period === "monthly"),
    yearly: activeGoals.filter(g => g.period === "yearly"),
  };

  // Achievement rate by period (from history)
  const achievementByPeriod = await db.all<{ period: string; avgRate: number; count: number }>(sql`
    SELECT 
      period,
      AVG(achievement_rate) as avgRate,
      COUNT(*) as count
    FROM ${goalHistory}
    GROUP BY period
  `);

  return c.json({
    reportType: "goals",
    generatedAt: new Date().toISOString(),
    summary: {
      totalActiveGoals,
      onTrackGoals,
      atRiskGoals: totalActiveGoals - onTrackGoals,
      completedAllTime: completedCount,
      missedAllTime: missedCount,
      avgAchievementRate: avgAchievementRate.toFixed(1),
      successRate: (completedCount + missedCount) > 0 
        ? ((completedCount / (completedCount + missedCount)) * 100).toFixed(1) 
        : "0.0",
    },
    activeGoals: activeGoals.map(g => {
      const progress = Number(g.targetAmount) > 0 ? (Number(g.currentAmount || 0) / Number(g.targetAmount)) * 100 : 0;
      const today = new Date();
      const endDate = new Date(g.endDate);
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      
      return {
        id: g.id,
        title: g.title,
        serviceId: g.serviceId,
        serviceName: g.serviceName || "All Services",
        goalType: g.goalType,
        period: g.period,
        targetAmount: Number(g.targetAmount),
        targetAmountFormatted: formatCurrency(Number(g.targetAmount)),
        currentAmount: Number(g.currentAmount || 0),
        currentAmountFormatted: formatCurrency(Number(g.currentAmount || 0)),
        progress: progress.toFixed(1),
        remaining: Number(g.targetAmount) - Number(g.currentAmount || 0),
        remainingFormatted: formatCurrency(Number(g.targetAmount) - Number(g.currentAmount || 0)),
        startDate: g.startDate,
        endDate: g.endDate,
        daysRemaining,
        status: g.status,
        isOnTrack: progress >= 50 || daysRemaining > 7,
      };
    }),
    goalsByType: {
      revenue: {
        count: goalsByType.revenue.length,
        totalTarget: goalsByType.revenue.reduce((sum, g) => sum + Number(g.targetAmount), 0),
        totalCurrent: goalsByType.revenue.reduce((sum, g) => sum + Number(g.currentAmount || 0), 0),
      },
      profit: {
        count: goalsByType.profit.length,
        totalTarget: goalsByType.profit.reduce((sum, g) => sum + Number(g.targetAmount), 0),
        totalCurrent: goalsByType.profit.reduce((sum, g) => sum + Number(g.currentAmount || 0), 0),
      },
      expense: {
        count: goalsByType.expense.length,
        totalTarget: goalsByType.expense.reduce((sum, g) => sum + Number(g.targetAmount), 0),
        totalCurrent: goalsByType.expense.reduce((sum, g) => sum + Number(g.currentAmount || 0), 0),
      },
    },
    goalsByPeriod: {
      daily: goalsByPeriod.daily.length,
      weekly: goalsByPeriod.weekly.length,
      monthly: goalsByPeriod.monthly.length,
      yearly: goalsByPeriod.yearly.length,
    },
    achievementHistory: completedGoals.map(g => ({
      id: g.id,
      title: g.title,
      serviceName: g.serviceName || "All Services",
      goalType: g.goalType,
      period: g.period,
      targetAmount: Number(g.targetAmount),
      targetAmountFormatted: formatCurrency(Number(g.targetAmount)),
      achievedAmount: Number(g.achievedAmount),
      achievedAmountFormatted: formatCurrency(Number(g.achievedAmount)),
      achievementRate: Number(g.achievementRate).toFixed(1),
      status: g.status,
      completedAt: g.completedAt,
    })),
    achievementByPeriod: achievementByPeriod.map(a => ({
      period: a.period,
      avgRate: Number(a.avgRate).toFixed(1),
      count: Number(a.count),
    })),
  });
});

// ============ REPORT TYPES LIST ============
reports.get("/types", async (c) => {
  return c.json({
    reportTypes: [
      {
        id: "daily",
        name: "Daily Summary Report",
        description: "Complete daily overview of revenue, expenses, and profit",
        endpoint: "/api/reports/daily",
        parameters: ["date"],
        icon: "calendar",
      },
      {
        id: "weekly",
        name: "Weekly Performance Report",
        description: "Weekly performance metrics with daily breakdown and comparisons",
        endpoint: "/api/reports/weekly",
        parameters: ["startDate", "endDate"],
        icon: "bar-chart-2",
      },
      {
        id: "monthly",
        name: "Monthly Financial Report",
        description: "Comprehensive monthly financial analysis with trends",
        endpoint: "/api/reports/monthly",
        parameters: ["month", "year"],
        icon: "file-text",
      },
      {
        id: "service",
        name: "Service-Wise Report",
        description: "Detailed performance report for a specific service",
        endpoint: "/api/reports/service/:serviceId",
        parameters: ["serviceId", "period"],
        icon: "pie-chart",
      },
      {
        id: "debts-aging",
        name: "Debts Aging Report",
        description: "Outstanding debts categorized by age with collection analysis",
        endpoint: "/api/reports/debts-aging",
        parameters: [],
        icon: "clock",
      },
      {
        id: "goals",
        name: "Goal Achievement Report",
        description: "Goal progress tracking and achievement history",
        endpoint: "/api/reports/goals",
        parameters: ["period"],
        icon: "target",
      },
    ],
  });
});

export default reports;
