// app/types/payroll.ts
// Type definitions for Payroll & Compensation Module

// ========== MODULE 3.1: PAYROLL GENERATION & DISBURSEMENT ==========

export interface PayrollBatch {
  id: string;
  payroll_period_code: string;
  period_start: string;
  period_end: string;
  totalGross: number;
  totalDeductions: number;
  total_net: number;
  total_employees: number;
  status: 'PENDING' | 'APPROVED' | 'DISBURSED' | 'CANCELLED'; // payroll_period_status
  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  payrolls?: Payroll[];
}

export interface Payroll {
  id: string;
  batchId: string;
  employeeId: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  isDisbursed: boolean;
  disbursementDate?: string;
  disbursedBy?: string;
  createdAt: string;
  updatedAt?: string;
  // Relations
  batch?: PayrollBatch;
  employee?: CachedEmployee;
}

export interface CachedEmployee {
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  department?: string;
  position?: string;
  status: string;
  hireDate?: string;
  terminationDate?: string;
  // For payroll data
  payrollData?: CachedPayrollData;
}

export interface CachedPayrollData {
  employeeNumber: string;
  basicRate: number;
  totalMonthlyBenefits: number;
  totalMonthlyDeductions: number;
  payrollPeriod: 'MONTHLY' | 'SEMI_MONTHLY' | 'WEEKLY';
}

// ========== MODULE 3.2: EMPLOYEE REIMBURSEMENT PROCESSING ==========

export interface Reimbursement {
  id: string;
  employeeId: string;
  amount: number;
  purpose: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
  receiptUrl?: string;
  disbursementDate?: string;
  isDisbursed: boolean;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  disbursedBy?: string;
  // Relations
  employee?: CachedEmployee;
  cashTransaction?: CashTransaction;
}

export interface CashTransaction {
  id: string;
  transactionType: string;
  amount: number;
  transactionDate: string;
  reference?: string;
  createdBy?: string;
  createdAt: string;
}

// ========== MODULE 3.3: TRIP DEFICIT LOAN AUTO-RECORDING ==========

export interface Loan {
  id: string;
  loanType: 'TRIP_DEFICIT' | 'EMPLOYEE_LOAN' | 'EMERGENCY_LOAN';
  principalAmount: number;
  driverShare?: number;
  conductorShare?: number;
  driverId?: string;
  conductorId?: string;
  installmentFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  installmentAmount: number;
  dueDate: string;
  status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
  isConvertedToEmployeeLoan: boolean;
  conversionDate?: string;
  tripAssignmentId?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  // Relations
  trip?: CachedTrip;
  driver?: CachedEmployee;
  conductor?: CachedEmployee;
  repayments?: LoanRepayment[];
}

export interface CachedTrip {
  assignmentId: string;
  busPlateNumber?: string;
  busType?: string;
  route?: string;
  driverId: string;
  driverName?: string;
  conductorId: string;
  conductorName?: string;
  tripDate: string;
  targetRevenue: number;
  actualRevenue: number;
  deficit: number;
  fuelExpense?: number;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  repaymentDate: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  createdBy?: string;
  createdAt: string;
  // Relations
  loan?: Loan;
}

// ========== FORM DATA TYPES ==========

export interface PayrollBatchFormData {
  batchCode: string;
  periodStart: string;
  periodEnd: string;
  selectedEmployees: string[];
}

export interface PayrollFormData {
  employeeId: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  disbursementDate: string;
}

export interface ReimbursementFormData {
  employeeId: string;
  amount: number;
  purpose: string;
  status: string;
  receiptUrl?: string;
  disbursementDate?: string;
  isDisbursed: boolean;
}

export interface LoanFormData {
  loanType: string;
  tripAssignmentId?: string;
  principalAmount: number;
  driverShare?: number;
  conductorShare?: number;
  driverId?: string;
  conductorId?: string;
  installmentFrequency: string;
  installmentAmount: number;
  dueDate: string;
  status: string;
}

// ========== API RESPONSE TYPES ==========

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
}
