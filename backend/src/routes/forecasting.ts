import { Hono } from "hono";
import { db } from "../db";
import { services, revenues, expenses } from "../db/schema";
import { sql } from "drizzle-orm";

const forecasting = new Hono();

// Helper: Simple Moving Average forecast
function simpleMovingAverage(data: number[], periods: number): number[] {
  const forecasts: number[] = [];
  for (let i = 0; i < periods; i++) {
    const windowSize = Math.min(3, data.length);
    const window = data.slice(-windowSize);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    forecasts.push(Math.round(avg));
    data = [...data, avg]; // Add forecast to data for next iteration
  }
  return forecasts;
}

// Helper: Exponential Smoothing forecast
function exponentialSmoothing(data: number[], alpha: number, periods: number): number[] {
  if (data.length === 0) return Array(periods).fill(0);
  
  // Initialize with first value
  let smoothed = data[0];
  
  // Apply smoothing to historical data
  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i] + (1 - alpha) * smoothed;
  }
  
  // Generate forecasts (flat line for simple exponential smoothing)
  return Array(periods).fill(Math.round(smoothed));
}

// Helper: Holt's Linear Trend (double exponential smoothing)
function holtLinearTrend(data: number[], alpha: number, beta: number, periods: number): number[] {
  if (data.length < 2) return Array(periods).fill(data[0] || 0);
  
  // Initialize
  let level = data[0];
  let trend = data[1] - data[0];
  
  // Apply smoothing
  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  
  // Generate forecasts
  const forecasts: number[] = [];
  for (let i = 1; i <= periods; i++) {
    forecasts.push(Math.round(level + i * trend));
  }
  return forecasts;
}

// Helper: Seasonal decomposition (simple)
function detectSeasonality(data: number[], seasonLength: number = 12): number[] {
  if (data.length < seasonLength) return Array(seasonLength).fill(1);
  
  // Calculate average
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  
  // Calculate seasonal indices
  const seasonalIndices: number[] = [];
  for (let i = 0; i < seasonLength; i++) {
    const seasonalValues = data.filter((_, idx) => idx % seasonLength === i);
    const seasonalAvg = seasonalValues.reduce((a, b) => a + b, 0) / (seasonalValues.length || 1);
    seasonalIndices.push(avg !== 0 ? seasonalAvg / avg : 1);
  }
  
  return seasonalIndices;
}

// Helper: Calculate growth rate
function calculateGrowthRate(data: number[]): number {
  if (data.length < 2) return 0;
  const nonZeroData = data.filter(d => d > 0);
  if (nonZeroData.length < 2) return 0;
  
  const firstHalf = nonZeroData.slice(0, Math.floor(nonZeroData.length / 2));
  const secondHalf = nonZeroData.slice(Math.floor(nonZeroData.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  return firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
}

// ============ REVENUE FORECASTING ============
forecasting.get("/revenue", async (c) => {
  const { months = "6", method = "holt", serviceId } = c.req.query();
  const forecastMonths = parseInt(months);
  
  // Get historical monthly revenue
  const historicalData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as total
    FROM ${revenues}
    WHERE date >= date('now', '-24 months')
    ${serviceId ? sql`AND service_id = ${parseInt(serviceId)}` : sql``}
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `);
  
  const monthlyValues = historicalData.map((d: any) => Number(d.total));
  
  // Generate forecasts based on method
  let forecasts: number[];
  switch (method) {
    case "sma":
      forecasts = simpleMovingAverage([...monthlyValues], forecastMonths);
      break;
    case "exponential":
      forecasts = exponentialSmoothing(monthlyValues, 0.3, forecastMonths);
      break;
    case "holt":
    default:
      forecasts = holtLinearTrend(monthlyValues, 0.3, 0.1, forecastMonths);
      break;
  }
  
  // Calculate confidence intervals (simple ± standard deviation)
  const stdDev = monthlyValues.length > 0 
    ? Math.sqrt(monthlyValues.reduce((sum, v) => sum + Math.pow(v - (monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length), 2), 0) / monthlyValues.length)
    : 0;
  
  // Generate forecast months
  const lastMonth = historicalData.length > 0 
    ? new Date(historicalData[historicalData.length - 1].month + "-01")
    : new Date();
  
  const forecastData = forecasts.map((forecast, i) => {
    const forecastDate = new Date(lastMonth);
    forecastDate.setMonth(forecastDate.getMonth() + i + 1);
    const month = forecastDate.toISOString().slice(0, 7);
    
    return {
      month,
      forecast: Math.max(0, forecast),
      lowerBound: Math.max(0, Math.round(forecast - 1.96 * stdDev)),
      upperBound: Math.round(forecast + 1.96 * stdDev),
      confidence: 95,
    };
  });
  
  // Calculate summary statistics
  const avgHistorical = monthlyValues.length > 0 
    ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length 
    : 0;
  const avgForecast = forecasts.length > 0 
    ? forecasts.reduce((a, b) => a + b, 0) / forecasts.length 
    : 0;
  const growthRate = calculateGrowthRate(monthlyValues);
  const seasonalIndices = detectSeasonality(monthlyValues);
  
  // Historical data for chart
  const historical = historicalData.map((d: any) => ({
    month: d.month,
    actual: Number(d.total),
  }));
  
  return c.json({
    method,
    forecastMonths,
    historical,
    forecasts: forecastData,
    summary: {
      avgMonthlyHistorical: Math.round(avgHistorical),
      avgMonthlyForecast: Math.round(avgForecast),
      totalForecast: Math.round(forecasts.reduce((a, b) => a + b, 0)),
      growthRate: Math.round(growthRate * 10) / 10,
      trend: avgForecast > avgHistorical ? "up" : avgForecast < avgHistorical ? "down" : "stable",
    },
    seasonality: {
      indices: seasonalIndices.map((s, i) => ({ month: i + 1, index: Math.round(s * 100) / 100 })),
      highSeason: seasonalIndices.map((s, i) => ({ month: i + 1, index: s }))
        .filter(s => s.index > 1.1)
        .map(s => s.month),
      lowSeason: seasonalIndices.map((s, i) => ({ month: i + 1, index: s }))
        .filter(s => s.index < 0.9)
        .map(s => s.month),
    },
  });
});

// ============ EXPENSE PROJECTIONS ============
forecasting.get("/expenses", async (c) => {
  const { months = "6", method = "holt" } = c.req.query();
  const forecastMonths = parseInt(months);
  
  // Get historical monthly expenses
  const historicalData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as total
    FROM ${expenses}
    WHERE date >= date('now', '-24 months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `);
  
  // Get expense breakdown by category
  const categoryData = await db.all(sql`
    SELECT 
      category,
      AVG(amount) as avgAmount,
      SUM(amount) as totalAmount,
      COUNT(*) as count
    FROM ${expenses}
    WHERE date >= date('now', '-12 months')
    GROUP BY category
    ORDER BY totalAmount DESC
  `);
  
  const monthlyValues = historicalData.map((d: any) => Number(d.total));
  
  // Generate forecasts
  let forecasts: number[];
  switch (method) {
    case "sma":
      forecasts = simpleMovingAverage([...monthlyValues], forecastMonths);
      break;
    case "exponential":
      forecasts = exponentialSmoothing(monthlyValues, 0.3, forecastMonths);
      break;
    case "holt":
    default:
      forecasts = holtLinearTrend(monthlyValues, 0.3, 0.1, forecastMonths);
      break;
  }
  
  // Calculate confidence intervals
  const stdDev = monthlyValues.length > 0
    ? Math.sqrt(monthlyValues.reduce((sum, v) => sum + Math.pow(v - (monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length), 2), 0) / monthlyValues.length)
    : 0;
  
  // Generate forecast months
  const lastMonth = historicalData.length > 0
    ? new Date(historicalData[historicalData.length - 1].month + "-01")
    : new Date();
  
  const forecastData = forecasts.map((forecast, i) => {
    const forecastDate = new Date(lastMonth);
    forecastDate.setMonth(forecastDate.getMonth() + i + 1);
    const month = forecastDate.toISOString().slice(0, 7);
    
    return {
      month,
      forecast: Math.max(0, forecast),
      lowerBound: Math.max(0, Math.round(forecast - 1.96 * stdDev)),
      upperBound: Math.round(forecast + 1.96 * stdDev),
      confidence: 95,
    };
  });
  
  // Category projections (simple linear projection)
  const categoryProjections = categoryData.map((cat: any) => {
    const monthlyAvg = Number(cat.totalAmount) / 12;
    return {
      category: cat.category,
      avgMonthly: Math.round(monthlyAvg),
      projectedTotal: Math.round(monthlyAvg * forecastMonths),
      share: 0, // Will be calculated below
    };
  });
  
  const totalProjected = categoryProjections.reduce((sum, c) => sum + c.projectedTotal, 0);
  categoryProjections.forEach(c => {
    c.share = totalProjected > 0 ? Math.round((c.projectedTotal / totalProjected) * 1000) / 10 : 0;
  });
  
  // Historical data for chart
  const historical = historicalData.map((d: any) => ({
    month: d.month,
    actual: Number(d.total),
  }));
  
  const avgHistorical = monthlyValues.length > 0 
    ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length 
    : 0;
  const avgForecast = forecasts.length > 0 
    ? forecasts.reduce((a, b) => a + b, 0) / forecasts.length 
    : 0;
  const growthRate = calculateGrowthRate(monthlyValues);
  
  return c.json({
    method,
    forecastMonths,
    historical,
    forecasts: forecastData,
    byCategory: categoryProjections,
    summary: {
      avgMonthlyHistorical: Math.round(avgHistorical),
      avgMonthlyForecast: Math.round(avgForecast),
      totalForecast: Math.round(forecasts.reduce((a, b) => a + b, 0)),
      growthRate: Math.round(growthRate * 10) / 10,
      trend: avgForecast > avgHistorical ? "up" : avgForecast < avgHistorical ? "down" : "stable",
    },
  });
});

// ============ PROFIT PREDICTIONS ============
forecasting.get("/profit", async (c) => {
  const { months = "6", method = "holt" } = c.req.query();
  const forecastMonths = parseInt(months);
  
  // Get historical monthly revenue and expenses
  const revenueData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as total
    FROM ${revenues}
    WHERE date >= date('now', '-24 months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `);
  
  const expenseData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as total
    FROM ${expenses}
    WHERE date >= date('now', '-24 months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `);
  
  // Create maps for easy lookup
  const revenueMap = new Map(revenueData.map((d: any) => [d.month, Number(d.total)]));
  const expenseMap = new Map(expenseData.map((d: any) => [d.month, Number(d.total)]));
  
  // Get all unique months
  const allMonths = [...new Set([
    ...revenueData.map((d: any) => d.month),
    ...expenseData.map((d: any) => d.month)
  ])].sort();
  
  // Calculate historical profit
  const profitData = allMonths.map(month => ({
    month,
    revenue: revenueMap.get(month) || 0,
    expenses: expenseMap.get(month) || 0,
    profit: (revenueMap.get(month) || 0) - (expenseMap.get(month) || 0),
  }));
  
  const profitValues = profitData.map(d => d.profit);
  const revenueValues = profitData.map(d => d.revenue);
  const expenseValues = profitData.map(d => d.expenses);
  
  // Generate forecasts for each metric
  let revenueForecast: number[], expenseForecast: number[];
  
  switch (method) {
    case "sma":
      revenueForecast = simpleMovingAverage([...revenueValues], forecastMonths);
      expenseForecast = simpleMovingAverage([...expenseValues], forecastMonths);
      break;
    case "exponential":
      revenueForecast = exponentialSmoothing(revenueValues, 0.3, forecastMonths);
      expenseForecast = exponentialSmoothing(expenseValues, 0.3, forecastMonths);
      break;
    case "holt":
    default:
      revenueForecast = holtLinearTrend(revenueValues, 0.3, 0.1, forecastMonths);
      expenseForecast = holtLinearTrend(expenseValues, 0.3, 0.1, forecastMonths);
      break;
  }
  
  // Generate forecast months
  const lastMonth = allMonths.length > 0
    ? new Date(allMonths[allMonths.length - 1] + "-01")
    : new Date();
  
  const forecastData = revenueForecast.map((rev, i) => {
    const forecastDate = new Date(lastMonth);
    forecastDate.setMonth(forecastDate.getMonth() + i + 1);
    const month = forecastDate.toISOString().slice(0, 7);
    const exp = expenseForecast[i];
    const profit = rev - exp;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    
    return {
      month,
      revenue: Math.max(0, rev),
      expenses: Math.max(0, exp),
      profit,
      profitMargin: Math.round(margin * 10) / 10,
    };
  });
  
  // Calculate summary
  const avgHistoricalProfit = profitValues.length > 0
    ? profitValues.reduce((a, b) => a + b, 0) / profitValues.length
    : 0;
  const avgForecastProfit = forecastData.length > 0
    ? forecastData.reduce((a, b) => a + b.profit, 0) / forecastData.length
    : 0;
  const avgMargin = forecastData.length > 0
    ? forecastData.reduce((a, b) => a + b.profitMargin, 0) / forecastData.length
    : 0;
  
  return c.json({
    method,
    forecastMonths,
    historical: profitData,
    forecasts: forecastData,
    summary: {
      avgMonthlyHistoricalProfit: Math.round(avgHistoricalProfit),
      avgMonthlyForecastProfit: Math.round(avgForecastProfit),
      totalForecastRevenue: Math.round(revenueForecast.reduce((a, b) => a + b, 0)),
      totalForecastExpenses: Math.round(expenseForecast.reduce((a, b) => a + b, 0)),
      totalForecastProfit: Math.round(forecastData.reduce((a, b) => a + b.profit, 0)),
      avgProfitMargin: Math.round(avgMargin * 10) / 10,
      trend: avgForecastProfit > avgHistoricalProfit ? "up" : avgForecastProfit < avgHistoricalProfit ? "down" : "stable",
    },
  });
});

// ============ SCENARIO PLANNING ============
forecasting.get("/scenarios", async (c) => {
  const { months = "12" } = c.req.query();
  const forecastMonths = parseInt(months);
  
  // Get baseline data
  const revenueData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as total
    FROM ${revenues}
    WHERE date >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `);
  
  const expenseData = await db.all(sql`
    SELECT 
      strftime('%Y-%m', date) as month,
      SUM(amount) as total
    FROM ${expenses}
    WHERE date >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month ASC
  `);
  
  const revenueValues = revenueData.map((d: any) => Number(d.total));
  const expenseValues = expenseData.map((d: any) => Number(d.total));
  
  const avgRevenue = revenueValues.length > 0 
    ? revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length 
    : 0;
  const avgExpense = expenseValues.length > 0 
    ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length 
    : 0;
  
  // Generate scenarios
  const scenarios = [
    {
      name: "Conservative",
      description: "5% revenue decrease, 10% expense increase",
      revenueGrowth: -5,
      expenseGrowth: 10,
      color: "#ef4444",
    },
    {
      name: "Baseline",
      description: "Current trends continue",
      revenueGrowth: 0,
      expenseGrowth: 0,
      color: "#3b82f6",
    },
    {
      name: "Moderate Growth",
      description: "10% revenue increase, 5% expense increase",
      revenueGrowth: 10,
      expenseGrowth: 5,
      color: "#22c55e",
    },
    {
      name: "Optimistic",
      description: "20% revenue increase, expenses flat",
      revenueGrowth: 20,
      expenseGrowth: 0,
      color: "#8b5cf6",
    },
    {
      name: "Aggressive Growth",
      description: "30% revenue increase, 15% expense increase",
      revenueGrowth: 30,
      expenseGrowth: 15,
      color: "#f97316",
    },
  ];
  
  // Calculate scenario projections
  const scenarioResults = scenarios.map(scenario => {
    const monthlyRevenue = avgRevenue * (1 + scenario.revenueGrowth / 100);
    const monthlyExpense = avgExpense * (1 + scenario.expenseGrowth / 100);
    const monthlyProfit = monthlyRevenue - monthlyExpense;
    const profitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
    
    // Generate monthly projections
    const projections = [];
    const lastMonth = revenueData.length > 0
      ? new Date(revenueData[revenueData.length - 1].month + "-01")
      : new Date();
    
    for (let i = 1; i <= forecastMonths; i++) {
      const forecastDate = new Date(lastMonth);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const month = forecastDate.toISOString().slice(0, 7);
      
      // Add slight variation
      const variance = 1 + (Math.random() * 0.1 - 0.05);
      
      projections.push({
        month,
        revenue: Math.round(monthlyRevenue * variance),
        expenses: Math.round(monthlyExpense * variance),
        profit: Math.round((monthlyRevenue - monthlyExpense) * variance),
      });
    }
    
    return {
      ...scenario,
      monthlyAvg: {
        revenue: Math.round(monthlyRevenue),
        expenses: Math.round(monthlyExpense),
        profit: Math.round(monthlyProfit),
        profitMargin: Math.round(profitMargin * 10) / 10,
      },
      annual: {
        revenue: Math.round(monthlyRevenue * 12),
        expenses: Math.round(monthlyExpense * 12),
        profit: Math.round(monthlyProfit * 12),
      },
      projections,
    };
  });
  
  return c.json({
    forecastMonths,
    baseline: {
      avgMonthlyRevenue: Math.round(avgRevenue),
      avgMonthlyExpenses: Math.round(avgExpense),
      avgMonthlyProfit: Math.round(avgRevenue - avgExpense),
    },
    scenarios: scenarioResults,
  });
});

// ============ SEASONAL ANALYSIS ============
forecasting.get("/seasonal", async (c) => {
  const { metric = "revenue" } = c.req.query();
  
  // Get data by month of year
  let monthlyData: any[];
  
  if (metric === "expenses") {
    monthlyData = await db.all(sql`
      SELECT 
        CAST(strftime('%m', date) AS INTEGER) as monthNum,
        strftime('%Y', date) as year,
        SUM(amount) as total
      FROM ${expenses}
      WHERE date >= date('now', '-36 months')
      GROUP BY strftime('%Y', date), strftime('%m', date)
      ORDER BY year, monthNum
    `);
  } else {
    monthlyData = await db.all(sql`
      SELECT 
        CAST(strftime('%m', date) AS INTEGER) as monthNum,
        strftime('%Y', date) as year,
        SUM(amount) as total
      FROM ${revenues}
      WHERE date >= date('now', '-36 months')
      GROUP BY strftime('%Y', date), strftime('%m', date)
      ORDER BY year, monthNum
    `);
  }
  
  // Aggregate by month of year
  const monthlyAggregates: { [key: number]: number[] } = {};
  for (let i = 1; i <= 12; i++) {
    monthlyAggregates[i] = [];
  }
  
  monthlyData.forEach((d: any) => {
    monthlyAggregates[d.monthNum].push(Number(d.total));
  });
  
  // Calculate seasonal indices
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const allValues = monthlyData.map((d: any) => Number(d.total));
  const overallAvg = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;
  
  const seasonalData = Object.entries(monthlyAggregates).map(([month, values]) => {
    const monthNum = parseInt(month);
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const index = overallAvg > 0 ? avg / overallAvg : 1;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    
    return {
      month: monthNum,
      monthName: monthNames[monthNum - 1],
      average: Math.round(avg),
      min: Math.round(min),
      max: Math.round(max),
      seasonalIndex: Math.round(index * 100) / 100,
      classification: index > 1.15 ? "peak" : index < 0.85 ? "low" : "normal",
      dataPoints: values.length,
    };
  });
  
  // Identify patterns
  const peakMonths = seasonalData.filter(m => m.classification === "peak").map(m => m.monthName);
  const lowMonths = seasonalData.filter(m => m.classification === "low").map(m => m.monthName);
  
  // Quarter analysis
  const quarters = [
    { name: "Q1", months: [1, 2, 3] },
    { name: "Q2", months: [4, 5, 6] },
    { name: "Q3", months: [7, 8, 9] },
    { name: "Q4", months: [10, 11, 12] },
  ];
  
  const quarterlyData = quarters.map(q => {
    const quarterMonths = seasonalData.filter(m => q.months.includes(m.month));
    const avgIndex = quarterMonths.reduce((a, b) => a + b.seasonalIndex, 0) / 3;
    const avgValue = quarterMonths.reduce((a, b) => a + b.average, 0);
    
    return {
      quarter: q.name,
      months: q.months.map(m => monthNames[m - 1]),
      avgSeasonalIndex: Math.round(avgIndex * 100) / 100,
      totalAverage: Math.round(avgValue),
      classification: avgIndex > 1.1 ? "strong" : avgIndex < 0.9 ? "weak" : "normal",
    };
  });
  
  return c.json({
    metric,
    overallAverage: Math.round(overallAvg),
    monthlyAnalysis: seasonalData,
    quarterlyAnalysis: quarterlyData,
    patterns: {
      peakMonths,
      lowMonths,
      seasonalStrength: Math.round(
        (Math.max(...seasonalData.map(m => m.seasonalIndex)) - 
         Math.min(...seasonalData.map(m => m.seasonalIndex))) * 100
      ) / 100,
      recommendation: peakMonths.length > 0
        ? `Focus marketing and inventory in ${peakMonths.join(", ")}. Plan cost reduction in ${lowMonths.join(", ") || "off-peak months"}.`
        : "No strong seasonal pattern detected. Maintain consistent operations year-round.",
    },
  });
});

// ============ SERVICE-LEVEL FORECASTS ============
forecasting.get("/by-service", async (c) => {
  const { months = "6" } = c.req.query();
  const forecastMonths = parseInt(months);
  
  // Get all services
  const allServices = await db.all(sql`
    SELECT id, name, color FROM ${services} WHERE is_active = 1
  `);
  
  // Get historical data per service
  const serviceForecasts = await Promise.all(
    allServices.map(async (service: any) => {
      const revenueHistory = await db.all(sql`
        SELECT 
          strftime('%Y-%m', date) as month,
          SUM(amount) as total
        FROM ${revenues}
        WHERE service_id = ${service.id}
          AND date >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month ASC
      `);
      
      const expenseHistory = await db.all(sql`
        SELECT 
          strftime('%Y-%m', date) as month,
          SUM(amount) as total
        FROM ${expenses}
        WHERE service_id = ${service.id}
          AND date >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month ASC
      `);
      
      const revenueValues = revenueHistory.map((d: any) => Number(d.total));
      const expenseValues = expenseHistory.map((d: any) => Number(d.total));
      
      const revForecast = holtLinearTrend(revenueValues, 0.3, 0.1, forecastMonths);
      const expForecast = holtLinearTrend(expenseValues, 0.3, 0.1, forecastMonths);
      
      const avgRevenue = revenueValues.length > 0 
        ? revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length 
        : 0;
      const avgExpense = expenseValues.length > 0 
        ? expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length 
        : 0;
      const forecastRevenue = revForecast.length > 0 
        ? revForecast.reduce((a, b) => a + b, 0) / revForecast.length 
        : 0;
      const forecastExpense = expForecast.length > 0 
        ? expForecast.reduce((a, b) => a + b, 0) / expForecast.length 
        : 0;
      
      return {
        serviceId: service.id,
        serviceName: service.name,
        serviceColor: service.color,
        historical: {
          avgMonthlyRevenue: Math.round(avgRevenue),
          avgMonthlyExpenses: Math.round(avgExpense),
          avgMonthlyProfit: Math.round(avgRevenue - avgExpense),
        },
        forecast: {
          avgMonthlyRevenue: Math.round(forecastRevenue),
          avgMonthlyExpenses: Math.round(forecastExpense),
          avgMonthlyProfit: Math.round(forecastRevenue - forecastExpense),
          totalRevenue: Math.round(revForecast.reduce((a, b) => a + b, 0)),
          totalExpenses: Math.round(expForecast.reduce((a, b) => a + b, 0)),
          totalProfit: Math.round(revForecast.reduce((a, b) => a + b, 0) - expForecast.reduce((a, b) => a + b, 0)),
        },
        trend: forecastRevenue > avgRevenue ? "up" : forecastRevenue < avgRevenue ? "down" : "stable",
        growthRate: avgRevenue > 0 
          ? Math.round(((forecastRevenue - avgRevenue) / avgRevenue) * 1000) / 10 
          : 0,
      };
    })
  );
  
  // Sort by forecast revenue
  serviceForecasts.sort((a, b) => b.forecast.totalRevenue - a.forecast.totalRevenue);
  
  return c.json({
    forecastMonths,
    services: serviceForecasts,
    summary: {
      totalForecastRevenue: serviceForecasts.reduce((a, b) => a + b.forecast.totalRevenue, 0),
      totalForecastExpenses: serviceForecasts.reduce((a, b) => a + b.forecast.totalExpenses, 0),
      totalForecastProfit: serviceForecasts.reduce((a, b) => a + b.forecast.totalProfit, 0),
      topGrowing: serviceForecasts.filter(s => s.trend === "up").slice(0, 3).map(s => s.serviceName),
      declining: serviceForecasts.filter(s => s.trend === "down").map(s => s.serviceName),
    },
  });
});

export default forecasting;
