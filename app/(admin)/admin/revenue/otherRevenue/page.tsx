/**
 * Admin Other Revenue Page - Backend Integrated
 *
 * Displays miscellaneous revenue records (excluding bus trips and rentals):
 * - Fetches data from /api/admin/revenue (excluding main categories)
 * - Server-side pagination, search, and sorting
 * - Analytics: Revenue breakdown by source type
 * - Database-optimized queries with indexes
 *
 * Columns: No., revenueCode, transactionDate, source, description, amount, paymentMethod, Actions
 */

"use client";

import React, { useState, useEffect } from "react";
import "../../../../styles/revenue/revenue.css";
import "../../../../styles/revenue/otherRevenue.css";
import "../../../../styles/components/table.css";
import "../../../../styles/components/chips.css";
import PaginationComponent from "../../../../Components/pagination";
import RevenueFilter from "../../../../Components/RevenueFilter";
import Swal from 'sweetalert2';
import { showSuccess, showError } from '../../../../utils/Alerts';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import ModalManager from '@/Components/modalManager';
import RecordOtherRevenueModal, { OtherRevenueData } from './recordOtherRevenue';
import ViewOtherRevenueModal from './viewOtherRevenue';

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
  revenueCode: string;
  transactionDate: string;
  source: {
    id: number;
    name: string;
    sourceCode: string;
  };
  description: string;
  amount: number;
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
}

export type OtherRevenueData = {
  id?: number;
  revenueCode: string; // ✅ exists (auto-generated)
  revenueType: 'OTHER'; // ❌ MISSING - should be readonly "OTHER"
  dateRecorded: string; // ✅ exists as transactionDate
  otherRevenueCategory: string; // ❌ MISSING - dropdown: ASSET_SALE/INTEREST/PENALTIES/INSURANCE/DONATIONS/OTHER
  amount: number; // ✅ exists
  sourceRefNo: string; // ❌ MISSING - reference number
  department: string; // ❌ MISSING - dropdown
  discountAmount?: number; // ❌ MISSING - optional number
  discountPercentage?: number; // ❌ MISSING - optional number
  discountReason?: string; // ❌ MISSING - optional text
  isUnearnedRevenue: boolean; // ❌ MISSING - checkbox
  recognitionSchedule?: any; // ❌ MISSING - textarea, JSON for recognition
  isVerified: boolean; // ❌ MISSING - checkbox
  remarks?: string; // ❌ MISSING - textarea
  
  // Relations/references
  sourceId: number; // ✅ exists
  paymentMethodId: number; // ✅ exists
  
  // View-only fields
  verifiedBy?: string; // ❌ MISSING - readonly
  verifiedAt?: string; // ❌ MISSING - readonly
  receiptUrl?: string; // ❌ MISSING - document links
  accountCode?: string; // ❌ MISSING - linked via ChartOfAccount.accountCode
  
  // Remove these fields:
  sourceName: string;
  description: string;
  transactionDate: string;
  externalRefType?: string;
  externalRefId?: string;
  createdBy: string;
  approvedBy?: string;
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
    revenueCode: "REV-OTHER-2024-001",
    transactionDate: "2024-11-01",
    source: { id: 1, name: "Asset Sale", sourceCode: "ASSET_SALE" },
    description: "Sale of old computer equipment",
    amount: 45000.00,
    paymentMethod: { id: 1, methodName: "Bank Transfer", methodCode: "BANK" },
    paymentMethodId: 1,
    sourceId: 1,
    externalRefType: "ASSET_SALE",
    externalRefId: "AS-2024-001",
    createdBy: "admin",
    approvedBy: "finance_manager"
  },
  {
    id: 2,
    revenueCode: "REV-OTHER-2024-002",
    transactionDate: "2024-11-02",
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
    revenueCode: "REV-OTHER-2024-003",
    transactionDate: "2024-11-03",
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
    revenueCode: "REV-OTHER-2024-004",
    transactionDate: "2024-11-04",
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
    revenueCode: "REV-OTHER-2024-005",
    transactionDate: "2024-11-05",
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
    revenueCode: "REV-OTHER-2024-006",
    transactionDate: "2024-11-06",
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
    revenueCode: "REV-OTHER-2024-007",
    transactionDate: "2024-11-07",
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
    revenueCode: "REV-OTHER-2024-008",
    transactionDate: "2024-11-08",
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
    revenueCode: "REV-OTHER-2024-009",
    transactionDate: "2024-11-09",
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
    revenueCode: "REV-OTHER-2024-010",
    transactionDate: "2024-11-10",
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
    revenueCode: "REV-OTHER-2024-011",
    transactionDate: "2024-11-11",
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
    revenueCode: "REV-OTHER-2024-012",
    transactionDate: "2024-10-28",
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
    revenueCode: "REV-OTHER-2024-013",
    transactionDate: "2024-10-25",
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
    revenueCode: "REV-OTHER-2024-014",
    transactionDate: "2024-10-20",
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
    revenueCode: "REV-OTHER-2024-015",
    transactionDate: "2024-10-15",
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
    revenueCode: "REV-OTHER-2024-016",
    transactionDate: "2024-10-10",
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
    revenueCode: "REV-OTHER-2024-017",
    transactionDate: "2024-10-05",
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
    revenueCode: "REV-OTHER-2024-018",
    transactionDate: "2024-09-30",
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
    revenueCode: "REV-OTHER-2024-019",
    transactionDate: "2024-09-25",
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
    revenueCode: "REV-OTHER-2024-020",
    transactionDate: "2024-09-20",
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
    sources: string[];
    paymentMethods: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
  }>({
    sources: [],
    paymentMethods: [],
    dateRange: { from: '', to: '' },
    amountRange: { from: '', to: '' }
  });

  // Sort states
  const [sortBy, setSortBy] = useState<"revenueCode" | "transactionDate" | "amount">("transactionDate");
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
      revenueCode: record.revenueCode,
      revenueType: 'OTHER',
      dateRecorded: record.transactionDate,
      otherRevenueCategory: record.source.sourceCode || record.externalRefType || 'OTHER',
      amount: record.amount,
      sourceRefNo: record.externalRefId || '',
      department: 'Operations', // Default department - will be stored in future backend updates
      discountAmount: 0,
      discountPercentage: 0,
      discountReason: '',
      isUnearnedRevenue: false,
      recognitionSchedule: '',
      isVerified: false,
      remarks: record.description || '',
      paymentMethodId: record.paymentMethodId,
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

  // Handle save other revenue (both add and edit)
  const handleSaveOtherRevenue = async (formData: OtherRevenueData, mode: 'add' | 'edit') => {
    try {
      // TODO: Backend API integration
      // Transform formData to backend-compatible format
      const payload = {
        revenueCode: formData.revenueCode,
        transactionDate: formData.dateRecorded,
        sourceId: revenueSources.find(s => s.sourceCode === formData.otherRevenueCategory)?.id || 0,
        description: formData.remarks || '',
        amount: formData.amount,
        paymentMethodId: formData.paymentMethodId,
        externalRefType: formData.otherRevenueCategory,
        externalRefId: formData.sourceRefNo,
        createdBy: formData.createdBy,
        // New fields - TODO: Add to backend schema
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
      if (activeFilters.sources && Array.isArray(activeFilters.sources) && activeFilters.sources.length > 0) {
        params.append('sources', activeFilters.sources.join(','));
      }

      if (activeFilters.paymentMethods && Array.isArray(activeFilters.paymentMethods) && activeFilters.paymentMethods.length > 0) {
        params.append('paymentMethods', activeFilters.paymentMethods.join(','));
      }

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
          item.revenueCode.toLowerCase().includes(searchLower) ||
          item.source.name.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.amount.toString().includes(searchLower)
        );
      }

      // Apply source filter
      if (activeFilters.sources.length > 0) {
        filteredData = filteredData.filter(item =>
          activeFilters.sources.includes(item.source.name)
        );
      }

      // Apply payment method filter
      if (activeFilters.paymentMethods.length > 0) {
        filteredData = filteredData.filter(item =>
          activeFilters.paymentMethods.includes(item.paymentMethod.methodName)
        );
      }

      // Apply date range filter
      if (activeFilters.dateRange.from || activeFilters.dateRange.to) {
        filteredData = filteredData.filter(item => {
          const itemDate = new Date(item.transactionDate);
          const fromDate = activeFilters.dateRange.from ? new Date(activeFilters.dateRange.from) : null;
          const toDate = activeFilters.dateRange.to ? new Date(activeFilters.dateRange.to) : null;

          if (fromDate && itemDate < fromDate) return false;
          if (toDate && itemDate > toDate) return false;
          return true;
        });
      }

      // Apply amount range filter
      if (activeFilters.amountRange.from || activeFilters.amountRange.to) {
        filteredData = filteredData.filter(item => {
          const amount = item.amount;
          const fromAmount = activeFilters.amountRange.from ? parseFloat(activeFilters.amountRange.from) : null;
          const toAmount = activeFilters.amountRange.to ? parseFloat(activeFilters.amountRange.to) : null;

          if (fromAmount && amount < fromAmount) return false;
          if (toAmount && amount > toAmount) return false;
          return true;
        });
      }

      // Apply sorting
      filteredData.sort((a, b) => {
        let comparison = 0;
        
        if (sortBy === 'revenueCode') {
          comparison = a.revenueCode.localeCompare(b.revenueCode);
        } else if (sortBy === 'transactionDate') {
          comparison = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
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

      setData(paginatedData);
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
  const handleSort = (field: "revenueCode" | "transactionDate" | "amount") => {
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
    sources: string[];
    paymentMethods: string[];
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
        const response = await fetch(`/api/admin/revenue/${id}?userId=admin`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete revenue');
        }

        showSuccess('Revenue record deleted successfully', 'Deleted');
        fetchData(); // Refresh the data
      } catch (err) {
        console.error('Error deleting revenue:', err);
        showError('Failed to delete revenue record', 'Error');
      }
    }
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
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="analytics-toggle-btn"
            title={showAnalytics ? "Hide Analytics" : "Show Analytics"}
          >
            <i className={showAnalytics ? "ri-eye-line" : "ri-eye-off-line"} />
          </button>
        </div>

        {showAnalytics && (
          <>
            {/* Analytics Cards */}
            <div className="analytics-grid">
              <div className="analytics-card total-revenue">
                <h3>Total Revenue</h3>
                <p>
                  {formatMoney(analytics.totalRevenue)}
                </p>
                <small>Other revenue sources</small>
              </div>

              <div className="analytics-card transactions">
                <h3>Transactions</h3>
                <p>
                  {analytics.transactionCount}
                </p>
                <small>Total records</small>
              </div>

              <div className="analytics-card top-sources">
                <h3>Top Revenue Sources</h3>
                <div className="top-sources-container">
                  {analytics.topSources.length === 0 ? (
                    <div className="no-data-message">
                      No data available
                    </div>
                  ) : (
                    analytics.topSources.map((source, index) => (
                      <div key={source.sourceName} className="top-sources-item">
                        <span className="source-name">{source.sourceName}</span>
                        <span className="source-amount">{formatMoney(source.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="revenue_searchBar">
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
              sources={revenueSources.map(source => ({
                id: source.id.toString(),
                label: source.name
              }))}
              paymentMethods={paymentMethods.map(method => ({
                id: method.id.toString(),
                label: method.methodName
              }))}
              onApply={handleFilterApply}
              initialValues={activeFilters}
            />
          </div>

          {/* Add Revenue Button on the right */}
          <div className="filters">
            <button onClick={handleAdd} id='addRevenue'>
              <i className="ri-add-line" /> Add Revenue
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th
                    onClick={() => handleSort("transactionDate")}
                    className="sortable-header"
                    title="Click to sort by Transaction Date"
                  >
                    Transaction Date{getSortIndicator("transactionDate")}
                  </th>
                  <th>Source</th>
                  <th>Description</th>
                  <th
                    onClick={() => handleSort("amount")}
                    className="sortable-header"
                    title="Click to sort by Amount"
                  >
                    Amount{getSortIndicator("amount")}
                  </th>
                  <th>Payment Method</th>
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
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-cell">
                      No other revenue records found.
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => {
                    // Calculate row number based on current page
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;

                    return (
                      <tr key={item.id}>
                        <td>{rowNumber}</td>
                        <td>{formatDate(item.transactionDate)}</td>
                        <td>{item.source.name}</td>
                        <td>{item.description || 'N/A'}</td>
                        <td>{formatMoney(item.amount)}</td>
                        <td>{item.paymentMethod.methodName}</td>
                        <td className="actionButtons">
                          <div className="actionButtonsContainer">
                            {/* View button */}
                            <button
                              className="viewBtn"
                              onClick={() => openModal('view', item)}
                              title="View Record"
                            >
                              <i className="ri-eye-line"></i>
                            </button>

                            {/* Edit button */}
                            <button
                              className="editBtn"
                              onClick={() => openModal('edit', item)}
                              title="Edit Record"
                            >
                              <i className="ri-edit-2-line" />
                            </button>

                            {/* Delete button */}
                            <button
                              className="deleteBtn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id);
                              }}
                              title="Delete Record"
                            >
                              <i className="ri-delete-bin-line" />
                            </button>
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
    </div>
  );
};

export default AdminOtherRevenuePage;