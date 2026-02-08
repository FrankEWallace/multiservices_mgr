// Helper functions for building filter conditions in dashboard queries
import { sql, eq, gte, lte, and } from "drizzle-orm";
import { revenues, expenses, entries, services } from "../db/schema";

export function buildRevenueConditions(filters: {
  serviceId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const conditions: any[] = [];
  
  if (filters.serviceId) {
    conditions.push(eq(revenues.serviceId, Number(filters.serviceId)));
  }
  if (filters.startDate) {
    conditions.push(gte(revenues.date, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(revenues.date, filters.endDate));
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export function buildEntriesConditions(filters: {
  serviceId?: string;
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense';
}) {
  const conditions: any[] = [];
  
  if (filters.type) {
    conditions.push(eq(entries.type, filters.type));
  }
  if (filters.serviceId) {
    conditions.push(eq(entries.serviceId, Number(filters.serviceId)));
  }
  if (filters.startDate) {
    conditions.push(gte(entries.date, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(entries.date, filters.endDate));
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export function buildExpensesConditions(filters: {
  serviceId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const conditions: any[] = [];
  
  if (filters.serviceId) {
    conditions.push(eq(expenses.serviceId, Number(filters.serviceId)));
  }
  if (filters.startDate) {
    conditions.push(gte(expenses.date, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(expenses.date, filters.endDate));
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined;
}
