// Payroll Calculations Utility
// Breaks down payroll components for detailed display

export interface EarningsBreakdown {
  basicPay: number;
  overtimePay: number;
  riceAllowance: number;
  transportationAllowance: number;
  otherAllowances: number;
}

export interface DeductionsBreakdown {
  withholdingTax: number;
  sssContribution: number;
  philhealthContribution: number;
  pagibigContribution: number;
  otherDeductions: number;
}

export interface AttendanceData {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  overtimeHours: number;
}

export type RateType = 'monthly' | 'weekly' | 'daily';

/**
 * Calculate earnings breakdown from base salary and allowances
 */
export function calculateEarnings(
  baseSalary: number,
  allowances: number,
  rateType: RateType = 'monthly'
): EarningsBreakdown {
  // For demo purposes, use realistic percentage breakdowns
  // In production, this would come from actual payroll data
  
  // Allowances breakdown (approximate percentages)
  const riceAllowance = allowances * 0.40; // 40% of allowances
  const transportationAllowance = allowances * 0.35; // 35% of allowances
  const otherAllowances = allowances * 0.25; // 25% of allowances
  
  // Overtime is separate from base salary (would come from timesheet)
  // For mock data, assume 5 hours at 1.25x rate (if monthly)
  const hourlyRate = rateType === 'monthly' ? baseSalary / 160 : // Assume 160 hours/month
                     rateType === 'weekly' ? baseSalary / 40 :  // 40 hours/week
                     baseSalary / 8; // 8 hours/day
  
  const overtimePay = hourlyRate * 1.25 * 5; // 5 hours overtime at 1.25x rate
  
  return {
    basicPay: baseSalary,
    overtimePay: Math.round(overtimePay * 100) / 100,
    riceAllowance: Math.round(riceAllowance * 100) / 100,
    transportationAllowance: Math.round(transportationAllowance * 100) / 100,
    otherAllowances: Math.round(otherAllowances * 100) / 100,
  };
}

/**
 * Calculate deductions breakdown from total deductions
 */
export function calculateDeductions(totalDeductions: number): DeductionsBreakdown {
  // Standard Philippine deduction percentages (approximate)
  // In production, this would be based on actual tax tables and contribution rates
  
  const withholdingTax = totalDeductions * 0.45; // ~45% withholding tax
  const sssContribution = totalDeductions * 0.25; // ~25% SSS
  const philhealthContribution = totalDeductions * 0.15; // ~15% PhilHealth
  const pagibigContribution = totalDeductions * 0.10; // ~10% Pag-IBIG
  const otherDeductions = totalDeductions * 0.05; // ~5% other deductions
  
  return {
    withholdingTax: Math.round(withholdingTax * 100) / 100,
    sssContribution: Math.round(sssContribution * 100) / 100,
    philhealthContribution: Math.round(philhealthContribution * 100) / 100,
    pagibigContribution: Math.round(pagibigContribution * 100) / 100,
    otherDeductions: Math.round(otherDeductions * 100) / 100,
  };
}

/**
 * Generate mock attendance data based on employee status
 * In production, this would come from attendance/timesheet system
 */
export function generateAttendanceData(isDisbursed: boolean): AttendanceData {
  // Mock data - in production, fetch from attendance system
  return {
    presentCount: 20,
    absentCount: 1,
    lateCount: 2,
    overtimeHours: 5,
  };
}

/**
 * Calculate total gross pay
 */
export function calculateGrossPay(earnings: EarningsBreakdown): number {
  const total = 
    earnings.basicPay +
    earnings.overtimePay +
    earnings.riceAllowance +
    earnings.transportationAllowance +
    earnings.otherAllowances;
  
  return Math.round(total * 100) / 100;
}

/**
 * Calculate total deductions
 */
export function calculateTotalDeductions(deductions: DeductionsBreakdown): number {
  const total = 
    deductions.withholdingTax +
    deductions.sssContribution +
    deductions.philhealthContribution +
    deductions.pagibigContribution +
    deductions.otherDeductions;
  
  return Math.round(total * 100) / 100;
}

/**
 * Format rate type for display
 */
export function formatRateType(rateType: RateType): string {
  switch (rateType) {
    case 'monthly': return 'Monthly';
    case 'weekly': return 'Weekly';
    case 'daily': return 'Daily';
    default: return 'Monthly';
  }
}

/**
 * Get employee name from employee object
 */
export function getEmployeeName(employee: any): string {
  if (!employee) return 'Unknown Employee';
  
  const parts = [
    employee.firstName,
    employee.middleName,
    employee.lastName,
    employee.suffix
  ].filter(Boolean);
  
  return parts.join(' ');
}
