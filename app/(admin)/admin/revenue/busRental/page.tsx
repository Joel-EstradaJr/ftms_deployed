/**
 * Admin Bus Rental Page - Backend Integrated
 *
 * Displays bus rental revenue records with analytics:
 * - Fetches data from /api/admin/revenue (filtered by RENTAL source)
 * - Server-side pagination, search, and sorting
 * - Analytics: Total rental revenue, active rentals, available buses
 * - Database-optimized queries with indexes
 *
 * Columns: No., rentalCode, transactionDate, renterName, busDetails, amount, paymentMethod, status, Actions
 */

"use client";

import React, { useState, useEffect } from "react";
import "../../../../styles/components/table.css";
import "../../../../styles/components/chips.css";

import ModalManager from '../../../../Components/modalManager';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import PaginationComponent from "../../../../Components/pagination";
import RevenueFilter from "../../../../Components/RevenueFilter";
import Swal from 'sweetalert2';

import { showSuccess, showError } from '../../../../utils/Alerts';
import { formatDate, formatMoney } from '../../../../utils/formatting';

import RecordRentalRevenueModal from './recordRentalRevenue';
import ViewRentalDetailsModal from './viewRentalDetails';



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

interface BusRentalRecord {
  id: number;
  revenueCode: string; // auto-generated
  revenueType: 'RENTAL'; // readonly
  entityName: string; // customer text
  total_rental_amount: number; // total rental amount
  downpayment_amount: number;
  balance_amount: number; // auto-calculated
  down_payment_date: string | null; // date picker
  full_payment_date: string | null; // date picker
  rental_status: boolean; // checkbox
  cancelled_at?: string | null; // date picker, shows when cancelled
  dateRecorded: string; // date picker
  sourceRefNo: string; // rental contract number
  remarks?: string; // textarea
  
  // Relations
  sourceId: number;
  source: RevenueSource;
  paymentMethodId: number;
  paymentMethod: PaymentMethod;
  receiptUrl?: string; // document links
  
  // Legacy/compatibility fields (for backward compatibility)
  transactionDate?: string; // alias for dateRecorded
  renterName?: string; // alias for entityName
  busPlateNumber?: string;
  bodyNumber?: string;
  rental_start_date?: string;
  rental_end_date?: string;
  status?: string; // derived from rental_status
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface RentalAnalytics {
  totalRevenue: number;
  activeRentals: number;
  availableBuses: number;
  monthlyRevenue: number;
  averageRentalAmount: number;
}

const AdminBusRentalPage = () => {
  // State for data and UI
  const [data, setData] = useState<BusRentalRecord[]>([]);
  const [analytics, setAnalytics] = useState<RentalAnalytics>({
    totalRevenue: 0,
    activeRentals: 0,
    availableBuses: 0,
    monthlyRevenue: 0,
    averageRentalAmount: 0
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
  const [sortBy, setSortBy] = useState<"revenueCode" | "entityName" | "dateRecorded" | "total_rental_amount" | "balance_amount">("dateRecorded");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [activeRow, setActiveRow] = useState<any>(null);

  // Fetch filter options (revenue sources and payment methods)
  const fetchFilterOptions = async () => {
    // TEMPORARY: API calls disabled - using mock data
    console.warn('API calls disabled - Using mock filter options');
    setRevenueSources([]);
    setPaymentMethods([]);
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      // Build query parameters same as fetchData but without pagination
      const params = new URLSearchParams({
        sortBy: sortBy,
        order: sortOrder,
        sourceFilter: 'RENTAL',
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

      // TODO: Replace with ftms_backend API call - http://localhost:4000/api/admin/revenue/analytics
      // const response = await fetch(`/api/admin/revenue/analytics?${params.toString()}`);
      console.warn('API integration pending - using mock analytics data');

      // Use local calculation from current page data
      const totalRevenue = data.reduce((sum, record) => sum + record.total_rental_amount, 0);
      const activeRentals = data.filter(record => !record.rental_status).length;
      const averageRentalAmount = data.length > 0 ? totalRevenue / data.length : 0;

      setAnalytics({
        totalRevenue,
        activeRentals,
        availableBuses: 25, // Placeholder - would need actual fleet data from API
        monthlyRevenue: totalRevenue * 0.3, // Estimate based on current data
        averageRentalAmount
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      // Fallback to local calculation
      const totalRevenue = data.reduce((sum, record) => sum + record.total_rental_amount, 0);
      const activeRentals = data.filter(record => !record.rental_status).length;
      const averageRentalAmount = data.length > 0 ? totalRevenue / data.length : 0;

      setAnalytics({
        totalRevenue,
        activeRentals,
        availableBuses: 25,
        monthlyRevenue: totalRevenue * 0.3,
        averageRentalAmount
      });
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
        sourceFilter: 'RENTAL', // Filter for rental revenue only
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
      console.warn('API integration pending - using mock rental data');

      // Mock data with complete details
      const mockData: BusRentalRecord[] = [
        {
          id: 1,
          revenueCode: 'RNT-2024-001',
          revenueType: 'RENTAL',
          entityName: 'ABC Company Inc.',
          total_rental_amount: 50000.00,
          downpayment_amount: 20000.00,
          balance_amount: 30000.00,
          down_payment_date: '2024-11-01',
          full_payment_date: null,
          rental_status: false,
          cancelled_at: null,
          dateRecorded: '2024-11-01',
          sourceRefNo: 'CONTRACT-2024-001',
          remarks: 'Corporate event transportation for 3 days',
          sourceId: 1,
          source: {
            id: 1,
            name: 'Bus Rental',
            sourceCode: 'RENTAL'
          },
          paymentMethodId: 1,
          paymentMethod: {
            id: 1,
            methodName: 'Bank Transfer',
            methodCode: 'BANK'
          },
          receiptUrl: '/receipts/rnt-2024-001.pdf'
        },
        {
          id: 2,
          revenueCode: 'RNT-2024-002',
          revenueType: 'RENTAL',
          entityName: 'John Dela Cruz',
          total_rental_amount: 25000.00,
          downpayment_amount: 25000.00,
          balance_amount: 0.00,
          down_payment_date: '2024-10-15',
          full_payment_date: '2024-10-15',
          rental_status: false,
          cancelled_at: null,
          dateRecorded: '2024-10-15',
          sourceRefNo: 'CONTRACT-2024-002',
          remarks: 'Wedding transportation - full payment received',
          sourceId: 1,
          source: {
            id: 1,
            name: 'Bus Rental',
            sourceCode: 'RENTAL'
          },
          paymentMethodId: 2,
          paymentMethod: {
            id: 2,
            methodName: 'Cash',
            methodCode: 'CASH'
          },
          receiptUrl: '/receipts/rnt-2024-002.pdf'
        },
        {
          id: 3,
          revenueCode: 'RNT-2024-003',
          revenueType: 'RENTAL',
          entityName: 'XYZ School Foundation',
          total_rental_amount: 75000.00,
          downpayment_amount: 30000.00,
          balance_amount: 45000.00,
          down_payment_date: '2024-10-20',
          full_payment_date: null,
          rental_status: true,
          cancelled_at: '2024-10-25',
          dateRecorded: '2024-10-20',
          sourceRefNo: 'CONTRACT-2024-003',
          remarks: 'Field trip cancelled due to weather conditions. Downpayment to be refunded.',
          sourceId: 1,
          source: {
            id: 1,
            name: 'Bus Rental',
            sourceCode: 'RENTAL'
          },
          paymentMethodId: 1,
          paymentMethod: {
            id: 1,
            methodName: 'Bank Transfer',
            methodCode: 'BANK'
          },
          receiptUrl: '/receipts/rnt-2024-003.pdf'
        },
        {
          id: 4,
          revenueCode: 'RNT-2024-004',
          revenueType: 'RENTAL',
          entityName: 'Maria Santos',
          total_rental_amount: 35000.00,
          downpayment_amount: 15000.00,
          balance_amount: 20000.00,
          down_payment_date: '2024-11-05',
          full_payment_date: null,
          rental_status: false,
          cancelled_at: null,
          dateRecorded: '2024-11-05',
          sourceRefNo: 'CONTRACT-2024-004',
          remarks: 'Family reunion trip - balance due before travel date',
          sourceId: 1,
          source: {
            id: 1,
            name: 'Bus Rental',
            sourceCode: 'RENTAL'
          },
          paymentMethodId: 3,
          paymentMethod: {
            id: 3,
            methodName: 'GCash',
            methodCode: 'GCASH'
          }
        },
        {
          id: 5,
          revenueCode: 'RNT-2024-005',
          revenueType: 'RENTAL',
          entityName: 'Tech Solutions Corp',
          total_rental_amount: 100000.00,
          downpayment_amount: 50000.00,
          balance_amount: 50000.00,
          down_payment_date: '2024-11-08',
          full_payment_date: null,
          rental_status: false,
          cancelled_at: null,
          dateRecorded: '2024-11-08',
          sourceRefNo: 'CONTRACT-2024-005',
          remarks: 'Company outing - 5 buses for 2 days',
          sourceId: 1,
          source: {
            id: 1,
            name: 'Bus Rental',
            sourceCode: 'RENTAL'
          },
          paymentMethodId: 1,
          paymentMethod: {
            id: 1,
            methodName: 'Bank Transfer',
            methodCode: 'BANK'
          },
          receiptUrl: '/receipts/rnt-2024-005.pdf'
        },
        {
          id: 6,
          revenueCode: 'RNT-2024-006',
          revenueType: 'RENTAL',
          entityName: 'Pedro Reyes',
          total_rental_amount: 18000.00,
          downpayment_amount: 18000.00,
          balance_amount: 0.00,
          down_payment_date: '2024-09-30',
          full_payment_date: '2024-09-30',
          rental_status: false,
          cancelled_at: null,
          dateRecorded: '2024-09-30',
          sourceRefNo: 'CONTRACT-2024-006',
          remarks: 'One-day beach trip - completed',
          sourceId: 1,
          source: {
            id: 1,
            name: 'Bus Rental',
            sourceCode: 'RENTAL'
          },
          paymentMethodId: 2,
          paymentMethod: {
            id: 2,
            methodName: 'Cash',
            methodCode: 'CASH'
          },
          receiptUrl: '/receipts/rnt-2024-006.pdf'
        },
        {
          id: 7,
          revenueCode: 'RNT-2024-007',
          revenueType: 'RENTAL',
          entityName: 'Green Valley Church',
          total_rental_amount: 45000.00,
          downpayment_amount: 20000.00,
          balance_amount: 25000.00,
          down_payment_date: '2024-11-10',
          full_payment_date: null,
          rental_status: false,
          cancelled_at: null,
          dateRecorded: '2024-11-10',
          sourceRefNo: 'CONTRACT-2024-007',
          remarks: 'Church retreat - 2 buses needed',
          sourceId: 1,
          source: {
            id: 1,
            name: 'Bus Rental',
            sourceCode: 'RENTAL'
          },
          paymentMethodId: 1,
          paymentMethod: {
            id: 1,
            methodName: 'Bank Transfer',
            methodCode: 'BANK'
          }
        },
        {
          id: 8,
          revenueCode: 'RNT-2024-008',
          revenueType: 'RENTAL',
          entityName: 'Global Trading Inc.',
          total_rental_amount: 60000.00,
          downpayment_amount: 25000.00,
          balance_amount: 35000.00,
          down_payment_date: '2024-10-28',
          full_payment_date: null,
          rental_status: true,
          cancelled_at: '2024-11-02',
          dateRecorded: '2024-10-28',
          sourceRefNo: 'CONTRACT-2024-008',
          remarks: 'Team building cancelled - client requested full refund',
          sourceId: 1,
          source: {
            id: 1,
            name: 'Bus Rental',
            sourceCode: 'RENTAL'
          },
          paymentMethodId: 1,
          paymentMethod: {
            id: 1,
            methodName: 'Bank Transfer',
            methodCode: 'BANK'
          }
        },
        {
          id: 9,
          revenueCode: 'RNT-2024-009',
          revenueType: 'RENTAL',
          entityName: 'Anna Garcia',
          total_rental_amount: 28000.00,
          downpayment_amount: 28000.00,
          balance_amount: 0.00,
          down_payment_date: '2024-11-03',
          full_payment_date: '2024-11-03',
          rental_status: false,
          cancelled_at: null,
          dateRecorded: '2024-11-03',
          sourceRefNo: 'CONTRACT-2024-009',
          remarks: 'Birthday party transportation - paid in full',
          sourceId: 1,
          source: {
            id: 1,
            name: 'Bus Rental',
            sourceCode: 'RENTAL'
          },
          paymentMethodId: 3,
          paymentMethod: {
            id: 3,
            methodName: 'GCash',
            methodCode: 'GCASH'
          },
          receiptUrl: '/receipts/rnt-2024-009.pdf'
        },
        {
          id: 10,
          revenueCode: 'RNT-2024-010',
          revenueType: 'RENTAL',
          entityName: 'Sunrise University',
          total_rental_amount: 120000.00,
          downpayment_amount: 50000.00,
          balance_amount: 70000.00,
          down_payment_date: '2024-11-11',
          full_payment_date: null,
          rental_status: false,
          cancelled_at: null,
          dateRecorded: '2024-11-11',
          sourceRefNo: 'CONTRACT-2024-010',
          remarks: 'Educational tour - 6 buses for 3 days, balance due before departure',
          sourceId: 1,
          source: {
            id: 1,
            name: 'Bus Rental',
            sourceCode: 'RENTAL'
          },
          paymentMethodId: 1,
          paymentMethod: {
            id: 1,
            methodName: 'Bank Transfer',
            methodCode: 'BANK'
          },
          receiptUrl: '/receipts/rnt-2024-010.pdf'
        }
      ];

      // Apply client-side sorting to mock data
      const sortedData = [...mockData].sort((a, b) => {
        let compareA: any = a[sortBy];
        let compareB: any = b[sortBy];

        // Handle string comparisons (case-insensitive)
        if (typeof compareA === 'string' && typeof compareB === 'string') {
          compareA = compareA.toLowerCase();
          compareB = compareB.toLowerCase();
        }

        // Handle null/undefined values
        if (compareA == null) return 1;
        if (compareB == null) return -1;

        // Compare values
        if (compareA < compareB) {
          return sortOrder === 'asc' ? -1 : 1;
        }
        if (compareA > compareB) {
          return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });

      // Use mock data
      setData(sortedData);
      setTotalPages(1);
      setTotalCount(sortedData.length);

    } catch (err) {
      console.error('Error fetching rental data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      showError('Failed to load rental data', 'Error');
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

  // Fetch analytics when filters change
  useEffect(() => {
    fetchAnalytics();
  }, [search, activeFilters, sortBy, sortOrder]);

  // Sort handler
  const handleSort = (field: "revenueCode" | "entityName" | "dateRecorded" | "total_rental_amount" | "balance_amount") => {
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
  const handleView = (id: number) => {
    const record = data.find(item => item.id === id);
    if (record) {
      openModal("view-rental", record);
    }
  };

  // Get rental status based on payment state
  const getRentalStatus = (record: BusRentalRecord): { 
    label: string; 
    className: string;
    icon: string;
  } => {
    // Cancelled
    if (record.rental_status) {
      return { 
        label: 'Cancelled', 
        className: 'cancelled',
        icon: 'ri-close-circle-line'
      };
    }
    
    // Completed (all paid)
    if (record.balance_amount === 0 && record.full_payment_date) {
      return { 
        label: 'Completed', 
        className: 'completed',
        icon: 'ri-checkbox-circle-line'
      };
    }
    
    // Active (downpayment received, balance pending)
    if (record.downpayment_amount > 0 && record.balance_amount > 0) {
      return { 
        label: 'Active', 
        className: 'active',
        icon: 'ri-time-line'
      };
    }
    
    // Pending downpayment
    return { 
      label: 'Pending', 
      className: 'pending',
      icon: 'ri-error-warning-line'
    };
  };

  const openModal = (mode: "edit-rental" | "pay-balance" | "view-rental", rowData?: BusRentalRecord) => {
    let content;

    switch (mode) {
      case "view-rental":
        const status = rowData ? getRentalStatus(rowData) : { label: '', className: '', icon: '' };
        content = (
          <ViewRentalDetailsModal
            record={rowData!}
            onClose={closeModal}
            status={status}
          />
        );
        break;
      case "edit-rental":
        content = (
          <RecordRentalRevenueModal
            phase="record"
            isEditMode={true}
            initialData={{
              revenueCode: rowData?.revenueCode || "",
              revenueType: 'RENTAL',
              entityName: rowData?.entityName || "",
              total_rental_amount: rowData?.total_rental_amount || 0,
              downpayment_amount: rowData?.downpayment_amount || 0,
              balance_amount: rowData?.balance_amount || 0,
              down_payment_date: rowData?.down_payment_date || "",
              full_payment_date: rowData?.full_payment_date || "",
              rental_status: rowData?.rental_status || false,
              cancelled_at: rowData?.cancelled_at || "",
              dateRecorded: rowData?.dateRecorded || "",
              sourceRefNo: rowData?.sourceRefNo || "",
              remarks: rowData?.remarks || "",
              sourceId: rowData?.sourceId || 1,
              paymentMethodId: rowData?.paymentMethodId || 1,
              receiptUrl: rowData?.receiptUrl || ""
            }}
            onSave={handleSaveEdit}
            onClose={closeModal}
          />
        );
        break;
      case "pay-balance":
        content = (
          <RecordRentalRevenueModal
            phase="balance"
            initialData={{
              revenueCode: rowData?.revenueCode || "",
              revenueType: 'RENTAL',
              entityName: rowData?.entityName || "",
              total_rental_amount: rowData?.total_rental_amount || 0,
              downpayment_amount: rowData?.downpayment_amount || 0,
              balance_amount: rowData?.balance_amount || 0,
              down_payment_date: rowData?.down_payment_date || "",
              full_payment_date: rowData?.full_payment_date || "",
              rental_status: rowData?.rental_status || false,
              cancelled_at: rowData?.cancelled_at || "",
              dateRecorded: rowData?.dateRecorded || "",
              sourceRefNo: rowData?.sourceRefNo || "",
              remarks: rowData?.remarks || "",
              sourceId: rowData?.sourceId || 1,
              paymentMethodId: rowData?.paymentMethodId || 1,
              receiptUrl: rowData?.receiptUrl || ""
            }}
            onSave={handleSaveEdit}
            onClose={closeModal}
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

  const handleEdit = (id: number) => {
    const record = data.find(item => item.id === id);
    if (record) {
      openModal("edit-rental", record);
    }
  };

  const handlePayBalance = (id: number) => {
    const record = data.find(item => item.id === id);
    if (record) {
      openModal("pay-balance", record);
    }
  };

  const handleCancelRental = async (id: number) => {
    const record = data.find(item => item.id === id);
    if (!record) return;

    const result = await Swal.fire({
      title: 'Cancel Rental?',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Customer:</strong> ${record.entityName}</p>
          <p><strong>Contract:</strong> ${record.sourceRefNo}</p>
          <p><strong>Total Amount:</strong> ${formatMoney(record.total_rental_amount)}</p>
          <p><strong>Downpayment:</strong> ${formatMoney(record.downpayment_amount)}</p>
          <p><strong>Balance:</strong> ${formatMoney(record.balance_amount)}</p>
          <hr/>
          <p style="color: #dc3545; font-weight: bold;">⚠️ This will mark the rental as cancelled.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, cancel rental',
      cancelButtonText: 'Keep rental',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      try {
        // Update rental to cancelled status
        const updatedRecord = {
          ...record,
          rental_status: true,
          cancelled_at: new Date().toISOString().split('T')[0]
        };

        // For now, update locally
        setData(prevData =>
          prevData.map(item =>
            item.id === id ? updatedRecord : item
          )
        );

        await showSuccess('Rental cancelled successfully', 'Cancelled');
        fetchData();
      } catch (err) {
        console.error('Error cancelling rental:', err);
        showError('Failed to cancel rental', 'Error');
      }
    }
  };

  const handleSaveEdit = async (formData: any) => {
    try {
      // For now, update the record locally
      setData(prevData =>
        prevData.map(item =>
          item.id === activeRow?.id
            ? { ...item, ...formData }
            : item
        )
      );

      closeModal();
      fetchData(); // Refresh the data
    } catch (err) {
      console.error('Error updating rental:', err);
      showError('Failed to update rental record', 'Error');
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the rental record permanently.',
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
          throw new Error('Failed to delete rental');
        }

        showSuccess('Rental record deleted successfully', 'Deleted');
        fetchData(); // Refresh the data
      } catch (err) {
        console.error('Error deleting rental:', err);
        showError('Failed to delete rental record', 'Error');
      }
    }
  };

  const handleAdd = () => {
    Swal.fire({
      title: 'Add Bus Rental',
      html: '<p><em>Add rental modal to be implemented</em></p>',
      icon: 'info',
      confirmButtonColor: '#961C1E',
    });
  };

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Bus Rental Records</h1>
        <Loading />
      </div>
    );
  }

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Bus Rental Records</h1>
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
          <h1>Bus Rental Records</h1>
        </div>

        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search by customer, code, or contract..."
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
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort("revenueCode")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Revenue Code"
                  >
                    Revenue Code{getSortIndicator("revenueCode")}
                  </th>
                  <th
                    onClick={() => handleSort("entityName")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Customer Name"
                  >
                    Customer Name{getSortIndicator("entityName")}
                  </th>
                  <th
                    onClick={() => handleSort("total_rental_amount")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Amount"
                  >
                    Total Amount{getSortIndicator("total_rental_amount")}
                  </th>
                  <th
                    onClick={() => handleSort("balance_amount")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Rental Balance"
                  >
                    Rental Balance{getSortIndicator("balance_amount")}
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      No rental records found.
                    </td>
                  </tr>
                ) : (
                  data.map((item) => {
                    // Get dynamic status
                    const statusInfo = getRentalStatus(item);

                    return (
                      <tr key={item.id}>
                        <td style={{ maxWidth:10 }}>{item.revenueCode}</td>
                        <td>{item.entityName}</td>
                        <td>{formatMoney(item.total_rental_amount)}</td>
                        <td>{formatMoney(item.balance_amount)}</td>
                        <td style={{ maxWidth:10 }}>
                          <span className={`chip ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="actionButtons">
                          <div className="actionButtonsContainer">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(item.id);
                              }}
                              className="viewBtn"
                              title="View Details"
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                            
                            {/* Show Pay Balance button if rental has balance and downpayment is paid */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePayBalance(item.id);
                              }}
                              className="editBtn"
                              title="Pay Balance"
                              style={{ backgroundColor: '#28a745' }}
                              disabled={item.rental_status || (item.balance_amount === 0 && item.downpayment_amount > 0)}
                            >
                              <i className="ri-money-dollar-circle-line"></i>
                            </button>

                            {/* Show Edit button if not cancelled and has balance */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(item.id);
                              }}
                              className="editBtn"
                              title="Edit Rental"
                              disabled={item.rental_status || (item.balance_amount === 0 && item.downpayment_amount > 0)}
                            >
                              <i className="ri-edit-line"></i>
                            </button>

                            {/* Show Cancel button if not cancelled, has downpayment, and has balance */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRental(item.id);
                              }}
                              className="deleteBtn"
                              title="Cancel Rental"
                              disabled={item.rental_status || (item.balance_amount === 0 && item.downpayment_amount > 0)}
                            >
                              <i className="ri-close-circle-line"></i>
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

export default AdminBusRentalPage;