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

// API fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (authToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    
    // Handle 401 - clear token and redirect to login
    if (response.status === 401) {
      setAuthToken(null);
      window.location.href = "/login";
    }
    
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
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
