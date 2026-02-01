// API Configuration and Client

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Token management
let authToken: string | null = localStorage.getItem("auth_token");

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
};

export const getAuthToken = () => authToken;

// Custom API error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Rate limit handling
interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

let rateLimitInfo: RateLimitInfo | null = null;

export const getRateLimitInfo = () => rateLimitInfo;

// API fetch wrapper with improved error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 2
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Update rate limit info from headers
    const limitHeader = response.headers.get("X-RateLimit-Limit");
    const remainingHeader = response.headers.get("X-RateLimit-Remaining");
    const resetHeader = response.headers.get("X-RateLimit-Reset");
    
    if (limitHeader && remainingHeader && resetHeader) {
      rateLimitInfo = {
        limit: parseInt(limitHeader, 10),
        remaining: parseInt(remainingHeader, 10),
        reset: parseInt(resetHeader, 10),
      };
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      
      // Handle 401 - clear token and redirect to login
      if (response.status === 401) {
        setAuthToken(null);
        window.location.href = "/login";
        throw new ApiError("Session expired. Please login again.", 401, "UNAUTHORIZED");
      }

      // Handle 429 - rate limited
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
        throw new ApiError(
          error.error || "Too many requests. Please try again later.",
          429,
          "RATE_LIMITED",
          retryAfter
        );
      }

      // Handle 5xx - server errors with retry
      if (response.status >= 500 && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
        return apiFetch<T>(endpoint, options, retries - 1);
      }

      throw new ApiError(
        error.error || `API Error: ${response.status}`,
        response.status,
        error.code
      );
    }

    return response.json();
  } catch (error) {
    // Network errors - retry
    if (error instanceof TypeError && error.message === "Failed to fetch" && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
      return apiFetch<T>(endpoint, options, retries - 1);
    }
    throw error;
  }
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ user: User; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { email: string; username: string; password: string; fullName?: string }) =>
    apiFetch<{ user: User; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => apiFetch<User>("/auth/me"),
};

// Dashboard API
export const dashboardApi = {
  getKPIs: () => apiFetch<{ kpis: KPI[] }>("/dashboard/kpis"),
  getRevenueChart: (period?: string) =>
    apiFetch<{ chartData: ChartDataPoint[] }>(`/dashboard/revenue-chart${period ? `?period=${period}` : ""}`),
  getServiceComparison: () =>
    apiFetch<{ comparison: ServiceComparison[] }>("/dashboard/service-comparison"),
  getInsights: () => apiFetch<{ insights: Insight[] }>("/dashboard/insights"),
  getDebtSummary: () => apiFetch<{ summary: DebtSummary }>("/dashboard/debt-summary"),
  getMadeniSummary: () => apiFetch<{ summary: DebtSummary }>("/dashboard/debt-summary"), // Alias
  getGoalProgress: () => apiFetch<{ goals: GoalProgress[] }>("/dashboard/goal-progress"),
  getComparison: (period: "mom" | "yoy" | "wow" = "mom") =>
    apiFetch<{
      period: string;
      dateRange: { current: { start: string; end: string }; previous: { start: string; end: string } };
      comparison: ComparisonData[];
    }>(`/dashboard/comparison?period=${period}`),
};

// Services API
export const servicesApi = {
  getAll: () => apiFetch<{ services: ServiceWithStats[] }>("/services"),
  getOne: (id: number) => apiFetch<{ service: Service }>(`/services/${id}`),
  getStats: (id: number) => apiFetch<{ service: Service; stats: ServiceStats }>(`/services/${id}/stats`),
  create: (data: Partial<Service>) =>
    apiFetch<{ service: Service }>("/services", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Service>) =>
    apiFetch<{ service: Service }>(`/services/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<{ message: string }>(`/services/${id}`, { method: "DELETE" }),
};

// Revenue API
export const revenueApi = {
  getAll: (limit?: number) =>
    apiFetch<{ revenues: Revenue[] }>(`/revenue${limit ? `?limit=${limit}` : ""}`),
  getSummary: () => apiFetch<{ summary: RevenueSummary }>("/revenue/summary"),
  getByService: (period?: string) =>
    apiFetch<{ byService: ServiceRevenue[] }>(`/revenue/by-service${period ? `?period=${period}` : ""}`),
  getTrend: (period?: string, days?: number) =>
    apiFetch<{ trend: TrendData[] }>(
      `/revenue/trend${period || days ? `?${period ? `period=${period}` : ""}${days ? `&days=${days}` : ""}` : ""}`
    ),
  create: (data: Partial<Revenue>) =>
    apiFetch<{ revenue: Revenue }>("/revenue", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Revenue>) =>
    apiFetch<{ revenue: Revenue }>(`/revenue/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<{ message: string }>(`/revenue/${id}`, { method: "DELETE" }),
  bulkImport: (revenues: Partial<Revenue>[]) =>
    apiFetch<{ message: string; imported: number; failed: number; errors: any[] }>("/revenue/bulk", {
      method: "POST",
      body: JSON.stringify({ revenues }),
    }),
};

// Expenses API
export const expensesApi = {
  getAll: (limit?: number, category?: string, serviceId?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (category) params.append("category", category);
    if (serviceId) params.append("serviceId", serviceId.toString());
    return apiFetch<{ expenses: Expense[] }>(`/expenses?${params.toString()}`);
  },
  getSummary: () => apiFetch<{ summary: ExpenseSummary }>("/expenses/summary"),
  getByCategory: (period?: string) =>
    apiFetch<{ byCategory: { category: string; total: number; count: number }[] }>(
      `/expenses/by-category${period ? `?period=${period}` : ""}`
    ),
  getByService: (period?: string) =>
    apiFetch<{ byService: { id: number; name: string; color: string; expense: number }[] }>(
      `/expenses/by-service${period ? `?period=${period}` : ""}`
    ),
  getTrend: (period?: string, days?: number) =>
    apiFetch<{ trend: { period: string; expense: number; count: number }[] }>(
      `/expenses/trend${period || days ? `?${period ? `period=${period}` : ""}${days ? `&days=${days}` : ""}` : ""}`
    ),
  getCategories: () => apiFetch<{ categories: ExpenseCategory[] }>("/expenses/categories"),
  getOne: (id: number) => apiFetch<{ expense: Expense }>(`/expenses/${id}`),
  create: (data: Partial<Expense>) =>
    apiFetch<{ expense: Expense }>("/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Expense>) =>
    apiFetch<{ expense: Expense }>(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<{ message: string }>(`/expenses/${id}`, { method: "DELETE" }),
  bulkImport: (expenses: Partial<Expense>[]) =>
    apiFetch<{ message: string; imported: number; failed: number; errors: any[] }>("/expenses/bulk", {
      method: "POST",
      body: JSON.stringify({ expenses }),
    }),
};

// Debts API
export const debtsApi = {
  getAll: (status?: string, serviceId?: number) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (serviceId) params.append("serviceId", serviceId.toString());
    return apiFetch<{ debts: Debt[] }>(`/debts?${params.toString()}`);
  },
  getAging: () => apiFetch<{ aging: AgingReport[]; total: { amount: number; count: number } }>("/debts/aging"),
  getOne: (id: number) => apiFetch<{ debt: Debt; payments: DebtPayment[] }>(`/debts/${id}`),
  create: (data: Partial<Debt>) =>
    apiFetch<{ debt: Debt }>("/debts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  recordPayment: (id: number, data: { amount: number; paymentDate: string; paymentMethod: string }) =>
    apiFetch<{ payment: DebtPayment; newBalance: number; newStatus: string }>(`/debts/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Debt>) =>
    apiFetch<{ debt: Debt }>(`/debts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<{ message: string }>(`/debts/${id}`, { method: "DELETE" }),
  sendReminder: (id: number, data: { method: "email" | "sms"; customMessage?: string }) =>
    apiFetch<{ success: boolean; message: string; details: ReminderDetails }>(`/debts/${id}/reminder`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Keep madeniApi as alias for backwards compatibility
export const madeniApi = debtsApi;

// Goals API
export const goalsApi = {
  getAll: (status?: string, serviceId?: number) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (serviceId) params.append("serviceId", serviceId.toString());
    return apiFetch<{ goals: Goal[] }>(`/goals?${params.toString()}`);
  },
  getProgress: () =>
    apiFetch<{
      goals: GoalProgress[];
      summary: { total: number; achieved: number; onTrack: number; behind: number; overallProgress: number };
    }>("/goals/progress"),
  getHistory: (serviceId?: number, status?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (serviceId) params.append("serviceId", serviceId.toString());
    if (status) params.append("status", status);
    if (limit) params.append("limit", limit.toString());
    return apiFetch<{ history: GoalHistory[]; summary: GoalHistorySummary }>(`/goals/history?${params.toString()}`);
  },
  getOne: (id: number) => apiFetch<{ goal: Goal }>(`/goals/${id}`),
  create: (data: Partial<Goal>) =>
    apiFetch<{ goal: Goal }>("/goals", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Goal>) =>
    apiFetch<{ goal: Goal }>(`/goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateProgress: (id: number, currentAmount: number) =>
    apiFetch<{ goal: Goal; progress: number }>(`/goals/${id}/progress`, {
      method: "PATCH",
      body: JSON.stringify({ currentAmount }),
    }),
  complete: (id: number, notes?: string) =>
    apiFetch<{ success: boolean; message: string; historyEntry: GoalHistory; achievementRate: number }>(
      `/goals/${id}/complete`,
      {
        method: "POST",
        body: JSON.stringify({ notes }),
      }
    ),
  delete: (id: number) =>
    apiFetch<{ message: string }>(`/goals/${id}`, { method: "DELETE" }),
};

// Types
export interface User {
  id: number;
  email: string;
  username: string;
  fullName?: string;
  isAdmin: boolean;
  createdAt?: string;
}

export interface KPI {
  title: string;
  value: number;
  formattedValue: string;
  change: number;
  icon: string;
  variant: "success" | "danger" | "warning";
}

export interface ChartDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ServiceComparison {
  id: number;
  name: string;
  color: string;
  target: number;
  actual: number;
  progress: number;
}

export interface Insight {
  type: string;
  title: string;
  description: string;
  value?: number;
}

export interface DebtSummary {
  total: number;
  count: number;
  overdue: number;
  dueSoon: number;
}

// Keep MadeniSummary as alias for backwards compatibility
export type MadeniSummary = DebtSummary;

export interface GoalProgress {
  id: number;
  title: string;
  serviceName?: string;
  type?: string;
  period?: string;
  target?: number;
  current?: number;
  progress: number;
  status?: string;
  endDate?: string;
}

export interface ComparisonData {
  label: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  icon: string;
  color: string;
  isActive: boolean;
  dailyTarget?: number;
  monthlyTarget?: number;
  yearlyTarget?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceWithStats extends Service {
  revenue: number;
  profit: number;
  margin: number;
  goalMet: boolean;
}

export interface ServiceStats {
  monthlyRevenue: number;
  yearlyRevenue: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  weeklyTrend: { week: string; revenue: number }[];
}

export interface Revenue {
  id: number;
  serviceId: number;
  serviceName?: string;
  amount: number;
  date: string;
  description?: string;
  paymentMethod: string;
  reference?: string;
  createdAt?: string;
}

export interface RevenueSummary {
  today: number;
  thisMonth: number;
  thisYear: number;
  byPaymentMethod: { method: string; total: number; count: number }[];
}

export interface ServiceRevenue {
  id: number;
  name: string;
  color: string;
  revenue: number;
}

export interface TrendData {
  period: string;
  revenue: number;
  transactions: number;
}

// Expense Types
export interface Expense {
  id: number;
  serviceId?: number;
  serviceName?: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
  vendor?: string;
  isRecurring: boolean;
  createdBy?: number;
  createdAt?: string;
}

export interface ExpenseSummary {
  today: number;
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
  changePercent: number;
  recurring: { total: number; count: number };
  byCategory: { category: string; total: number; count: number }[];
}

export interface ExpenseCategory {
  value: string;
  label: string;
}

export interface Debt {
  id: number;
  serviceId: number;
  serviceName?: string;
  debtorName: string;
  debtorContact?: string;
  debtorEmail?: string;
  debtorAddress?: string;
  originalAmount: number;
  amountPaid: number;
  balance: number;
  issueDate: string;
  dueDate: string;
  status: string;
  notes?: string;
  daysOverdue?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Keep Madeni as alias for backwards compatibility
export type Madeni = Debt;

export interface DebtPayment {
  id: number;
  debtId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  createdAt?: string;
}

// Keep MadeniPayment as alias for backwards compatibility
export type MadeniPayment = DebtPayment;

export interface AgingReport {
  label: string;
  amount: number;
  count: number;
  color: string;
}

export interface ReminderDetails {
  method: string;
  recipient: string;
  debtorName: string;
  balance: number;
  sentAt: string;
}

export interface Goal {
  id: number;
  serviceId?: number;
  serviceName?: string;
  title: string;
  description?: string;
  goalType: string;
  period: string;
  targetAmount: number;
  currentAmount?: number;
  startDate: string;
  endDate: string;
  status: string;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GoalHistory {
  id: number;
  goalId?: number;
  serviceId?: number;
  serviceName?: string;
  title: string;
  goalType: string;
  period: string;
  targetAmount: number;
  achievedAmount: number;
  achievementRate: number;
  status: string;
  startDate: string;
  endDate: string;
  completedAt: string;
  notes?: string;
  createdAt?: string;
}

export interface GoalHistorySummary {
  totalGoals: number;
  completedGoals: number;
  missedGoals: number;
  avgAchievementRate: number;
  successRate: number;
}

// ============ SETTINGS TYPES ============
export interface Setting {
  id: number;
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  category: string;
  type: "string" | "number" | "boolean" | "json";
  label?: string;
  description?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettingsGrouped {
  [category: string]: Setting[];
}

// ============ SETTINGS API ============
export const settingsApi = {
  // Get all settings (grouped by category)
  getAll: (category?: string, publicOnly?: boolean): Promise<SettingsGrouped> => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (publicOnly) params.append("public", "true");
    const queryString = params.toString();
    return apiFetch(`/settings${queryString ? `?${queryString}` : ""}`);
  },

  // Get a single setting by key
  get: (key: string): Promise<Setting> => apiFetch(`/settings/${key}`),

  // Create or update a setting
  save: (setting: Omit<Setting, "id" | "createdAt" | "updatedAt">): Promise<Setting> =>
    apiFetch("/settings", {
      method: "POST",
      body: JSON.stringify(setting),
    }),

  // Bulk update settings
  bulkUpdate: (settings: Omit<Setting, "id" | "createdAt" | "updatedAt">[]): Promise<Setting[]> =>
    apiFetch("/settings/bulk", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  // Delete a setting
  delete: (key: string): Promise<{ success: boolean }> =>
    apiFetch(`/settings/${key}`, {
      method: "DELETE",
    }),
};

// ============ ANALYTICS TYPES ============
export interface ProfitMargin {
  serviceId: number;
  serviceName: string;
  serviceColor: string;
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  profitMargin: number;
  revenueCount: number;
  expenseCount: number;
}

export interface ProfitabilityRanking {
  rank: number;
  serviceId: number;
  serviceName: string;
  serviceColor: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  revenueShare: number;
  profitShare: number;
  roi: number;
  trend: "up" | "down" | "stable";
  previousProfit: number;
}

export interface CashFlowData {
  month: string;
  inflows: number;
  outflows: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  inflowCount: number;
  outflowCount: number;
}

export interface CashFlowSummary {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  averageMonthlyNet: number;
  bestMonth: { month: string; net: number };
  worstMonth: { month: string; net: number };
}

export interface AnalyticsTrendData {
  period: string;
  revenue: number;
  movingAverage: number;
  trend: "upward" | "downward" | "stable";
  momentum: number;
}

export interface TrendSummary {
  overallTrend: "upward" | "downward" | "stable";
  averageGrowth: number;
  volatility: number;
  seasonalPatterns: { highSeason: string[]; lowSeason: string[] };
}

export interface Anomaly {
  id: number;
  type: "revenue" | "expense";
  date: string;
  amount: number;
  expectedAmount: number;
  deviation: number;
  deviationPercent: number;
  severity: "low" | "medium" | "high";
  serviceName?: string;
  description?: string;
  category?: string;
}

export interface AnomalyStats {
  totalAnomalies: number;
  revenueAnomalies: number;
  expenseAnomalies: number;
  avgDeviation: number;
  severityDistribution: { low: number; medium: number; high: number };
}

// ============ ANALYTICS API ============
export const analyticsApi = {
  // Profit margin analysis per service
  getProfitMargins: (period?: string, serviceId?: number) => {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (serviceId) params.append("serviceId", serviceId.toString());
    return apiFetch<{
      margins: ProfitMargin[];
      overall: { totalRevenue: number; totalExpenses: number; grossProfit: number; overallMargin: number };
      period: string;
    }>(`/analytics/profit-margins?${params.toString()}`);
  },

  // Service profitability ranking
  getProfitabilityRanking: (period?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (limit) params.append("limit", limit.toString());
    return apiFetch<{
      rankings: ProfitabilityRanking[];
      period: string;
      totalServices: number;
    }>(`/analytics/profitability-ranking?${params.toString()}`);
  },

  // Cash flow analysis
  getCashFlow: (months?: number) => {
    const params = new URLSearchParams();
    if (months) params.append("months", months.toString());
    return apiFetch<{
      cashFlow: CashFlowData[];
      summary: CashFlowSummary;
      period: string;
    }>(`/analytics/cash-flow?${params.toString()}`);
  },

  // Trend detection
  getTrends: (period?: string, metric?: string) => {
    const params = new URLSearchParams();
    if (period) params.append("period", period);
    if (metric) params.append("metric", metric);
    return apiFetch<{
      trends: AnalyticsTrendData[];
      summary: TrendSummary;
      metric: string;
      period: string;
    }>(`/analytics/trends?${params.toString()}`);
  },

  // Anomaly detection
  getAnomalies: (type?: string, severity?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (type) params.append("type", type);
    if (severity) params.append("severity", severity);
    if (limit) params.append("limit", limit.toString());
    return apiFetch<{
      anomalies: Anomaly[];
      stats: AnomalyStats;
    }>(`/analytics/anomalies?${params.toString()}`);
  },
};

// ============ FORECASTING TYPES ============
export interface ForecastDataPoint {
  month: string;
  forecast: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface HistoricalDataPoint {
  month: string;
  actual: number;
}

export interface SeasonalityData {
  indices: { month: number; index: number }[];
  highSeason: number[];
  lowSeason: number[];
}

export interface RevenueForecast {
  method: string;
  forecastMonths: number;
  historical: HistoricalDataPoint[];
  forecasts: ForecastDataPoint[];
  summary: {
    avgMonthlyHistorical: number;
    avgMonthlyForecast: number;
    totalForecast: number;
    growthRate: number;
    trend: "up" | "down" | "stable";
  };
  seasonality: SeasonalityData;
}

export interface ExpenseForecast {
  method: string;
  forecastMonths: number;
  historical: HistoricalDataPoint[];
  forecasts: ForecastDataPoint[];
  byCategory: {
    category: string;
    avgMonthly: number;
    projectedTotal: number;
    share: number;
  }[];
  summary: {
    avgMonthlyHistorical: number;
    avgMonthlyForecast: number;
    totalForecast: number;
    growthRate: number;
    trend: "up" | "down" | "stable";
  };
}

export interface ProfitForecastPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
}

export interface ProfitForecast {
  method: string;
  forecastMonths: number;
  historical: { month: string; revenue: number; expenses: number; profit: number }[];
  forecasts: ProfitForecastPoint[];
  summary: {
    avgMonthlyHistoricalProfit: number;
    avgMonthlyForecastProfit: number;
    totalForecastRevenue: number;
    totalForecastExpenses: number;
    totalForecastProfit: number;
    avgProfitMargin: number;
    trend: "up" | "down" | "stable";
  };
}

export interface Scenario {
  name: string;
  description: string;
  revenueGrowth: number;
  expenseGrowth: number;
  color: string;
  monthlyAvg: {
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
  };
  annual: {
    revenue: number;
    expenses: number;
    profit: number;
  };
  projections: { month: string; revenue: number; expenses: number; profit: number }[];
}

export interface ScenarioPlanning {
  forecastMonths: number;
  baseline: {
    avgMonthlyRevenue: number;
    avgMonthlyExpenses: number;
    avgMonthlyProfit: number;
  };
  scenarios: Scenario[];
}

export interface SeasonalMonth {
  month: number;
  monthName: string;
  average: number;
  min: number;
  max: number;
  seasonalIndex: number;
  classification: "peak" | "low" | "normal";
  dataPoints: number;
}

export interface SeasonalAnalysis {
  metric: string;
  overallAverage: number;
  monthlyAnalysis: SeasonalMonth[];
  quarterlyAnalysis: {
    quarter: string;
    months: string[];
    avgSeasonalIndex: number;
    totalAverage: number;
    classification: "strong" | "weak" | "normal";
  }[];
  patterns: {
    peakMonths: string[];
    lowMonths: string[];
    seasonalStrength: number;
    recommendation: string;
  };
}

export interface ServiceForecast {
  serviceId: number;
  serviceName: string;
  serviceColor: string;
  historical: {
    avgMonthlyRevenue: number;
    avgMonthlyExpenses: number;
    avgMonthlyProfit: number;
  };
  forecast: {
    avgMonthlyRevenue: number;
    avgMonthlyExpenses: number;
    avgMonthlyProfit: number;
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
  };
  trend: "up" | "down" | "stable";
  growthRate: number;
}

// ============ FORECASTING API ============
export const forecastingApi = {
  // Revenue forecasting
  getRevenueForecast: (months?: number, method?: string, serviceId?: number) => {
    const params = new URLSearchParams();
    if (months) params.append("months", months.toString());
    if (method) params.append("method", method);
    if (serviceId) params.append("serviceId", serviceId.toString());
    return apiFetch<RevenueForecast>(`/forecasting/revenue?${params.toString()}`);
  },

  // Expense projections
  getExpenseForecast: (months?: number, method?: string) => {
    const params = new URLSearchParams();
    if (months) params.append("months", months.toString());
    if (method) params.append("method", method);
    return apiFetch<ExpenseForecast>(`/forecasting/expenses?${params.toString()}`);
  },

  // Profit predictions
  getProfitForecast: (months?: number, method?: string) => {
    const params = new URLSearchParams();
    if (months) params.append("months", months.toString());
    if (method) params.append("method", method);
    return apiFetch<ProfitForecast>(`/forecasting/profit?${params.toString()}`);
  },

  // Scenario planning
  getScenarios: (months?: number) => {
    const params = new URLSearchParams();
    if (months) params.append("months", months.toString());
    return apiFetch<ScenarioPlanning>(`/forecasting/scenarios?${params.toString()}`);
  },

  // Seasonal analysis
  getSeasonalAnalysis: (metric?: string) => {
    const params = new URLSearchParams();
    if (metric) params.append("metric", metric);
    return apiFetch<SeasonalAnalysis>(`/forecasting/seasonal?${params.toString()}`);
  },

  // Service-level forecasts
  getServiceForecasts: (months?: number) => {
    const params = new URLSearchParams();
    if (months) params.append("months", months.toString());
    return apiFetch<{
      forecastMonths: number;
      services: ServiceForecast[];
      summary: {
        totalForecastRevenue: number;
        totalForecastExpenses: number;
        totalForecastProfit: number;
        topGrowing: string[];
        declining: string[];
      };
    }>(`/forecasting/by-service?${params.toString()}`);
  },
};

// ============ INSIGHTS TYPES ============
export type InsightSeverity = "critical" | "warning" | "info" | "success";
export type InsightCategory = "revenue" | "expense" | "profit" | "debt" | "goal" | "service" | "trend" | "anomaly";

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  category: InsightCategory;
  severity: InsightSeverity;
  metric?: string;
  value?: number | string;
  change?: number;
  recommendation?: string;
  actionUrl?: string;
  timestamp: string;
}

export interface InsightsResponse {
  period: string;
  dateRange: { start: string; end: string };
  totalInsights: number;
  bySeverity: {
    critical: number;
    warning: number;
    success: number;
    info: number;
  };
  insights: AIInsight[];
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  category: InsightCategory;
  priority: number;
  expectedBenefit?: string;
  steps?: string[];
}

export interface RecommendationsResponse {
  totalRecommendations: number;
  byImpact: {
    high: number;
    medium: number;
    low: number;
  };
  recommendations: Recommendation[];
}

export type AlertType = "threshold" | "anomaly" | "trend" | "deadline" | "reminder";

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: InsightSeverity;
  triggered: boolean;
  triggeredAt?: string;
  condition: string;
  value?: number | string;
  threshold?: number | string;
}

export interface AlertsResponse {
  totalAlerts: number;
  bySeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  byType: {
    threshold: number;
    anomaly: number;
    deadline: number;
    reminder: number;
  };
  alerts: Alert[];
}

export interface WeeklySummary {
  period: {
    start: string;
    end: string;
    weekNumber: number;
  };
  summary: {
    revenue: {
      current: number;
      previous: number;
      change: number;
      formatted: string;
    };
    expenses: {
      current: number;
      previous: number;
      change: number;
      formatted: string;
    };
    profit: {
      current: number;
      previous: number;
      change: number;
      formatted: string;
      margin: number;
    };
    debtCollected: {
      amount: number;
      formatted: string;
    };
  };
  dailyBreakdown: {
    revenue: { date: string; dayName: string; amount: number }[];
    expenses: { date: string; dayName: string; amount: number }[];
  };
  servicePerformance: {
    name: string;
    color: string;
    revenue: number;
    share: string | number;
  }[];
  topTransactions: {
    revenue: { amount: number; description: string | null; date: string; service: string | null }[];
    expenses: { amount: number; description: string | null; category: string; date: string }[];
  };
  goalsProgress: {
    name: string;
    progress: string | number;
    type: string;
  }[];
  highlights: string[];
  generatedAt: string;
}

// ============ INSIGHTS API ============
export const insightsApi = {
  // Get AI-generated insights
  getInsights: (period: "week" | "month" | "quarter" = "month") =>
    apiFetch<InsightsResponse>(`/insights/insights?period=${period}`),

  // Get performance recommendations
  getRecommendations: () =>
    apiFetch<RecommendationsResponse>("/insights/recommendations"),

  // Get active alerts
  getAlerts: () =>
    apiFetch<AlertsResponse>("/insights/alerts"),

  // Get weekly summary
  getWeeklySummary: () =>
    apiFetch<WeeklySummary>("/insights/weekly-summary"),
};

// ============ REPORTS TYPES ============
export interface ReportType {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  parameters: string[];
  icon: string;
}

export interface DailyReportSummary {
  totalRevenue: number;
  totalRevenueFormatted: string;
  totalExpenses: number;
  totalExpensesFormatted: string;
  netProfit: number;
  netProfitFormatted: string;
  profitMargin: string;
  totalDebtPayments: number;
  totalDebtPaymentsFormatted: string;
  totalNewDebts: number;
  totalNewDebtsFormatted: string;
}

export interface DailyReport {
  reportType: string;
  reportDate: string;
  generatedAt: string;
  summary: DailyReportSummary;
  comparison: {
    revenueChange: string;
    expenseChange: string;
    previousRevenue: number;
    previousExpenses: number;
  };
  breakdown: {
    revenueByService: {
      serviceId: number;
      serviceName: string;
      total: number;
      totalFormatted: string;
      transactionCount: number;
      percentage: string;
    }[];
    expensesByCategory: {
      category: string;
      total: number;
      totalFormatted: string;
      transactionCount: number;
      percentage: string;
    }[];
    debtPayments: {
      debtorName: string;
      amount: number;
      amountFormatted: string;
    }[];
    newDebts: {
      debtorName: string;
      amount: number;
      amountFormatted: string;
    }[];
  };
}

export interface WeeklyReportSummary {
  totalRevenue: number;
  totalRevenueFormatted: string;
  totalExpenses: number;
  totalExpensesFormatted: string;
  netProfit: number;
  netProfitFormatted: string;
  profitMargin: string;
  avgDailyRevenue: number;
  avgDailyRevenueFormatted: string;
  avgDailyExpenses: number;
  avgDailyExpensesFormatted: string;
  debtCollected: number;
  debtCollectedFormatted: string;
  paymentsReceived: number;
}

export interface WeeklyReport {
  reportType: string;
  period: { startDate: string; endDate: string };
  generatedAt: string;
  summary: WeeklyReportSummary;
  comparison: {
    prevWeekRevenue: number;
    prevWeekExpenses: number;
    revenueChange: string;
    expenseChange: string;
  };
  highlights: {
    bestDay: { date: string; revenue: number; revenueFormatted: string } | null;
    worstDay: { date: string; revenue: number; revenueFormatted: string } | null;
    topService: { name: string; revenue: number; revenueFormatted: string } | null;
  };
  dailyBreakdown: {
    date: string;
    dayName: string;
    revenue: number;
    revenueFormatted: string;
    expenses: number;
    expensesFormatted: string;
    profit: number;
    profitFormatted: string;
  }[];
  servicePerformance: {
    serviceId: number;
    serviceName: string;
    revenue: number;
    revenueFormatted: string;
    expenses: number;
    expensesFormatted: string;
    profit: number;
    profitFormatted: string;
    profitMargin: string;
  }[];
  goalProgress: {
    id: number;
    title: string;
    targetAmount: number;
    currentAmount: number;
    progress: string;
    status: string;
  }[];
}

export interface MonthlyReportSummary {
  totalRevenue: number;
  totalRevenueFormatted: string;
  totalExpenses: number;
  totalExpensesFormatted: string;
  netProfit: number;
  netProfitFormatted: string;
  grossProfitMargin: string;
  avgDailyRevenue: number;
  avgDailyRevenueFormatted: string;
  avgDailyExpenses: number;
  avgDailyExpensesFormatted: string;
  projectedMonthlyRevenue: number;
  projectedMonthlyRevenueFormatted: string;
}

export interface MonthlyReport {
  reportType: string;
  period: {
    month: number;
    monthName: string;
    year: number;
    startDate: string;
    endDate: string;
    daysInMonth: number;
    daysPassed: number;
  };
  generatedAt: string;
  summary: MonthlyReportSummary;
  comparison: {
    prevMonthRevenue: number;
    prevMonthRevenueFormatted: string;
    prevMonthExpenses: number;
    prevMonthExpensesFormatted: string;
    revenueChange: string;
    expenseChange: string;
  };
  revenueBreakdown: {
    byService: {
      serviceId: number;
      serviceName: string;
      total: number;
      totalFormatted: string;
      percentage: string;
    }[];
    byWeek: {
      week: string;
      total: number;
      totalFormatted: string;
    }[];
  };
  expenseBreakdown: {
    byCategory: {
      category: string;
      total: number;
      totalFormatted: string;
      count: number;
      percentage: string;
    }[];
    byService: {
      serviceId: number;
      serviceName: string;
      total: number;
      totalFormatted: string;
    }[];
  };
  debtSummary: {
    totalOutstanding: number;
    totalOutstandingFormatted: string;
    collectedThisMonth: number;
    collectedThisMonthFormatted: string;
    newDebtsThisMonth: number;
    newDebtsThisMonthFormatted: string;
    netDebtChange: number;
  };
  goalProgress: {
    id: number;
    title: string;
    goalType: string;
    targetAmount: number;
    targetAmountFormatted: string;
    currentAmount: number;
    currentAmountFormatted: string;
    progress: string;
    status: string;
  }[];
}

export interface ServiceReport {
  reportType: string;
  service: {
    id: number;
    name: string;
    description: string;
    dailyTarget: number;
    monthlyTarget: number;
  };
  period: { startDate: string; endDate: string; periodName: string };
  generatedAt: string;
  summary: {
    totalRevenue: number;
    totalRevenueFormatted: string;
    totalExpenses: number;
    totalExpensesFormatted: string;
    netProfit: number;
    netProfitFormatted: string;
    profitMargin: string;
    totalDebt: number;
    totalDebtFormatted: string;
    transactionCount: number;
  };
  revenueBreakdown: {
    byPaymentMethod: {
      method: string;
      total: number;
      totalFormatted: string;
      percentage: string;
    }[];
    transactions: {
      date: string;
      amount: number;
      amountFormatted: string;
      description: string;
      paymentMethod: string;
    }[];
  };
  expenseBreakdown: {
    byCategory: {
      category: string;
      total: number;
      totalFormatted: string;
      percentage: string;
    }[];
    transactions: {
      date: string;
      amount: number;
      amountFormatted: string;
      category: string;
      description: string;
    }[];
  };
  dailyBreakdown: {
    date: string;
    revenue: number;
    revenueFormatted: string;
    expenses: number;
    expensesFormatted: string;
    profit: number;
    profitFormatted: string;
  }[];
  debts: {
    debtorName: string;
    originalAmount: number;
    originalAmountFormatted: string;
    balance: number;
    balanceFormatted: string;
    status: string;
    dueDate: string;
  }[];
  goals: {
    id: number;
    title: string;
    targetAmount: number;
    currentAmount: number;
    progress: string;
    period: string;
    status: string;
  }[];
}

export interface DebtsAgingBucket {
  count: number;
  total: number;
  totalFormatted: string;
}

export interface DebtItem {
  id: number;
  debtorName: string;
  debtorContact: string;
  serviceId: number;
  serviceName: string;
  originalAmount: number;
  originalAmountFormatted: string;
  amountPaid: number;
  amountPaidFormatted: string;
  balance: number;
  balanceFormatted: string;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  status: string;
}

export interface DebtsAgingReport {
  reportType: string;
  reportDate: string;
  generatedAt: string;
  summary: {
    totalOutstanding: number;
    totalOutstandingFormatted: string;
    totalOverdue: number;
    totalOverdueFormatted: string;
    totalDebtors: number;
    overduePercentage: string;
    avgDebtAge: number;
  };
  agingBuckets: {
    current: DebtsAgingBucket;
    days1to30: DebtsAgingBucket;
    days31to60: DebtsAgingBucket;
    days61to90: DebtsAgingBucket;
    over90: DebtsAgingBucket;
  };
  agingDetails: {
    current: DebtItem[];
    days1to30: DebtItem[];
    days31to60: DebtItem[];
    days61to90: DebtItem[];
    over90: DebtItem[];
  };
  debtByService: {
    serviceId: number;
    serviceName: string;
    totalBalance: number;
    totalBalanceFormatted: string;
    count: number;
    percentage: string;
  }[];
  topDebtors: DebtItem[];
  collectionHistory: {
    month: string;
    monthName: string;
    collected: number;
    collectedFormatted: string;
  }[];
}

export interface GoalReportItem {
  id: number;
  title: string;
  serviceId?: number;
  serviceName: string;
  goalType: string;
  period: string;
  targetAmount: number;
  targetAmountFormatted: string;
  currentAmount: number;
  currentAmountFormatted: string;
  progress: string;
  remaining?: number;
  remainingFormatted?: string;
  startDate?: string;
  endDate?: string;
  daysRemaining?: number;
  status: string;
  isOnTrack?: boolean;
}

export interface GoalHistoryItem {
  id: number;
  title: string;
  serviceName: string;
  goalType: string;
  period: string;
  targetAmount: number;
  targetAmountFormatted: string;
  achievedAmount: number;
  achievedAmountFormatted: string;
  achievementRate: string;
  status: string;
  completedAt: string;
}

export interface GoalsReport {
  reportType: string;
  generatedAt: string;
  summary: {
    totalActiveGoals: number;
    onTrackGoals: number;
    atRiskGoals: number;
    completedAllTime: number;
    missedAllTime: number;
    avgAchievementRate: string;
    successRate: string;
  };
  activeGoals: GoalReportItem[];
  goalsByType: {
    revenue: { count: number; totalTarget: number; totalCurrent: number };
    profit: { count: number; totalTarget: number; totalCurrent: number };
    expense: { count: number; totalTarget: number; totalCurrent: number };
  };
  goalsByPeriod: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  achievementHistory: GoalHistoryItem[];
  achievementByPeriod: {
    period: string;
    avgRate: string;
    count: number;
  }[];
}

// ============ SCHEDULED REPORTS TYPES ============
export interface ScheduledReport {
  id: number;
  userId: number | null;
  name: string;
  reportType: string;
  serviceId: number | null;
  serviceName: string | null;
  schedule: "daily" | "weekly" | "monthly";
  scheduleTime: string | null;
  scheduleDay: number | null;
  exportFormat: string | null;
  emailDelivery: boolean | null;
  emailRecipients: string[];
  isActive: boolean | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string | null;
  updatedAt?: string | null;
}

export interface CreateScheduledReport {
  name: string;
  reportType: string;
  serviceId?: number | null;
  schedule: "daily" | "weekly" | "monthly";
  scheduleTime?: string;
  scheduleDay?: number | null;
  exportFormat?: string;
  emailDelivery?: boolean;
  emailRecipients?: string[];
}

export interface ReportHistoryItem {
  id: number;
  userId: number | null;
  scheduledReportId: number | null;
  scheduleName: string | null;
  reportType: string;
  reportName: string;
  exportFormat: string;
  parameters: Record<string, unknown> | null;
  status: string | null;
  errorMessage: string | null;
  fileSize: number | null;
  fileSizeFormatted: string | null;
  filePath: string | null;
  emailSent: boolean | null;
  emailSentTo: string[];
  generatedAt: string | null;
  expiresAt: string | null;
}

export interface ScheduledReportsStats {
  totalSchedules: number;
  activeSchedules: number;
  inactiveSchedules: number;
  byReportType: Record<string, number>;
  bySchedule: Record<string, number>;
  last30Days: {
    totalReports: number;
    failedReports: number;
    successRate: string;
  };
}

export interface UpcomingSchedule {
  id: number;
  name: string;
  reportType: string;
  nextRunAt: string | null;
}

// ============ REPORTS API ============
export const reportsApi = {
  // Get available report types
  getTypes: () =>
    apiFetch<{ reportTypes: ReportType[] }>("/reports/types"),

  // Daily Summary Report
  getDaily: (date?: string) =>
    apiFetch<DailyReport>(`/reports/daily${date ? `?date=${date}` : ""}`),

  // Weekly Performance Report
  getWeekly: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const query = params.toString();
    return apiFetch<WeeklyReport>(`/reports/weekly${query ? `?${query}` : ""}`);
  },

  // Monthly Financial Report
  getMonthly: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append("month", month.toString());
    if (year) params.append("year", year.toString());
    const query = params.toString();
    return apiFetch<MonthlyReport>(`/reports/monthly${query ? `?${query}` : ""}`);
  },

  // Service-Wise Report
  getService: (serviceId: number, period?: string) =>
    apiFetch<ServiceReport>(`/reports/service/${serviceId}${period ? `?period=${period}` : ""}`),

  // Debts Aging Report
  getDebtsAging: () =>
    apiFetch<DebtsAgingReport>("/reports/debts-aging"),

  // Goal Achievement Report
  getGoals: (period?: string) =>
    apiFetch<GoalsReport>(`/reports/goals${period ? `?period=${period}` : ""}`),
};

// ============ SCHEDULED REPORTS API ============
export const scheduledReportsApi = {
  // Get all scheduled reports
  getAll: () =>
    apiFetch<{ schedules: ScheduledReport[] }>("/scheduled-reports"),

  // Get single scheduled report
  getOne: (id: number) =>
    apiFetch<{ schedule: ScheduledReport }>(`/scheduled-reports/${id}`),

  // Create new scheduled report
  create: (data: CreateScheduledReport) =>
    apiFetch<{ schedule: ScheduledReport; message: string }>("/scheduled-reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update scheduled report
  update: (id: number, data: Partial<CreateScheduledReport & { isActive?: boolean }>) =>
    apiFetch<{ schedule: ScheduledReport; message: string }>(`/scheduled-reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete scheduled report
  delete: (id: number) =>
    apiFetch<{ message: string }>(`/scheduled-reports/${id}`, {
      method: "DELETE",
    }),

  // Toggle active status
  toggle: (id: number) =>
    apiFetch<{ isActive: boolean; message: string }>(`/scheduled-reports/${id}/toggle`, {
      method: "POST",
    }),

  // Manually run a scheduled report
  run: (id: number) =>
    apiFetch<{ historyEntry: ReportHistoryItem; message: string }>(`/scheduled-reports/${id}/run`, {
      method: "POST",
    }),

  // Get report history (all)
  getHistory: (params?: { limit?: number; offset?: number; reportType?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());
    if (params?.reportType) searchParams.append("reportType", params.reportType);
    if (params?.status) searchParams.append("status", params.status);
    const query = searchParams.toString();
    return apiFetch<{ history: ReportHistoryItem[]; total: number; limit: number; offset: number }>(
      `/scheduled-reports/history/all${query ? `?${query}` : ""}`
    );
  },

  // Get history for specific schedule
  getScheduleHistory: (scheduleId: number, limit?: number) =>
    apiFetch<{ history: ReportHistoryItem[] }>(
      `/scheduled-reports/${scheduleId}/history${limit ? `?limit=${limit}` : ""}`
    ),

  // Delete history entry
  deleteHistory: (historyId: number) =>
    apiFetch<{ message: string }>(`/scheduled-reports/history/${historyId}`, {
      method: "DELETE",
    }),

  // Get statistics
  getStats: () =>
    apiFetch<{ stats: ScheduledReportsStats; upcomingSchedules: UpcomingSchedule[] }>(
      "/scheduled-reports/stats/summary"
    ),
};

// ============ ACTIVITIES API ============
export interface Activity {
  id: number;
  serviceId: number | null;
  serviceName: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  action: "create" | "read" | "update" | "delete";
  entityType: "revenue" | "expense" | "debt" | "goal" | "service" | "payment";
  entityId: number | null;
  entityName: string | null;
  details: string | null;
  createdAt: string;
}

export interface ActivitySummary {
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
}

export interface ActivityStats {
  totalActivities: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byService: { serviceId: number; serviceName: string; count: number }[];
  recentTrend: { date: string; count: number }[];
}

export const activitiesApi = {
  // Get all activities with optional filters
  getAll: (params?: { 
    serviceId?: number; 
    action?: string; 
    entityType?: string; 
    limit?: number; 
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.serviceId) searchParams.append("serviceId", params.serviceId.toString());
    if (params?.action) searchParams.append("action", params.action);
    if (params?.entityType) searchParams.append("entityType", params.entityType);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());
    const query = searchParams.toString();
    return apiFetch<{ activities: Activity[]; total: number }>(
      `/activities${query ? `?${query}` : ""}`
    );
  },

  // Get activities for a specific service
  getByService: (serviceId: number, params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());
    const query = searchParams.toString();
    return apiFetch<{ activities: Activity[]; total: number; summary: ActivitySummary }>(
      `/activities/service/${serviceId}${query ? `?${query}` : ""}`
    );
  },

  // Get activity summary/stats
  getSummary: (days?: number) =>
    apiFetch<ActivityStats>(`/activities/summary${days ? `?days=${days}` : ""}`),

  // Log an activity (usually called automatically by other CRUD operations)
  create: (data: {
    serviceId?: number;
    action: "create" | "read" | "update" | "delete";
    entityType: "revenue" | "expense" | "debt" | "goal" | "service" | "payment";
    entityId?: number;
    entityName?: string;
    details?: string;
  }) =>
    apiFetch<{ activity: Activity; message: string }>("/activities", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============ ENTRIES API (Unified Income/Expense) ============
export interface Entry {
  id: number;
  type: "income" | "expense";
  amount: number;
  serviceId: number | null;
  serviceName: string | null;
  category: string | null;
  description: string | null;
  images: string[];
  date: string;
  userId: number | null;
  userName: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface EntrySummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeCount: number;
  expenseCount: number;
  byService: {
    serviceId: number | null;
    serviceName: string | null;
    type: string;
    total: number;
    count: number;
  }[];
  byCategory: {
    category: string;
    total: number;
    count: number;
  }[];
  dailyTrend: {
    date: string;
    type: string;
    total: number;
  }[];
}

export const entriesApi = {
  // Get all entries with filters
  getAll: (params?: {
    type?: "income" | "expense";
    serviceId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append("type", params.type);
    if (params?.serviceId) searchParams.append("serviceId", params.serviceId.toString());
    if (params?.startDate) searchParams.append("startDate", params.startDate);
    if (params?.endDate) searchParams.append("endDate", params.endDate);
    if (params?.search) searchParams.append("search", params.search);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset) searchParams.append("offset", params.offset.toString());
    const query = searchParams.toString();
    return apiFetch<{ entries: Entry[]; total: number }>(
      `/entries${query ? `?${query}` : ""}`
    );
  },

  // Get summary statistics
  getSummary: (params?: { startDate?: string; endDate?: string; serviceId?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append("startDate", params.startDate);
    if (params?.endDate) searchParams.append("endDate", params.endDate);
    if (params?.serviceId) searchParams.append("serviceId", params.serviceId.toString());
    const query = searchParams.toString();
    return apiFetch<EntrySummary>(`/entries/summary${query ? `?${query}` : ""}`);
  },

  // Get single entry
  getById: (id: number) => apiFetch<{ entry: Entry }>(`/entries/${id}`),

  // Create entry
  create: (data: {
    type: "income" | "expense";
    amount: number;
    serviceId?: number;
    category?: string;
    description?: string;
    images?: string[];
    date: string;
  }) =>
    apiFetch<{ entry: Entry; message: string }>("/entries", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update entry
  update: (id: number, data: Partial<{
    type: "income" | "expense";
    amount: number;
    serviceId?: number;
    category?: string;
    description?: string;
    images?: string[];
    date: string;
  }>) =>
    apiFetch<{ entry: Entry; message: string }>(`/entries/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete entry
  delete: (id: number) =>
    apiFetch<{ message: string }>(`/entries/${id}`, {
      method: "DELETE",
    }),

  // Upload image
  uploadImage: (image: string) =>
    apiFetch<{ url: string; message: string }>("/entries/upload-image", {
      method: "POST",
      body: JSON.stringify({ image }),
    }),
};
