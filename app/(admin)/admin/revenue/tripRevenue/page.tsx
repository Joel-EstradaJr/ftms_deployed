"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/table.css";
import "@/styles/components/chips.css";
import "@/styles/components/config.css";

import Loading from '@/Components/loading';
import ErrorDisplay from '@/Components/errordisplay';
import ModalManager from "@/Components/modalManager";
import PaginationComponent from "@/Components/pagination";
import RevenueFilter from "@/Components/RevenueFilter";

import ViewTripRevenueModal from "./viewTripRevenue";
import RecordTripRevenueModal from "./recordTripRevenue"; // Combined add/edit modal
import TripReceivablePaymentModal from "./TripReceivablePaymentModal"; // Receivable payment modal wrapper
import ConfigModal, { ConfigData } from "./configModal"; // Configuration modal

import { PaymentRecordData } from "@/app/types/payments";
import { RevenueScheduleItem, PaymentStatus } from "../../../../types/revenue";

import { showSuccess, showError } from '@/utils/Alerts';
import { formatDate, formatMoney } from '@/utils/formatting';

// TypeScript interfaces
interface BusTripRecord {
  // Revenue ID from backend (used for API calls)
  revenue_id: number;

  // Primary fields from Operations table
  assignment_id: string;
  bus_trip_id: string;
  bus_route: string;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: string; // 'Percentage' or 'Boundary'
  assignment_value: number; // quota if Boundary, company share% if Percentage
  date_expected: string | null;

  // Employee details (from Human Resource table)
  employee_id: string;
  employee_firstName: string;
  employee_middleName: string;
  employee_lastName: string;
  employee_suffix: string;
  position_id: string;
  position_name: string;

  // Bus details
  bus_plate_number: string;
  bus_type: string; // 'Airconditioned' or 'Ordinary'
  body_number: string;
  bus_brand: string; // 'Hilltop', 'Agila', 'DARJ'

  // Status tracking (from Model Revenue table)
  date_recorded: string | null; // Maps to revenue.date_recorded
  amount: number | null; // Maps to revenue.amount
  total_amount: number | null; // Maps to receivable.total_amount
  payment_status: 'PENDING' | 'PARTIALLY_PAID' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED' | 'WRITTEN_OFF'; // Backend source of truth
  remarks: string | null; // Maps to revenue.description
  due_date: string | null; // Maps to receivable.due_date

  // receivable payment details (for receivable status)
  receivableDetails?: {
    totalAmount: number;
    dueDate: string;
    createdDate: string;
    driverShare: number;
    driverPaid: number;
    driverStatus: 'Pending' | 'Paid' | 'Overdue';
    driverPayments: Array<{
      date: string;
      time: string;
      amount: number;
      method: string;
      recordedBy: string;
    }>;
    conductorShare?: number;
    conductorPaid?: number;
    conductorStatus?: 'Pending' | 'Paid' | 'Overdue';
    conductorPayments?: Array<{
      date: string;
      time: string;
      amount: number;
      method: string;
      recordedBy: string;
    }>;
    overallStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Closed';
  };

  // Computed/display fields
  driverName?: string; // Computed from employee fields
  conductorName?: string; // Computed from employee fields

  // Conductor and Driver details
  conductorId?: string;
  conductorFirstName?: string;
  conductorMiddleName?: string;
  conductorLastName?: string;
  conductorSuffix?: string;

  driverId?: string;
  driverFirstName?: string;
  driverMiddleName?: string;
  driverLastName?: string;
  driverSuffix?: string;

  // Installment schedules (for receivable payments)
  driverInstallments?: RevenueScheduleItem[];
  conductorInstallments?: RevenueScheduleItem[];
}

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

// Helper function to calculate shortage amount based on assignment type
const calculateShortageAmount = (record: BusTripRecord): number => {
  if (record.assignment_type === 'Boundary') {
    // For Boundary: shortage is the quota (assignment_value) that wasn't remitted
    return record.assignment_value;
  } else {
    // For Percentage: shortage is company's share of trip revenue
    // assignment_value is the company's share percentage
    return record.trip_revenue * (record.assignment_value / 100);
  }
};

// Helper function to generate installment schedules
const generateInstallmentSchedule = (
  totalAmount: number,
  startDate: string,
  numberOfPayments: number = 3,
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'WEEKLY',
  paidAmount: number = 0
): RevenueScheduleItem[] => {
  const installments: RevenueScheduleItem[] = [];
  const amountPerInstallment = totalAmount / numberOfPayments;
  let remainingPaid = paidAmount;

  for (let i = 0; i < numberOfPayments; i++) {
    const dueDate = new Date(startDate);

    switch (frequency) {
      case 'DAILY':
        dueDate.setDate(dueDate.getDate() + i);
        break;
      case 'WEEKLY':
        dueDate.setDate(dueDate.getDate() + (i * 7));
        break;
      case 'MONTHLY':
        dueDate.setMonth(dueDate.getMonth() + i);
        break;
    }

    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Calculate how much of this installment is paid
    const installmentPaid = Math.min(remainingPaid, amountPerInstallment);
    remainingPaid -= installmentPaid;

    const balance = amountPerInstallment - installmentPaid;
    let status: PaymentStatus;

    if (balance <= 0.01) {
      status = PaymentStatus.PAID;
    } else if (installmentPaid > 0) {
      status = PaymentStatus.PARTIALLY_PAID;
    } else if (new Date(dueDateStr) < new Date()) {
      status = PaymentStatus.OVERDUE;
    } else {
      status = PaymentStatus.PENDING;
    }

    installments.push({
      id: `inst-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
      installment_number: i + 1,
      due_date: dueDateStr,
      amount_due: amountPerInstallment,
      amount_paid: installmentPaid,
      balance: balance,
      status: status,
      isPastDue: new Date(dueDateStr) < new Date() && balance > 0,
      isEditable: status !== PaymentStatus.PAID
    });
  }

  return installments;
};


const AdminTripRevenuePage = () => {
  // State for data and UI
  const [data, setData] = useState<BusTripRecord[]>([]);
  const [fullDataset, setFullDataset] = useState<BusTripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Configuration state
  const [config, setConfig] = useState<ConfigData>({
    minimum_wage: 600,
    duration_to_late: 72,
    receivable_due_date: 30,
    conductor_share: 50,
    driver_share: 50,
    default_frequency: 'WEEKLY',
    default_number_of_payments: 3,
  });

  // Filter options state
  const [revenueSources, setRevenueSources] = useState<RevenueSource[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Search and filter states
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // For debouncing
  const [activeFilters, setActiveFilters] = useState<{
    types: string[];
    statuses: string[];
    dateAssignedRange: { from: string; to: string };
    dueDateRange: { from: string; to: string };
    tripRevenueRange: { from: string; to: string };
  }>({
    types: [],
    statuses: [],
    dateAssignedRange: { from: '', to: '' },
    dueDateRange: { from: '', to: '' },
    tripRevenueRange: { from: '', to: '' }
  });

  // Sort states
  const [sortBy, setSortBy] = useState<"body_number" | "date_assigned" | "trip_revenue" | "bus_route" | "assignment_type" | "assignment_value" | "date_expected">("date_assigned");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states using ModalManager pattern
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<BusTripRecord | null>(null);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  // Open modal with different modes
  const openModal = (mode: "view" | "add" | "edit" | "config" | "payReceivable", rowData?: BusTripRecord) => {
    let content;

    switch (mode) {
      case "view":
        content = <ViewTripRevenueModal
          revenueId={rowData!.revenue_id}
          onClose={closeModal}
        />;
        break;
      case "add":
      case "edit":
        // Edit is only allowed for PARTIALLY_PAID status
        if (mode === "edit" && rowData && rowData.payment_status !== 'PARTIALLY_PAID') {
          showError(`This record cannot be edited because its status is "${rowData.payment_status}". Only PARTIALLY_PAID records can be edited.`, 'Cannot Edit');
          return;
        }

        content = <RecordTripRevenueModal
          mode={mode}
          revenueId={mode === "edit" ? rowData!.revenue_id : undefined}
          tripData={rowData!}
          config={config}
          onSave={handleSaveTripRevenue}
          onClose={closeModal}
        />;
        break;
      case "payReceivable":
        content = <TripReceivablePaymentModal
          revenueId={rowData!.revenue_id}
          tripData={{
            assignment_id: rowData!.assignment_id,
            body_number: rowData!.body_number,
            bus_route: rowData!.bus_route,
            date_assigned: rowData!.date_assigned,
            payment_status: rowData!.payment_status,
          }}
          paymentMethods={paymentMethods}
          currentUser="Admin User" // TODO: Get from auth context
          onPaymentRecorded={handleReceivablePayment}
          onCloseReceivable={handleCloseReceivable}
          onClose={closeModal}
        />;
        break;
      case "config":
        content = <ConfigModal
          currentConfig={config}
          onSave={handleSaveConfig}
          onClose={closeModal}
        />;
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

  // Handle save configuration
  const handleSaveConfig = (configData: ConfigData) => {
    console.log('Page: Saving configuration:', configData);

    setConfig(configData);
    console.log('Page: Config state updated to:', configData);

    // Show success message
    showSuccess('Configuration saved successfully', 'Success');
  };

  // Handle receivable payment - calls backend API and updates local state
  const handleReceivablePayment = async (paymentData: PaymentRecordData & { employeeType: 'driver' | 'conductor'; employeeId: string; employeeNumber?: string }) => {
    console.log('Recording receivable payment:', paymentData);

    // Extract the numeric installment ID from scheduleItemId (format: "driver-inst-123" or "conductor-inst-123")
    const extractInstallmentId = (scheduleItemId: string): number | null => {
      const match = scheduleItemId.match(/(?:driver|conductor)-inst-(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    };

    const installmentId = extractInstallmentId(paymentData.scheduleItemId);
    if (!installmentId) {
      showError('Invalid installment ID format', 'Payment Error');
      throw new Error('Invalid installment ID format');
    }

    // Prepare API payload
    const apiPayload = {
      installment_id: installmentId,
      amount_paid: paymentData.amountToPay,
      payment_method: paymentData.paymentMethodCode || 'CASH',
      payment_date: paymentData.paymentDate,
      payment_reference: paymentData.referenceNumber || null,
    };

    console.log('[Payment] API Payload:', apiPayload);

    // Call the backend API
    const response = await fetch('/api/admin/revenue/receivable-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('[Payment] API Error:', result);
      showError(result.message || result.error || 'Failed to record payment', 'Payment Error');
      throw new Error(result.message || result.error || 'Failed to record payment');
    }

    console.log('[Payment] API Success:', result);

    // Refresh data from server to get updated state
    await fetchData();
  };

  // Handle close receivable - updates payment_status to COMPLETED via backend API
  const handleCloseReceivable = async (revenueId: number) => {
    console.log('Closing receivable for revenue ID:', revenueId);

    try {
      // Call the PATCH API to update payment_status to COMPLETED
      const response = await fetch(`/api/admin/revenue/${revenueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_status: 'COMPLETED',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('[CloseReceivable] API Error:', result);
        showError(result.message || result.error || 'Failed to close receivable', 'Error');
        throw new Error(result.message || result.error || 'Failed to close receivable');
      }

      console.log('[CloseReceivable] API Success:', result);
      showSuccess('Receivable closed successfully', 'Closed');

      // Refresh data from server to get updated state
      await fetchData();
    } catch (error) {
      console.error('[CloseReceivable] Error:', error);
      throw error;
    }
  };

  // Handle save trip revenue (both add and edit)
  const handleSaveTripRevenue = async (formData: any, mode: "add" | "edit") => {
    console.log(`${mode === 'add' ? 'Recording' : 'Updating'} trip revenue:`, formData);

    // TODO: Replace with actual API call
    // Simulate success for now
    showSuccess(`Trip revenue ${mode === 'add' ? 'recorded' : 'updated'} successfully (MOCK)`, 'Success');

    // Update persistent mock data
    setFullDataset(prevData => prevData.map(item => {
      if (item.assignment_id !== formData.assignment_id) {
        return item;
      }

      // Base update for all cases
      const updatedItem: BusTripRecord = {
        ...item,
        date_recorded: formData.date_recorded,
        amount: formData.amount,
        payment_status: formData.payment_status || 'COMPLETED',
        remarks: formData.description
      };

      // Handle receivable case with separate driver and conductor receivables
      if (formData.payment_status === 'PARTIALLY_PAID') {
        const hasConductor = !!formData.conductorReceivable;
        const driverReceivable = formData.driverReceivable;
        const conductorReceivable = formData.conductorReceivable;

        // Calculate total amount from both receivables
        const totalAmount = (driverReceivable?.total_amount || 0) + (conductorReceivable?.total_amount || 0);

        updatedItem.total_amount = totalAmount;
        updatedItem.due_date = driverReceivable?.due_date || null;
        updatedItem.receivableDetails = {
          totalAmount,
          dueDate: driverReceivable?.due_date || '',
          createdDate: formData.date_recorded,
          driverShare: driverReceivable?.total_amount || 0,
          driverPaid: 0,
          driverStatus: 'Pending',
          driverPayments: [],
          ...(hasConductor && {
            conductorShare: conductorReceivable?.total_amount || 0,
            conductorPaid: 0,
            conductorStatus: 'Pending',
            conductorPayments: []
          }),
          overallStatus: 'Pending'
        };

        // Convert installments from API format to internal format
        if (driverReceivable?.installments) {
          updatedItem.driverInstallments = driverReceivable.installments.map((inst: any, index: number) => ({
            id: `driver-inst-${Date.now()}-${index}`,
            installment_number: inst.installment_number,
            due_date: inst.due_date,
            amount_due: inst.amount_due,
            amount_paid: inst.amount_paid || 0,
            balance: inst.amount_due - (inst.amount_paid || 0),
            status: inst.status || PaymentStatus.PENDING,
            isPastDue: new Date(inst.due_date) < new Date() && (inst.amount_due - (inst.amount_paid || 0)) > 0,
            isEditable: inst.status !== PaymentStatus.PAID
          }));
        }

        if (hasConductor && conductorReceivable?.installments) {
          updatedItem.conductorInstallments = conductorReceivable.installments.map((inst: any, index: number) => ({
            id: `conductor-inst-${Date.now()}-${index}`,
            installment_number: inst.installment_number,
            due_date: inst.due_date,
            amount_due: inst.amount_due,
            amount_paid: inst.amount_paid || 0,
            balance: inst.amount_due - (inst.amount_paid || 0),
            status: inst.status || PaymentStatus.PENDING,
            isPastDue: new Date(inst.due_date) < new Date() && (inst.amount_due - (inst.amount_paid || 0)) > 0,
            isEditable: inst.status !== PaymentStatus.PAID
          }));
        }
      }

      return updatedItem;
    }));

    // Refresh displayed data
    fetchData();

    closeModal();
  };

  // Fetch filter options (revenue sources)
  const fetchFilterOptions = async () => {
    // TODO: Fetch revenue sources from API
    console.log('Fetching filter options...');
  };

  // Helper function to get display label for payment status
  const getStatusDisplayLabel = (status: BusTripRecord['payment_status'] | undefined | null): string => {
    if (!status) return 'Pending';
    const labels: Record<BusTripRecord['payment_status'], string> = {
      'PENDING': 'Pending',
      'PARTIALLY_PAID': 'Partially Paid',
      'COMPLETED': 'Paid',
      'OVERDUE': 'Overdue',
      'CANCELLED': 'Cancelled',
      'WRITTEN_OFF': 'Written Off'
    };
    return labels[status] || status;
  };

  // Helper function to get CSS class for payment status chip
  const getStatusChipClass = (status: BusTripRecord['payment_status'] | undefined | null): string => {
    if (!status) return 'pending';
    const classes: Record<BusTripRecord['payment_status'], string> = {
      'PENDING': 'pending',
      'PARTIALLY_PAID': 'receivable',
      'COMPLETED': 'paid',
      'OVERDUE': 'overdue',
      'CANCELLED': 'rejected',
      'WRITTEN_OFF': 'rejected'
    };
    return classes[status] || 'pending';
  };

  // Fetch data from API
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params for server-side filtering, sorting, pagination
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', pageSize.toString());
      params.set('sort_by', sortBy);
      params.set('sort_order', sortOrder);

      // Search
      if (search) {
        params.set('search', search);
      }

      // Date filters
      if (activeFilters.dateAssignedRange.from) {
        params.set('date_assigned_from', activeFilters.dateAssignedRange.from);
      }
      if (activeFilters.dateAssignedRange.to) {
        params.set('date_assigned_to', activeFilters.dateAssignedRange.to);
      }
      if (activeFilters.dueDateRange.from) {
        params.set('date_recorded_from', activeFilters.dueDateRange.from);
      }
      if (activeFilters.dueDateRange.to) {
        params.set('date_recorded_to', activeFilters.dueDateRange.to);
      }

      // Trip revenue range
      if (activeFilters.tripRevenueRange.from) {
        params.set('trip_revenue_min', activeFilters.tripRevenueRange.from);
      }
      if (activeFilters.tripRevenueRange.to) {
        params.set('trip_revenue_max', activeFilters.tripRevenueRange.to);
      }

      // Assignment type filter
      if (activeFilters.types.length === 1) {
        // Map UI type names to backend enum values
        const typeMap: Record<string, string> = {
          'Boundary': 'BOUNDARY',
          'Percentage': 'PERCENTAGE'
        };
        params.set('assignment_type', typeMap[activeFilters.types[0]] || activeFilters.types[0]);
      }

      // Status filter
      if (activeFilters.statuses.length === 1) {
        // Map UI status names to backend enum values
        const statusMap: Record<string, string> = {
          'Remitted': 'COMPLETED',
          'Pending': 'PENDING',
          'Receivable': 'PARTIALLY_PAID'
        };
        params.set('status', statusMap[activeFilters.statuses[0]] || activeFilters.statuses[0]);
      }

      console.log('[TripRevenue] Fetching data with params:', params.toString());

      const response = await fetch(`/api/admin/revenue?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch revenue data');
      }

      // Map API response to UI interface
      const mappedData: BusTripRecord[] = result.data.map((item: any) => ({
        // Revenue ID from backend (used for detail API calls)
        revenue_id: item.id,

        // Primary identifiers
        assignment_id: item.code || `REV-${item.id}`,
        bus_trip_id: item.code || `REV-${item.id}`,

        // Bus details
        body_number: item.body_number || 'N/A',
        bus_route: 'N/A', // Not in list response
        bus_plate_number: 'N/A',
        bus_type: 'N/A',
        bus_brand: 'N/A',

        // Trip details
        date_assigned: item.date_assigned ? new Date(item.date_assigned).toISOString().split('T')[0] : '',
        trip_fuel_expense: 0,
        trip_revenue: item.trip_revenue || 0,
        assignment_type: item.assignment_type === 'BOUNDARY' ? 'Boundary' : 'Percentage',
        assignment_value: 0,
        date_expected: item.date_assigned,

        // Employee placeholders (not in list response)
        employee_id: '',
        employee_firstName: '',
        employee_middleName: '',
        employee_lastName: '',
        employee_suffix: '',
        position_id: '',
        position_name: '',

        // Revenue status
        date_recorded: item.date_recorded ? new Date(item.date_recorded).toISOString().split('T')[0] : null,
        amount: item.trip_revenue,
        total_amount: item.shortage > 0 ? item.shortage : null,
        payment_status: (item.payment_status as BusTripRecord['payment_status']) || 'PENDING',
        remarks: null,
        due_date: null,

        // Computed names
        driverName: 'N/A',
        conductorName: item.has_receivables ? 'N/A' : undefined,

        // Receivable details placeholder
        receivableDetails: item.has_receivables ? {
          totalAmount: item.shortage,
          dueDate: '',
          createdDate: item.date_recorded,
          driverShare: item.shortage / 2,
          driverPaid: 0,
          driverStatus: 'Pending' as const,
          driverPayments: [],
          conductorShare: item.shortage / 2,
          conductorPaid: 0,
          conductorStatus: 'Pending' as const,
          conductorPayments: [],
          overallStatus: 'Pending' as const
        } : undefined,
      }));

      setData(mappedData);
      setTotalPages(result.pages || 1);
      setTotalCount(result.total || mappedData.length);
      setLoading(false);

    } catch (err) {
      console.error('[TripRevenue] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setErrorCode(500);
      setLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch configuration from API on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/admin/revenue/config');
        const result = await response.json();

        if (response.ok && result.success) {
          console.log('Loaded config from API:', result.data);
          setConfig(result.data);
        } else {
          console.warn('Failed to load config from API, using defaults:', result.error);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
        // Keep using default config values
      }
    };

    fetchConfig();
  }, []);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, search, sortBy, sortOrder, activeFilters]);

  // Periodic data refresh (runs every 5 minutes to sync with backend)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      console.log('Running periodic data refresh...');
      fetchData(); // Refresh data from backend (source of truth for status)
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(checkInterval);
  }, [fullDataset, config]); // Re-create interval when dataset or config changes

  // Sort handler
  const handleSort = (field: "body_number" | "date_assigned" | "trip_revenue" | "bus_route" | "assignment_type" | "assignment_value" | "date_expected") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // Get sort indicator for column
  const getSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  // Calculate receivable due date (configurable days from dateRecorded)
  const getReceivableDueDate = (dateRecorded: string | null): string => {
    if (!dateRecorded) return 'N/A';
    const dueDate = new Date(dateRecorded);
    dueDate.setDate(dueDate.getDate() + config.receivable_due_date);
    return formatDate(dueDate.toISOString().split('T')[0]);
  };

  // Handle filter apply
  const handleFilterApply = (filterValues: {
    types: string[];
    statuses: string[];
    dateAssignedRange: { from: string; to: string };
    dueDateRange: { from: string; to: string };
    tripRevenueRange: { from: string; to: string };
  }) => {
    setActiveFilters(filterValues);
    setCurrentPage(1);
  };

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Trip Revenue Records</h1>
        <Loading />
      </div>
    );
  }

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Trip Revenue Records</h1>
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
          <h1>Trip Revenue Records</h1>

        </div>

        <div className="settings">
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search by body number, route, or assignment ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <RevenueFilter
              types={[
                { id: 'Boundary', label: 'Boundary' },
                { id: 'Percentage', label: 'Percentage' }
              ]}
              statuses={[
                { id: 'Remitted', label: 'Remitted' },
                { id: 'Receivable', label: 'Receivable' },
                { id: 'Closed', label: 'Closed' },
                { id: 'Pending', label: 'Pending' }
              ]}
              onApply={handleFilterApply}
              initialValues={activeFilters}
            />
            <button
              className="config-btn"
              onClick={() => openModal("config")}
              title="Configure Bus Trip Rules"
            >
              <i className="ri-settings-3-line"></i>
              Config
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort("body_number")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Body Number"
                  >
                    Body Number{getSortIndicator("body_number")}
                  </th>
                  <th
                    onClick={() => handleSort("date_assigned")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Date Assigned"
                  >
                    Date Assigned{getSortIndicator("date_assigned")}
                  </th>
                  <th
                    onClick={() => handleSort("trip_revenue")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Trip Revenue"
                  >
                    Trip Revenue{getSortIndicator("trip_revenue")}
                  </th>
                  <th>Assignment Type</th>
                  <th>Status</th>
                  <th>Date Recorded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      No bus trip records found.
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.assignment_id}>
                      <td>{item.body_number}</td>
                      <td>{formatDate(item.date_assigned)}</td>
                      <td>{formatMoney(item.trip_revenue)}</td>
                      <td>{item.assignment_type}</td>
                      <td>
                        {/* Status chips based on backend payment_status - source of truth */}
                        <span className={`chip ${getStatusChipClass(item.payment_status)}`}>
                          {getStatusDisplayLabel(item.payment_status)}
                        </span>
                      </td>
                      <td>
                        {/* Date Recorded - show actual date or "-" if null */}
                        {item.date_recorded ? formatDate(item.date_recorded) : '-'}
                      </td>
                      <td className="actionButtons">
                        <div className="actionButtonsContainer">
                          {/* View button - always visible for all statuses */}
                          <button
                            className="viewBtn"
                            onClick={() => openModal("view", item)}
                            title="View Trip Details"
                          >
                            <i className="ri-eye-line" />
                          </button>

                          {/* Record Receivable Payment */}
                          <button
                            className="editBtn"
                            onClick={() => openModal("payReceivable", item)}
                            title={item.payment_status === 'PARTIALLY_PAID' ? "Record Receivable Payment" : "Only available for Partial Payments"}
                            disabled={item.payment_status !== 'PARTIALLY_PAID'}
                            style={{
                              opacity: item.payment_status !== 'PARTIALLY_PAID' ? 0.5 : 1,
                              cursor: item.payment_status !== 'PARTIALLY_PAID' ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <i className="ri-hand-coin-line" />
                          </button>

                          {/* Edit button */}
                          <button
                            className="editBtn"
                            onClick={() => openModal("edit", item)}
                            title={item.payment_status === 'PARTIALLY_PAID' ? "Edit Receivable Details" : "Only available for Partial Payments"}
                            disabled={item.payment_status !== 'PARTIALLY_PAID'}
                            style={{
                              opacity: item.payment_status !== 'PARTIALLY_PAID' ? 0.5 : 1,
                              cursor: item.payment_status !== 'PARTIALLY_PAID' ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <i className="ri-edit-line" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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

export default AdminTripRevenuePage;