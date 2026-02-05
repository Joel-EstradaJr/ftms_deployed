import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

// ============================================================================
// TYPES - Re-export from main hook
// ============================================================================

export type { DashboardSummary, MonthlyAggregate, ForecastData } from './useDashboardData';

import type { DashboardSummary, ForecastData } from './useDashboardData';

// ============================================================================
// API FUNCTIONS - STAFF VERSION
// ============================================================================

async function fetchStaffDashboardSummary(
    dateFilter?: string,
    dateFrom?: string,
    dateTo?: string
): Promise<DashboardSummary> {
    const params = new URLSearchParams();
    if (dateFilter) params.set('dateFilter', dateFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    // STAFF endpoint
    const url = `${API_BASE_URL}/api/v1/staff/dashboard/summary${params.toString() ? `?${params}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch staff dashboard summary: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
}

async function fetchStaffForecastData(months: number = 12): Promise<ForecastData> {
    // STAFF endpoint
    const url = `${API_BASE_URL}/api/v1/staff/dashboard/forecast-data?months=${months}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch staff forecast data: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
}

// ============================================================================
// HOOKS - STAFF VERSION
// ============================================================================

/**
 * Hook to fetch staff dashboard summary data
 * No caching - always fetches fresh data for accurate financial reporting
 */
export function useStaffDashboardData(
    dateFilter?: string,
    dateFrom?: string,
    dateTo?: string
) {
    return useQuery({
        queryKey: ['staff-dashboard', 'summary', dateFilter, dateFrom, dateTo],
        queryFn: () => fetchStaffDashboardSummary(dateFilter, dateFrom, dateTo),
        staleTime: 0,              // Always fetch fresh data (no cache)
        refetchInterval: 30000,    // Auto-refresh every 30 seconds
        refetchOnWindowFocus: true // Refresh when user returns to tab
    });
}

/**
 * Hook to fetch staff forecast data for predictive analytics
 * No caching - always fetches fresh data
 */
export function useStaffForecastData(months: number = 12) {
    return useQuery({
        queryKey: ['staff-dashboard', 'forecast', months],
        queryFn: () => fetchStaffForecastData(months),
        staleTime: 0,              // Always fetch fresh data
        refetchInterval: 30000,    // Auto-refresh every 30 seconds
        refetchOnWindowFocus: true
    });
}
