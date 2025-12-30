// app/(admin)/admin/financial-management/payroll/types.ts
// Payroll-specific types aligned with app/types/payroll.ts

import { PayrollBatch, Payroll, CachedEmployee, CachedPayrollData } from '@/app/types/payroll';

// Re-export main types for convenience
export type { PayrollBatch, Payroll, CachedEmployee, CachedPayrollData };

// Employee with payroll data for selection
export interface EmployeeWithPayroll extends CachedEmployee {
  payrollData: CachedPayrollData;
  fullName: string;
}

// Form data for creating/editing payroll batch
export interface PayrollBatchFormData {
  batchCode: string;
  periodStart: string;
  periodEnd: string;
  selectedEmployees: string[]; // employee IDs
  payrolls: PayrollFormData[];
}

// Form data for individual payroll record
export interface PayrollFormData {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  isDisbursed: boolean;
  disbursementDate?: string;
}

// Form validation errors
export interface PayrollBatchFormErrors {
  batchCode: string;
  periodStart: string;
  periodEnd: string;
  selectedEmployees: string;
  payrolls: string;
}

// API Response for batch creation
export interface PayrollBatchApiResponse {
  success: boolean;
  data?: PayrollBatch;
  error?: string;
  message?: string;
}
