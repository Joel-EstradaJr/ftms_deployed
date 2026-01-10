/**
 * Payroll Service - Backend API Integration
 * Connects to the FTMS backend API for payroll data retrieval
 */

import { api } from '../lib/api';

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
  basic_rate: string;
  rate_type: 'Monthly' | 'Daily' | 'Weekly' | 'Semi-Monthly';
  attendances: HrPayrollAttendance[];
  benefits: HrPayrollBenefit[];
  deductions: HrPayrollDeduction[];
}

/**
 * Query parameters for HR payroll endpoint
 */
export interface HrPayrollQueryParams {
  payroll_period_start?: string;
  payroll_period_end?: string;
  employee_number?: string;
}

/**
 * Payroll Service
 */
export const payrollService = {
  /**
   * Fetch HR payroll data from external integration endpoint
   * GET /api/integration/hr_payroll
   */
  fetchHrPayroll: async (params?: HrPayrollQueryParams): Promise<HrPayrollData[]> => {
    try {
      const response = await api.get<HrPayrollData[]>('/api/integration/hr_payroll', params);
      return response;
    } catch (error) {
      console.error('Error fetching HR payroll data:', error);
      throw error;
    }
  },

  /**
   * Fetch HR payroll data for a specific employee
   */
  fetchEmployeePayroll: async (
    employeeNumber: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<HrPayrollData | null> => {
    try {
      const params: HrPayrollQueryParams = { employee_number: employeeNumber };
      
      if (periodStart && periodEnd) {
        params.payroll_period_start = periodStart;
        params.payroll_period_end = periodEnd;
      }

      const response = await api.get<HrPayrollData[]>('/api/integration/hr_payroll', params);
      return response.length > 0 ? response[0] : null;
    } catch (error) {
      console.error('Error fetching employee payroll data:', error);
      throw error;
    }
  },

  /**
   * Calculate gross earnings from HR payroll data
   */
  calculateGrossEarnings: (payrollData: HrPayrollData): number => {
    const basicRate = parseFloat(payrollData.basic_rate);
    const presentDays = payrollData.attendances.filter(a => a.status === 'Present').length;
    
    // Basic pay calculation based on rate type
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
        // Assuming 15 working days per semi-month
        basicPay = (basicRate / 15) * presentDays;
        break;
      case 'Monthly':
        // Assuming 22 working days per month
        basicPay = (basicRate / 22) * presentDays;
        break;
    }

    // Add benefits
    const totalBenefits = payrollData.benefits
      .filter(b => b.is_active)
      .reduce((sum, benefit) => sum + parseFloat(benefit.value), 0);

    return basicPay + totalBenefits;
  },

  /**
   * Calculate total deductions from HR payroll data
   */
  calculateTotalDeductions: (payrollData: HrPayrollData): number => {
    return payrollData.deductions
      .filter(d => d.is_active)
      .reduce((sum, deduction) => sum + parseFloat(deduction.value), 0);
  },

  /**
   * Calculate net pay from HR payroll data
   */
  calculateNetPay: (payrollData: HrPayrollData): number => {
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
