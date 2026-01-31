import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardSummary {
    revenue: {
        total: number;
        byCategory: Record<string, { name: string; amount: number; count: number }>;
    };
    expense: {
        total: number;
        byCategory: Record<string, { name: string; amount: number; count: number }>;
    };
    profit: number;
    periodLabel: string;
}

export interface MonthlyAggregate {
    month: string;
    year: number;
    monthNum: number;
    totalAmount: number;
    count: number;
    avgAmount: number;
    byCategory?: Record<number, { name: string; amount: number; count: number }>;
}

export interface ForecastData {
    revenueAggregates: MonthlyAggregate[];
    expenseAggregates: MonthlyAggregate[];
    revenueTypes: { id: number; code: string; name: string }[];
    expenseTypes: { id: number; code: string; name: string }[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function fetchDashboardSummary(
    dateFilter?: string,
    dateFrom?: string,
    dateTo?: string
): Promise<DashboardSummary> {
    const params = new URLSearchParams();
    if (dateFilter) params.set('dateFilter', dateFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    const url = `${API_BASE_URL}/api/v1/dashboard/summary${params.toString() ? `?${params}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch dashboard summary: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
}

async function fetchForecastData(months: number = 12): Promise<ForecastData> {
    const url = `${API_BASE_URL}/api/v1/dashboard/forecast-data?months=${months}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch forecast data: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to fetch dashboard summary data
 * No caching - always fetches fresh data for accurate financial reporting
 */
export function useDashboardData(
    dateFilter?: string,
    dateFrom?: string,
    dateTo?: string
) {
    return useQuery({
        queryKey: ['dashboard', 'summary', dateFilter, dateFrom, dateTo],
        queryFn: () => fetchDashboardSummary(dateFilter, dateFrom, dateTo),
        staleTime: 0,              // Always fetch fresh data (no cache)
        refetchInterval: 30000,    // Auto-refresh every 30 seconds
        refetchOnWindowFocus: true // Refresh when user returns to tab
    });
}

/**
 * Hook to fetch forecast data for predictive analytics
 * No caching - always fetches fresh data
 */
export function useForecastData(months: number = 12) {
    return useQuery({
        queryKey: ['dashboard', 'forecast', months],
        queryFn: () => fetchForecastData(months),
        staleTime: 0,              // Always fetch fresh data
        refetchInterval: 30000,    // Auto-refresh every 30 seconds
        refetchOnWindowFocus: true
    });
}
