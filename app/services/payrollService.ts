/**
 * Payroll Service - Backend API Integration
 * Connects to the FTMS backend API for payroll data retrieval
 * Supports semi-monthly period-based payroll batches
 */

import { api } from '../lib/api';

/**
 * Semi-monthly payroll period helper
 */
export function getSemiMonthlyPeriod(date: Date): { period: number; start: string; end: string } {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();

  if (day <= 15) {
    // Period 1: 1st to 15th
    const start = new Date(year, month, 1);
    const end = new Date(year, month, 15);
    return {
      period: 1,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  } else {
    // Period 2: 16th to end of month
    const start = new Date(year, month, 16);
    const end = new Date(year, month + 1, 0); // Last day of month
    return {
      period: 2,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }
}

/**
 * Get current semi-monthly period
 */
export function getCurrentSemiMonthlyPeriod(): { period: number; start: string; end: string } {
  return getSemiMonthlyPeriod(new Date());
}

/**
 * HR Payroll Data Types (from backend integration endpoint)
 */
export interface HrPayrollAttendance {
  date: string;
  status: 'Present' | 'Absent' | 'Leave';
}

export interface HrPayrollBenefitType {
  id: string;
  name: string;
}

export interface HrPayrollBenefit {
  value: string;
  frequency: 'Once' | 'Monthly' | 'Daily' | 'Weekly' | 'Yearly';
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
  benefit_type: HrPayrollBenefitType;
}

export interface HrPayrollDeductionType {
  id: string;
  name: string;
}

export interface HrPayrollDeduction {
  value: string;
  frequency: 'Once' | 'Monthly' | 'Daily' | 'Weekly' | 'Yearly';
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
  deduction_type: HrPayrollDeductionType;
}

export interface HrPayrollData {
  payroll_period_start: string;
  payroll_period_end: string;
  employee_number: string;
  employee_name?: string;
  basic_rate: string;
  rate_type: 'Monthly' | 'Daily' | 'Weekly' | 'Semi-Monthly';
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

/**
 * Payroll Service
 */
const payrollService = {
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
   * GET /api/integration/hr_payroll?grouped=true
   */
  fetchPayrollBatches: async (year: number, month: number): Promise<any[]> => {
    try {
      const monthStr = String(month + 1).padStart(2, '0');
      const yearStr = String(year);
      
      const response = await api.get<any[]>('/api/integration/hr_payroll', {
        grouped: 'true',
        year: yearStr,
        month: monthStr
      });
      return response;
    } catch (error) {
      console.error('Error fetching payroll batches:', error);
      throw error;
    }
  },

  /**
   * Fetch available payroll periods
   * GET /api/integration/hr_payroll/periods
   */
  fetchPayrollPeriods: async (year: number, month: number): Promise<any> => {
    try {
      const monthStr = String(month + 1).padStart(2, '0');
      const response = await api.get<any>('/api/integration/hr_payroll/periods', {
        year: String(year),
        month: monthStr
      });
      return response;
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
      throw error;
    }
  },

  /**
   * Get semi-monthly period details
   */
  getSemiMonthlyPeriod: (year: number, month: number, period: 1 | 2): { startDate: string; endDate: string; workingDays: number } => {
    const startDay = period === 1 ? 1 : 16;
    const endDay = period === 1 ? 15 : new Date(year, month + 1, 0).getDate();
    
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    const workingDays = endDay - startDay + 1;
    
    return { startDate, endDate, workingDays };
  },

  /**
   * Get current semi-monthly period
   */
  getCurrentSemiMonthlyPeriod: (): { year: number; month: number; period: 1 | 2 } => {
    const now = new Date();
    const day = now.getDate();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      period: day <= 15 ? 1 : 2
    };
  },

  /**
   * Calculate gross earnings based on attendance, base salary, and benefits
   */
  calculateGrossEarnings: (payrollData: HrPayrollData): number => {
    const basicRate = parseFloat(payrollData.basic_rate);
    const presentDays = payrollData.present_days || 
      payrollData.attendances.filter(a => a.status === 'Present').length;
    
    // If zero attendance, return zero pay
    if (presentDays === 0) {
      return 0;
    }

    // Basic pay calculation based on rate type (semi-monthly = 15 working days)
    let basicPay = 0;
    switch (payrollData.rate_type) {
      case 'Daily':
        basicPay = basicRate * presentDays;
        break;
      case 'Weekly':
        // Assuming 5 working days per week
        basicPay = (basicRate / 5) * presentDays;
        break;
      case 'Semi-Monthly':
        // Semi-monthly: 15 working days per period
        basicPay = (basicRate / 15) * presentDays;
        break;
      case 'Monthly':
        // Monthly: 22 working days per month, divide by 2 for semi-monthly
        basicPay = (basicRate / 22) * presentDays;
        break;
    }

    // Add benefits (only active ones)
    const totalBenefits = payrollData.benefits
      .filter(b => b.is_active)
      .reduce((sum, benefit) => sum + parseFloat(benefit.value), 0);

    return basicPay + totalBenefits;
  },

  /**
   * Calculate total deductions from HR payroll data
   * Returns 0 if no attendance
   */
  calculateTotalDeductions: (payrollData: HrPayrollData): number => {
    const presentDays = payrollData.present_days || 
      payrollData.attendances.filter(a => a.status === 'Present').length;
    
    // If zero attendance, no deductions
    if (presentDays === 0) {
      return 0;
    }

    return payrollData.deductions
      .filter(d => d.is_active)
      .reduce((sum, deduction) => sum + parseFloat(deduction.value), 0);
  },

  /**
   * Calculate net pay from HR payroll data
   * Returns 0 if no attendance
   */
  calculateNetPay: (payrollData: HrPayrollData): number => {
    const presentDays = payrollData.present_days || 
      payrollData.attendances.filter(a => a.status === 'Present').length;
    
    // If zero attendance, net pay is zero
    if (presentDays === 0) {
      return 0;
    }

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
   * Get benefits by type
   */
  getBenefitsByType: (payrollData: HrPayrollData): Map<string, number> => {
    const benefitMap = new Map<string, number>();
    
    payrollData.benefits
      .filter(b => b.is_active)
      .forEach(benefit => {
        const current = benefitMap.get(benefit.benefit_type.name) || 0;
        benefitMap.set(benefit.benefit_type.name, current + parseFloat(benefit.value));
      });

    return benefitMap;
  },

  /**
   * Get deductions by type
   */
  getDeductionsByType: (payrollData: HrPayrollData): Map<string, number> => {
    const deductionMap = new Map<string, number>();
    
    payrollData.deductions
      .filter(d => d.is_active)
      .forEach(deduction => {
        const current = deductionMap.get(deduction.deduction_type.name) || 0;
        deductionMap.set(deduction.deduction_type.name, current + parseFloat(deduction.value));
      });

    return deductionMap;
  },
};

export default payrollService;
