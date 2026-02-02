/**
 * Admin Bus Rental Page - Backend Integrated
 *
 * Displays bus rental revenue records with analytics:
 * - Fetches data from /api/admin/revenue
 * - Server-side pagination, search, and sorting
 * - Analytics: Total rental revenue, active rentals, available buses
 * - Database-optimized queries with indexes
 *
 * Schema-aligned fields from rental_local and revenue tables
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

// Payment method enum matching schema
type PaymentMethodEnum = 'CASH' | 'BANK_TRANSFER' | 'E_WALLET' | 'REIMBURSEMENT';

// Payment method options matching schema enum
const PAYMENT_METHOD_OPTIONS: { value: PaymentMethodEnum; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'E_WALLET', label: 'E-Wallet (GCash, PayMaya, etc.)' },
  { value: 'REIMBURSEMENT', label: 'Reimbursement' },
];

// TypeScript interface aligned with schema
interface BusRentalRecord {
  id: number;
  code: string; // revenue.code (auto-generated)
  revenue_type_id: number; // FK to revenue_type
  total_rental_amount: number; // rental_local.total_rental_amount
  down_payment_amount: number; // rental_local.down_payment_amount
  balance_amount: number; // rental_local.balance_amount (auto-calculated)
  down_payment_date: string | null; // rental_local.down_payment_date
  full_payment_date: string | null; // rental_local.full_payment_date
  rental_status: string | null; // rental_local.rental_status (string: approved, completed, cancelled)
  cancelled_at?: string | null; // rental_local.cancelled_at
  date_recorded: string; // revenue.date_recorded
  assignment_id: string; // rental_local.assignment_id (primary key / contract reference)
  description?: string; // revenue.description
  payment_method: PaymentMethodEnum; // revenue.payment_method (enum)
  rental_package: string | null; // rental_local.rental_package (destination/package info)
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

  // Search and filter states
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // For debouncing
  const [activeFilters, setActiveFilters] = useState<{
    paymentMethods: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
  }>({
    paymentMethods: [],
    dateRange: { from: '', to: '' },
    amountRange: { from: '', to: '' }
  });

  // Sort states
  const [sortBy, setSortBy] = useState<"code" | "date_recorded" | "total_rental_amount" | "balance_amount" | "updated_at">("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [activeRow, setActiveRow] = useState<BusRentalRecord | null>(null);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      // Build query parameters for analytics
      const params = new URLSearchParams();

      // Add date filters if present
      if (activeFilters.dateRange && typeof activeFilters.dateRange === 'object') {
        const dateRange = activeFilters.dateRange as { from: string; to: string };
        if (dateRange.from) {
          params.append('date_from', dateRange.from);
        }
        if (dateRange.to) {
          params.append('date_to', dateRange.to);
        }
      }

      const response = await fetch(`/api/admin/rental-revenue/analytics?${params.toString()}`);
      const result = await response.json();

      if (result.success && result.data) {
        const analyticsData = result.data;
        setAnalytics({
          totalRevenue: analyticsData.total_revenue || 0,
          activeRentals: analyticsData.active_count || 0,
          availableBuses: 25, // Placeholder - would need fleet data API
          monthlyRevenue: analyticsData.monthly_revenue || 0,
          averageRentalAmount: analyticsData.average_amount || 0
        });
      } else {
        console.warn('Analytics API returned unexpected format, using fallback');
        setAnalytics({
          totalRevenue: 0,
          activeRentals: 0,
          availableBuses: 25,
          monthlyRevenue: 0,
          averageRentalAmount: 0
        });
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      // Fallback to local calculation from current data
      const totalRevenue = data.reduce((sum, record) => sum + record.total_rental_amount, 0);
      const activeRentals = data.filter(record => record.rental_status !== 'cancelled').length;
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

      // Build query parameters for rental revenue endpoint
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      // Add search parameter if exists (trimmed and sanitized)
      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        params.append('search', trimmedSearch);
      }

      // Add filter parameters
      if (activeFilters.paymentMethods && Array.isArray(activeFilters.paymentMethods) && activeFilters.paymentMethods.length > 0) {
        params.append('payment_method', activeFilters.paymentMethods[0]); // Backend expects single value
      }

      if (activeFilters.dateRange && typeof activeFilters.dateRange === 'object') {
        const dateRange = activeFilters.dateRange as { from: string; to: string };
        if (dateRange.from && dateRange.from.trim()) {
          params.append('date_recorded_from', dateRange.from.trim());
        }
        if (dateRange.to && dateRange.to.trim()) {
          params.append('date_recorded_to', dateRange.to.trim());
        }
      }

      if (activeFilters.amountRange && typeof activeFilters.amountRange === 'object') {
        const amountRange = activeFilters.amountRange as { from: string; to: string };
        // Ensure amount values are valid numbers before appending
        const minAmount = amountRange.from?.trim();
        const maxAmount = amountRange.to?.trim();

        if (minAmount && !isNaN(Number(minAmount)) && Number(minAmount) >= 0) {
          params.append('amount_min', minAmount);
        }
        if (maxAmount && !isNaN(Number(maxAmount)) && Number(maxAmount) >= 0) {
          params.append('amount_max', maxAmount);
        }
      }

      const response = await fetch(`/api/admin/rental-revenue?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch rental revenue data');
      }

      if (result.success && result.data) {
        // Map API response to UI interface
        const mappedData: BusRentalRecord[] = result.data.map((item: any) => ({
          id: item.id,
          code: item.code,
          revenue_type_id: item.revenue_type_id || 3,
          total_rental_amount: item.total_rental_amount || 0,
          down_payment_amount: item.down_payment_amount || 0,
          balance_amount: item.balance_amount || 0,
          down_payment_date: item.down_payment_date,
          full_payment_date: item.full_payment_date,
          rental_status: item.rental_status,
          cancelled_at: item.cancelled_at,
          date_recorded: item.date_recorded,
          assignment_id: item.assignment_id,
          description: item.description,
          payment_method: item.payment_method || 'CASH',
          rental_package: item.rental_package || null,
        }));

        setData(mappedData);

        // Handle pagination from API response
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages || 1);
          setTotalCount(result.pagination.totalCount || mappedData.length);
        } else {
          setTotalPages(result.pages || 1);
          setTotalCount(result.total || mappedData.length);
        }
      } else {
        setData([]);
        setTotalPages(1);
        setTotalCount(0);
      }

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

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, search, sortBy, sortOrder, activeFilters]);

  // Fetch analytics when filters change
  useEffect(() => {
    fetchAnalytics();
  }, [search, activeFilters, sortBy, sortOrder]);

  // Sort handler
  const handleSort = (field: "code" | "date_recorded" | "total_rental_amount" | "balance_amount") => {
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
    sources: string[];  // Kept for RevenueFilter component compatibility (not used)
    paymentMethods: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
  }) => {
    // Only set the fields we use
    setActiveFilters({
      paymentMethods: filterValues.paymentMethods,
      dateRange: filterValues.dateRange,
      amountRange: filterValues.amountRange
    });
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Action handlers
  const handleView = (id: number) => {
    const record = data.find(item => item.id === id);
    if (record) {
      openModal("view-rental", record);
    }
  };

  // Get rental status - reads directly from rental_local.rental_status
  // Only allowed statuses: completed, approved, cancelled
  // Note: 'pending' status is excluded from display
  const getRentalStatus = (record: BusRentalRecord): {
    label: string;
    className: string;
    icon: string;
  } | null => {
    // Read directly from rental_local.rental_status - no inference
    const status = record.rental_status?.toLowerCase() || '';

    // Only display allowed statuses: completed, approved, cancelled
    switch (status) {
      case 'completed':
        return {
          label: 'Completed',
          className: 'completed',
          icon: 'ri-checkbox-circle-line'
        };
      case 'approved':
        return {
          label: 'Approved',
          className: 'approved',
          icon: 'ri-check-line'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          className: 'cancelled',
          icon: 'ri-close-circle-line'
        };
      default:
        // 'pending' and any other status: return null to indicate not displayable
        return null;
    }
  };

  const openModal = (mode: "edit-rental" | "pay-balance" | "view-rental", rowData?: BusRentalRecord) => {
    // Set activeRow FIRST - before creating modal content
    setActiveRow(rowData || null);

    // Create bound handlers that capture rowData directly (not relying on activeRow state)
    const boundSaveEdit = async (formData: any) => {
      if (!rowData?.id) {
        showError('No record selected to update', 'Error');
        return;
      }
      try {
        const response = await fetch(`/api/admin/rental-revenue/${rowData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: formData.description,
            payment_method: formData.payment_method,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to update rental record');
        }
        closeModal();
        await showSuccess('Rental record updated successfully', 'Updated');
        fetchData();
      } catch (err) {
        console.error('Error updating rental:', err);
        showError('Failed to update rental record', 'Error');
      }
    };

    const boundPayBalance = async (formData: any) => {
      if (!rowData?.id) {
        showError('No record selected to pay balance', 'Error');
        return;
      }
      try {
        const response = await fetch(`/api/admin/rental-revenue/${rowData.id}/pay-balance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_method: formData.payment_method || 'CASH',
            payment_reference: formData.payment_reference,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to pay balance');
        }
        closeModal();
        await showSuccess('Balance paid successfully. Rental is now complete.', 'Completed');
        fetchData();
        fetchAnalytics();
      } catch (err) {
        console.error('Error paying balance:', err);
        showError('Failed to pay balance', 'Error');
      }
    };

    let content;

    switch (mode) {
      case "view-rental":
        const status = rowData ? getRentalStatus(rowData) : null;
        content = (
          <ViewRentalDetailsModal
            record={rowData!}
            onClose={closeModal}
            status={status || { label: 'N/A', className: '', icon: '' }}
          />
        );
        break;
      case "edit-rental":
        content = (
          <RecordRentalRevenueModal
            phase="record"
            isEditMode={true}
            initialData={{
              code: rowData?.code || "",
              revenue_type_id: rowData?.revenue_type_id || 1,
              total_rental_amount: rowData?.total_rental_amount || 0,
              down_payment_amount: rowData?.down_payment_amount || 0,
              balance_amount: rowData?.balance_amount || 0,
              down_payment_date: rowData?.down_payment_date || "",
              full_payment_date: rowData?.full_payment_date || "",
              rental_status: rowData?.rental_status || null,
              cancelled_at: rowData?.cancelled_at || "",
              date_recorded: rowData?.date_recorded || "",
              assignment_id: rowData?.assignment_id || "",
              description: rowData?.description || "",
              payment_method: rowData?.payment_method || 'CASH',
            }}
            onSave={boundSaveEdit}
            onClose={closeModal}
          />
        );
        break;
      case "pay-balance":
        content = (
          <RecordRentalRevenueModal
            phase="balance"
            initialData={{
              code: rowData?.code || "",
              revenue_type_id: rowData?.revenue_type_id || 1,
              total_rental_amount: rowData?.total_rental_amount || 0,
              down_payment_amount: rowData?.down_payment_amount || 0,
              balance_amount: rowData?.balance_amount || 0,
              down_payment_date: rowData?.down_payment_date || "",
              full_payment_date: rowData?.full_payment_date || "",
              rental_status: rowData?.rental_status || null,
              cancelled_at: rowData?.cancelled_at || "",
              date_recorded: rowData?.date_recorded || "",
              assignment_id: rowData?.assignment_id || "",
              description: rowData?.description || "",
              payment_method: rowData?.payment_method || 'CASH',
            }}
            onSave={boundPayBalance}
            onClose={closeModal}
          />
        );
        break;
      default:
        content = null;
    }

    setModalContent(content);
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
          <p><strong>Assignment ID:</strong> ${record.assignment_id}</p>
          <p><strong>Total Amount:</strong> ${formatMoney(record.total_rental_amount)}</p>
          <p><strong>Downpayment:</strong> ${formatMoney(record.down_payment_amount)}</p>
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
      reverseButtons: true,
      input: 'textarea',
      inputLabel: 'Cancellation Reason (optional)',
      inputPlaceholder: 'Enter reason for cancellation...'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/rental-revenue/${id}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cancellation_reason: result.value || 'Cancelled by user'
          }),
        });

        const apiResult = await response.json();

        if (!response.ok || !apiResult.success) {
          throw new Error(apiResult.error || 'Failed to cancel rental');
        }

        await showSuccess('Rental cancelled successfully', 'Cancelled');
        fetchData(); // Refresh the data
      } catch (err) {
        console.error('Error cancelling rental:', err);
        showError('Failed to cancel rental', 'Error');
      }
    }
  };

  const handleSaveEdit = async (formData: any) => {
    try {
      if (!activeRow?.id) {
        throw new Error('No active record to update');
      }

      const response = await fetch(`/api/admin/rental-revenue/${activeRow.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: formData.description,
          payment_method: formData.payment_method,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update rental record');
      }

      closeModal();
      await showSuccess('Rental record updated successfully', 'Updated');
      fetchData(); // Refresh the data
    } catch (err) {
      console.error('Error updating rental:', err);
      showError('Failed to update rental record', 'Error');
    }
  };

  // Handle balance payment submission
  const handlePayBalanceSubmit = async (formData: any) => {
    try {
      if (!activeRow?.id) {
        throw new Error('No active record to pay balance');
      }

      const response = await fetch(`/api/admin/rental-revenue/${activeRow.id}/pay-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: formData.payment_method || 'CASH',
          payment_reference: formData.payment_reference,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to pay balance');
      }

      closeModal();
      await showSuccess('Balance paid successfully. Rental is now complete.', 'Completed');
      fetchData(); // Refresh the data
      fetchAnalytics(); // Refresh analytics
    } catch (err) {
      console.error('Error paying balance:', err);
      showError('Failed to pay balance', 'Error');
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
                placeholder="Search by code, assignment ID, rental package, status..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {/* Filter button right next to search bar */}
            <RevenueFilter
              sources={[]}
              paymentMethods={PAYMENT_METHOD_OPTIONS.map(method => ({
                id: method.value,
                label: method.label
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
                    onClick={() => handleSort("code")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Revenue Code"
                  >
                    Revenue Code{getSortIndicator("code")}
                  </th>
                  <th>Assignment ID</th>
                  <th>Rental Package</th>
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
                  <th
                    onClick={() => handleSort("date_recorded")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Date Recorded"
                  >
                    Date Recorded{getSortIndicator("date_recorded")}
                  </th>
                  <th>Status</th>
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
                      No rental records found.
                    </td>
                  </tr>
                ) : (
                  data
                    // Filter out rows with non-displayable statuses (e.g., pending)
                    .filter((item) => {
                      const status = item.rental_status?.toLowerCase() || '';
                      return ['completed', 'approved', 'cancelled'].includes(status);
                    })
                    .map((item) => {
                      // Get dynamic status - guaranteed non-null after filter
                      const statusInfo = getRentalStatus(item)!;

                      return (
                        <tr key={item.id}>
                          <td style={{ maxWidth: 10 }}>{item.code}</td>
                          <td>{item.assignment_id}</td>
                          <td>{item.rental_package || '—'}</td>
                          <td>{formatMoney(item.total_rental_amount)}</td>
                          <td>{formatMoney(item.balance_amount)}</td>
                          <td>{item.date_recorded ? formatDate(item.date_recorded) : '—'}</td>
                          <td style={{ maxWidth: 10 }}>
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
                                disabled={item.rental_status === 'cancelled' || (item.balance_amount === 0 && item.down_payment_amount > 0)}
                              >
                                <i className="ri-money-dollar-circle-line"></i>
                              </button>

                              {/* Show Edit button if not cancelled and has balance */}
                              {/* <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(item.id);
                              }}
                              className="editBtn"
                              title="Edit Rental"
                              disabled={item.rental_status === 'cancelled' || (item.balance_amount === 0 && item.down_payment_amount > 0)}
                            >
                              <i className="ri-edit-line"></i>
                            </button> */}

                              {/* Show Cancel button if not cancelled, has downpayment, and has balance */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelRental(item.id);
                                }}
                                className="deleteBtn"
                                title="Cancel Rental"
                                disabled={item.rental_status === 'cancelled' || (item.balance_amount === 0 && item.down_payment_amount > 0)}
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