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

interface OtherRevenueRecord {
  id: number;
  code: string;
  date_recorded: string;
  date_expected?: string;
  last_payment_date?: string;
  source: {
    id: number;
    name: string;
    sourceCode: string;
  };
  description: string;
  amount: number;
  balance?: number;
  status?: string;
  revenue_status?: string;
  receivable_status?: string;
  paymentMethod: {
    id: number;
    methodName: string;
    methodCode: string;
  };
  paymentMethodId: number;
  sourceId: number;
  externalRefType?: string;
  externalRefId?: string;
  createdBy: string;
  approvedBy?: string;
  isUnearnedRevenue?: boolean;
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
  department: string;
  discountAmount?: number;
  discountPercentage?: number;
  discountReason?: string;
  isUnearnedRevenue: boolean;
  recognitionSchedule?: string;
  isVerified: boolean;
  remarks?: string;
  
  // Payment Schedule Fields
  scheduleFrequency?: RevenueScheduleFrequency;
  scheduleStartDate?: string;
  numberOfPayments?: number;
  scheduleItems?: RevenueScheduleItem[];
  
  // Relations
  payment_method: string;
  
  // View-only fields
  verifiedBy?: string;
  verifiedAt?: string;
  receiptUrl?: string;
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
    source: { id: 1, name: "Asset Sale", sourceCode: "ASSET_SALE" },
    description: "Sale of old computer equipment",
    amount: 45000.00,
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 1,
    externalRefType: "ASSET_SALE",
    externalRefId: "AS-2024-001",
    createdBy: "admin",
    approvedBy: "finance_manager",
    isUnearnedRevenue: true,
      scheduleItems: [
      {
        id: '1',
        installmentNumber: 1,
        originalDueDate: "2024-11-15",
        currentDueDate: "2024-11-15",
        originalDueAmount: 15000.00,
        currentDueAmount: 15000.00,
        paidAmount: 15000.00,
        carriedOverAmount: 0,
        isPastDue: false,
        isEditable: false,
        paymentStatus: PaymentStatus.PAID,
        paidAt: "2024-11-14",
        paidBy: "admin",
        paymentMethod: "Bank Transfer",
        referenceNumber: "PAY-001-2024",
        remarks: "First installment paid on time",
      },
      {
        id: '2',
        installmentNumber: 2,
        originalDueDate: "2024-12-15",
        currentDueDate: "2024-12-15",
        originalDueAmount: 15000.00,
        currentDueAmount: 15000.00,
        paidAmount: 10000.00,
        carriedOverAmount: 0,
        isPastDue: false,
        isEditable: false,
        paymentStatus: PaymentStatus.PARTIALLY_PAID,
        paidAt: "2024-12-10",
        paidBy: "admin",
        paymentMethod: "Bank Transfer",
        referenceNumber: "PAY-002-2024",
        remarks: "Partial payment received",
      },
      {
        id: '3',
        installmentNumber: 3,
        originalDueDate: "2025-01-15",
        currentDueDate: "2025-01-15",
        originalDueAmount: 15000.00,
        currentDueAmount: 20000.00,
        paidAmount: 0,
        carriedOverAmount: 5000.00,
        isPastDue: false,
        isEditable: true,
        paymentStatus: PaymentStatus.PENDING,
        // Unpaid installment, optional fields omitted
        remarks: "Carried over balance from installment 2",
      }
    ]
  },
  {
    id: 2,
    code: "REV-OTHER-2024-002",
    date_recorded: "2024-11-02",
    source: { id: 2, name: "Interest Income", sourceCode: "INTEREST" },
    description: "Bank interest for Q3 2024",
    amount: 12500.50,
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
    source: { id: 3, name: "Late Payment Penalties", sourceCode: "PENALTIES" },
    description: "Late payment fees from trip rentals",
    amount: 8750.00,
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
    source: { id: 4, name: "Insurance Claims", sourceCode: "INSURANCE" },
    description: "Vehicle accident insurance payout",
    amount: 150000.00,
    paymentMethod: { id: 3, methodName: "Check", methodCode: "CHECK" },
    paymentMethodId: 3,
    sourceId: 4,
    externalRefType: "INSURANCE",
    externalRefId: "INS-CLAIM-2024-045",
    createdBy: "admin",
    approvedBy: "operations_head"
  },
  {
    id: 5,
    code: "REV-OTHER-2024-005",
    date_recorded: "2024-11-05",
    source: { id: 5, name: "Donations", sourceCode: "DONATIONS" },
    description: "Corporate sponsorship from ABC Corp",
    amount: 75000.00,
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
    source: { id: 6, name: "Parking Fees", sourceCode: "OTHER" },
    description: "Monthly parking revenue at terminal",
    amount: 32500.00,
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
    source: { id: 1, name: "Asset Sale", sourceCode: "ASSET_SALE" },
    description: "Sale of retired bus units",
    amount: 280000.00,
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 1,
    externalRefType: "ASSET_SALE",
    externalRefId: "AS-2024-002",
    createdBy: "admin",
    approvedBy: "ceo"
  },
  {
    id: 8,
    code: "REV-OTHER-2024-008",
    date_recorded: "2024-11-08",
    source: { id: 7, name: "Advertising Revenue", sourceCode: "OTHER" },
    description: "Bus exterior advertising - November",
    amount: 45000.00,
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
    source: { id: 2, name: "Interest Income", sourceCode: "INTEREST" },
    description: "Investment returns - fixed deposit",
    amount: 18200.75,
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
    source: { id: 8, name: "Merchandise Sales", sourceCode: "OTHER" },
    description: "Company merchandise and souvenirs",
    amount: 15600.00,
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
    source: { id: 3, name: "Late Payment Penalties", sourceCode: "PENALTIES" },
    description: "Penalty fees from contract breaches",
    amount: 12000.00,
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
    source: { id: 9, name: "Terminal Rentals", sourceCode: "OTHER" },
    description: "Food stall rental at bus terminal",
    amount: 28000.00,
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
    source: { id: 5, name: "Donations", sourceCode: "DONATIONS" },
    description: "Community fund-raising event proceeds",
    amount: 52000.00,
    paymentMethod: { id: 2, methodName: "Cash", methodCode: "CASH" },
    paymentMethodId: 2,
    sourceId: 5,
    externalRefType: "DONATIONS",
    createdBy: "admin",
    approvedBy: "finance_manager"
  },
  {
    id: 14,
    code: "REV-OTHER-2024-014",
    date_recorded: "2024-10-20",
    source: { id: 1, name: "Asset Sale", sourceCode: "ASSET_SALE" },
    description: "Sale of office furniture and fixtures",
    amount: 22500.00,
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
    source: { id: 10, name: "Scrap Sales", sourceCode: "OTHER" },
    description: "Sale of scrap metal from old parts",
    amount: 8900.50,
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
    source: { id: 4, name: "Insurance Claims", sourceCode: "INSURANCE" },
    description: "Property damage insurance claim",
    amount: 95000.00,
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 4,
    externalRefType: "INSURANCE",
    externalRefId: "INS-CLAIM-2024-038",
    createdBy: "admin",
    approvedBy: "finance_manager"
  },
  {
    id: 17,
    code: "REV-OTHER-2024-017",
    date_recorded: "2024-10-05",
    source: { id: 2, name: "Interest Income", sourceCode: "INTEREST" },
    description: "Savings account interest - October",
    amount: 6750.25,
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
    source: { id: 7, name: "Advertising Revenue", sourceCode: "OTHER" },
    description: "Digital billboard advertising - Q3",
    amount: 120000.00,
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 7,
    externalRefType: "OTHER",
    externalRefId: "ADV-Q3-2024",
    createdBy: "marketing",
    approvedBy: "marketing_head"
  },
  {
    id: 19,
    code: "REV-OTHER-2024-019",
    date_recorded: "2024-09-25",
    source: { id: 3, name: "Late Payment Penalties", sourceCode: "PENALTIES" },
    description: "Overdue invoice penalty charges",
    amount: 15500.00,
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
    source: { id: 6, name: "Parking Fees", sourceCode: "OTHER" },
    description: "Quarterly parking fee collection",
    amount: 98000.00,
    paymentMethod: { id: 2, methodName: "Cash", methodCode: "CASH" },
    paymentMethodId: 2,
    sourceId: 6,
    externalRefType: "OTHER",
    createdBy: "staff_01",
    approvedBy: "operations_head"
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
  const [sortBy, setSortBy] = useState<"code" | "date_recorded" | "amount">("date_recorded");
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
    // TEMPORARY: API calls disabled - using mock data
    console.warn('API calls disabled - Using mock filter options');
    
    // Set mock revenue sources
    setRevenueSources([
      { id: 1, name: "Asset Sale", sourceCode: "ASSET_SALE" },
      { id: 2, name: "Interest Income", sourceCode: "INTEREST" },
      { id: 3, name: "Late Payment Penalties", sourceCode: "PENALTIES" },
      { id: 4, name: "Insurance Claims", sourceCode: "INSURANCE" },
      { id: 5, name: "Donations", sourceCode: "DONATIONS" },
      { id: 6, name: "Parking Fees", sourceCode: "OTHER" },
      { id: 7, name: "Advertising Revenue", sourceCode: "OTHER" },
      { id: 8, name: "Merchandise Sales", sourceCode: "OTHER" },
      { id: 9, name: "Terminal Rentals", sourceCode: "OTHER" },
      { id: 10, name: "Scrap Sales", sourceCode: "OTHER" }
    ]);

    // Set mock payment methods
    setPaymentMethods([
      { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
      { id: 2, methodName: "Cash", methodCode: "CASH" },
      { id: 3, methodName: "Check", methodCode: "CHECK" }
    ]);
  };

  // Transform OtherRevenueRecord to OtherRevenueData for modals
  const transformRecordToFormData = (record: OtherRevenueRecord): OtherRevenueData => {
    return {
      id: record.id,
      code: record.code,
      name: 'OTHER',
      date_recorded: record.date_recorded,
      description: record.description || record.source.name || '',
      amount: record.amount,
      payment_reference: record.externalRefId || '',
      department: 'Operations', // Default department - will be stored in future backend updates
      discountAmount: 0,
      discountPercentage: 0,
      discountReason: '',
      isUnearnedRevenue: record.isUnearnedRevenue || false,
      scheduleItems: record.scheduleItems || [],
      recognitionSchedule: '',
      isVerified: false,
      remarks: record.description || '',
      payment_method: record.paymentMethod?.methodName || '',
      verifiedBy: record.approvedBy || '',
      verifiedAt: '',
      receiptUrl: '',
      accountCode: '',
      createdBy: record.createdBy,
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
              paymentMethodName: rowData!.paymentMethod.methodName,
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
            departments={MOCK_DEPARTMENTS}
            currentUser="admin"
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
    const overdueItems = scheduleItems.filter(item => item.paymentStatus === PaymentStatus.OVERDUE);
    const partiallyPaidItems = scheduleItems.filter(item => item.paymentStatus === PaymentStatus.PARTIALLY_PAID);
    const pendingItems = scheduleItems.filter(item => item.paymentStatus === PaymentStatus.PENDING);
    
    let targetItem = scheduleItem;
    
    // If there's an overdue item, always pay that first
    if (overdueItems.length > 0) {
      targetItem = overdueItems[0];
    }
    // Otherwise, if clicked item is PAID, find the next unpaid one
    else if (scheduleItem.paymentStatus === PaymentStatus.PAID) {
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
      // TODO: POST to backend API /api/cash-transactions/payment
      console.log('Payment data to submit:', paymentData);

      // Mock success - in production this would be an actual API call
      // const response = await fetch('/api/cash-transactions/payment', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(paymentData)
      // });

      // For now, simulate success and refresh data
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
      // TODO: Backend API integration
      // Transform formData to backend-compatible format
      const payload = {
        revenueCode: formData.code,
        name: formData.name,
        transactionDate: formData.date_recorded,
        description: formData.description,
        amount: formData.amount,
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference,
        createdBy: formData.createdBy,
        // Additional fields
        department: formData.department,
        discountAmount: formData.discountAmount,
        discountPercentage: formData.discountPercentage,
        discountReason: formData.discountReason,
        isUnearnedRevenue: formData.isUnearnedRevenue,
        recognitionSchedule: formData.recognitionSchedule,
        isVerified: formData.isVerified,
        remarks: formData.remarks,
      };

      const method = mode === 'add' ? 'POST' : 'PUT';
      const url = mode === 'add'
        ? '/api/admin/revenue?userId=admin'
        : `/api/admin/revenue/${activeRow?.id}?userId=admin`;

      // Temporarily use mock data - skip actual API call
      console.log('Would submit to API:', { method, url, payload });

      // Update mock data locally so UI shows saved changes during development
      if (mode === 'add') {
        // Generate simple incrementing numeric id
        const nextId = (MOCK_OTHER_REVENUE_DATA.reduce((max, r) => Math.max(max, r.id), 0) || 0) + 1;

        const sourceObj = { id: 0, name: formData.description, sourceCode: 'OTHER' };
        const paymentMethodObj = paymentMethods.find(p => p.methodName === formData.payment_method) || { id: 0, methodName: formData.payment_method, methodCode: '' };

        const newRecord: OtherRevenueRecord = {
          id: nextId,
          code: formData.code,
          date_recorded: formData.date_recorded,
          source: sourceObj,
          description: formData.remarks || '',
          amount: formData.amount,
          paymentMethod: paymentMethodObj,
          paymentMethodId: paymentMethodObj.id,
          sourceId: sourceObj.id,
          externalRefType: 'OTHER',
          externalRefId: formData.payment_reference || undefined,
          createdBy: formData.createdBy || 'admin'
        };

        if (formData.isUnearnedRevenue) {
          newRecord.isUnearnedRevenue = true;
          newRecord.scheduleItems = formData.scheduleItems || [];
        }

        // Add to the top for visibility
        MOCK_OTHER_REVENUE_DATA.unshift(newRecord);
      } else {
        // Edit existing record in mock data
        const idx = MOCK_OTHER_REVENUE_DATA.findIndex(r => r.id === activeRow?.id);
        if (idx !== -1) {
          const sourceObj = { id: 0, name: formData.description, sourceCode: 'OTHER' };
          const paymentMethodObj = paymentMethods.find(p => p.methodName === formData.payment_method) || { id: 0, methodName: formData.payment_method, methodCode: '' };

          MOCK_OTHER_REVENUE_DATA[idx] = {
            ...MOCK_OTHER_REVENUE_DATA[idx],
            code: formData.code,
            date_recorded: formData.date_recorded,
            source: sourceObj,
            description: formData.description,
            amount: formData.amount,
            paymentMethod: paymentMethodObj,
            paymentMethodId: paymentMethodObj.id,
            sourceId: sourceObj.id,
            externalRefType: 'OTHER',
            externalRefId: formData.payment_reference || undefined,
            isUnearnedRevenue: formData.isUnearnedRevenue,
            scheduleItems: formData.scheduleItems || []
          };
        }
      }

      showSuccess(
        `Revenue record ${mode === 'add' ? 'added' : 'updated'} successfully`,
        mode === 'add' ? 'Added' : 'Updated'
      );

      fetchData(); // Refresh data
      closeModal();
    } catch (err) {
      console.error(`Error ${mode}ing revenue:`, err);
      showError(`Failed to ${mode} revenue record`, 'Error');
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
        const sourceName = record.source.name;
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
        order: sortOrder,
        excludeSources: 'BUS_TRIP,RENTAL', // Exclude main categories
      });

      // Add search parameter if exists
      if (search) {
        params.append('search', search);
      }

      // Add filter parameters
      if (activeFilters.dateRange && typeof activeFilters.dateRange === 'object') {
        const dateRange = activeFilters.dateRange as { from: string; to: string };
        if (dateRange.from) {
          params.append('dateFrom', dateRange.from);
        }
        if (dateRange.to) {
          params.append('dateTo', dateRange.to);
        }
      }

      if (activeFilters.amountRange && typeof activeFilters.amountRange === 'object') {
        const amountRange = activeFilters.amountRange as { from: string; to: string };
        if (amountRange.from) {
          params.append('amountFrom', amountRange.from);
        }
        if (amountRange.to) {
          params.append('amountTo', amountRange.to);
        }
      }

      // TODO: Replace with ftms_backend API call - http://localhost:4000/api/admin/revenue
      // const response = await fetch(`/api/admin/revenue?${params.toString()}`);
      console.warn('API integration pending - using mock other revenue data');

      // Use mock data - apply filters and sorting client-side
      let filteredData = [...MOCK_OTHER_REVENUE_DATA];

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filteredData = filteredData.filter(item =>
          item.code.toLowerCase().includes(searchLower) ||
          item.source.name.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.amount.toString().includes(searchLower) ||
          (item.date_expected && item.date_expected.includes(searchLower)) ||
          (item.last_payment_date && item.last_payment_date.includes(searchLower)) ||
          (item.status && item.status.toLowerCase().includes(searchLower)) ||
          (item.revenue_status && item.revenue_status.toLowerCase().includes(searchLower)) ||
          (item.receivable_status && item.receivable_status.toLowerCase().includes(searchLower))
        );
      }

      // Apply date range filter
      if (activeFilters.dateRange?.from || activeFilters.dateRange?.to) {
        filteredData = filteredData.filter(item => {
          const itemDate = new Date(item.date_recorded);
          const fromDate = activeFilters.dateRange?.from ? new Date(activeFilters.dateRange.from) : null;
          const toDate = activeFilters.dateRange?.to ? new Date(activeFilters.dateRange.to) : null;

          if (fromDate && itemDate < fromDate) return false;
          if (toDate && itemDate > toDate) return false;
          return true;
        });
      }

      // Apply amount range filter
      if (activeFilters.amountRange?.from || activeFilters.amountRange?.to) {
        filteredData = filteredData.filter(item => {
          const amount = item.amount;
          const fromAmount = activeFilters.amountRange?.from ? parseFloat(activeFilters.amountRange.from) : null;
          const toAmount = activeFilters.amountRange?.to ? parseFloat(activeFilters.amountRange.to) : null;

          if (fromAmount && amount < fromAmount) return false;
          if (toAmount && amount > toAmount) return false;
          return true;
        });
      }

      // Apply sorting
      filteredData.sort((a, b) => {
        let comparison = 0;
        
        if (sortBy === 'code') {
          comparison = a.code.localeCompare(b.code);
        } else if (sortBy === 'date_recorded') {
          comparison = new Date(a.date_recorded).getTime() - new Date(b.date_recorded).getTime();
        } else if (sortBy === 'amount') {
          comparison = a.amount - b.amount;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });

      // Calculate pagination
      const totalRecords = filteredData.length;
      const calculatedTotalPages = Math.ceil(totalRecords / pageSize);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      // Process overdue carryover for records with schedule items
      const processedData = paginatedData.map(record => {
        if (record.isUnearnedRevenue && record.scheduleItems && record.scheduleItems.length > 0) {
          const { updatedItems, carryoversProcessed } = processOverdueCarryover(record.scheduleItems);
          
          if (carryoversProcessed > 0) {
            console.log(`Processed ${carryoversProcessed} carryover(s) for revenue ${record.code}`);
            // TODO: In production, save updatedItems to backend
          }
          
          return {
            ...record,
            scheduleItems: updatedItems
          };
        }
        return record;
      });

      setData(processedData);
      setTotalPages(calculatedTotalPages);
      setTotalCount(totalRecords);

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
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the revenue record permanently.',
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
        // MOCK: UI-only mode - simulate delete without API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        showSuccess('Revenue record deleted successfully (UI-only mode)', 'Deleted');
        fetchData(); // Refresh the data
      } catch (err) {
        console.error('Error deleting revenue:', err);
        showError('Failed to delete revenue record', 'Error');
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
    last_payment_date?: string;
    source: { id: number; name: string; sourceCode: string };
    description: string;
    type: 'Receivable' | 'Single';
    amount: number;
    receivable?: number;
    status?: string;
    paymentMethod: { id: number; methodName: string; methodCode: string };
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
        // Create one row per installment
        record.scheduleItems
          .sort((a, b) => a.installmentNumber - b.installmentNumber)
          .forEach((scheduleItem) => {
            const balance = scheduleItem.currentDueAmount - scheduleItem.paidAmount;
            const status = calculatePaymentStatus(scheduleItem);

            rows.push({
              id: `${record.id}-${scheduleItem.installmentNumber}`,
              revenueId: record.id,
              revenueCode: record.code,
              date_recorded: record.date_recorded,
              date_expected: record.date_expected,
              last_payment_date: scheduleItem.paidAt || record.last_payment_date,
              source: record.source,
              description: record.description,
              type: 'Receivable' as const,
              amount: record.amount,
              receivable: balance,
              status: record.status || record.receivable_status || status,
              paymentMethod: record.paymentMethod,
              isInstallmentRow: true,
              installmentNumber: scheduleItem.installmentNumber,
              totalInstallments: record.scheduleItems!.length,
              dueDate: scheduleItem.currentDueDate,
              balance: balance,
              paymentStatus: status,
              scheduleItem: scheduleItem,
              originalRecord: record
            });
          });
      } else {
        // Regular revenue record (single row)
        rows.push({
          id: `${record.id}-single`,
          revenueId: record.id,
          revenueCode: record.code,
          date_recorded: record.date_recorded,
          date_expected: record.date_expected,
          last_payment_date: record.last_payment_date,
          source: record.source,
          description: record.description,
          type: 'Single' as const,
          amount: record.amount,
          receivable: record.balance || 0,
          status: record.status || record.revenue_status,
          paymentMethod: record.paymentMethod,
          isInstallmentRow: false,
          originalRecord: record
        });
      }
    });

    return rows;
  };

  const tableRows = transformDataToRows();

  // Apply payment status filter to table rows
  const filteredTableRows = activeFilters.paymentStatuses.length > 0
    ? tableRows.filter(row => {
        if (!row.isInstallmentRow) return true; // Always show non-installment rows
        return row.paymentStatus && activeFilters.paymentStatuses.includes(row.paymentStatus);
      })
    : tableRows;

  // Get payment status chip class
  const getPaymentStatusClass = (status: PaymentStatus): string => {
    return `chip ${status.toLowerCase().replace('_', '-')}`;
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
              paymentStatuses={[
                { id: PaymentStatus.PENDING, label: 'Pending' },
                { id: PaymentStatus.PAID, label: 'Paid' },
                { id: PaymentStatus.PARTIALLY_PAID, label: 'Partially Paid' },
                { id: PaymentStatus.OVERDUE, label: 'Overdue' },
                { id: PaymentStatus.CANCELLED, label: 'Cancelled' },
                { id: PaymentStatus.WRITTEN_OFF, label: 'Written Off' }
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
                  <th
                    onClick={() => handleSort("date_recorded")}
                    className="sortable-header"
                    title="Click to sort by Transaction Date"
                  >
                    Transaction Date{getSortIndicator("date_recorded")}
                  </th>
                  <th>Received by</th>
                  <th>Source</th>
                  <th>Type</th>
                  <th
                    onClick={() => handleSort("amount")}
                    className="sortable-header"
                    title="Click to sort by Amount"
                  >
                    Total Amount{getSortIndicator("amount")}
                  </th>
                  <th>Receivable</th>
                  <th>Status</th>
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
                  filteredTableRows.map((row, index) => {
                    // Determine if this is the first row of a group for styling
                    const isFirstInstallmentRow = row.isInstallmentRow && row.installmentNumber === 1;
                    const rowClass = row.isInstallmentRow ? `installment-row revenue-${row.revenueId}` : '';

                    return (
                      <tr key={row.id} className={rowClass}>
                        <td>{formatDate(row.date_recorded)}</td>
                        {/* Received by Column - show date_expected or last_payment_date */}
                        <td>
                          {row.date_expected 
                            ? formatDate(row.date_expected) 
                            : row.last_payment_date 
                              ? formatDate(row.last_payment_date) 
                              : '—'}
                        </td>
                        {/* Source Column - show description */}
                        <td>{row.description}</td>
                        {/* Type Column - Receivable or Single */}
                        <td>
                          <span className={`chip ${row.type.toLowerCase()}`}>
                            {row.type}
                          </span>
                        </td>
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
                        {/* Status Column */}
                        <td>
                          {row.status ? (
                            <span className={getPaymentStatusClass(row.paymentStatus || PaymentStatus.PENDING)}>
                              {row.status.replace('_', ' ')}
                            </span>
                          ) : row.paymentStatus ? (
                            <span className={getPaymentStatusClass(row.paymentStatus)}>
                              {row.paymentStatus.replace('_', ' ')}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        
                        {/* Actions Column */}
                        <td className="actionButtons">
                          <div className="actionButtonsContainer">
                            {/* Show View/Edit/Delete only for first installment or single records */}
                            {(!row.isInstallmentRow || isFirstInstallmentRow) && (
                              <>
                                {/* View button */}
                                <button
                                  className="viewBtn"
                                  onClick={() => openModal('view', row.originalRecord)}
                                  title="View Record"
                                >
                                  <i className="ri-eye-line"></i>
                                </button>

                                {/* Edit button */}
                                <button
                                  className="editBtn"
                                  onClick={() => openModal('edit', row.originalRecord)}
                                  title="Edit Record"
                                >
                                  <i className="ri-edit-2-line" />
                                </button>

                                {/* Delete button */}
                                <button
                                  className="deleteBtn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(row.revenueId);
                                  }}
                                  title="Delete Record"
                                >
                                  <i className="ri-delete-bin-line" />
                                </button>
                              </>
                            )}

                            {/* Pay button for installment rows */}
                            {row.isInstallmentRow && 
                             row.paymentStatus && 
                             row.paymentStatus !== PaymentStatus.PAID &&
                             row.paymentStatus !== PaymentStatus.CANCELLED &&
                             row.paymentStatus !== PaymentStatus.WRITTEN_OFF && (
                              <button
                                className="payBtn"
                                onClick={() => openPaymentModal(row.scheduleItem!, row.originalRecord)}
                                title="Record Payment"
                              >
                                <i className="ri-money-dollar-circle-line"></i>
                              </button>
                            )}
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
              entityType="revenue"
              recordId={selectedRevenueRecord.id}
              recordRef={selectedRevenueRecord.code}
              scheduleItems={selectedRevenueRecord.scheduleItems || []}
              selectedInstallment={selectedScheduleItem}
              paymentMethods={paymentMethods}
              currentUser="admin"
              onPaymentRecorded={handlePaymentRecorded}
              onClose={closePaymentModal}
              processCascadePayment={processRevenueCascade}
            />
          }
        />
      )}
    </div>
  );
};

export default AdminOtherRevenuePage;