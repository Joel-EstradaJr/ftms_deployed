/**
 * Report Service - Backend API Integration
 * Connects to the FTMS backend API for financial reports
 */

import { api } from '../lib/api';

// ============================================================================
// TYPES - Aligned with Backend Response Types
// ============================================================================

// Journal Entry Report Types
export interface JournalEntryLine {
  date: string;
  scenario: string;
  accountCode: string;
  accountName: string;
  debit: number | null;
  credit: number | null;
}

export interface JournalTransaction {
  id: string;
  lines: JournalEntryLine[];
  remarks: string;
}

export interface JournalEntryReportFilters {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  scenario?: string[];
  accountType?: string[];
  amountMin?: number;
  amountMax?: number;
  status?: string;
}

export interface JournalEntryReportResponse {
  success: boolean;
  data: {
    transactions: JournalTransaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      totalDebit: number;
      totalCredit: number;
      transactionCount: number;
    };
  };
}

// Income Statement Report Types
export interface IncomeStatementLine {
  accountName: string;
  amount: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
}

export interface IncomeStatementSection {
  title: string;
  items: IncomeStatementLine[];
  subtotal: number;
  isNegative?: boolean;
}

export interface IncomeStatementData {
  companyName: string;
  reportTitle: string;
  periodEnding: string;
  revenue: IncomeStatementSection;
  costOfService: IncomeStatementSection;
  grossProfit: number;
  operatingExpenses: IncomeStatementSection;
  netOperatingIncome: number;
  otherIncome: IncomeStatementSection;
  netIncomeBeforeTax: number;
  incomeTaxProvision: number;
  netIncome: number;
}

export interface IncomeStatementReportResponse {
  success: boolean;
  data: IncomeStatementData;
}

// Financial Position Report Types
export interface FinancialPositionLine {
  accountName: string;
  amount: number;
}

export interface FinancialPositionSection {
  title: string;
  items: FinancialPositionLine[];
  subtotal: number;
}

export interface FinancialPositionData {
  companyName: string;
  reportTitle: string;
  asOfDate: string;
  currentAssets: FinancialPositionSection;
  nonCurrentAssets: FinancialPositionSection;
  totalAssets: number;
  currentLiabilities: FinancialPositionSection;
  longTermLiabilities: FinancialPositionSection;
  totalLiabilities: number;
}

export interface FinancialPositionReportResponse {
  success: boolean;
  data: FinancialPositionData;
}

// System Configuration Types
export interface SystemConfigurationData {
  companyName: string;
  configCode: string;
  minimumWage: number;
  driverSharePercentage: number;
  conductorSharePercentage: number;
}

export interface SystemConfigurationResponse {
  success: boolean;
  data: SystemConfigurationData;
}

// Scenario Options Types
export interface ScenarioOptionsResponse {
  success: boolean;
  data: string[];
}

// ============================================================================
// REPORT SERVICE
// ============================================================================

export const reportService = {
  /**
   * Fetch Journal Entry Report data
   */
  getJournalEntryReport: async (filters: JournalEntryReportFilters = {}): Promise<JournalEntryReportResponse> => {
    const params: Record<string, any> = {
      page: filters.page || 1,
      limit: filters.limit || 10,
    };

    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.status) params.status = filters.status;
    if (filters.amountMin !== undefined) params.amountMin = filters.amountMin;
    if (filters.amountMax !== undefined) params.amountMax = filters.amountMax;

    // Handle array parameters
    if (filters.scenario && filters.scenario.length > 0) {
      filters.scenario.forEach(s => {
        if (!params.scenario) params.scenario = [];
        params.scenario.push(s);
      });
    }

    if (filters.accountType && filters.accountType.length > 0) {
      filters.accountType.forEach(t => {
        if (!params.accountType) params.accountType = [];
        params.accountType.push(t);
      });
    }

    // Build URL with array params properly
    const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/v1/reports/journal-entry`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch journal entry report: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Fetch Income Statement Report data
   */
  getIncomeStatementReport: async (dateFrom?: string, dateTo?: string): Promise<IncomeStatementReportResponse> => {
    const params: Record<string, any> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    return api.get<IncomeStatementReportResponse>('/api/v1/reports/income-statement', params);
  },

  /**
   * Fetch Financial Position Report data
   */
  getFinancialPositionReport: async (asOfDate?: string): Promise<FinancialPositionReportResponse> => {
    const params: Record<string, any> = {};
    if (asOfDate) params.asOfDate = asOfDate;

    return api.get<FinancialPositionReportResponse>('/api/v1/reports/financial-position', params);
  },

  /**
   * Fetch System Configuration data for report headers
   */
  getSystemConfiguration: async (): Promise<SystemConfigurationResponse> => {
    return api.get<SystemConfigurationResponse>('/api/v1/reports/configuration');
  },

  /**
   * Fetch available scenario options for filtering
   */
  getScenarioOptions: async (): Promise<ScenarioOptionsResponse> => {
    return api.get<ScenarioOptionsResponse>('/api/v1/reports/scenarios');
  },
};

// ============================================================================
// DEFAULT/FALLBACK DATA
// ============================================================================

export const defaultIncomeStatementData: IncomeStatementData = {
  companyName: 'Company Name',
  reportTitle: 'Income Statement',
  periodEnding: 'For the Year Ended December 31, 20xx',
  revenue: { title: 'TOTAL REVENUE', items: [], subtotal: 0 },
  costOfService: { title: 'LESS: COST OF SERVICE', items: [], subtotal: 0, isNegative: true },
  grossProfit: 0,
  operatingExpenses: { title: 'LESS: OPERATING EXPENSES', items: [], subtotal: 0, isNegative: true },
  netOperatingIncome: 0,
  otherIncome: { title: 'OTHER INCOME', items: [], subtotal: 0 },
  netIncomeBeforeTax: 0,
  incomeTaxProvision: 0,
  netIncome: 0,
};

export const defaultFinancialPositionData: FinancialPositionData = {
  companyName: 'Company Name',
  reportTitle: 'Statement of Financial Position',
  asOfDate: 'As of December 31, 20xx',
  currentAssets: { title: 'Current Assets', items: [], subtotal: 0 },
  nonCurrentAssets: { title: 'Non-Current Assets', items: [], subtotal: 0 },
  totalAssets: 0,
  currentLiabilities: { title: 'Current Liabilities', items: [], subtotal: 0 },
  longTermLiabilities: { title: 'Long-term Liabilities', items: [], subtotal: 0 },
  totalLiabilities: 0,
};
