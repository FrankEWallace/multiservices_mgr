# Dashboard Filters Implementation

## Overview
Implemented functional filters on the Dashboard page to allow filtering by **Service** and **Date Range**. Users can now view data for specific services and custom time periods.

## ✅ What Was Implemented (Frontend)

### 1. **Filter UI on Dashboard**
Added a new Filters section with:
- **Service Selector**: Dropdown to select a specific service or "All Services"
- **Clear Filter Button**: Appears when a service is selected
- **Date Range Picker**: Already existed, now properly integrated with filtering

Location: `src/pages/Index.tsx`

```tsx
{/* Filters Row */}
<div className="glass-card p-4">
  <div className="flex flex-wrap items-center gap-4">
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">Filters:</span>
    </div>
    <div className="flex-1 min-w-[200px] max-w-xs">
      <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
        <SelectTrigger className="bg-secondary border-border">
          <SelectValue placeholder="All Services" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Services</SelectItem>
          {servicesData?.services?.map((service) => (
            <SelectItem key={service.id} value={service.id.toString()}>
              {service.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    {selectedServiceId !== "all" && (
      <Button variant="ghost" size="sm" onClick={() => setSelectedServiceId("all")}>
        Clear Filter
      </Button>
    )}
  </div>
</div>
```

### 2. **State Management**
Added filter states:
```typescript
const [selectedServiceId, setSelectedServiceId] = useState<string>("all");
const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
```

### 3. **Updated API Calls**
Modified `src/lib/api.ts` to support filter parameters:

```typescript
export const dashboardApi = {
  getKPIs: (filters?: { serviceId?: number; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.serviceId) params.append('serviceId', filters.serviceId.toString());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const queryString = params.toString();
    return apiFetch<{ kpis: KPI[] }>(`/dashboard/kpis${queryString ? `?${queryString}` : ''}`);
  },
  getRevenueChart: (filters?: { period?: string; serviceId?: number; startDate?: string; endDate?: string }) => {
    // Similar implementation
  },
  getServiceComparison: (filters?: { startDate?: string; endDate?: string }) => {
    // Similar implementation
  },
  getGoalProgress: (filters?: { serviceId?: number }) => {
    // Similar implementation
  },
};
```

### 4. **Component Updates**

#### **Dashboard (Index.tsx)**
- Passes filters to child components
- Updates query keys with filter parameters for proper refetching

```typescript
// KPIs Query with filters
const { data: kpiData } = useQuery({
  queryKey: ["dashboard", "kpis", selectedServiceId, dateRange.from, dateRange.to],
  queryFn: () => dashboardApi.getKPIs({
    serviceId: selectedServiceId !== "all" ? Number(selectedServiceId) : undefined,
    startDate: dateRange.from.toISOString().split('T')[0],
    endDate: dateRange.to.toISOString().split('T')[0],
  }),
});

// Pass filters to components
<RevenueChart 
  serviceId={selectedServiceId !== "all" ? Number(selectedServiceId) : undefined}
  startDate={dateRange.from.toISOString().split('T')[0]}
  endDate={dateRange.to.toISOString().split('T')[0]}
/>
```

#### **RevenueChart.tsx**
- Accepts `serviceId`, `startDate`, `endDate` props
- Updates query with filter parameters
- Applied number formatting to tooltips

```typescript
interface RevenueChartProps {
  serviceId?: number;
  startDate?: string;
  endDate?: string;
}

export function RevenueChart({ serviceId, startDate, endDate }: RevenueChartProps) {
  const { data } = useQuery({
    queryKey: ["dashboard", "revenue-chart", serviceId, startDate, endDate],
    queryFn: () => dashboardApi.getRevenueChart({ serviceId, startDate, endDate }),
  });
  // ...
}
```

#### **ServiceComparison.tsx**
- Accepts `startDate`, `endDate` props
- Filters service revenue by date range

```typescript
interface ServiceComparisonProps {
  startDate?: string;
  endDate?: string;
}

export function ServiceComparison({ startDate, endDate }: ServiceComparisonProps) {
  const { data } = useQuery({
    queryKey: ["dashboard", "service-comparison", startDate, endDate],
    queryFn: () => dashboardApi.getServiceComparison({ startDate, endDate }),
  });
  // ...
}
```

#### **GoalProgress.tsx**
- Accepts `serviceId` prop
- Filters goals by service

```typescript
interface GoalProgressProps {
  serviceId?: number;
}

export function GoalProgress({ serviceId }: GoalProgressProps) {
  const { data } = useQuery({
    queryKey: ["dashboard", "goal-progress", serviceId],
    queryFn: () => dashboardApi.getGoalProgress({ serviceId }),
  });
  // ...
}
```

## ⏳ Backend Updates Needed

The backend routes need to be updated to handle filter parameters. Here's what needs to be done:

### 1. **Update `/dashboard/kpis` Route**

File: `backend/src/routes/dashboard.ts`

```typescript
dashboard.get("/kpis", async (c) => {
  // Get filter parameters
  const serviceId = c.req.query('serviceId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  
  // Use filters in queries:
  // - If serviceId is provided, filter revenues/entries/expenses by service_id
  // - If startDate/endDate provided, use those instead of startOfMonth/today
  // - Build conditional WHERE clauses using drizzle-orm's and() function
  
  // Example:
  const serviceFilter = serviceId ? eq(revenues.serviceId, Number(serviceId)) : undefined;
  const conditions = [
    gte(revenues.date, startDate || startOfMonth),
    lte(revenues.date, endDate || today),
    serviceFilter
  ].filter(Boolean);
  
  const revenueResult = await db
    .select({ total: sum(revenues.amount) })
    .from(revenues)
    .where(and(...conditions));
});
```

### 2. **Update `/dashboard/revenue-chart` Route**

```typescript
dashboard.get("/revenue-chart", async (c) => {
  const serviceId = c.req.query('serviceId');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  
  // Filter chart data by service and date range
  // Update SQL queries to include WHERE clauses for service_id and date range
});
```

### 3. **Update `/dashboard/service-comparison` Route**

```typescript
dashboard.get("/service-comparison", async (c) => {
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  
  // Update the date filter from startOfMonth to use startDate/endDate parameters
  // Modify the SQL query:
  const startOfMonth = startDate || (new Date().toISOString().slice(0, 7) + "-01");
  const endOfPeriod = endDate || new Date().toISOString().split("T")[0];
  
  const comparison = await db.all(sql`
    SELECT 
      s.id, s.name, s.color, s.monthly_target as target,
      COALESCE(SUM(r.amount), 0) + COALESCE(SUM(e.amount), 0) as actual
    FROM ${services} s
    LEFT JOIN ${revenues} r ON r.service_id = s.id 
      AND r.date >= ${startOfMonth} 
      AND r.date <= ${endOfPeriod}
    LEFT JOIN ${entries} e ON e.service_id = s.id 
      AND e.type = 'income' 
      AND e.date >= ${startOfMonth}
      AND e.date <= ${endOfPeriod}
    WHERE s.is_active = 1
    GROUP BY s.id
    ORDER BY actual DESC
  `);
});
```

### 4. **Update `/dashboard/goal-progress` Route**

```typescript
dashboard.get("/goal-progress", async (c) => {
  const serviceId = c.req.query('serviceId');
  
  // Filter goals by service
  const conditions = serviceId 
    ? eq(goals.serviceId, Number(serviceId))
    : eq(goals.status, "active");
    
  const activeGoals = await db.select().from(goals).where(conditions);
});
```

## How It Works

### User Flow:
1. **Select Date Range**: User picks "Last 30 Days", "This Month", or custom range
2. **Select Service** (Optional): User picks a specific service from dropdown
3. **Data Updates**: All dashboard components automatically refetch with new filters
4. **Clear Filter**: User can clear service filter to see all services again

### Filter Behavior:

| Filter Applied | What Happens |
|---------------|--------------|
| **Date Range Only** | Shows data for all services within the date range |
| **Service Only** | Shows data for selected service within current month |
| **Both** | Shows data for selected service within selected date range |
| **Neither** | Shows all services for current month (default) |

## Components Affected

- ✅ **Dashboard KPIs**: Filters by service and date range
- ✅ **Revenue Chart**: Filters by service and date range  
- ✅ **Service Comparison**: Filters by date range (always shows all services for comparison)
- ✅ **Goal Progress**: Filters by service

## Technical Details

### Query Key Structure
Each component uses query keys that include filter parameters:

```typescript
["dashboard", "kpis", serviceId, dateFrom, dateTo]
["dashboard", "revenue-chart", serviceId, startDate, endDate]
["dashboard", "service-comparison", startDate, endDate]
["dashboard", "goal-progress", serviceId]
```

This ensures:
- Data refetches automatically when filters change
- React Query caches results per filter combination
- No unnecessary API calls

### URL Parameters
Backend endpoints expect these query parameters:
- `serviceId` (number): ID of the service to filter by
- `startDate` (string): Start date in YYYY-MM-DD format
- `endDate` (string): End date in YYYY-MM-DD format

Example:
```
GET /dashboard/kpis?serviceId=2&startDate=2026-01-01&endDate=2026-01-31
```

## Testing

To test the filters:

1. **Open Dashboard** - http://localhost:8082
2. **Change Date Range** - Select "Last 7 Days" or custom range
3. **Select a Service** - Choose "Transport" or another service
4. **Observe Changes**:
   - KPI cards update with filtered data
   - Revenue chart shows only that service's data
   - Service comparison respects date range
   - Goals filter to selected service
5. **Clear Filter** - Click "Clear Filter" to return to all services

## Next Steps

1. ✅ Frontend filter UI - **COMPLETE**
2. ✅ Frontend API integration - **COMPLETE**
3. ✅ Component filter props - **COMPLETE**
4. ⏳ Backend route updates - **PENDING**
5. ⏳ Backend testing - **PENDING**
6. ⏳ End-to-end testing - **PENDING**

## Files Modified

### Frontend
- `src/pages/Index.tsx` - Added filter UI and state
- `src/lib/api.ts` - Updated API functions to accept filters
- `src/components/dashboard/RevenueChart.tsx` - Accept filter props
- `src/components/dashboard/ServiceComparison.tsx` - Accept date filters
- `src/components/dashboard/GoalProgress.tsx` - Accept service filter

### Backend (Needs Updates)
- `backend/src/routes/dashboard.ts` - All routes need filter parameter support
  - `/dashboard/kpis`
  - `/dashboard/revenue-chart`
  - `/dashboard/service-comparison`  
  - `/dashboard/goal-progress`

## Benefits

✅ **Better Data Analysis**: Users can focus on specific services or time periods
✅ **Improved Decision Making**: Compare performance across different timeframes
✅ **Flexible Reporting**: Custom date ranges for any analysis need
✅ **Service-Specific Insights**: Deep dive into individual service performance
✅ **Clean UX**: Intuitive filter interface with clear feedback
✅ **Performant**: React Query caching prevents unnecessary API calls

## Future Enhancements

- Add "Compare Services" mode to compare 2-3 services side-by-side
- Add "Export Filtered Data" button
- Save favorite filter combinations
- Add URL parameters to share filtered dashboard views
- Add filter presets (This Week, Last Quarter, etc.)
