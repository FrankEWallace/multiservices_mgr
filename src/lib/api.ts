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
  getMadeniSummary: () => apiFetch<{ summary: MadeniSummary }>("/dashboard/madeni-summary"),
  getGoalProgress: () => apiFetch<{ goals: GoalProgress[] }>("/dashboard/goal-progress"),
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
};

// Madeni API
export const madeniApi = {
  getAll: (status?: string, serviceId?: number) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (serviceId) params.append("serviceId", serviceId.toString());
    return apiFetch<{ madenis: Madeni[] }>(`/madeni?${params.toString()}`);
  },
  getAging: () => apiFetch<{ aging: AgingReport[]; total: { amount: number; count: number } }>("/madeni/aging"),
  getOne: (id: number) => apiFetch<{ madeni: Madeni; payments: MadeniPayment[] }>(`/madeni/${id}`),
  create: (data: Partial<Madeni>) =>
    apiFetch<{ madeni: Madeni }>("/madeni", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  recordPayment: (id: number, data: { amount: number; paymentDate: string; paymentMethod: string }) =>
    apiFetch<{ payment: MadeniPayment; newBalance: number; newStatus: string }>(`/madeni/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Madeni>) =>
    apiFetch<{ madeni: Madeni }>(`/madeni/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<{ message: string }>(`/madeni/${id}`, { method: "DELETE" }),
};

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

export interface MadeniSummary {
  total: number;
  count: number;
  overdue: number;
  dueSoon: number;
}

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

export interface Madeni {
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

export interface MadeniPayment {
  id: number;
  madeniId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  createdAt?: string;
}

export interface AgingReport {
  label: string;
  amount: number;
  count: number;
  color: string;
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
