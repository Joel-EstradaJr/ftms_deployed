"use client";

import React, { useState, useEffect, useMemo } from "react";
import PaginationComponent from "../../../../Components/pagination";
import Loading from "../../../../Components/loading";
import ErrorDisplay from "../../../../Components/errordisplay";
import ExportButton from "../../../../Components/ExportButton";
import { showSuccess, showError, showConfirmation } from "../../../../utils/Alerts";
import { formatDate, formatDateTime, formatMoney } from "../../../../utils/formatting";

// Import existing modal components
import ViewBudgetRequest from "../budgetRequest/viewBudgetRequest";
import AuditTrailBudgetRequest from "../budgetRequest/auditTrailBudgetRequest";
import BudgetApprovalModal from "./BudgetApprovalModal";

// Import styles
import "../../../../styles/budget-management/budgetApproval.css";
import "../../../../styles/components/table.css";


import { SharedApprovalFilters } from "../../../../types/approvals";

interface BudgetRequest {
  request_id: string;
  title: string;
  description: string;
  requested_amount: number;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Closed';
  category: string;
  requested_by: string;
  request_date: string;
  approval_date?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
}

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

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchData = async () => {
      onLoadingChange(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockData: BudgetRequest[] = [
          {
            request_id: 'BR001',
            title: 'New Bus Maintenance Equipment',
            description: 'Purchase of diagnostic equipment for bus maintenance including computerized diagnostic tools and specialized repair equipment for improving service quality.',
            requested_amount: 50000,
            status: 'Pending Approval',
            category: 'Maintenance',
            requested_by: 'John Doe',
            request_date: '2024-03-15',
            created_at: '2024-03-15T10:00:00Z'
          },
          {
            request_id: 'BR002',
            title: 'Driver Training Program',
            description: 'Comprehensive training program for new drivers including safety protocols and customer service training.',
            requested_amount: 25000,
            status: 'Approved',
            category: 'Training',
            requested_by: 'Mike Johnson',
            request_date: '2024-03-10',
            approval_date: '2024-03-12',
            approved_by: 'Finance Director',
            created_at: '2024-03-10T14:30:00Z'
          },
          {
            request_id: 'BR003',
            title: 'Marketing Campaign Materials',
            description: 'Design and production of marketing materials for the new route promotion campaign.',
            requested_amount: 15000,
            status: 'Rejected',
            category: 'Marketing',
            requested_by: 'Sarah Wilson',
            request_date: '2024-03-08',
            rejection_reason: 'Budget already allocated for Q1 marketing activities',
            created_at: '2024-03-08T09:15:00Z'
          },
          {
            request_id: 'BR004',
            title: 'Office Supplies and Stationery',
            description: 'Monthly office supplies including paper, pens, and other stationery items.',
            requested_amount: 8000,
            status: 'Pending Approval',
            category: 'Office Supplies',
            requested_by: 'Anna Garcia',
            request_date: '2024-03-12',
            created_at: '2024-03-12T11:20:00Z'
          },
          {
            request_id: 'BR005',
            title: 'IT Equipment Upgrade',
            description: 'Upgrade of computer systems and networking equipment for improved performance.',
            requested_amount: 75000,
            status: 'Approved',
            category: 'IT',
            requested_by: 'Carlos Rodriguez',
            request_date: '2024-03-05',
            approval_date: '2024-03-07',
            approved_by: 'IT Director',
            created_at: '2024-03-05T14:45:00Z'
          },
          {
            request_id: 'BR006',
            title: 'Employee Wellness Program',
            description: 'Implementation of employee wellness initiatives including gym memberships and health screenings.',
            requested_amount: 30000,
            status: 'Pending Approval',
            category: 'HR',
            requested_by: 'Maria Lopez',
            request_date: '2024-03-18',
            created_at: '2024-03-18T09:30:00Z'
          },
          {
            request_id: 'BR007',
            title: 'Security System Enhancement',
            description: 'Installation of additional security cameras and access control systems.',
            requested_amount: 45000,
            status: 'Rejected',
            category: 'Security',
            requested_by: 'David Chen',
            request_date: '2024-03-01',
            rejection_reason: 'Security budget already committed for the year',
            created_at: '2024-03-01T16:15:00Z'
          },
          {
            request_id: 'BR008',
            title: 'Vehicle Fuel Efficiency Program',
            description: 'Implementation of fuel efficiency monitoring and driver training program.',
            requested_amount: 20000,
            status: 'Approved',
            category: 'Operations',
            requested_by: 'Elena Martinez',
            request_date: '2024-02-28',
            approval_date: '2024-03-02',
            approved_by: 'Operations Manager',
            created_at: '2024-02-28T13:40:00Z'
          },
          {
            request_id: 'BR009',
            title: 'Customer Service Training',
            description: 'Advanced customer service training for all front-line staff.',
            requested_amount: 15000,
            status: 'Pending Approval',
            category: 'Training',
            requested_by: 'Robert Kim',
            request_date: '2024-03-20',
            created_at: '2024-03-20T10:00:00Z'
          },
          {
            request_id: 'BR010',
            title: 'Facility Maintenance Contract',
            description: 'Annual contract for facility maintenance and cleaning services.',
            requested_amount: 60000,
            status: 'Approved',
            category: 'Facilities',
            requested_by: 'Lisa Wong',
            request_date: '2024-02-25',
            approval_date: '2024-02-27',
            approved_by: 'Facilities Manager',
            created_at: '2024-02-25T12:30:00Z'
          },
          {
            request_id: 'BR011',
            title: 'Software License Renewal',
            description: 'Annual renewal of software licenses for accounting and management systems.',
            requested_amount: 25000,
            status: 'Pending Approval',
            category: 'IT',
            requested_by: 'James Park',
            request_date: '2024-03-22',
            created_at: '2024-03-22T15:20:00Z'
          },
          {
            request_id: 'BR012',
            title: 'Emergency Response Equipment',
            description: 'Purchase of first aid kits, defibrillators, and emergency response equipment.',
            requested_amount: 35000,
            status: 'Approved',
            category: 'Safety',
            requested_by: 'Sarah Johnson',
            request_date: '2024-02-20',
            approval_date: '2024-02-22',
            approved_by: 'Safety Officer',
            created_at: '2024-02-20T11:10:00Z'
          }
        ];

        setData(mockData);
        onError(null);
      } catch (err) {
        onError('Failed to load budget requests');
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

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.request_id.toLowerCase().includes(searchLower) ||
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.requested_by.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower)
      );
    }

    // Status filter from shared filters
    if (filters.status?.length) {
      result = result.filter(item => {
        const statusMap: { [key: string]: string } = {
          'pending': 'Pending Approval',
          'approved': 'Approved',
          'rejected': 'Rejected',
          'completed': 'Closed'
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

  // Handle approve from modal
  const handleApprove = (request: BudgetRequest) => {
    setData(prevData =>
      prevData.map(item =>
        item.request_id === request.request_id
          ? {
              ...item,
              status: 'Approved' as const,
              approval_date: new Date().toISOString().split('T')[0],
              approved_by: 'Current User'
            }
          : item
      )
    );
  };

  // Handle reject from modal
  const handleReject = (request: BudgetRequest, reason: string) => {
    setData(prevData =>
      prevData.map(item =>
        item.request_id === request.request_id
          ? {
              ...item,
              status: 'Rejected' as const,
              rejection_reason: reason
            }
          : item
      )
    );
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
                <th onClick={() => handleSort('title')} className="sortable">
                  Title
                  {sortField === 'title' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('category')} className="sortable">
                  Category
                  {sortField === 'category' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('requested_amount')} className="sortable">
                  Amount
                  {sortField === 'requested_amount' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th>Status</th>
                <th onClick={() => handleSort('requested_by')} className="sortable">
                  Requested By
                  {sortField === 'requested_by' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(request => (
                <tr key={request.request_id} onClick={() => handleView(request)} title="View Details">
                  <td>{formatDate(request.request_date)}</td>
                  <td>{request.title}</td>
                  <td>{request.category}</td>
                  <td>{formatMoney(request.requested_amount)}</td>
                  <td>
                    <span className={`chip ${getStatusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td>{request.requested_by}</td>
                  <td className="actionButtons">
                    <div className="actionButtonsContainer">
                      <button
                        className="auditBtn"
                        onClick={() => handleAuditTrail(request)}
                        title="Audit Trail"
                      >
                        <i className="ri-history-line" />
                      </button>
                      {request.status === 'Pending Approval' && (
                        <button
                          className="approveBtn"
                          onClick={() => handleApprovalAction(request)}
                          title="Approve/Reject"
                        >
                          <i className="ri-check-line" />
                        </button>
                      )}
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