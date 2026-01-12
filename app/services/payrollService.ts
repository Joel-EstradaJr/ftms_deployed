/**
 * Payroll Service - Backend API Integration
 * Connects to the FTMS backend API for payroll data retrieval
 * Supports weekly payroll periods (Monday → Saturday)
 */

import { api } from '../lib/api';

// ============================================================================
// WEEKLY PERIOD HELPERS
// ============================================================================

/**
 * Get the Monday of the week containing the given date
 */
export function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the Saturday of the week containing the given date
 */
export function getWeekSaturday(date: Date): Date {
  const monday = getWeekMonday(date);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);
  return saturday;
}

/**
 * Format date as YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get weekly period for a given date
 */
export function getWeeklyPeriod(date: Date): { period: number; start: string; end: string } {
  const monday = getWeekMonday(date);
  const saturday = getWeekSaturday(date);

  // Calculate week number in the year
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  return {
    period: weekNumber,
    start: formatDateString(monday),
    end: formatDateString(saturday),
  };
}

/**
 * Get current weekly period
 */
export function getCurrentWeeklyPeriod(): { period: number; start: string; end: string } {
  return getWeeklyPeriod(new Date());
}

// ============================================================================
// SEMI-MONTHLY PERIOD HELPERS
// ============================================================================

/**
 * Get semi-monthly period dates for a given year, month, and period type
 * @param year - The year
 * @param month - The month (0-indexed, 0 = January)
 * @param periodType - 1 for 1st-15th, 2 for 16th-end of month
 */
export function getSemiMonthlyPeriod(
  year: number,
  month: number,
  periodType: 1 | 2
): { startDate: string; endDate: string } {
  if (periodType === 1) {
    // First half: 1st to 15th
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month, 15);
    return {
      startDate: formatDateString(startDate),
      endDate: formatDateString(endDate),
    };
  } else {
    // Second half: 16th to end of month
    const startDate = new Date(year, month, 16);
    const endDate = new Date(year, month + 1, 0); // Last day of the month
    return {
      startDate: formatDateString(startDate),
      endDate: formatDateString(endDate),
    };
  }
}

// ============================================================================
// HR PAYROLL DATA TYPES
// ============================================================================

export interface HrPayrollAttendance {
  date: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Late' | 'Overtime';
}

export interface HrPayrollBenefitType {
  id: string;
  name: string;
}

export interface HrPayrollBenefit {
  name?: string;  // Flat structure from new HR API
  value: string;
  frequency: 'Once' | 'Daily' | 'Weekly' | 'Monthly' | 'Annually';
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
  benefit_type?: HrPayrollBenefitType;  // Legacy format
}

export interface HrPayrollDeductionType {
  id: string;
  name: string;
}

export interface HrPayrollDeduction {
  name?: string;  // Flat structure from new HR API
  value: string;
  frequency: 'Once' | 'Daily' | 'Weekly' | 'Monthly' | 'Annually';
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
  deduction_type?: HrPayrollDeductionType;  // Legacy format
}

export interface HrPayrollData {
  payroll_period_start: string;
  payroll_period_end: string;
  employee_number: string;
  employee_name?: string;
  basic_rate: string;
  rate_type: 'Daily' | 'Weekly' | 'Monthly' | 'Semi-Monthly';
  present_days?: number;
  attendances: HrPayrollAttendance[];
  benefits: HrPayrollBenefit[];
  deductions: HrPayrollDeduction[];
}

/**
 * Grouped payroll batch (one period, multiple employees)
 */
export interface PayrollBatchGroup {
  payroll_period_start: string;
  payroll_period_end: string;
  total_employees: number;
  employees: HrPayrollData[];
}

/**
 * Query parameters for HR payroll endpoint
 */
export interface HrPayrollQueryParams {
  payroll_period_start?: string;
  payroll_period_end?: string;
  employee_number?: string;
  grouped?: boolean | string;
}

// ============================================================================
// FREQUENCY CALCULATION HELPERS
// ============================================================================

type PayrollFrequency = 'Once' | 'Daily' | 'Weekly' | 'Monthly' | 'Annually';

/**
 * Check if a date falls within a range
 */
function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Parse date string to Date object
 */
function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Determine if a benefit/deduction should be applied for a given payroll week
 */
function shouldApplyItemForWeek(
  item: { frequency: PayrollFrequency; effective_date: string; end_date: string | null; is_active: boolean },
  periodStart: Date,
  periodEnd: Date
): boolean {
  if (!item.is_active) return false;

  const effectiveDate = parseDateString(item.effective_date);
  const endDate = item.end_date ? parseDateString(item.end_date) : null;

  if (endDate && endDate < periodStart) return false;
  if (effectiveDate > periodEnd) return false;

  switch (item.frequency) {
    case 'Once':
      return isDateInRange(effectiveDate, periodStart, periodEnd);
    case 'Daily':
    case 'Weekly':
      return true;
    case 'Monthly':
      // Apply if effective date's day-of-month matches any day in period
      const effectiveDay = effectiveDate.getDate();
      for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
        if (d.getDate() === effectiveDay) return true;
      }
      return false;
    case 'Annually':
      const thisYearEffective = new Date(periodStart.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate());
      return isDateInRange(thisYearEffective, periodStart, periodEnd);
    default:
      return false;
  }
}

/**
 * Calculate frequency multiplier
 */
function calculateFrequencyMultiplier(
  frequency: PayrollFrequency,
  presentDays: number
): number {
  switch (frequency) {
    case 'Daily':
      return presentDays;
    case 'Once':
    case 'Weekly':
    case 'Monthly':
    case 'Annually':
      return 1;
    default:
      return 0;
  }
}

// ============================================================================
// PAYROLL SERVICE
// ============================================================================

const payrollService = {
  /**
   * Get semi-monthly period dates for a given year, month, and period type
   */
  getSemiMonthlyPeriod,

  /**
   * Fetch HR payroll data from integration endpoint
   * GET /api/integration/hr_payroll
   */
  fetchHrPayroll: async (params?: HrPayrollQueryParams): Promise<HrPayrollData[]> => {
    try {
      const queryParams: any = { ...params };
      if (queryParams.grouped !== undefined) {
        queryParams.grouped = queryParams.grouped ? 'true' : 'false';
      }
      const response = await api.get<HrPayrollData[]>('/api/integration/hr_payroll', queryParams);
      return response;
    } catch (error) {
      console.error('Error fetching HR payroll data:', error);
      throw error;
    }
  },

  /**
   * Fetch HR payroll data grouped by period
   * Uses current week's Monday to Saturday for strict weekly periods
   * GET /api/integration/hr_payroll?grouped=true
   */
  fetchPayrollBatches: async (year?: number, month?: number): Promise<PayrollBatchGroup[]> => {
    try {
      // Get current week's Monday to Saturday for strict weekly periods
      const currentPeriod = payrollService.getCurrentWeeklyPeriod();

      const response = await api.get<PayrollBatchGroup[]>('/api/integration/hr_payroll', {
        grouped: 'true',
        payroll_period_start: currentPeriod.start,
        payroll_period_end: currentPeriod.end,
      });
      return response;
    } catch (error) {
      console.error('Error fetching payroll batches:', error);
      throw error;
    }
  },

  /**
   * Fetch payroll for a specific weekly period
   */
  fetchPayrollForWeek: async (periodStart: string, periodEnd: string): Promise<PayrollBatchGroup[]> => {
    try {
      const response = await api.get<PayrollBatchGroup[]>('/api/integration/hr_payroll', {
        grouped: 'true',
        payroll_period_start: periodStart,
        payroll_period_end: periodEnd,
      });
      return response;
    } catch (error) {
      console.error('Error fetching payroll for week:', error);
      throw error;
    }
  },

  /**
   * Re-fetch payroll data from HR API (manual trigger)
   * POST /api/integration/hr_payroll/refetch
   */
  refetchFromHR: async (periodStart: string, periodEnd: string): Promise<{ success: boolean; synced: number; errors: string[] }> => {
    try {
      const response = await api.post<{ success: boolean; synced: number; errors: string[] }>(
        '/api/integration/hr_payroll/refetch',
        { period_start: periodStart, period_end: periodEnd }
      );
      return response;
    } catch (error) {
      console.error('Error re-fetching from HR:', error);
      throw error;
    }
  },

  /**
   * Fetch and sync payroll data from HR
   * POST /api/integration/hr_payroll/fetch-and-sync
   */
  fetchAndSync: async (periodStart: string, periodEnd: string): Promise<{ success: boolean; synced: number; errors: string[] }> => {
    try {
      const response = await api.post<{ success: boolean; synced: number; errors: string[] }>(
        '/api/integration/hr_payroll/fetch-and-sync',
        { period_start: periodStart, period_end: periodEnd }
      );
      return response;
    } catch (error) {
      console.error('Error fetching and syncing from HR:', error);
      throw error;
    }
  },

  /**
   * Fetch available weekly payroll periods
   * GET /api/integration/hr_payroll/periods
   */
  fetchPayrollPeriods: async (year: number, month: number): Promise<any> => {
    try {
      const response = await api.get<any>('/api/integration/hr_payroll/periods', {
        year: String(year),
        month: String(month),
      });
      return response;
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
      throw error;
    }
  },

  /**
   * Get weekly periods for a given month
   */
  getWeeklyPeriodsForMonth: (year: number, month: number): Array<{ start: string; end: string; weekNumber: number }> => {
    const periods: Array<{ start: string; end: string; weekNumber: number }> = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let currentMonday = getWeekMonday(firstDay);
    let weekNumber = 1;

    while (currentMonday <= lastDay) {
      const saturday = getWeekSaturday(currentMonday);

      if (saturday >= firstDay && currentMonday <= lastDay) {
        periods.push({
          start: formatDateString(currentMonday),
          end: formatDateString(saturday),
          weekNumber,
        });
      }

      currentMonday.setDate(currentMonday.getDate() + 7);
      weekNumber++;
    }

    return periods;
  },

  /**
   * Get current weekly period
   */
  getCurrentWeeklyPeriod: (): { year: number; month: number; weekNumber: number; start: string; end: string } => {
    const now = new Date();
    const period = getWeeklyPeriod(now);
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      weekNumber: period.period,
      start: period.start,
      end: period.end,
    };
  },

  /**
   * Calculate gross earnings based on attendance, base salary, and benefits
   * Uses weekly calculation: Basic Pay = basic_rate × Present days
   */
  calculateGrossEarnings: (payrollData: HrPayrollData): number => {
    const basicRate = parseFloat(payrollData.basic_rate);
    const presentDays = payrollData.present_days ||
      payrollData.attendances.filter(a => a.status === 'Present').length;

    if (presentDays === 0) return 0;

    // Basic pay = daily rate × present days
    const basicPay = basicRate * presentDays;

    // Calculate benefits with frequency rules
    const periodStart = parseDateString(payrollData.payroll_period_start);
    const periodEnd = parseDateString(payrollData.payroll_period_end);

    const totalBenefits = payrollData.benefits
      .filter(b => b.is_active && shouldApplyItemForWeek(b, periodStart, periodEnd))
      .reduce((sum, benefit) => {
        const value = parseFloat(benefit.value);
        const multiplier = calculateFrequencyMultiplier(benefit.frequency, presentDays);
        return sum + (value * multiplier);
      }, 0);

    return basicPay + totalBenefits;
  },

  /**
   * Calculate total deductions from HR payroll data with frequency rules
   */
  calculateTotalDeductions: (payrollData: HrPayrollData): number => {
    const presentDays = payrollData.present_days ||
      payrollData.attendances.filter(a => a.status === 'Present').length;

    if (presentDays === 0) return 0;

    const periodStart = parseDateString(payrollData.payroll_period_start);
    const periodEnd = parseDateString(payrollData.payroll_period_end);

    return payrollData.deductions
      .filter(d => d.is_active && shouldApplyItemForWeek(d, periodStart, periodEnd))
      .reduce((sum, deduction) => {
        const value = parseFloat(deduction.value);
        const multiplier = calculateFrequencyMultiplier(deduction.frequency, presentDays);
        return sum + (value * multiplier);
      }, 0);
  },

  /**
   * Calculate net pay from HR payroll data
   */
  calculateNetPay: (payrollData: HrPayrollData): number => {
    const presentDays = payrollData.present_days ||
      payrollData.attendances.filter(a => a.status === 'Present').length;

    if (presentDays === 0) return 0;

    const gross = payrollService.calculateGrossEarnings(payrollData);
    const deductions = payrollService.calculateTotalDeductions(payrollData);
    return gross - deductions;
  },

  /**
   * Get present days count
   */
  getPresentDays: (payrollData: HrPayrollData): number => {
    return payrollData.attendances.filter(a => a.status === 'Present').length;
  },

  /**
   * Get benefits by type (name)
   */
  getBenefitsByType: (payrollData: HrPayrollData): Map<string, number> => {
    const benefitMap = new Map<string, number>();

    payrollData.benefits
      .filter(b => b.is_active)
      .forEach(benefit => {
        const name = benefit.name || benefit.benefit_type?.name || 'Unknown';
        const current = benefitMap.get(name) || 0;
        benefitMap.set(name, current + parseFloat(benefit.value));
      });

    return benefitMap;
  },

  /**
   * Get deductions by type (name)
   */
  getDeductionsByType: (payrollData: HrPayrollData): Map<string, number> => {
    const deductionMap = new Map<string, number>();

    payrollData.deductions
      .filter(d => d.is_active)
      .forEach(deduction => {
        const name = deduction.name || deduction.deduction_type?.name || 'Unknown';
        const current = deductionMap.get(name) || 0;
        deductionMap.set(name, current + parseFloat(deduction.value));
      });

    return deductionMap;
  },

  /**
   * Release payroll batch
   * 1. Syncs data to ensure DB record exists
   * 2. Processes the payroll (changes status to PROCESSED)
   * 3. Calls admin endpoint to release (triggers webhook)
   */
  releasePayrollBatch: async (periodStart: string, periodEnd: string): Promise<boolean> => {
    try {
      // 1. Sync first to get the ID
      const syncResponse = await api.post<{ success: boolean; periodId: number }>(
        '/api/integration/hr_payroll/fetch-and-sync',
        { period_start: periodStart, period_end: periodEnd }
      );

      if (!syncResponse.success || !syncResponse.periodId) {
        throw new Error('Failed to sync payroll data before release');
      }

      const periodId = syncResponse.periodId;

      // 2. Process the payroll (required before release)
      await api.post<{ success: boolean }>(
        `/api/v1/admin/payroll-periods/${periodId}/process`,
        { period_start: periodStart, period_end: periodEnd }
      );

      // 3. Call release endpoint (triggers webhook)
      const releaseResponse = await api.post<{ success: boolean }>(
        `/api/v1/admin/payroll-periods/${periodId}/release`,
        {}
      );

      return releaseResponse.success;
    } catch (error) {
      console.error('Error releasing payroll batch:', error);
      throw error;
    }
  },
};

export default payrollService;
