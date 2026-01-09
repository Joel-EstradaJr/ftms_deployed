"use client";

import React, { useState, useEffect, useMemo } from "react";
import PaginationComponent from "@/Components/pagination";
import ModalManager from "@/Components/modalManager";
import { showSuccess, showError } from "@/utils/Alerts";
import { formatDate, formatMoney } from "@/utils/formatting";

// Import modal components
import ViewCashAdvanceModal, { CashAdvanceRequest } from "./ViewCashAdvanceModal";
import CashAdvanceApprovalModal from "./CashAdvanceApprovalModal";

// Import styles
import "@/styles/budget-management/budgetApproval.css";
import "@/styles/components/table.css";
import "@/styles/components/chips.css";

import { SharedApprovalFilters } from "../../../../types/approvals";

interface CashAdvanceApprovalTabProps {
  filters: SharedApprovalFilters;
  searchTerm: string;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: string | null) => void;
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
  onDataUpdate?: (data: CashAdvanceRequest[]) => void;
}

// Mock Data - Cash Advance Requests
const MOCK_CASH_ADVANCE_REQUESTS: CashAdvanceRequest[] = [
  {
    request_id: 'CA-2026-001',
    employee_number: 'EMP-0001',
    employee_name: 'Juan Dela Cruz',
    contact_number: '09171234567',
    email: 'juan.delacruz@company.com',
    position: 'Driver',
    department: 'Operations',
    requested_amount: 5000,
    approved_amount: null,
    request_type: 'Regular',
    status: 'Pending',
    purpose: 'Emergency medical expenses for family member',
    request_date: '2026-01-05',
    reviewed_at: null,
    reviewed_by: null,
    created_at: '2026-01-05T08:30:00Z'
  },
  {
    request_id: 'CA-2026-002',
    employee_number: 'EMP-0002',
    employee_name: 'Maria Santos',
    contact_number: '09189876543',
    email: null,
    position: 'Conductor',
    department: 'Operations',
    requested_amount: 3000,
    approved_amount: 3000,
    request_type: 'Urgent',
    status: 'Approved',
    purpose: 'School enrollment fees for children',
    request_date: '2026-01-03',
    reviewed_at: '2026-01-04T10:15:00Z',
    reviewed_by: 'Finance Manager',
    created_at: '2026-01-03T14:20:00Z'
  },
  {
    request_id: 'CA-2026-003',
    employee_number: 'EMP-0003',
    employee_name: 'Pedro Reyes',
    contact_number: null,
    email: 'pedro.reyes@company.com',
    position: 'Mechanic',
    department: 'Maintenance',
    requested_amount: 10000,
    approved_amount: null,
    request_type: 'Emergency',
    status: 'Pending',
    purpose: 'Hospitalization expenses due to accident',
    request_date: '2026-01-06',
    reviewed_at: null,
    reviewed_by: null,
    created_at: '2026-01-06T06:00:00Z'
  },
  {
    request_id: 'CA-2026-004',
    employee_number: 'EMP-0004',
    employee_name: 'Rosa Garcia',
    contact_number: '09201234567',
    email: 'rosa.garcia@company.com',
    position: 'Accountant',
    department: 'Finance',
    requested_amount: 8000,
    approved_amount: null,
    request_type: 'Regular',
    status: 'Rejected',
    purpose: 'Home renovation expenses',
    request_date: '2026-01-02',
    reviewed_at: '2026-01-03T09:00:00Z',
    reviewed_by: 'HR Director',
    rejection_reason: 'Non-emergency request. Please apply through regular loan facility.',
    created_at: '2026-01-02T11:45:00Z'
  },
  {
    request_id: 'CA-2026-005',
    employee_number: 'EMP-0005',
    employee_name: 'Antonio Lopez',
    contact_number: null,
    email: null,
    position: 'Driver',
    department: 'Operations',
    requested_amount: 2500,
    approved_amount: 2500,
    request_type: 'Urgent',
    status: 'Disbursed',
    purpose: 'Urgent travel expenses for family emergency',
    request_date: '2025-12-28',
    reviewed_at: '2025-12-28T16:30:00Z',
    reviewed_by: 'Finance Manager',
    created_at: '2025-12-28T14:00:00Z'
  },
  {
    request_id: 'CA-2026-006',
    employee_number: 'EMP-0006',
    employee_name: 'Linda Cruz',
    contact_number: '09151112233',
    email: 'linda.cruz@company.com',
    position: 'HR Officer',
    department: 'Human Resources',
    requested_amount: 15000,
    approved_amount: 12000,
    request_type: 'Emergency',
    status: 'Approved',
    purpose: 'Medical procedure for dependent',
    request_date: '2026-01-04',
    reviewed_at: '2026-01-05T08:00:00Z',
    reviewed_by: 'General Manager',
    created_at: '2026-01-04T17:30:00Z'
  },
  {
    request_id: 'CA-2026-007',
    employee_number: 'EMP-0007',
    employee_name: 'Carlos Mendoza',
    contact_number: '09223334455',
    email: null,
    position: 'Supervisor',
    department: 'Operations',
    requested_amount: 7500,
    approved_amount: null,
    request_type: 'Regular',
    status: 'Pending',
    purpose: 'Educational assistance for professional development course',
    request_date: '2026-01-06',
    reviewed_at: null,
    reviewed_by: null,
    created_at: '2026-01-06T09:15:00Z'
  },
  {
    request_id: 'CA-2026-008',
    employee_number: 'EMP-0008',
    employee_name: 'Elena Martinez',
    contact_number: null,
    email: 'elena.martinez@company.com',
    position: 'Admin Assistant',
    department: 'Administration',
    requested_amount: 4000,
    approved_amount: 4000,
    request_type: 'Urgent',
    status: 'Disbursed',
    purpose: 'Emergency house repair due to storm damage',
    request_date: '2025-12-20',
    reviewed_at: '2025-12-21T11:00:00Z',
    reviewed_by: 'Finance Manager',
    created_at: '2025-12-20T08:00:00Z'
  },
  {
    request_id: 'CA-2026-009',
    employee_number: 'EMP-0009',
    employee_name: 'Roberto Kim',
    contact_number: '09334445566',
    email: 'roberto.kim@company.com',
    position: 'IT Specialist',
    department: 'IT',
    requested_amount: 6000,
    approved_amount: null,
    request_type: 'Regular',
    status: 'Rejected',
    purpose: 'Purchase of personal computer equipment',
    request_date: '2025-12-15',
    reviewed_at: '2025-12-16T14:00:00Z',
    reviewed_by: 'HR Director',
    rejection_reason: 'Personal equipment purchases are not covered under cash advance policy.',
    created_at: '2025-12-15T10:30:00Z'
  },
  {
    request_id: 'CA-2026-010',
    employee_number: 'EMP-0010',
    employee_name: 'Ana Villanueva',
    contact_number: '09445556677',
    email: 'ana.villanueva@company.com',
    position: 'Conductor',
    department: 'Operations',
    requested_amount: 3500,
    approved_amount: null,
    request_type: 'Emergency',
    status: 'Pending',
    purpose: 'Emergency dental procedure',
    request_date: '2026-01-06',
    reviewed_at: null,
    reviewed_by: null,
    created_at: '2026-01-06T07:45:00Z'
  },
  {
    request_id: 'CA-2026-011',
    employee_number: 'EMP-0011',
    employee_name: 'Miguel Torres',
    contact_number: null,
    email: 'miguel.torres@company.com',
    position: 'Driver',
    department: 'Operations',
    requested_amount: 5500,
    approved_amount: 5500,
    request_type: 'Urgent',
    status: 'Approved',
    purpose: 'Urgent medication for chronic illness',
    request_date: '2026-01-05',
    reviewed_at: '2026-01-05T15:00:00Z',
    reviewed_by: 'Finance Manager',
    created_at: '2026-01-05T12:00:00Z'
  },
  {
    request_id: 'CA-2026-012',
    employee_number: 'EMP-0012',
    employee_name: 'Sofia Ramos',
    contact_number: '09556667788',
    email: null,
    position: 'Dispatcher',
    department: 'Operations',
    requested_amount: 2000,
    approved_amount: 2000,
    request_type: 'Regular',
    status: 'Disbursed',
    purpose: 'School supplies for children',
    request_date: '2025-12-10',
    reviewed_at: '2025-12-11T09:30:00Z',
    reviewed_by: 'Finance Manager',
    created_at: '2025-12-10T13:00:00Z'
  }
];

export default function CashAdvanceApprovalTab({
  filters,
  searchTerm,
  loading,
  onLoadingChange,
  onError,
  onExport,
  onDataUpdate
}: CashAdvanceApprovalTabProps) {
  const [data, setData] = useState<CashAdvanceRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [activeRow, setActiveRow] = useState<CashAdvanceRequest | null>(null);
  const [sortField, setSortField] = useState<keyof CashAdvanceRequest>('request_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load mock data
  useEffect(() => {
    const fetchData = async () => {
      onLoadingChange(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        setData(MOCK_CASH_ADVANCE_REQUESTS);
        onError(null);
      } catch (err) {
        onError('Failed to load cash advance requests');
      } finally {
        onLoadingChange(false);
      }
    };

    fetchData();
  }, [onLoadingChange, onError]);

  // Reset pagination when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.request_id.toLowerCase().includes(searchLower) ||
        item.employee_name.toLowerCase().includes(searchLower) ||
        item.employee_number.toLowerCase().includes(searchLower) ||
        item.department.toLowerCase().includes(searchLower) ||
        item.position.toLowerCase().includes(searchLower) ||
        item.purpose.toLowerCase().includes(searchLower)
      );
    }

    // Status filter from shared filters
    if (filters.status?.length) {
      result = result.filter(item => {
        const statusMap: { [key: string]: string } = {
          'pending': 'Pending',
          'approved': 'Approved',
          'rejected': 'Rejected',
          'completed': 'Disbursed'
        };
        return filters.status!.some(status => statusMap[status] === item.status);
      });
    }

    // Date range filter
    if (filters.dateRange) {
      result = result.filter(item => {
        const itemDate = new Date(item.request_date);
        const fromDate = filters.dateRange!.from ? new Date(filters.dateRange!.from) : null;
        const toDate = filters.dateRange!.to ? new Date(filters.dateRange!.to) : null;

        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
        return true;
      });
    }

    // Sort data
    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue == null) return sortOrder === 'asc' ? 1 : -1;

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, filters, searchTerm, sortField, sortOrder]);

  // Send filtered data to parent for export
  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate(filteredData);
    }
  }, [filteredData, onDataUpdate]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Handle sorting
  const handleSort = (field: keyof CashAdvanceRequest) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Open modal with different modes
  const openModal = (mode: 'view' | 'approve', rowData?: CashAdvanceRequest) => {
    let content;

    switch (mode) {
      case 'view':
        content = (
          <ViewCashAdvanceModal
            request={rowData!}
            onClose={closeModal}
          />
        );
        break;
      case 'approve':
        content = (
          <CashAdvanceApprovalModal
            request={rowData!}
            onClose={closeModal}
            onApprove={handleApprove}
            onReject={handleReject}
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

  // Handle view
  const handleView = (request: CashAdvanceRequest) => {
    openModal('view', request);
  };

  // Handle approval modal
  const handleApprovalAction = (request: CashAdvanceRequest) => {
    openModal('approve', request);
  };

  // Handle approve from modal
  const handleApprove = (request: CashAdvanceRequest, approvedAmount: number) => {
    setData(prevData =>
      prevData.map(item =>
        item.request_id === request.request_id
          ? {
              ...item,
              status: 'Approved' as const,
              approved_amount: approvedAmount,
              reviewed_at: new Date().toISOString(),
              reviewed_by: 'Current User'
            }
          : item
      )
    );
  };

  // Handle reject from modal
  const handleReject = (request: CashAdvanceRequest, reason: string) => {
    setData(prevData =>
      prevData.map(item =>
        item.request_id === request.request_id
          ? {
              ...item,
              status: 'Rejected' as const,
              rejection_reason: reason,
              reviewed_at: new Date().toISOString(),
              reviewed_by: 'Current User'
            }
          : item
      )
    );
  };

  // Get status class for styling
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Pending': return 'pending';
      case 'Approved': return 'approved';
      case 'Rejected': return 'rejected';
      case 'Disbursed': return 'disbursed';
      default: return 'pending';
    }
  };

  // Get request type class for styling
  const getRequestTypeClass = (type: string) => {
    switch (type) {
      case 'Regular': return 'normal';
      case 'Urgent': return 'urgent';
      case 'Emergency': return 'rejected';
      default: return 'normal';
    }
  };

  // Empty state
  if (paginatedData.length === 0 && !loading) {
    return (
      <div className="tab-empty">
        <div className="tab-empty-icon">💰</div>
        <h3 className="tab-empty-title">No Cash Advance Requests Found</h3>
        <p className="tab-empty-description">
          {searchTerm || Object.keys(filters).length > 0
            ? "No cash advance requests match your current filters."
            : "There are no cash advance requests to review at this time."}
        </p>
      </div>
    );
  }

  // Don't render table when loading
  if (loading) {
    return null;
  }

  return (
    <>
      <div className="table-wrapper">
        <div className="tableContainer">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('request_date')} className="sortable">
                  Request Date
                  {sortField === 'request_date' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('employee_name')} className="sortable">
                  Employee Name
                  {sortField === 'employee_name' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('position')} className="sortable">
                  Position
                  {sortField === 'position' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('requested_amount')} className="sortable">
                  Requested Amount
                  {sortField === 'requested_amount' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('approved_amount')} className="sortable">
                  Approved Amount
                  {sortField === 'approved_amount' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('request_type')} className="sortable">
                  Type
                  {sortField === 'request_type' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(request => (
                <tr key={request.request_id} onClick={() => handleView(request)} title="View Details">
                  <td>{formatDate(request.request_date)}</td>
                  <td>{request.employee_name}</td>
                  <td>{request.position}</td>
                  <td>{formatMoney(request.requested_amount)}</td>
                  <td>{request.approved_amount !== null ? formatMoney(request.approved_amount) : '-'}</td>
                  <td>
                    <span className={`chip ${getRequestTypeClass(request.request_type)}`}>
                      {request.request_type}
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${getStatusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="actionButtons" onClick={(e) => e.stopPropagation()}>
                    <div className="actionButtonsContainer">
                      <button
                        className="viewBtn"
                        onClick={() => handleView(request)}
                        title="View Details"
                      >
                        <i className="ri-eye-line" />
                      </button>
                      <button
                        className="approveBtn"
                        onClick={() => handleApprovalAction(request)}
                        title="Approve"
                        disabled={request.status !== 'Pending'}
                      >
                        <i className="ri-check-line" />
                      </button>
                      <button
                        className="rejectBtn"
                        onClick={() => handleApprovalAction(request)}
                        title="Reject"
                        disabled={request.status !== 'Pending'}
                      >
                        <i className="ri-close-line" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Modal Manager */}
      <ModalManager
        isOpen={isModalOpen}
        onClose={closeModal}
        modalContent={modalContent}
      />
    </>
  );
}
