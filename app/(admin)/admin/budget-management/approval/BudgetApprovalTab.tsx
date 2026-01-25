

"use client";

import React, { useState, useEffect, useMemo } from "react";
import PaginationComponent from "../../../../Components/pagination";
import Loading from "../../../../Components/loading";
import ErrorDisplay from "../../../../Components/errordisplay";
import ExportButton from "../../../../Components/ExportButton";
import { showSuccess, showError, showConfirmation } from "../../../../utils/Alerts";
import { formatDate, formatDateTime, formatMoney } from "../../../../utils/formatting";

// Import existing modal components
import ViewBudgetRequest, { BudgetItem, BudgetRequest } from "./viewBudgetRequest";
import AuditTrailBudgetRequest from "../budgetRequest/auditTrailBudgetRequest";
import BudgetApprovalModal from "./BudgetApprovalModal";

// Import styles
import "../../../../styles/budget-management/budgetApproval.css";
import "../../../../styles/components/table.css";


import { SharedApprovalFilters } from "../../../../types/approvals";

interface BudgetApprovalTabProps {
  filters: SharedApprovalFilters;
  searchTerm: string;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: string | null) => void;
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
  onDataUpdate?: (data: any[]) => void;
}

export default function BudgetApprovalTab({
  filters,
  searchTerm,
  loading,
  onLoadingChange,
  onError,
  onExport,
  onDataUpdate
}: BudgetApprovalTabProps) {
  const [data, setData] = useState<BudgetRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequestForAudit, setSelectedRequestForAudit] = useState<BudgetRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [sortField, setSortField] = useState<keyof BudgetRequest>('request_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch budget requests from API
  useEffect(() => {
    const fetchData = async () => {
      onLoadingChange(true);
      try {
        // Import API helper dynamically to avoid SSR issues
        const { fetchBudgetRequests } = await import('../../../../lib/budgetRequestApi');

        // Call the API with filters
        const budgetRequests = await fetchBudgetRequests({
          status: filters.status?.length ? filters.status[0] : undefined,
          request_type: filters.requestType?.length ? filters.requestType[0] : undefined,
        });

        setData(budgetRequests);
        onError(null);
      } catch (err: any) {
        console.error('Failed to fetch budget requests:', err);
        onError(err.message || 'Failed to load budget requests');
        setData([]); // Clear data on error
      } finally {
        onLoadingChange(false);
      }
    };

    fetchData();
  }, [filters, searchTerm, onLoadingChange, onError]);

  // Reset pagination when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search filter - searches across multiple fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.request_id.toLowerCase().includes(searchLower) ||
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.requested_by.toLowerCase().includes(searchLower) ||
        item.department.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower) ||
        item.requested_type.toLowerCase().includes(searchLower) ||
        item.requested_amount.toString().includes(searchLower) ||
        (item.approved_amount && item.approved_amount.toString().includes(searchLower))
      );
    }

    // Status filter from shared filters
    if (filters.status?.length) {
      result = result.filter(item => {
        const statusMap: { [key: string]: string } = {
          'pending': 'Pending Approval',
          'approved': 'Approved',
          'rejected': 'Rejected',
          'completed': 'Closed',
          'draft': 'Draft'
        };
        return filters.status!.some(status => statusMap[status] === item.status);
      });
    }

    // Request Type filter
    if (filters.requestType?.length) {
      result = result.filter(item =>
        filters.requestType!.includes(item.requested_type)
      );
    }

    // Category filter
    if (filters.category?.length) {
      result = result.filter(item =>
        filters.category!.some(cat =>
          item.category.toLowerCase().includes(cat.toLowerCase())
        )
      );
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
  const handleSort = (field: keyof BudgetRequest) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Handle view modal
  const handleView = (request: BudgetRequest) => {
    setSelectedRequest(request);
    setShowViewModal(true);
  };

  // Handle audit trail modal
  const handleAuditTrail = (request: BudgetRequest) => {
    setSelectedRequestForAudit(request);
    setShowAuditModal(true);
  };

  // Handle approve/reject modal
  const handleApprovalAction = (request: BudgetRequest) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  // Handle approve from modal - calls API and updates state
  const handleApprove = async (request: BudgetRequest) => {
    try {
      const { approveBudgetRequest } = await import('../../../../lib/budgetRequestApi');
      const updatedRequest = await approveBudgetRequest(
        request.request_id,
        { approved_amount: request.approved_amount }
      );

      // Update local state with the response
      setData(prevData =>
        prevData.map(item =>
          item.request_id === request.request_id
            ? updatedRequest
            : item
        )
      );
    } catch (error: any) {
      console.error('Failed to approve budget request:', error);
      showError(error.message || 'Failed to approve budget request', 'Approval Failed');
    }
  };

  // Handle reject from modal - calls API and updates state
  const handleReject = async (request: BudgetRequest, reason: string) => {
    try {
      const { rejectBudgetRequest } = await import('../../../../lib/budgetRequestApi');
      const updatedRequest = await rejectBudgetRequest(
        request.request_id,
        { rejection_reason: reason }
      );

      // Update local state with the response
      setData(prevData =>
        prevData.map(item =>
          item.request_id === request.request_id
            ? updatedRequest
            : item
        )
      );
    } catch (error: any) {
      console.error('Failed to reject budget request:', error);
      showError(error.message || 'Failed to reject budget request', 'Rejection Failed');
    }
  };

  // Handle export
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    onExport(format);
  };

  // Get status class for styling
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Pending Approval':
        return 'pending-approval';
      case 'Approved':
        return 'approved';
      case 'Rejected':
        return 'rejected';
      case 'Closed':
        return 'completed';
      case 'Draft':
        return 'draft';
      default:
        return 'pending';
    }
  };

  // Get request type chip class
  const getRequestTypeClass = (type: string) => {
    switch (type) {
      case 'Emergency':
        return 'emergency';
      case 'Urgent':
        return 'urgent';
      case 'Regular':
        return 'regular';
      case 'Project-Based':
        return 'project-based';
      default:
        return 'regular';
    }
  };

  if (paginatedData.length === 0 && !loading) {
    return (
      <div className="tab-empty">
        <div className="tab-empty-icon">📋</div>
        <h3 className="tab-empty-title">No Budget Requests Found</h3>
        <p className="tab-empty-description">
          {searchTerm || Object.keys(filters).length > 0
            ? "No budget requests match your current filters."
            : "There are no budget requests to approve at this time."}
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
                <th onClick={() => handleSort('department')} className="sortable">
                  Department
                  {sortField === 'department' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('category')} className="sortable">
                  Budget Category
                  {sortField === 'category' && (
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
                <th onClick={() => handleSort('requested_type')} className="sortable">
                  Requested Type
                  {sortField === 'requested_type' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th className="sticky-status">Status</th>
                <th className="sticky-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(request => (
                <tr key={request.request_id}>
                  <td>{formatDate(request.request_date)}</td>
                  <td>{request.department}</td>
                  <td>{request.category}</td>
                  <td>{formatMoney(request.requested_amount)}</td>
                  <td>{request.approved_amount ? formatMoney(request.approved_amount) : '-'}</td>
                  <td>
                    <span className={`chip ${getRequestTypeClass(request.requested_type)}`}>
                      {request.requested_type}
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${getStatusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="actionButtons">
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
                        title="Approve/Reject"
                        disabled={request.status !== 'Pending Approval'}
                      >
                        <i className="ri-check-line" />
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
            setCurrentPage(1); // Reset to first page when page size changes
          }}
        />
      )}

      {/* Modals */}
      {showViewModal && selectedRequest && (
        <ViewBudgetRequest
          request={selectedRequest}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRequest(null);
          }}
        />
      )}

      {showAuditModal && selectedRequestForAudit && (
        <AuditTrailBudgetRequest
          requestId={selectedRequestForAudit.request_id}
          requestTitle={selectedRequestForAudit.title}
          onClose={() => {
            setShowAuditModal(false);
            setSelectedRequestForAudit(null);
          }}
        />
      )}

      {showApprovalModal && selectedRequest && (
        <BudgetApprovalModal
          request={selectedRequest}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedRequest(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </>
  );
}