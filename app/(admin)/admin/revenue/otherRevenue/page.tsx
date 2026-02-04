/**
 * Admin Other Revenue Page - Backend Integrated
 *
 * Displays miscellaneous revenue records (excluding bus trips and rentals):
 * - Fetches data from /api/admin/revenue (excluding main categories)
 * - Server-side pagination, search, and sorting
 * - Analytics: Revenue breakdown by source type
 * - Database-optimized queries with indexes
 *
 * Columns: No., code, date_recorded, source, description, amount, paymentMethod, Actions
 */

"use client";

import React, { useState, useEffect } from "react";

import "../../../../styles/components/table.css";
import "../../../../styles/components/chips.css";

import Swal from 'sweetalert2';
import { showSuccess, showError } from '../../../../utils/Alerts';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { calculatePaymentStatus, processCascadePayment as processRevenueCascade, processOverdueCarryover } from '@/app/utils/revenueScheduleCalculations';


import PaginationComponent from "../../../../Components/pagination";
import RevenueFilter from "../../../../Components/RevenueFilter";
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import ModalManager from '@/Components/modalManager';

import RecordOtherRevenueModal from './recordOtherRevenue';
import ViewOtherRevenueModal from './viewOtherRevenue';
import RecordPaymentModal from '@/Components/RecordPaymentModal';

import { RevenueScheduleFrequency, RevenueScheduleItem, PaymentStatus } from '@/app/types/revenue';
import { PaymentRecordData } from '@/app/types/payments';


// TypeScript interfaces
interface RevenueSource {
  id: number;
  name: string;
  sourceCode: string;
}

interface PaymentMethod {
  id: number;
  methodName: string;
  methodCode: string;
}

interface RevenueType {
  id: number;
  code: string;
  name: string;
  description?: string;
}

interface Department {
  id: number;
  department_name: string;
}

interface ScheduleFrequency {
  value: string;
  label: string;
}

interface OtherRevenueRecord {
  id: number;
  code: string;
  date_recorded: string;
  date_expected?: string;
  // Revenue type from backend
  revenueType: {
    id: number;
    code: string;
    name: string;
  };
  // Department relation from backend
  department?: {
    id: number;
    department_name: string;
  } | null;
  department_id?: number;
  // Parsed description fields
  description: string;
  remarks?: string;
  amount: number;
  payment_status: string;
  payment_method?: string;
  payment_reference?: string;
  isUnearnedRevenue: boolean;
  accountCode?: string;
  created_by?: string;
  created_at?: string;
  approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  accounting_status?: 'DRAFT' | 'POSTED' | 'ADJUSTED' | 'REVERSED';
  approvalRemarks?: string;
  // Journal Entry link (for edit/delete restrictions)
  journalEntry?: {
    id: number;
    code: string;
    status: string;
  } | null;
  // Receivable data for unearned revenue
  receivable?: {
    id: number;
    status: string;
    frequency?: string;
    numberOfPayments?: number;
    scheduleStartDate?: string;
    scheduleItems: Array<{
      id: number;
      installmentNumber: number;
      dueDate: string;
      amountDue: number;
      amountPaid: number;
      balance: number;
      status: string;
    }>;
  } | null;
  // For backward compatibility with transformRecordToFormData
  source?: { id: number; name: string; sourceCode: string };
  paymentMethod?: { id: number; methodName: string; methodCode: string };
  paymentMethodId?: number;
  sourceId?: number;
  externalRefType?: string;
  externalRefId?: string;
  createdBy?: string;
  scheduleItems?: RevenueScheduleItem[];
}

export type OtherRevenueData = {
  id?: number;
  code: string;
  name: string;
  date_recorded: string;
  description: string;
  amount: number;
  payment_reference: string;
  department_id?: number;  // Reference to department_local
  department?: string;     // For display purposes (derived from department relation)
  isUnearnedRevenue: boolean;
  remarks?: string;

  // Payment Schedule Fields
  scheduleFrequency?: RevenueScheduleFrequency;
  scheduleStartDate?: string;
  numberOfPayments?: number;
  scheduleItems?: RevenueScheduleItem[];

  // Relations
  payment_method: string;

  // View-only fields (derived from journal_entry)
  accountCode?: string;
  createdBy: string;
};

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface RevenueAnalytics {
  totalRevenue: number;
  transactionCount: number;
  topSources: Array<{
    sourceName: string;
    amount: number;
  }>;
}

// Mock data for development/testing
const MOCK_OTHER_REVENUE_DATA: OtherRevenueRecord[] = [
  {
    id: 1,
    code: "REV-OTHER-2024-001",
    date_recorded: "2024-11-01",
    revenueType: { id: 1, name: "Asset Sale", code: "ASSET_SALE" },
    description: "Sale of old computer equipment",
    amount: 45000.00,
    payment_status: "COMPLETED",
    payment_method: "Bank Transfer",
    isUnearnedRevenue: true,
    receivable: {
      id: 1,
      status: "PARTIALLY_PAID",
      frequency: "MONTHLY",
      numberOfPayments: 3,
      scheduleStartDate: "2024-11-15",
      scheduleItems: [
        {
          id: 1,
          installmentNumber: 1,
          dueDate: "2024-11-15",
          amountDue: 15000.00,
          amountPaid: 15000.00,
          balance: 0,
          status: "PAID",
        },
        {
          id: 2,
          installmentNumber: 2,
          dueDate: "2024-12-15",
          amountDue: 15000.00,
          amountPaid: 10000.00,
          balance: 5000.00,
          status: "PARTIALLY_PAID",
        },
        {
          id: 3,
          installmentNumber: 3,
          dueDate: "2025-01-15",
          amountDue: 15000.00,
          amountPaid: 0,
          balance: 15000.00,
          status: "PENDING",
        }
      ]
    },
    // Backward compatibility fields
    source: { id: 1, name: "Asset Sale", sourceCode: "ASSET_SALE" },
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 1,
    externalRefType: "ASSET_SALE",
    externalRefId: "AS-2024-001",
    createdBy: "admin",
    scheduleItems: [
      {
        id: '1',
        installment_number: 1,
        due_date: "2024-11-15",
        amount_due: 15000.00,
        amount_paid: 15000.00,
        balance: 0,
        status: PaymentStatus.PAID,
        isPastDue: false,
        isEditable: false,
      },
      {
        id: '2',
        installment_number: 2,
        due_date: "2024-12-15",
        amount_due: 15000.00,
        amount_paid: 10000.00,
        balance: 5000.00,
        status: PaymentStatus.PARTIALLY_PAID,
        isPastDue: false,
        isEditable: false,
      },
      {
        id: '3',
        installment_number: 3,
        due_date: "2025-01-15",
        amount_due: 15000.00,
        amount_paid: 0,
        balance: 15000.00,
        status: PaymentStatus.PENDING,
        isPastDue: false,
        isEditable: true,
      }
    ]
  },
  {
    id: 2,
    code: "REV-OTHER-2024-002",
    date_recorded: "2024-11-02",
    revenueType: { id: 2, name: "Interest Income", code: "INTEREST" },
    description: "Bank interest for Q3 2024",
    amount: 12500.50,
    payment_status: "COMPLETED",
    payment_method: "Bank Transfer",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 2, name: "Interest Income", sourceCode: "INTEREST" },
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 2,
    externalRefType: "INTEREST",
    createdBy: "admin"
  },
  {
    id: 3,
    code: "REV-OTHER-2024-003",
    date_recorded: "2024-11-03",
    revenueType: { id: 3, name: "Late Payment Penalties", code: "PENALTIES" },
    description: "Late payment fees from trip rentals",
    amount: 8750.00,
    payment_status: "COMPLETED",
    payment_method: "Cash",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 3, name: "Late Payment Penalties", sourceCode: "PENALTIES" },
    paymentMethod: { id: 2, methodName: "Cash", methodCode: "CASH" },
    paymentMethodId: 2,
    sourceId: 3,
    externalRefType: "PENALTIES",
    createdBy: "admin"
  },
  {
    id: 4,
    code: "REV-OTHER-2024-004",
    date_recorded: "2024-11-04",
    revenueType: { id: 4, name: "Insurance Claims", code: "INSURANCE" },
    description: "Vehicle accident insurance payout",
    amount: 150000.00,
    payment_status: "COMPLETED",
    payment_method: "Check",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 4, name: "Insurance Claims", sourceCode: "INSURANCE" },
    paymentMethod: { id: 3, methodName: "Check", methodCode: "CHECK" },
    paymentMethodId: 3,
    sourceId: 4,
    externalRefType: "INSURANCE",
    externalRefId: "INS-CLAIM-2024-045",
    createdBy: "admin"
  },
  {
    id: 5,
    code: "REV-OTHER-2024-005",
    date_recorded: "2024-11-05",
    revenueType: { id: 5, name: "Donations", code: "DONATIONS" },
    description: "Corporate sponsorship from ABC Corp",
    amount: 75000.00,
    payment_status: "COMPLETED",
    payment_method: "Bank Transfer",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 5, name: "Donations", sourceCode: "DONATIONS" },
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 5,
    externalRefType: "DONATIONS",
    externalRefId: "DON-ABC-2024",
    createdBy: "admin"
  },
  {
    id: 6,
    code: "REV-OTHER-2024-006",
    date_recorded: "2024-11-06",
    revenueType: { id: 6, name: "Parking Fees", code: "OTHER" },
    description: "Monthly parking revenue at terminal",
    amount: 32500.00,
    payment_status: "COMPLETED",
    payment_method: "Cash",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 6, name: "Parking Fees", sourceCode: "OTHER" },
    paymentMethod: { id: 2, methodName: "Cash", methodCode: "CASH" },
    paymentMethodId: 2,
    sourceId: 6,
    externalRefType: "OTHER",
    createdBy: "staff_01"
  },
  {
    id: 7,
    code: "REV-OTHER-2024-007",
    date_recorded: "2024-11-07",
    revenueType: { id: 1, name: "Asset Sale", code: "ASSET_SALE" },
    description: "Sale of retired bus units",
    amount: 280000.00,
    payment_status: "COMPLETED",
    payment_method: "Bank Transfer",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 1, name: "Asset Sale", sourceCode: "ASSET_SALE" },
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 1,
    externalRefType: "ASSET_SALE",
    externalRefId: "AS-2024-002",
    createdBy: "admin"
  },
  {
    id: 8,
    code: "REV-OTHER-2024-008",
    date_recorded: "2024-11-08",
    revenueType: { id: 7, name: "Advertising Revenue", code: "OTHER" },
    description: "Bus exterior advertising - November",
    amount: 45000.00,
    payment_status: "COMPLETED",
    payment_method: "Bank Transfer",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 7, name: "Advertising Revenue", sourceCode: "OTHER" },
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 7,
    externalRefType: "OTHER",
    createdBy: "marketing"
  },
  {
    id: 9,
    code: "REV-OTHER-2024-009",
    date_recorded: "2024-11-09",
    revenueType: { id: 2, name: "Interest Income", code: "INTEREST" },
    description: "Investment returns - fixed deposit",
    amount: 18200.75,
    payment_status: "COMPLETED",
    payment_method: "Bank Transfer",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 2, name: "Interest Income", sourceCode: "INTEREST" },
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 2,
    externalRefType: "INTEREST",
    createdBy: "admin"
  },
  {
    id: 10,
    code: "REV-OTHER-2024-010",
    date_recorded: "2024-11-10",
    revenueType: { id: 8, name: "Merchandise Sales", code: "OTHER" },
    description: "Company merchandise and souvenirs",
    amount: 15600.00,
    payment_status: "COMPLETED",
    payment_method: "Cash",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 8, name: "Merchandise Sales", sourceCode: "OTHER" },
    paymentMethod: { id: 2, methodName: "Cash", methodCode: "CASH" },
    paymentMethodId: 2,
    sourceId: 8,
    externalRefType: "OTHER",
    createdBy: "staff_02"
  },
  {
    id: 11,
    code: "REV-OTHER-2024-011",
    date_recorded: "2024-11-11",
    revenueType: { id: 3, name: "Late Payment Penalties", code: "PENALTIES" },
    description: "Penalty fees from contract breaches",
    amount: 12000.00,
    payment_status: "COMPLETED",
    payment_method: "Bank Transfer",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 3, name: "Late Payment Penalties", sourceCode: "PENALTIES" },
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 3,
    externalRefType: "PENALTIES",
    createdBy: "admin"
  },
  {
    id: 12,
    code: "REV-OTHER-2024-012",
    date_recorded: "2024-10-28",
    revenueType: { id: 9, name: "Terminal Rentals", code: "OTHER" },
    description: "Food stall rental at bus terminal",
    amount: 28000.00,
    payment_status: "COMPLETED",
    payment_method: "Cash",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 9, name: "Terminal Rentals", sourceCode: "OTHER" },
    paymentMethod: { id: 2, methodName: "Cash", methodCode: "CASH" },
    paymentMethodId: 2,
    sourceId: 9,
    externalRefType: "OTHER",
    createdBy: "staff_03"
  },
  {
    id: 13,
    code: "REV-OTHER-2024-013",
    date_recorded: "2024-10-25",
    revenueType: { id: 5, name: "Donations", code: "DONATIONS" },
    description: "Community fund-raising event proceeds",
    amount: 52000.00,
    payment_status: "COMPLETED",
    payment_method: "Cash",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 5, name: "Donations", sourceCode: "DONATIONS" },
    paymentMethod: { id: 2, methodName: "Cash", methodCode: "CASH" },
    paymentMethodId: 2,
    sourceId: 5,
    externalRefType: "DONATIONS",
    createdBy: "admin"
  },
  {
    id: 14,
    code: "REV-OTHER-2024-014",
    date_recorded: "2024-10-20",
    revenueType: { id: 1, name: "Asset Sale", code: "ASSET_SALE" },
    description: "Sale of office furniture and fixtures",
    amount: 22500.00,
    payment_status: "COMPLETED",
    payment_method: "Check",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 1, name: "Asset Sale", sourceCode: "ASSET_SALE" },
    paymentMethod: { id: 3, methodName: "Check", methodCode: "CHECK" },
    paymentMethodId: 3,
    sourceId: 1,
    externalRefType: "ASSET_SALE",
    externalRefId: "AS-2024-003",
    createdBy: "admin"
  },
  {
    id: 15,
    code: "REV-OTHER-2024-015",
    date_recorded: "2024-10-15",
    revenueType: { id: 10, name: "Scrap Sales", code: "OTHER" },
    description: "Sale of scrap metal from old parts",
    amount: 8900.50,
    payment_status: "COMPLETED",
    payment_method: "Cash",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 10, name: "Scrap Sales", sourceCode: "OTHER" },
    paymentMethod: { id: 2, methodName: "Cash", methodCode: "CASH" },
    paymentMethodId: 2,
    sourceId: 10,
    externalRefType: "OTHER",
    createdBy: "maintenance"
  },
  {
    id: 16,
    code: "REV-OTHER-2024-016",
    date_recorded: "2024-10-10",
    revenueType: { id: 4, name: "Insurance Claims", code: "INSURANCE" },
    description: "Property damage insurance claim",
    amount: 95000.00,
    payment_status: "COMPLETED",
    payment_method: "Bank Transfer",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 4, name: "Insurance Claims", sourceCode: "INSURANCE" },
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 4,
    externalRefType: "INSURANCE",
    externalRefId: "INS-CLAIM-2024-038",
    createdBy: "admin"
  },
  {
    id: 17,
    code: "REV-OTHER-2024-017",
    date_recorded: "2024-10-05",
    revenueType: { id: 2, name: "Interest Income", code: "INTEREST" },
    description: "Savings account interest - October",
    amount: 6750.25,
    payment_status: "COMPLETED",
    payment_method: "Bank Transfer",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 2, name: "Interest Income", sourceCode: "INTEREST" },
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 2,
    externalRefType: "INTEREST",
    createdBy: "admin"
  },
  {
    id: 18,
    code: "REV-OTHER-2024-018",
    date_recorded: "2024-09-30",
    revenueType: { id: 7, name: "Advertising Revenue", code: "OTHER" },
    description: "Digital billboard advertising - Q3",
    amount: 120000.00,
    payment_status: "COMPLETED",
    payment_method: "Bank Transfer",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 7, name: "Advertising Revenue", sourceCode: "OTHER" },
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 7,
    externalRefType: "OTHER",
    externalRefId: "ADV-Q3-2024",
    createdBy: "marketing"
  },
  {
    id: 19,
    code: "REV-OTHER-2024-019",
    date_recorded: "2024-09-25",
    revenueType: { id: 3, name: "Late Payment Penalties", code: "PENALTIES" },
    description: "Overdue invoice penalty charges",
    amount: 15500.00,
    payment_status: "COMPLETED",
    payment_method: "Bank Transfer",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 3, name: "Late Payment Penalties", sourceCode: "PENALTIES" },
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 3,
    externalRefType: "PENALTIES",
    createdBy: "admin"
  },
  {
    id: 20,
    code: "REV-OTHER-2024-020",
    date_recorded: "2024-09-20",
    revenueType: { id: 6, name: "Parking Fees", code: "OTHER" },
    description: "Quarterly parking fee collection",
    amount: 98000.00,
    payment_status: "COMPLETED",
    payment_method: "Cash",
    isUnearnedRevenue: false,
    // Backward compatibility fields
    source: { id: 6, name: "Parking Fees", sourceCode: "OTHER" },
    paymentMethod: { id: 2, methodName: "Cash", methodCode: "CASH" },
    paymentMethodId: 2,
    sourceId: 6,
    externalRefType: "OTHER",
    createdBy: "staff_01"
  }
];

// Mock departments data
const MOCK_DEPARTMENTS = [
  { id: 1, name: 'Operations' },
  { id: 2, name: 'Finance' },
  { id: 3, name: 'HR' },
  { id: 4, name: 'Marketing' },
  { id: 5, name: 'Maintenance' },
  { id: 6, name: 'Others' },
];

const AdminOtherRevenuePage = () => {
  // State for data and UI
  const [data, setData] = useState<OtherRevenueRecord[]>([]);
  const [analytics, setAnalytics] = useState<RevenueAnalytics>({
    totalRevenue: 0,
    transactionCount: 0,
    topSources: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Filter options state
  const [revenueSources, setRevenueSources] = useState<RevenueSource[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [revenueTypes, setRevenueTypes] = useState<RevenueType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [scheduleFrequencies, setScheduleFrequencies] = useState<ScheduleFrequency[]>([]);

  // Search and filter states
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // For debouncing
  const [activeFilters, setActiveFilters] = useState<{
    paymentStatuses: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
  }>({
    paymentStatuses: [],
    dateRange: { from: '', to: '' },
    amountRange: { from: '', to: '' }
  });

  // Sort states
  const [sortBy, setSortBy] = useState<"code" | "date_recorded" | "amount" | "updated_at">("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // UI states
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Modal states using ModalManager pattern
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<OtherRevenueRecord | null>(null);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<RevenueScheduleItem | null>(null);
  const [selectedRevenueRecord, setSelectedRevenueRecord] = useState<OtherRevenueRecord | null>(null);

  // Fetch filter options (revenue sources and payment methods)
  const fetchFilterOptions = async () => {
    try {
      // Fetch revenue types from backend
      const typesResponse = await fetch('/api/admin/other-revenue/types');
      if (typesResponse.ok) {
        const typesResult = await typesResponse.json();
        const types = typesResult.data || [];
        setRevenueTypes(types);
        // Also set as revenue sources for filter compatibility
        setRevenueSources(types.map((t: RevenueType) => ({
          id: t.id,
          name: t.name,
          sourceCode: t.code
        })));
      }
    } catch (err) {
      console.error('Error fetching revenue types:', err);
    }

    // Fetch departments from backend
    try {
      const deptResponse = await fetch('/api/admin/other-revenue/departments');
      if (deptResponse.ok) {
        const deptResult = await deptResponse.json();
        setDepartments(deptResult.data || []);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }

    // Fetch schedule frequencies from backend
    try {
      const freqResponse = await fetch('/api/admin/other-revenue/schedule-frequencies');
      if (freqResponse.ok) {
        const freqResult = await freqResponse.json();
        setScheduleFrequencies(freqResult.data || []);
      }
    } catch (err) {
      console.error('Error fetching schedule frequencies:', err);
    }

    // Set payment methods (matching schema enum values)
    // Note: REIMBURSEMENT is excluded from revenue payment methods.
    // Reimbursement is only applicable to expense records, not revenue records.
    setPaymentMethods([
      { id: 1, methodName: "Cash", methodCode: "CASH" },
      { id: 2, methodName: "Bank Transfer", methodCode: "BANK_TRANSFER" },
      { id: 3, methodName: "E-Wallet", methodCode: "E_WALLET" }
    ]);
  };

  // Transform OtherRevenueRecord to OtherRevenueData for modals
  const transformRecordToFormData = (record: OtherRevenueRecord): OtherRevenueData => {
    // Map backend payment method enum to display name
    // Note: REIMBURSEMENT from legacy data is treated as Cash
    const paymentMethodEnumToName: Record<string, string> = {
      'CASH': 'Cash',
      'BANK_TRANSFER': 'Bank Transfer',
      'E_WALLET': 'E-Wallet'
    };
    const paymentMethodName = paymentMethodEnumToName[record.payment_method || ''] || 'Cash';

    // Ensure date_recorded is in YYYY-MM-DD format for date input
    let dateRecorded = record.date_recorded || '';
    if (dateRecorded && dateRecorded.includes('T')) {
      dateRecorded = dateRecorded.split('T')[0];
    }

    // Extract schedule data from receivable if present
    let scheduleFrequency: RevenueScheduleFrequency | undefined;
    let scheduleStartDate: string | undefined;
    let numberOfPayments: number | undefined;

    if (record.receivable) {
      // Map backend frequency string to RevenueScheduleFrequency enum
      if (record.receivable.frequency) {
        scheduleFrequency = record.receivable.frequency as RevenueScheduleFrequency;
      }
      numberOfPayments = record.receivable.numberOfPayments;

      // Format scheduleStartDate to YYYY-MM-DD
      if (record.receivable.scheduleStartDate) {
        const startDate = record.receivable.scheduleStartDate;
        scheduleStartDate = startDate.includes('T') ? startDate.split('T')[0] : startDate;
      }
    }

    return {
      id: record.id,
      code: record.code,
      name: record.revenueType?.name || 'OTHER',
      date_recorded: dateRecorded,
      description: record.description || record.revenueType?.name || '',
      amount: record.amount,
      payment_reference: record.payment_reference || '',
      department_id: record.department_id || record.department?.id,
      department: record.department?.department_name,
      // Use receivable existence as ground truth for isUnearnedRevenue
      isUnearnedRevenue: !!record.receivable || record.isUnearnedRevenue || false,
      // Include schedule fields from receivable
      scheduleFrequency,
      scheduleStartDate,
      numberOfPayments,
      scheduleItems: record.scheduleItems || [],
      remarks: record.remarks || '',
      payment_method: paymentMethodName,
      accountCode: record.accountCode || '',
      createdBy: record.created_by || 'admin',
    };
  };

  // Open modal with different modes
  const openModal = (mode: 'view' | 'add' | 'edit', rowData?: OtherRevenueRecord) => {
    let content;

    switch (mode) {
      case 'view':
        content = (
          <ViewOtherRevenueModal
            revenueData={{
              ...transformRecordToFormData(rowData!),
              paymentMethodName: rowData!.payment_method || 'N/A',
            }}
            onClose={closeModal}
            onRecordPayment={(scheduleItem?: RevenueScheduleItem) => {
              if (scheduleItem && rowData) {
                openPaymentModal(scheduleItem, rowData);
              }
            }}
          />
        );
        break;
      case 'add':
      case 'edit':
        content = (
          <RecordOtherRevenueModal
            mode={mode}
            existingData={rowData ? transformRecordToFormData(rowData) : null}
            onClose={closeModal}
            onSave={handleSaveOtherRevenue}
            paymentMethods={paymentMethods}
            departments={departments.map(d => ({ id: d.id, name: d.department_name }))}
            currentUser="admin"
            revenueTypes={revenueTypes}
            scheduleFrequencies={scheduleFrequencies}
            approvalStatus={rowData?.approval_status || 'PENDING'}
          />
        );
        break;
      default:
        content = null;
    }

    setModalContent(content);
    setActiveRow(rowData || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setActiveRow(null);
  };

  // Payment modal handlers
  const openPaymentModal = (scheduleItem: RevenueScheduleItem, revenueRecord: OtherRevenueRecord) => {
    const scheduleItems = revenueRecord.scheduleItems || [];

    // Find the earliest unpaid installment: prioritize OVERDUE > PARTIALLY_PAID > PENDING
    const overdueItems = scheduleItems.filter(item => item.status === PaymentStatus.OVERDUE);
    const partiallyPaidItems = scheduleItems.filter(item => item.status === PaymentStatus.PARTIALLY_PAID);
    const pendingItems = scheduleItems.filter(item => item.status === PaymentStatus.PENDING);

    let targetItem = scheduleItem;

    // If there's an overdue item, always pay that first
    if (overdueItems.length > 0) {
      targetItem = overdueItems[0];
    }
    // Otherwise, if clicked item is PAID, find the next unpaid one
    else if (scheduleItem.status === PaymentStatus.PAID) {
      if (partiallyPaidItems.length > 0) {
        targetItem = partiallyPaidItems[0];
      } else if (pendingItems.length > 0) {
        targetItem = pendingItems[0];
      }
    }
    // If clicked item is PARTIALLY_PAID and there's no overdue, allow payment to it
    // (user may want to complete the partial payment)

    setSelectedScheduleItem(targetItem);
    setSelectedRevenueRecord(revenueRecord);
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedScheduleItem(null);
    setSelectedRevenueRecord(null);
  };

  const handlePaymentRecorded = async (paymentData: PaymentRecordData) => {
    try {
      // POST to backend API to record the payment
      const response = await fetch('/api/admin/other-revenue/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenueId: paymentData.recordId,
          scheduleItemId: paymentData.scheduleItemId,
          scheduleItemIds: paymentData.scheduleItemIds,
          amountPaid: paymentData.amountToPay,
          paymentDate: paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethodCode,
          recordedBy: paymentData.recordedBy,
          cascadeBreakdown: paymentData.cascadeBreakdown
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to record payment');
      }

      await fetchData();
      closePaymentModal();
    } catch (error) {
      console.error('Payment recording failed:', error);
      throw error; // Let RecordPaymentModal handle error display
    }
  };

  // Handle save other revenue (both add and edit)
  const handleSaveOtherRevenue = async (formData: OtherRevenueData, mode: 'add' | 'edit') => {
    try {
      // Find revenue type ID from name
      const revenueType = revenueTypes.find(t => t.name === formData.name);
      if (!revenueType && mode === 'add') {
        showError('Invalid revenue type selected', 'Validation Error');
        return;
      }

      // Map payment method name to enum value
      const paymentMethodMap: Record<string, string> = {
        'Cash': 'CASH',
        'Bank Transfer': 'BANK_TRANSFER',
        'E-Wallet': 'E_WALLET',
        'Reimbursement': 'REIMBURSEMENT'
      };
      const paymentMethodEnum = paymentMethodMap[formData.payment_method] || 'CASH';

      if (mode === 'add') {
        // Build payload matching backend OtherRevenueCreateInput
        const payload = {
          revenue_type_id: revenueType!.id,
          amount: formData.amount,
          date_recorded: formData.date_recorded,
          description: formData.description || formData.name,
          payment_method: paymentMethodEnum,
          payment_reference: formData.payment_reference || undefined,
          department_id: formData.department_id,
          remarks: formData.remarks || undefined,
          isUnearnedRevenue: formData.isUnearnedRevenue,
          scheduleFrequency: formData.isUnearnedRevenue ? formData.scheduleFrequency : undefined,
          scheduleStartDate: formData.isUnearnedRevenue ? formData.scheduleStartDate : undefined,
          numberOfPayments: formData.isUnearnedRevenue ? formData.numberOfPayments : undefined,
          created_by: formData.createdBy || 'admin'
        };

        const response = await fetch('/api/admin/other-revenue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create revenue record');
        }

        showSuccess('Revenue record added successfully', 'Added');
      } else {
        // Update existing record
        // Use formData.id (passed from modal) as primary, fallback to activeRow?.id
        const revenueId = formData.id || activeRow?.id;
        if (!revenueId) {
          showError('Invalid revenue ID - unable to update record', 'Error');
          return;
        }

        // Check if unearned revenue status changed (conversion)
        // Use activeRow?.receivable as ground truth - if record has a receivable, it was unearned revenue
        const wasUnearnedRevenue = !!activeRow?.receivable;
        const isNowUnearnedRevenue = formData.isUnearnedRevenue;
        const unearnedStatusChanged = wasUnearnedRevenue !== isNowUnearnedRevenue;

        console.log('[DEBUG] Conversion check:', {
          wasUnearnedRevenue,
          isNowUnearnedRevenue,
          unearnedStatusChanged,
          activeRowReceivable: activeRow?.receivable,
          activeRowIsUnearnedRevenue: activeRow?.isUnearnedRevenue,
          formDataIsUnearned: formData.isUnearnedRevenue
        });

        const payload: Record<string, unknown> = {
          revenue_type_id: revenueType?.id,
          amount: formData.amount,
          date_recorded: formData.date_recorded,
          description: formData.description || formData.name,
          payment_method: paymentMethodEnum,
          payment_reference: formData.payment_reference || undefined,
          department_id: formData.department_id,
          remarks: formData.remarks || undefined,
          updated_by: formData.createdBy || 'admin',
          // ALWAYS include isUnearnedRevenue so backend knows current state
          isUnearnedRevenue: isNowUnearnedRevenue
        };

        console.log('[DEBUG] Payload isUnearnedRevenue:', isNowUnearnedRevenue);

        // Include schedule details if converting to receivable
        if (isNowUnearnedRevenue) {
          payload.scheduleFrequency = formData.scheduleFrequency;
          payload.scheduleStartDate = formData.scheduleStartDate;
          payload.numberOfPayments = formData.numberOfPayments;
        }

        console.log('[DEBUG] Final payload:', JSON.stringify(payload, null, 2));

        const response = await fetch(`/api/admin/other-revenue/${revenueId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update revenue record');
        }

        showSuccess('Revenue record updated successfully', 'Updated');
      }

      await fetchData(); // Refresh data to show new/updated record
      closeModal();
    } catch (err) {
      console.error(`Error ${mode}ing revenue:`, err);
      showError(err instanceof Error ? err.message : `Failed to ${mode} revenue record`, 'Error');
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      // Calculate analytics from ALL mock data (not just paginated data)
      const allData = MOCK_OTHER_REVENUE_DATA;
      const totalRevenue = allData.reduce((sum, record) => sum + record.amount, 0);

      // Calculate top sources
      const sourceMap = new Map<string, number>();
      allData.forEach(record => {
        const sourceName = record.revenueType.name;
        const currentAmount = sourceMap.get(sourceName) || 0;
        sourceMap.set(sourceName, currentAmount + record.amount);
      });

      const topSources = Array.from(sourceMap.entries())
        .map(([sourceName, amount]) => ({ sourceName, amount }))
        .sort((a, b) => b.amount - a.amount) // Sort by amount descending
        .slice(0, 5); // Show top 5 sources

      setAnalytics({
        totalRevenue,
        transactionCount: allData.length,
        topSources
      });
    } catch (err) {
      console.error('Error calculating analytics:', err);
    }
  };

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      // Add search parameter if exists
      if (search) {
        params.append('search', search);
      }

      // Add filter parameters
      if (activeFilters.dateRange?.from) {
        params.append('startDate', activeFilters.dateRange.from);
      }
      if (activeFilters.dateRange?.to) {
        params.append('endDate', activeFilters.dateRange.to);
      }

      // Add status filter
      if (activeFilters.paymentStatuses.length > 0) {
        params.append('status', activeFilters.paymentStatuses[0]);
      }

      // Call actual API endpoint
      const response = await fetch(`/api/admin/other-revenue?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Map backend response to OtherRevenueRecord format
      const mappedRecords: OtherRevenueRecord[] = (result.data || []).map((item: Record<string, unknown>) => {
        const revenueType = item.revenueType as { id: number; code: string; name: string } | undefined;
        const receivable = item.receivable as {
          id: number;
          status: string;
          frequency?: string;
          numberOfPayments?: number;
          scheduleStartDate?: string;
          scheduleItems?: Array<{
            id: number;
            installmentNumber: number;
            dueDate: string;
            amountDue: number;
            amountPaid: number;
            balance: number;
            status: string;
            payments?: Array<{
              id: number;
              amountPaid: number;
              paymentDate: string;
              paymentMethod: string | null;
              paymentReference: string | null;
              createdBy: string | null;
              createdAt: string;
            }>;
          }>;
        } | null | undefined;

        // Map journal entry from backend response for edit/delete restrictions
        const journalEntry = item.journalEntry as {
          id: number;
          code: string;
          status: string;
        } | null | undefined;

        // Map schedule items to frontend format (schema-aligned field names)
        const scheduleItems: RevenueScheduleItem[] = receivable?.scheduleItems?.map(s => ({
          id: String(s.id),
          installment_number: s.installmentNumber,
          due_date: s.dueDate?.split('T')[0] || s.dueDate,
          amount_due: s.amountDue,
          amount_paid: s.amountPaid,
          balance: s.balance,
          status: s.status as PaymentStatus,
          isPastDue: new Date(s.dueDate) < new Date() && s.status !== 'PAID',
          isEditable: s.status !== 'PAID',
          // Map payment transaction records for payment history
          payments: s.payments?.map(p => ({
            id: p.id,
            amount_paid: p.amountPaid,
            payment_date: p.paymentDate?.split('T')[0] || p.paymentDate,
            payment_method: p.paymentMethod,
            payment_reference: p.paymentReference,
            created_by: p.createdBy,
            created_at: p.createdAt
          })) || []
        })) || [];

        return {
          id: item.id as number,
          code: item.code as string,
          date_recorded: item.date_recorded as string,
          date_expected: item.date_expected as string | undefined,
          revenueType: revenueType || { id: 0, code: '', name: 'Unknown' },
          description: (item.description as string) || '',
          department: item.department as string | undefined,
          remarks: item.remarks as string | undefined,
          amount: item.amount as number,
          payment_status: item.payment_status as string,
          payment_method: item.payment_method as string | undefined,
          payment_reference: item.payment_reference as string | undefined,
          isUnearnedRevenue: item.isUnearnedRevenue as boolean,
          accountCode: item.accountCode as string | undefined,
          created_by: item.created_by as string | undefined,
          created_at: item.created_at as string | undefined,
          approval_status: (item.approval_status as any) || 'PENDING',
          accounting_status: item.accounting_status as string | undefined,
          approvalRemarks: item.approvalRemarks as string | undefined,
          // Journal Entry for edit/delete restrictions - single source of truth
          journalEntry: journalEntry ? {
            id: journalEntry.id,
            code: journalEntry.code,
            status: journalEntry.status
          } : null,
          receivable: receivable ? {
            id: receivable.id,
            status: receivable.status,
            frequency: receivable.frequency,
            numberOfPayments: receivable.numberOfPayments,
            scheduleStartDate: receivable.scheduleStartDate,
            scheduleItems: receivable.scheduleItems || []
          } : null,
          // Backward compatibility mappings
          source: {
            id: revenueType?.id || 0,
            name: revenueType?.name || 'Unknown',
            sourceCode: revenueType?.code || ''
          },
          paymentMethod: {
            id: 0,
            methodName: (item.payment_method as string) || 'Unknown',
            methodCode: (item.payment_method as string) || ''
          },
          paymentMethodId: 0,
          sourceId: revenueType?.id || 0,
          externalRefType: 'OTHER',
          externalRefId: item.payment_reference as string | undefined,
          createdBy: (item.created_by as string) || 'system',
          scheduleItems: scheduleItems
        };
      });

      setData(mappedRecords);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotalCount(result.pagination?.totalCount || 0);

      // Set analytics from backend
      if (result.analytics) {
        setAnalytics({
          totalRevenue: result.analytics.totalAmount || 0,
          transactionCount: result.analytics.totalRecords || 0,
          topSources: (result.analytics.byType || []).map((t: { name: string; amount: number }) => ({
            sourceName: t.name,
            amount: t.amount
          }))
        });
      }

    } catch (err) {
      console.error('Error fetching other revenue data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      showError('Failed to load other revenue data', 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, search, sortBy, sortOrder, activeFilters]);

  // Fetch analytics when data changes
  useEffect(() => {
    if (!loading) {
      fetchAnalytics();
    }
  }, [data, loading]);

  // Sort handler
  const handleSort = (field: "code" | "date_recorded" | "amount") => {
    if (sortBy === field) {
      // Toggle sort order if clicking same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New column - default to desc
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1); // Reset to first page
  };

  // Get sort indicator for column
  const getSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  // Handle filter apply
  const handleFilterApply = (filterValues: {
    paymentStatuses: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
  }) => {
    setActiveFilters(filterValues);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Action handlers
  const handleAdd = () => {
    openModal('add');
  };

  const handleView = (id: number) => {
    const record = data.find(item => item.id === id);
    if (record) {
      openModal('view', record);
    }
  };

  const handleEdit = (id: number) => {
    const record = data.find(item => item.id === id);
    if (record) {
      openModal('edit', record);
    }
  };

  const handleDelete = async (id: number) => {
    // Find the record to verify status
    const record = data.find(item => item.id === id);
    if (!record) {
      showError('Revenue record not found', 'Error');
      return;
    }

    // Only allow deletion for PENDING approval status (before approval)
    if (record.approval_status !== 'PENDING') {
      showError('Only records with PENDING approval status can be deleted', 'Cannot Delete');
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the revenue record. This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#961C1E',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      confirmButtonText: 'Yes, delete it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        // Call API to soft delete the record
        const response = await fetch(`/api/admin/other-revenue/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleted_by: 'admin' })
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to delete revenue record');
        }

        showSuccess('Revenue record deleted successfully', 'Deleted');
        fetchData(); // Refresh the data
      } catch (err) {
        console.error('Error deleting revenue:', err);
        showError(err instanceof Error ? err.message : 'Failed to delete revenue record', 'Delete Failed');
      }
    }
  };

  const handleApprove = async (id: number) => {
    const record = data.find(item => item.id === id);
    if (!record) return;

    // Check if already approved
    if (record.approval_status !== 'PENDING') {
      showError(`Record is already ${record.approval_status}`, 'Cannot Approve');
      return;
    }

    const result = await Swal.fire({
      title: 'Approve Revenue?',
      text: `Are you sure you want to approve ${record.code}? This will generate a journal entry and allow payments.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, approve it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/other-revenue/${id}/approve`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'admin' })
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to approve revenue');
        }

        showSuccess('Revenue record approved successfully', 'Approved');
        await fetchData(); // Await to ensure data refreshes before user can click again
      } catch (err) {
        console.error('Error approving revenue:', err);
        showError(err instanceof Error ? err.message : 'Failed to approve revenue', 'Error');
      }
    }
  };

  const handleReject = async (id: number) => {
    const record = data.find(item => item.id === id);
    if (!record) return;

    // Check if already rejected or approved
    if (record.approval_status !== 'PENDING') {
      showError(`Record is already ${record.approval_status}`, 'Cannot Reject');
      return;
    }

    const result = await Swal.fire({
      title: 'Reject Revenue?',
      text: `Are you sure you want to reject ${record.code}? This record will be locked and cannot be processed further.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, reject it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/other-revenue/${id}/reject`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'admin' })
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(responseData.message || 'Failed to reject revenue');
        }

        showSuccess('Revenue record rejected', 'Rejected');
        await fetchData(); // Await to ensure data refreshes before user can click again
      } catch (err) {
        console.error('Error rejecting revenue:', err);
        showError(err instanceof Error ? err.message : 'Failed to reject revenue', 'Error');
      }
    }
  };

  // Transform data to include installment rows for unearned revenue
  interface TableRow {
    id: string; // Unique identifier for React key (revenueId-installmentNumber)
    revenueId: number;
    revenueCode: string;
    date_recorded: string;
    date_expected?: string;
    source?: { id: number; name: string; sourceCode: string };
    description: string;
    type: 'Receivable' | 'Single';
    amount: number;
    receivable?: number;
    status?: string;
    paymentMethod?: { id: number; methodName: string; methodCode: string };
    isInstallmentRow: boolean;
    installmentNumber?: number;
    totalInstallments?: number;
    dueDate?: string;
    balance?: number;
    paymentStatus?: PaymentStatus;
    scheduleItem?: RevenueScheduleItem;
    originalRecord: OtherRevenueRecord;
  }

  const transformDataToRows = (): TableRow[] => {
    const rows: TableRow[] = [];

    data.forEach(record => {
      // Check if this is unearned revenue with schedule
      if (record.isUnearnedRevenue && record.scheduleItems && record.scheduleItems.length > 0) {
        // Create ONE row per revenue, aggregating all installment data
        // Calculate total receivable balance from all installments
        const totalBalance = record.scheduleItems.reduce(
          (sum, item) => sum + (item.balance || (item.amount_due - item.amount_paid)),
          0
        );
        const totalPaid = record.scheduleItems.reduce(
          (sum, item) => sum + (item.amount_paid || 0),
          0
        );

        // Derive status from overall receivable balance (NOT per installment)
        let derivedStatus: PaymentStatus;
        if (totalBalance <= 0) {
          derivedStatus = PaymentStatus.PAID;
        } else if (totalPaid > 0) {
          derivedStatus = PaymentStatus.PARTIALLY_PAID;
        } else {
          derivedStatus = PaymentStatus.PENDING;
        }

        rows.push({
          id: `${record.id}-revenue`,
          revenueId: record.id,
          revenueCode: record.code,
          date_recorded: record.date_recorded,
          date_expected: record.date_expected,
          source: record.source,
          description: record.description,
          type: 'Receivable' as const,
          amount: record.amount,
          receivable: totalBalance,
          status: record.payment_status || derivedStatus,
          paymentMethod: record.paymentMethod,
          isInstallmentRow: false, // Single row per revenue, not per installment
          paymentStatus: derivedStatus,
          originalRecord: record
        });
      } else {
        // Regular revenue record (single row)
        // Derive status from payment_status or default to COMPLETED
        const status = record.payment_status as PaymentStatus || PaymentStatus.COMPLETED;

        rows.push({
          id: `${record.id}-single`,
          revenueId: record.id,
          revenueCode: record.code,
          date_recorded: record.date_recorded,
          date_expected: record.date_expected,
          source: record.source,
          description: record.description,
          type: 'Single' as const,
          amount: record.amount,
          receivable: 0,
          status: status,
          paymentMethod: record.paymentMethod,
          isInstallmentRow: false,
          paymentStatus: status, // Set paymentStatus so filter works
          originalRecord: record
        });
      }
    });

    return rows;
  };

  // Update matchesSearch to include approval status and formatted values
  const matchesSearch = (row: TableRow, searchTerm: string): boolean => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    // Match visible columns with formatted display values
    const matchCode = row.revenueCode.toLowerCase().includes(term);
    const matchDate = formatDate(row.date_recorded).toLowerCase().includes(term);
    const matchSource = row.originalRecord.revenueType?.name?.toLowerCase().includes(term) || false;
    const matchAmount = formatMoney(row.amount).toLowerCase().includes(term) ||
      row.amount.toString().includes(term);
    const matchReceivable = row.receivable !== undefined && (
      formatMoney(row.receivable).toLowerCase().includes(term) ||
      row.receivable.toString().includes(term)
    );
    const matchStatus = (row.status?.toLowerCase().replace('_', ' ').includes(term) || false) ||
      (row.paymentStatus?.toLowerCase().replace('_', ' ').includes(term) || false) ||
      (row.originalRecord.approval_status?.toLowerCase().includes(term) || false);

    return matchCode || matchDate || matchSource || matchAmount || matchReceivable || matchStatus;
  };

  const tableRows = transformDataToRows();

  // Apply payment status filter and client-side search supplement to table rows
  let filteredTableRows = tableRows;

  // Apply payment status filter
  if (activeFilters.paymentStatuses.length > 0) {
    filteredTableRows = filteredTableRows.filter(row =>
      row.paymentStatus && activeFilters.paymentStatuses.includes(row.paymentStatus)
    );
  }

  // Apply client-side search for formatted values (supplements backend search)
  if (search) {
    filteredTableRows = filteredTableRows.filter(row => matchesSearch(row, search));
  }

  // Get status chip class - uses classes from chips.css
  const getStatusClass = (status: string): string => {
    // Normalize status: lowercase and replace underscores with hyphens
    const normalized = status.toLowerCase().replace(/_/g, '-');
    return `chip ${normalized}`;
  };

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Other Revenue Records</h1>
        <Loading />
      </div>
    );
  }

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Other Revenue Records</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setErrorCode(null);
            fetchData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Other Revenue Records</h1>
        </div>
        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search other revenue..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {/* Filter button right next to search bar */}
            <RevenueFilter
              sources={[]} // Not filtering by source - it's searchable but not filterable
              paymentMethods={[]} // Payment method is NOT a visible column - remove filter
              paymentStatuses={[
                { id: PaymentStatus.PENDING, label: 'Pending' },
                { id: PaymentStatus.PAID, label: 'Paid' },
                { id: PaymentStatus.PARTIALLY_PAID, label: 'Partially Paid' },
              ]}
              onApply={handleFilterApply}
              initialValues={activeFilters}
            />
          </div>

          {/* Add Revenue Button on the right */}
          <div className="filters">
            <button onClick={handleAdd} className='addButton'>
              <i className="ri-add-line" /> Add Revenue
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Revenue Code</th>
                  <th
                    onClick={() => handleSort("date_recorded")}
                    className="sortable-header"
                    title="Click to sort by Transaction Date"
                  >
                    Transaction Date{getSortIndicator("date_recorded")}
                  </th>
                  <th>Source</th>
                  <th
                    onClick={() => handleSort("amount")}
                    className="sortable-header"
                    title="Click to sort by Amount"
                  >
                    Total Amount{getSortIndicator("amount")}
                  </th>
                  <th>Receivable</th>
                  <th>Approval Status</th>
                  <th>Payment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="loading-cell">
                      Loading...
                    </td>
                  </tr>
                ) : filteredTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-cell">
                      No other revenue records found.
                    </td>
                  </tr>
                ) : (
                  filteredTableRows.map((row) => {
                    return (
                      <tr key={row.id}>
                        {/* Revenue Code Column */}
                        <td>{row.revenueCode}</td>
                        <td>{formatDate(row.date_recorded)}</td>
                        {/* Source Column - show revenue type name */}
                        <td>{row.originalRecord.revenueType.name}</td>
                        {/* Total Amount Column */}
                        <td>{formatMoney(row.amount)}</td>
                        {/* Receivable Column */}
                        <td>
                          {row.receivable !== undefined && row.receivable !== null ? (
                            <span style={{
                              color: row.receivable > 0 ? '#FF4949' : '#4CAF50',
                              fontWeight: '600'
                            }}>
                              {formatMoney(row.receivable)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        {/* Approval Status Column */}
                        <td>
                          <span className={getStatusClass(row.originalRecord.approval_status || 'PENDING')}>
                            {row.originalRecord.approval_status?.replace('_', ' ') || 'PENDING'}
                          </span>
                        </td>

                        {/* Payment Status Column */}
                        <td>
                          {row.status ? (
                            <span className={getStatusClass(row.paymentStatus || PaymentStatus.PENDING)}>
                              {row.status.replace('_', ' ')}
                            </span>
                          ) : row.paymentStatus ? (
                            <span className={getStatusClass(row.paymentStatus)}>
                              {row.paymentStatus.replace('_', ' ')}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="actionButtons">
                          <div className="actionButtonsContainer">
                            {/* View button - always visible */}
                            <button
                              className="viewBtn"
                              onClick={() => openModal('view', row.originalRecord)}
                              title="View Record"
                            >
                              <i className="ri-eye-line"></i>
                            </button>

                            {/* Approve button - ONLY visible for PENDING status */}
                            {/* Approve button */}
                            <button
                              className="approveBtn"
                              onClick={() => handleApprove(row.revenueId)}
                              title={row.originalRecord.approval_status === 'PENDING' ? "Approve Record" : `Already ${row.originalRecord.approval_status}`}
                              disabled={row.originalRecord.approval_status !== 'PENDING'}
                              style={{
                                color: '#28a745',
                                opacity: row.originalRecord.approval_status !== 'PENDING' ? 0.5 : 1,
                                cursor: row.originalRecord.approval_status !== 'PENDING' ? 'not-allowed' : 'pointer',
                                marginRight: '4px'
                              }}
                            >
                              <i className="ri-checkbox-circle-line"></i>
                            </button>

                            {/* Reject button - ONLY visible for PENDING status */}
                            {/* Reject button */}
                            <button
                              className="rejectBtn"
                              onClick={() => handleReject(row.revenueId)}
                              title={row.originalRecord.approval_status === 'PENDING' ? "Reject Record" : `Already ${row.originalRecord.approval_status}`}
                              disabled={row.originalRecord.approval_status !== 'PENDING'}
                              style={{
                                color: '#dc3545',
                                opacity: row.originalRecord.approval_status !== 'PENDING' ? 0.5 : 1,
                                cursor: row.originalRecord.approval_status !== 'PENDING' ? 'not-allowed' : 'pointer',
                                marginRight: '4px'
                              }}
                            >
                              <i className="ri-close-circle-line"></i>
                            </button>

                            {/* Edit button - ONLY visible for PENDING status and JE in DRAFT status */}
                            {/* Journal Entry status is the single source of truth for edit restrictions */}
                            {/* Edit button */}
                            <button
                              className="editBtn"
                              onClick={() => openModal('edit', row.originalRecord)}
                              title={row.originalRecord.approval_status === 'PENDING' ? "Edit Record" : "Cannot edit non-pending record"}
                              disabled={row.originalRecord.approval_status !== 'PENDING'}
                              style={{
                                opacity: row.originalRecord.approval_status !== 'PENDING' ? 0.5 : 1,
                                cursor: row.originalRecord.approval_status !== 'PENDING' ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <i className="ri-edit-2-line" />
                            </button>

                            {/* Delete button - ONLY visible for PENDING status and JE in DRAFT status */}
                            {/* Journal Entry status is the single source of truth for delete restrictions */}
                            {/* Delete button */}
                            <button
                              className="deleteBtn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(row.revenueId);
                              }}
                              title={row.originalRecord.approval_status === 'PENDING' ? "Delete Record" : "Cannot delete non-pending record"}
                              disabled={row.originalRecord.approval_status !== 'PENDING'}
                              style={{
                                opacity: row.originalRecord.approval_status !== 'PENDING' ? 0.5 : 1,
                                cursor: row.originalRecord.approval_status !== 'PENDING' ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <i className="ri-delete-bin-line" />
                            </button>

                            {/* Locked indicator for non-DRAFT journal entries */}
                            {row.originalRecord.journalEntry && row.originalRecord.journalEntry?.status !== 'DRAFT' && (
                              <span
                                className="lockedIndicator"
                                title={`Locked - Journal entry ${row.originalRecord.journalEntry?.status?.toLowerCase()}`}
                                style={{ color: '#888', padding: '4px 8px' }}
                              >
                                <i className="ri-lock-line" />
                              </span>
                            )}

                            {/* Pay button for unearned revenue that's not fully paid */}
                            {row.originalRecord.isUnearnedRevenue &&
                              row.originalRecord.approval_status === 'APPROVED' &&
                              row.paymentStatus &&
                              row.status !== PaymentStatus.PAID &&
                              row.status !== PaymentStatus.CANCELLED &&
                              row.status !== PaymentStatus.WRITTEN_OFF &&
                              row.originalRecord.scheduleItems &&
                              row.originalRecord.scheduleItems.length > 0 && (() => {
                                // Find the first unpaid installment
                                const firstUnpaid = row.originalRecord.scheduleItems.find(
                                  item => item.status !== PaymentStatus.PAID
                                );
                                return firstUnpaid ? (
                                  <button
                                    className="payBtn"
                                    onClick={() => openPaymentModal(firstUnpaid, row.originalRecord)}
                                    title="Record Payment"
                                  >
                                    <i className="ri-money-dollar-circle-line"></i>
                                  </button>
                                ) : null;
                              })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

      </div>

      {/* Dynamic Modal Manager */}
      <ModalManager
        isOpen={isModalOpen}
        onClose={closeModal}
        modalContent={modalContent}
      />

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedScheduleItem && selectedRevenueRecord && (
        <ModalManager
          isOpen={isPaymentModalOpen}
          onClose={closePaymentModal}
          modalContent={
            <RecordPaymentModal
              entityType="other-revenue"
              recordId={selectedRevenueRecord.id}
              recordRef={selectedRevenueRecord.code}
              scheduleItems={selectedRevenueRecord.scheduleItems || []}
              selectedInstallment={selectedScheduleItem}
              paymentMethods={paymentMethods}
              currentUser="admin"
              onPaymentRecorded={handlePaymentRecorded}
              onClose={closePaymentModal}
              processCascadePayment={processRevenueCascade}
              hideEmployeeFields={true}
            />
          }
        />
      )}
    </div>
  );
};

export default AdminOtherRevenuePage;