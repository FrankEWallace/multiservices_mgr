import { Hono } from "hono";
import { db } from "../db";
import { services, revenues, expenses, madenis, madeniPayments } from "../db/schema";
import { sql, eq, gte, lte, and, desc, sum, avg } from "drizzle-orm";

const analytics = new Hono();

// ============ PROFIT MARGIN ANALYSIS ============
analytics.get("/profit-margins", async (c) => {
  const { period = "month" } = c.req.query();
  
  const now = new Date();
  let startDate: string;
  
  if (period === "year") {
    startDate = `${now.getFullYear()}-01-01`;
  } else if (period === "quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    startDate = `${now.getFullYear()}-${String(quarter * 3 + 1).padStart(2, "0")}-01`;
  } else {
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
  
  const endDate = now.toISOString().split("T")[0];
  
  // Get revenue and expenses by service
  const revenueByService = await db.all(sql`
    SELECT 
      s.id,
      s.name,
      s.color,
      COALESCE(SUM(r.amount), 0) as revenue
    FROM ${services} s
    LEFT JOIN ${revenues} r ON r.service_id = s.id 
      AND r.date >= ${startDate} AND r.date <= ${endDate}
    WHERE s.is_active = 1
    GROUP BY s.id
  `);
  
  const expensesByService = await db.all(sql`
    SELECT 
      s.id,
      COALESCE(SUM(e.amount), 0) as expenses
    FROM ${services} s
    LEFT JOIN ${expenses} e ON e.service_id = s.id 
      AND e.date >= ${startDate} AND e.date <= ${endDate}
    WHERE s.is_active = 1
    GROUP BY s.id
  `);
  
  const expenseMap = new Map(expensesByService.map((e: any) => [e.id, e.expenses]));
  
  // Calculate margins
  const margins = revenueByService.map((s: any) => {
    const revenue = Number(s.revenue) || 0;
    const expense = Number(expenseMap.get(s.id)) || 0;
    const profit = revenue - expense;
    const grossMargin = revenue > 0 ? ((revenue - expense) / revenue) * 100 : 0;
    
    return {
      serviceId: s.id,
      serviceName: s.name,
      serviceColor: s.color,
      totalRevenue: revenue,
      totalExpenses: expense,
      grossProfit: profit,
      profitMargin: Math.round(grossMargin * 10) / 10,
      revenueCount: 0,
      expenseCount: 0,
    };
  });
  
  // Overall margins
  const totalRevenue = margins.reduce((sum, m) => sum + m.totalRevenue, 0);
  const totalExpenses = margins.reduce((sum, m) => sum + m.totalExpenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const overallGrossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
  
  return c.json({
    period,
    margins: margins.sort((a, b) => b.profitMargin - a.profitMargin),
    overall: {
      totalRevenue,
      totalExpenses,
      grossProfit: totalProfit,
      overallMargin: Math.round(overallGrossMargin * 10) / 10,
    },
  });
});

// ============ SERVICE PROFITABILITY RANKING ============
analytics.get("/profitability-ranking", async (c) => {
  const { period = "month", metric = "profit" } = c.req.query();
  
  const now = new Date();
  let startDate: string;
  let previousStartDate: string;
  let previousEndDate: string;
  
  if (period === "year") {
    startDate = `${now.getFullYear()}-01-01`;
    previousStartDate = `${now.getFullYear() - 1}-01-01`;
    previousEndDate = `${now.getFullYear() - 1}-12-31`;
  } else {
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    previousStartDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`;
    previousEndDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split("T")[0];
  }
  
  const endDate = now.toISOString().split("T")[0];
  
  // Current period data
  const currentData = await db.all(sql`
    SELECT 
      s.id,
      s.name,
      s.color,
      s.monthly_target,
      COALESCE((SELECT SUM(amount) FROM ${revenues} WHERE service_id = s.id AND date >= ${startDate} AND date <= ${endDate}), 0) as revenue,
      COALESCE((SELECT SUM(amount) FROM ${expenses} WHERE service_id = s.id AND date >= ${startDate} AND date <= ${endDate}), 0) as expenses,
      COALESCE((SELECT COUNT(*) FROM ${revenues} WHERE service_id = s.id AND date >= ${startDate} AND date <= ${endDate}), 0) as transactions
    FROM ${services} s
    WHERE s.is_active = 1
  `);
  
  // Previous period data for trend
  const previousData = await db.all(sql`
    SELECT 
      s.id,
      COALESCE((SELECT SUM(amount) FROM ${revenues} WHERE service_id = s.id AND date >= ${previousStartDate} AND date <= ${previousEndDate}), 0) as revenue,
      COALESCE((SELECT SUM(amount) FROM ${expenses} WHERE service_id = s.id AND date >= ${previousStartDate} AND date <= ${previousEndDate}), 0) as expenses
    FROM ${services} s
    WHERE s.is_active = 1
  `);
  
  const previousMap = new Map(previousData.map((p: any) => [p.id, { revenue: p.revenue, expenses: p.expenses }]));
  
  // Calculate rankings
  const rankings = currentData.map((s: any, index: number) => {
    const revenue = Number(s.revenue) || 0;
    const expense = Number(s.expenses) || 0;
    const profit = revenue - expense;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const transactions = Number(s.transactions) || 0;
    const target = Number(s.monthly_target) || 0;
    const targetProgress = target > 0 ? (revenue / target) * 100 : 0;
    
    const prev = previousMap.get(s.id) || { revenue: 0, expenses: 0 };
    const prevRevenue = Number(prev.revenue) || 0;
    const prevProfit = prevRevenue - (Number(prev.expenses) || 0);
    
    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : revenue > 0 ? 100 : 0;
    const profitChange = prevProfit !== 0 ? ((profit - prevProfit) / Math.abs(prevProfit)) * 100 : profit > 0 ? 100 : 0;
    
    // Calculate total revenue and profit for shares
    const totalRevenue = currentData.reduce((sum: number, d: any) => sum + (Number(d.revenue) || 0), 0);
    const totalProfit = currentData.reduce((sum: number, d: any) => {
      const r = Number(d.revenue) || 0;
      const e = Number(d.expenses) || 0;
      return sum + (r - e);
    }, 0);
    
    return {
      rank: 0, // Will be assigned after sorting
      serviceId: s.id,
      serviceName: s.name,
      serviceColor: s.color,
      revenue,
      expenses: expense,
      profit,
      profitMargin: Math.round(margin * 10) / 10,
      revenueShare: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 1000) / 10 : 0,
      profitShare: totalProfit > 0 ? Math.round((profit / totalProfit) * 1000) / 10 : 0,
      roi: expense > 0 ? Math.round((profit / expense) * 100) : 0,
      trend: (revenueChange >= 5 ? "up" : revenueChange <= -5 ? "down" : "stable") as "up" | "down" | "stable",
      previousProfit: prevProfit,
    };
  });
  
  // Sort by selected metric
  const sortedRankings = [...rankings].sort((a, b) => {
    switch (metric) {
      case "revenue": return b.revenue - a.revenue;
      case "margin": return b.profitMargin - a.profitMargin;
      default: return b.profit - a.profit;
    }
  });
  
  // Assign ranks
  sortedRankings.forEach((s, index) => {
    s.rank = index + 1;
  });
  
  return c.json({
    period,
    rankings: sortedRankings,
    totalServices: sortedRankings.length,
  });
});

// ============ CASH FLOW ANALYSIS ============
analytics.get("/cash-flow", async (c) => {
  const { months = "12" } = c.req.query();
  const numMonths = parseInt(months);
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - numMonths);
  
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];
  
  // Monthly cash inflows (revenues)
  const inflows = await db.all(sql`
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as total,
      COUNT(*) as count
    FROM ${revenues}
    WHERE date >= ${startStr} AND date <= ${endStr}
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `);
  
  // Monthly cash outflows (expenses)
  const outflows = await db.all(sql`
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as total,
      COUNT(*) as count
    FROM ${expenses}
    WHERE date >= ${startStr} AND date <= ${endStr}
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `);
  
  // Create monthly cash flow maps
  const inflowMap = new Map(inflows.map((i: any) => [i.month, { total: Number(i.total), count: Number(i.count) }]));
  const outflowMap = new Map(outflows.map((o: any) => [o.month, { total: Number(o.total), count: Number(o.count) }]));
  
  // Generate month-by-month cash flow
  const cashFlow: any[] = [];
  let cumulativeCashFlow = 0;
  
  for (let i = 0; i < numMonths; i++) {
    const monthDate = new Date(startDate);
    monthDate.setMonth(startDate.getMonth() + i);
    const monthStr = monthDate.toISOString().slice(0, 7);
    
    const inData = inflowMap.get(monthStr) || { total: 0, count: 0 };
    const outData = outflowMap.get(monthStr) || { total: 0, count: 0 };
    const netCashFlow = inData.total - outData.total;
    cumulativeCashFlow += netCashFlow;
    
    cashFlow.push({
      month: monthStr,
      inflows: inData.total,
      outflows: outData.total,
      netCashFlow,
      cumulativeCashFlow,
      inflowCount: inData.count,
      outflowCount: outData.count,
    });
  }
  
  // Calculate summary
  const totalInflows = cashFlow.reduce((sum, d) => sum + d.inflows, 0);
  const totalOutflows = cashFlow.reduce((sum, d) => sum + d.outflows, 0);
  const netCashFlow = totalInflows - totalOutflows;
  const averageMonthlyNet = cashFlow.length > 0 ? netCashFlow / cashFlow.length : 0;
  
  // Find best and worst months
  const sortedByNet = [...cashFlow].sort((a, b) => b.netCashFlow - a.netCashFlow);
  const bestMonth = sortedByNet[0] || { month: "N/A", netCashFlow: 0 };
  const worstMonth = sortedByNet[sortedByNet.length - 1] || { month: "N/A", netCashFlow: 0 };
  
  return c.json({
    cashFlow,
    summary: {
      totalInflows,
      totalOutflows,
      netCashFlow,
      averageMonthlyNet: Math.round(averageMonthlyNet),
      bestMonth: { month: bestMonth.month, net: bestMonth.netCashFlow },
      worstMonth: { month: worstMonth.month, net: worstMonth.netCashFlow },
    },
    period: `Last ${numMonths} months`,
  });
});

// ============ TREND DETECTION ============
analytics.get("/trends", async (c) => {
  const { metric = "revenue", period = "daily", days = "90" } = c.req.query();
  const numDays = parseInt(days);
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - numDays);
  
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];
  
  // Get historical data
  let data: any[];
  
  if (metric === "expenses") {
    if (period === "monthly") {
      data = await db.all(sql`
        SELECT 
          strftime('%Y-%m', date) as period,
          SUM(amount) as value,
          COUNT(*) as count
        FROM ${expenses}
        WHERE date >= ${startStr}
        GROUP BY strftime('%Y-%m', date)
        ORDER BY period ASC
      `);
    } else if (period === "weekly") {
      data = await db.all(sql`
        SELECT 
          strftime('%Y-W%W', date) as period,
          SUM(amount) as value,
          COUNT(*) as count
        FROM ${expenses}
        WHERE date >= ${startStr}
        GROUP BY strftime('%Y-W%W', date)
        ORDER BY period ASC
      `);
    } else {
      data = await db.all(sql`
        SELECT 
          date as period,
          SUM(amount) as value,
          COUNT(*) as count
        FROM ${expenses}
        WHERE date >= ${startStr}
        GROUP BY date
        ORDER BY period ASC
      `);
    }
  } else {
    if (period === "monthly") {
      data = await db.all(sql`
        SELECT 
          strftime('%Y-%m', date) as period,
          SUM(amount) as value,
          COUNT(*) as count
        FROM ${revenues}
        WHERE date >= ${startStr}
        GROUP BY strftime('%Y-%m', date)
        ORDER BY period ASC
      `);
    } else if (period === "weekly") {
      data = await db.all(sql`
        SELECT 
          strftime('%Y-W%W', date) as period,
          SUM(amount) as value,
          COUNT(*) as count
        FROM ${revenues}
        WHERE date >= ${startStr}
        GROUP BY strftime('%Y-W%W', date)
        ORDER BY period ASC
      `);
    } else {
      data = await db.all(sql`
        SELECT 
          date as period,
          SUM(amount) as value,
          COUNT(*) as count
        FROM ${revenues}
        WHERE date >= ${startStr}
        GROUP BY date
        ORDER BY period ASC
      `);
    }
  }
  
  const values = data.map((d: any) => Number(d.value));
  
  // Calculate trend statistics
  const n = values.length;
  if (n < 2) {
    return c.json({
      metric,
      period,
      data,
      trend: { direction: "neutral", slope: 0, confidence: 0 },
      statistics: { avg: 0, min: 0, max: 0, stdDev: 0 },
    });
  }
  
  // Linear regression for trend
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) * (i - xMean);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Calculate R-squared (confidence)
  let ssRes = 0;
  let ssTot = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - yMean) ** 2;
  }
  
  const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
  
  // Determine trend direction
  const direction = slope > yMean * 0.01 ? "up" : slope < -yMean * 0.01 ? "down" : "neutral";
  const percentChange = yMean !== 0 ? (slope / yMean) * 100 : 0;
  
  // Statistics
  const min = Math.min(...values);
  const max = Math.max(...values);
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + (v - yMean) ** 2, 0) / n);
  
  // Moving average (7-day for daily, 4-week for weekly)
  const maWindow = period === "daily" ? 7 : period === "weekly" ? 4 : 3;
  const movingAvg = values.map((_, i) => {
    if (i < maWindow - 1) return yMean; // Use mean for early periods
    const window = values.slice(i - maWindow + 1, i + 1);
    return window.reduce((a, b) => a + b, 0) / maWindow;
  });
  
  // Calculate momentum (change from previous period)
  const momentum = values.map((v, i) => {
    if (i === 0) return 0;
    return values[i - 1] !== 0 ? ((v - values[i - 1]) / values[i - 1]) * 100 : 0;
  });
  
  // Map trend direction for each period
  const trends = data.map((d: any, i: number) => ({
    period: d.period,
    revenue: Number(d.value),
    movingAverage: Math.round(movingAvg[i] || yMean),
    trend: (momentum[i] > 5 ? "upward" : momentum[i] < -5 ? "downward" : "stable") as "upward" | "downward" | "stable",
    momentum: Math.round(momentum[i] * 10) / 10,
  }));
  
  // Overall trend direction
  const overallTrend = percentChange > 5 ? "upward" : percentChange < -5 ? "downward" : "stable";
  
  // Calculate volatility (coefficient of variation)
  const volatility = yMean !== 0 ? (stdDev / yMean) * 100 : 0;
  
  // Seasonal patterns (find high/low months)
  const monthlyAvg = new Map<string, { sum: number; count: number }>();
  data.forEach((d: any) => {
    const month = d.period.slice(5, 7); // Extract month
    const existing = monthlyAvg.get(month) || { sum: 0, count: 0 };
    monthlyAvg.set(month, { sum: existing.sum + Number(d.value), count: existing.count + 1 });
  });
  
  const monthAvgs = Array.from(monthlyAvg.entries()).map(([month, { sum, count }]) => ({
    month,
    avg: sum / count,
  }));
  
  const monthlyMean = monthAvgs.length > 0 ? monthAvgs.reduce((s, m) => s + m.avg, 0) / monthAvgs.length : 0;
  const highSeason = monthAvgs.filter(m => m.avg > monthlyMean * 1.2).map(m => m.month);
  const lowSeason = monthAvgs.filter(m => m.avg < monthlyMean * 0.8).map(m => m.month);
  
  return c.json({
    trends,
    summary: {
      overallTrend,
      averageGrowth: Math.round(percentChange * 10) / 10,
      volatility: Math.round(volatility * 10) / 10,
      seasonalPatterns: { highSeason, lowSeason },
    },
    metric,
    period,
  });
});

// ============ ANOMALY DETECTION ============
analytics.get("/anomalies", async (c) => {
  const { days = "90", threshold = "2" } = c.req.query();
  const numDays = parseInt(days);
  const stdThreshold = parseFloat(threshold);
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - numDays);
  
  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];
  
  // Get daily revenue data
  const revenueData = await db.all(sql`
    SELECT 
      date,
      SUM(amount) as value
    FROM ${revenues}
    WHERE date >= ${startStr}
    GROUP BY date
    ORDER BY date ASC
  `);
  
  // Get daily expense data
  const expenseData = await db.all(sql`
    SELECT 
      date,
      SUM(amount) as value
    FROM ${expenses}
    WHERE date >= ${startStr}
    GROUP BY date
    ORDER BY date ASC
  `);
  
  const detectAnomalies = (data: any[], type: "revenue" | "expense") => {
    const values = data.map((d: any) => Number(d.value));
    const n = values.length;
    
    if (n < 5) return [];
    
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n);
    
    const anomalies: any[] = [];
    let idCounter = 1;
    
    data.forEach((d: any, i: number) => {
      const value = Number(d.value);
      const zScore = stdDev !== 0 ? (value - mean) / stdDev : 0;
      
      if (Math.abs(zScore) > stdThreshold) {
        const deviation = value - mean;
        const deviationPercent = mean !== 0 ? (deviation / mean) * 100 : 0;
        
        anomalies.push({
          id: idCounter++,
          type,
          date: d.date,
          amount: value,
          expectedAmount: Math.round(mean),
          deviation: Math.round(deviation),
          deviationPercent: Math.round(deviationPercent),
          severity: (Math.abs(zScore) > 3 ? "high" : Math.abs(zScore) > 2 ? "medium" : "low") as "low" | "medium" | "high",
          description: `${type === "revenue" ? "Revenue" : "Expense"} anomaly detected`,
        });
      }
    });
    
    return anomalies;
  };
  
  const revenueAnomalies = detectAnomalies(revenueData, "revenue");
  const expenseAnomalies = detectAnomalies(expenseData, "expense");
  
  const allAnomalies = [...revenueAnomalies, ...expenseAnomalies].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Calculate average deviation
  const avgDeviation = allAnomalies.length > 0
    ? Math.abs(allAnomalies.reduce((sum, a) => sum + a.deviationPercent, 0) / allAnomalies.length)
    : 0;
  
  return c.json({
    anomalies: allAnomalies,
    stats: {
      totalAnomalies: allAnomalies.length,
      revenueAnomalies: revenueAnomalies.length,
      expenseAnomalies: expenseAnomalies.length,
      avgDeviation: Math.round(avgDeviation * 10) / 10,
      severityDistribution: {
        low: allAnomalies.filter(a => a.severity === "low").length,
        medium: allAnomalies.filter(a => a.severity === "medium").length,
        high: allAnomalies.filter(a => a.severity === "high").length,
      },
    },
  });
});

export default analytics;
