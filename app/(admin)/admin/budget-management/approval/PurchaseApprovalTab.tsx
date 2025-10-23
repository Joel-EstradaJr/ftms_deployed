"use client";

import React, { useState, useEffect, useMemo } from "react";
import PaginationComponent from "../../../../Components/pagination";
import Loading from "../../../../Components/loading";
import ErrorDisplay from "../../../../Components/errordisplay";
import { showConfirmation, showSuccess, showError } from "../../../../utils/Alerts";

// Import types for purchase request approval
import {
  ApprovalStatus,
  RequestPriority,
  Department,
  ApprovalAction,
  RollbackAction,
  RefundAction,
  ApprovalFilters
} from "../../../../types/purchaseRequestApproval";
import type { PurchaseRequestApproval } from "../../../../types/purchaseRequestApproval";

// Import existing modal components
import ViewPurchaseRequest from "../../budget-management/purchase-request-approval/viewPurchaseRequest";
import AuditTrailPurchaseRequest from "../../budget-management/purchase-request-approval/auditTrailPurchaseRequest";
import ApprovalModal from "../../budget-management/purchase-request-approval/approvalModal";
import RejectionModal from "../../budget-management/purchase-request-approval/rejectionModal";
import ProcessRefundModal from "../../budget-management/purchase-request-approval/processRefundModal";
import TrackStatusPurchaseRequest from "../../budget-management/purchase-request-approval/trackStatusPurchaseRequest";
import PurchaseApprovalModal from "./PurchaseApprovalModal";

// Import styles
import "../../../../styles/purchase-approval/purchase-approval.css";

import { SharedApprovalFilters } from "../../../../types/approvals";

interface PurchaseApprovalTabProps {
  filters: SharedApprovalFilters;
  searchTerm: string;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: string | null) => void;
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
}

export default function PurchaseApprovalTab({
  filters,
  searchTerm,
  loading,
  onLoadingChange,
  onError,
  onExport
}: PurchaseApprovalTabProps) {
  const [data, setData] = useState<PurchaseRequestApproval[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequestApproval | null>(null);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchData = async () => {
      onLoadingChange(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockData: PurchaseRequestApproval[] = [
          {
            id: "1",
            request_id: "PR-2024-001",
            title: "Vehicle Maintenance Supplies",
            department: Department.OPERATIONS,
            requester_name: "Juan Dela Cruz",
            requester_position: "Fleet Supervisor",
            supplier_name: "AutoParts Inc.",
            total_amount: 25000.00,
            request_date: "2024-01-15",
            status: ApprovalStatus.PENDING_APPROVAL,
            priority: RequestPriority.URGENT,
            submitted_by: "Juan Dela Cruz",
            submitted_date: "2024-01-15",
            items: [
              {
                item_name: "Brake Pads",
                quantity: 10,
                unit_measure: "sets",
                unit_cost: 1500.00,
                total_cost: 15000.00,
                supplier: "AutoParts Inc.",
                category: "Maintenance"
              },
              {
                item_name: "Engine Oil",
                quantity: 20,
                unit_measure: "liters",
                unit_cost: 500.00,
                total_cost: 10000.00,
                supplier: "AutoParts Inc.",
                category: "Maintenance"
              }
            ],
            purpose: "Regular maintenance for bus fleet",
            justification: "Critical maintenance items needed to ensure fleet safety and reliability",
            created_at: "2024-01-15T08:00:00Z",
            created_by: "Juan Dela Cruz",
            is_deleted: false
          },
          {
            id: "2",
            request_id: "PR-2024-002",
            title: "Office Equipment Upgrade",
            department: Department.ACCOUNTING,
            requester_name: "Maria Santos",
            requester_position: "Admin Manager",
            supplier_name: "TechMax Supply",
            total_amount: 45000.00,
            request_date: "2024-01-20",
            status: ApprovalStatus.APPROVED,
            priority: RequestPriority.NORMAL,
            submitted_by: "Maria Santos",
            submitted_date: "2024-01-20",
            approved_by: "Finance Director",
            approved_date: "2024-01-22",
            items: [
              {
                item_name: "Laptops",
                quantity: 5,
                unit_measure: "units",
                unit_cost: 25000.00,
                total_cost: 125000.00,
                supplier: "TechMax Supply",
                category: "Equipment"
              }
            ],
            purpose: "Upgrade office equipment for better productivity",
            justification: "Current equipment is outdated and affecting work efficiency",
            created_at: "2024-01-20T10:30:00Z",
            created_by: "Maria Santos",
            is_deleted: false
          },
          {
            id: "3",
            request_id: "PR-2024-003",
            title: "Safety Equipment",
            department: Department.HR,
            requester_name: "Ana Reyes",
            requester_position: "HR Manager",
            supplier_name: "SafetyFirst Corp",
            total_amount: 35000.00,
            request_date: "2024-01-25",
            status: ApprovalStatus.REJECTED,
            priority: RequestPriority.URGENT,
            submitted_by: "Ana Reyes",
            submitted_date: "2024-01-25",
            rejected_by: "Finance Manager",
            rejected_date: "2024-01-26",
            rejection_reason: "Budget allocation exceeded for safety equipment this quarter",
            items: [
              {
                item_name: "Fire Extinguishers",
                quantity: 20,
                unit_measure: "units",
                unit_cost: 1750.00,
                total_cost: 35000.00,
                supplier: "SafetyFirst Corp",
                category: "Safety"
              }
            ],
            purpose: "Essential safety equipment for all departments",
            justification: "Compliance with safety regulations and employee protection",
            created_at: "2024-01-25T14:00:00Z",
            created_by: "Ana Reyes",
            is_deleted: false
          },
          {
            id: "4",
            request_id: "PR-2024-004",
            title: "IT Software Licenses",
            department: Department.ACCOUNTING,
            requester_name: "Carlos Mendoza",
            requester_position: "IT Manager",
            supplier_name: "Software Solutions Ltd",
            total_amount: 75000.00,
            request_date: "2024-02-01",
            status: ApprovalStatus.PENDING_APPROVAL,
            priority: RequestPriority.NORMAL,
            submitted_by: "Carlos Mendoza",
            submitted_date: "2024-02-01",
            items: [
              {
                item_name: "Microsoft Office Licenses",
                quantity: 50,
                unit_measure: "licenses",
                unit_cost: 1500.00,
                total_cost: 75000.00,
                supplier: "Software Solutions Ltd",
                category: "Software"
              }
            ],
            purpose: "Annual software license renewal",
            justification: "Required for daily operations and productivity",
            created_at: "2024-02-01T09:00:00Z",
            created_by: "Carlos Mendoza",
            is_deleted: false
          },
          {
            id: "5",
            request_id: "PR-2024-005",
            title: "Facility Cleaning Supplies",
            department: Department.OPERATIONS,
            requester_name: "Rosa Garcia",
            requester_position: "Facilities Manager",
            supplier_name: "CleanCorp Supplies",
            total_amount: 15000.00,
            request_date: "2024-02-05",
            status: ApprovalStatus.APPROVED,
            priority: RequestPriority.NORMAL,
            submitted_by: "Rosa Garcia",
            submitted_date: "2024-02-05",
            approved_by: "Operations Director",
            approved_date: "2024-02-07",
            items: [
              {
                item_name: "Cleaning Supplies",
                quantity: 100,
                unit_measure: "kits",
                unit_cost: 150.00,
                total_cost: 15000.00,
                supplier: "CleanCorp Supplies",
                category: "Facilities"
              }
            ],
            purpose: "Monthly cleaning supplies for all facilities",
            justification: "Maintaining clean and hygienic work environment",
            created_at: "2024-02-05T11:30:00Z",
            created_by: "Rosa Garcia",
            is_deleted: false
          },
          {
            id: "6",
            request_id: "PR-2024-006",
            title: "Training Materials",
            department: Department.HR,
            requester_name: "Luis Torres",
            requester_position: "HR Coordinator",
            supplier_name: "EduMaterials Inc",
            total_amount: 25000.00,
            request_date: "2024-02-10",
            status: ApprovalStatus.PENDING_APPROVAL,
            priority: RequestPriority.NORMAL,
            submitted_by: "Luis Torres",
            submitted_date: "2024-02-10",
            items: [
              {
                item_name: "Training Manuals",
                quantity: 200,
                unit_measure: "sets",
                unit_cost: 125.00,
                total_cost: 25000.00,
                supplier: "EduMaterials Inc",
                category: "Training"
              }
            ],
            purpose: "Employee training and development materials",
            justification: "Supporting continuous learning and skill development",
            created_at: "2024-02-10T13:15:00Z",
            created_by: "Luis Torres",
            is_deleted: false
          },
          {
            id: "7",
            request_id: "PR-2024-007",
            title: "Vehicle Fuel Cards",
            department: Department.OPERATIONS,
            requester_name: "Pedro Santos",
            requester_position: "Fleet Manager",
            supplier_name: "FuelCard Services",
            total_amount: 30000.00,
            request_date: "2024-02-15",
            status: ApprovalStatus.REJECTED,
            priority: RequestPriority.URGENT,
            submitted_by: "Pedro Santos",
            submitted_date: "2024-02-15",
            rejected_by: "Finance Manager",
            rejected_date: "2024-02-16",
            rejection_reason: "Alternative fuel management solution already in place",
            items: [
              {
                item_name: "Fuel Cards",
                quantity: 25,
                unit_measure: "cards",
                unit_cost: 1200.00,
                total_cost: 30000.00,
                supplier: "FuelCard Services",
                category: "Fuel"
              }
            ],
            purpose: "Fuel management for company vehicles",
            justification: "Streamlining fuel expenses and tracking",
            created_at: "2024-02-15T10:45:00Z",
            created_by: "Pedro Santos",
            is_deleted: false
          },
          {
            id: "8",
            request_id: "PR-2024-008",
            title: "Marketing Materials",
            department: Department.OPERATIONS,
            requester_name: "Sofia Cruz",
            requester_position: "Marketing Manager",
            supplier_name: "PrintPro Services",
            total_amount: 40000.00,
            request_date: "2024-02-20",
            status: ApprovalStatus.APPROVED,
            priority: RequestPriority.NORMAL,
            submitted_by: "Sofia Cruz",
            submitted_date: "2024-02-20",
            approved_by: "Marketing Director",
            approved_date: "2024-02-22",
            items: [
              {
                item_name: "Promotional Materials",
                quantity: 5000,
                unit_measure: "pieces",
                unit_cost: 8.00,
                total_cost: 40000.00,
                supplier: "PrintPro Services",
                category: "Marketing"
              }
            ],
            purpose: "Promotional materials for new service launch",
            justification: "Supporting marketing campaigns and customer acquisition",
            created_at: "2024-02-20T14:20:00Z",
            created_by: "Sofia Cruz",
            is_deleted: false
          },
          {
            id: "9",
            request_id: "PR-2024-009",
            title: "Security System Upgrade",
            department: Department.OPERATIONS,
            requester_name: "Miguel Reyes",
            requester_position: "Security Chief",
            supplier_name: "SecureTech Systems",
            total_amount: 85000.00,
            request_date: "2024-02-25",
            status: ApprovalStatus.PENDING_APPROVAL,
            priority: RequestPriority.URGENT,
            submitted_by: "Miguel Reyes",
            submitted_date: "2024-02-25",
            items: [
              {
                item_name: "Security Cameras",
                quantity: 30,
                unit_measure: "units",
                unit_cost: 2833.33,
                total_cost: 85000.00,
                supplier: "SecureTech Systems",
                category: "Security"
              }
            ],
            purpose: "Enhanced security monitoring system",
            justification: "Improving facility security and surveillance",
            created_at: "2024-02-25T16:00:00Z",
            created_by: "Miguel Reyes",
            is_deleted: false
          },
          {
            id: "10",
            request_id: "PR-2024-010",
            title: "Office Furniture",
            department: Department.ACCOUNTING,
            requester_name: "Elena Morales",
            requester_position: "Admin Assistant",
            supplier_name: "OfficeFurnish Co",
            total_amount: 55000.00,
            request_date: "2024-03-01",
            status: ApprovalStatus.APPROVED,
            priority: RequestPriority.NORMAL,
            submitted_by: "Elena Morales",
            submitted_date: "2024-03-01",
            approved_by: "Facilities Manager",
            approved_date: "2024-03-03",
            items: [
              {
                item_name: "Office Desks",
                quantity: 25,
                unit_measure: "units",
                unit_cost: 2200.00,
                total_cost: 55000.00,
                supplier: "OfficeFurnish Co",
                category: "Furniture"
              }
            ],
            purpose: "New office furniture for expanded workspace",
            justification: "Accommodating growing team and improving workspace ergonomics",
            created_at: "2024-03-01T09:30:00Z",
            created_by: "Elena Morales",
            is_deleted: false
          },
          {
            id: "11",
            request_id: "PR-2024-011",
            title: "Medical Supplies",
            department: Department.HR,
            requester_name: "Dr. Ana Lopez",
            requester_position: "Company Nurse",
            supplier_name: "MediSupply Corp",
            total_amount: 20000.00,
            request_date: "2024-03-05",
            status: ApprovalStatus.PENDING_APPROVAL,
            priority: RequestPriority.URGENT,
            submitted_by: "Dr. Ana Lopez",
            submitted_date: "2024-03-05",
            items: [
              {
                item_name: "First Aid Kits",
                quantity: 50,
                unit_measure: "kits",
                unit_cost: 400.00,
                total_cost: 20000.00,
                supplier: "MediSupply Corp",
                category: "Medical"
              }
            ],
            purpose: "Emergency medical supplies for all locations",
            justification: "Ensuring employee health and safety preparedness",
            created_at: "2024-03-05T11:00:00Z",
            created_by: "Dr. Ana Lopez",
            is_deleted: false
          },
          {
            id: "12",
            request_id: "PR-2024-012",
            title: "Network Equipment",
            department: Department.ACCOUNTING,
            requester_name: "Roberto Diaz",
            requester_position: "Network Administrator",
            supplier_name: "NetTech Solutions",
            total_amount: 65000.00,
            request_date: "2024-03-10",
            status: ApprovalStatus.REJECTED,
            priority: RequestPriority.URGENT,
            submitted_by: "Roberto Diaz",
            submitted_date: "2024-03-10",
            rejected_by: "IT Director",
            rejected_date: "2024-03-11",
            rejection_reason: "Network upgrade scheduled for next quarter",
            items: [
              {
                item_name: "Network Switches",
                quantity: 10,
                unit_measure: "units",
                unit_cost: 6500.00,
                total_cost: 65000.00,
                supplier: "NetTech Solutions",
                category: "Networking"
              }
            ],
            purpose: "Network infrastructure upgrade",
            justification: "Improving network performance and reliability",
            created_at: "2024-03-10T15:45:00Z",
            created_by: "Roberto Diaz",
            is_deleted: false
          }
        ];

        setData(mockData);
        onError(null);
      } catch (err) {
        onError('Failed to load purchase requests');
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
        item.requester_name.toLowerCase().includes(searchLower) ||
        item.supplier_name.toLowerCase().includes(searchLower) ||
        item.department.toLowerCase().includes(searchLower) ||
        item.total_amount.toString().includes(searchLower)
      );
    }

    // Status filter from shared filters
    if (filters.status?.length) {
      result = result.filter(item => {
        const statusMap: { [key: string]: ApprovalStatus } = {
          'pending': ApprovalStatus.PENDING_APPROVAL,
          'approved': ApprovalStatus.APPROVED,
          'rejected': ApprovalStatus.REJECTED,
          'completed': ApprovalStatus.COMPLETED
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

    return result;
  }, [data, filters, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Modal handlers
  const openViewModal = (request: PurchaseRequestApproval) => {
    setSelectedRequest(request);
    setShowViewModal(true);
  };

  const openAuditModal = (request: PurchaseRequestApproval) => {
    setSelectedRequest(request);
    setShowAuditModal(true);
  };

  const openTrackModal = (request: PurchaseRequestApproval) => {
    setSelectedRequest(request);
    setShowTrackModal(true);
  };

  const openApproveModal = (request: PurchaseRequestApproval) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const openRejectModal = (request: PurchaseRequestApproval) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const closeAllModals = () => {
    setShowViewModal(false);
    setShowAuditModal(false);
    setShowTrackModal(false);
    setShowApproveModal(false);
    setShowRejectModal(false);
    setShowApprovalModal(false);
    setSelectedRequest(null);
  };

  // Action handlers
  const handleApprove = (request: PurchaseRequestApproval) => {
    setData(prevData =>
      prevData.map(item =>
        item.id === request.id
          ? {
              ...item,
              status: ApprovalStatus.APPROVED,
              approved_by: "Current User",
              approved_date: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString(),
              updated_by: "Current User"
            }
          : item
      )
    );
  };

  const handleReject = (request: PurchaseRequestApproval, reason: string) => {
    setData(prevData =>
      prevData.map(item =>
        item.id === request.id
          ? {
              ...item,
              status: ApprovalStatus.REJECTED,
              rejected_by: "Current User",
              rejected_date: new Date().toISOString().split('T')[0],
              rejection_reason: reason,
              updated_at: new Date().toISOString(),
              updated_by: "Current User"
            }
          : item
      )
    );
  };

  const handleApproveRequest = async (comments?: string) => {
    if (!selectedRequest) return;

    try {
      handleApprove(selectedRequest);
      showSuccess("Purchase request approved successfully", "Approved");
      closeAllModals();
    } catch (error) {
      showError("Failed to approve purchase request", "Error");
    }
  };

  const handleRejectRequest = async (reason: string) => {
    if (!selectedRequest) return;

    try {
      handleReject(selectedRequest, reason);
      showSuccess("Purchase request rejected successfully", "Rejected");
      closeAllModals();
    } catch (error) {
      showError("Failed to reject purchase request", "Error");
    }
  };

  const handleView = (request: PurchaseRequestApproval) => {
    openViewModal(request);
  };

  const handleAuditTrail = (request: PurchaseRequestApproval) => {
    openAuditModal(request);
  };

  const handleTrackStatus = (request: PurchaseRequestApproval) => {
    openTrackModal(request);
  };

  // Utility functions
  const formatDepartment = (dept: Department) => {
    return dept.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPriority = (priority: RequestPriority) => {
    return priority === RequestPriority.URGENT ? 'High' : 'Normal';
  };

  const getStatusClass = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED: return 'approved';
      case ApprovalStatus.REJECTED: return 'rejected';
      case ApprovalStatus.PENDING_APPROVAL: return 'pending-approval';
      case ApprovalStatus.COMPLETED: return 'completed';
      default: return 'pending';
    }
  };

  const formatStatus = (status: ApprovalStatus) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (paginatedData.length === 0 && !loading) {
    return (
      <div className="tab-empty">
        <div className="tab-empty-icon">🛒</div>
        <h3 className="tab-empty-title">No Purchase Requests Found</h3>
        <p className="tab-empty-description">
          {searchTerm || Object.keys(filters).length > 0
            ? "No purchase requests match your current filters."
            : "There are no purchase requests to approve at this time."}
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
                <th>Title</th>
                <th>Department</th>
                <th>Requester</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(request => (
                <tr key={request.id} onClick={() => openApproveModal(request)} title="Approve">
                  <td>{request.title}</td>
                  <td>{formatDepartment(request.department)}</td>
                  <td>{request.requester_name}</td>
                  <td>{request.supplier_name}</td>
                  <td>₱{request.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{new Date(request.request_date).toLocaleDateString()}</td>
                  <td className="table-status">
                    <span className={`chip ${getStatusClass(request.status)}`}>
                      {formatStatus(request.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${request.priority === RequestPriority.URGENT ? 'urgent' : 'normal'}`}>
                      {formatPriority(request.priority)}
                    </span>
                  </td>
                  <td className="actionButtons">
                    <div className="actionButtonsContainer">
                      <button
                        className="auditBtn"
                        onClick={() => handleAuditTrail(request)}
                        title="Audit Trail"
                      >
                        <i className="ri-history-line" />
                      </button>
                      <button
                        className="auditBtn"
                        onClick={() => handleTrackStatus(request)}
                        title="Track Status"
                      >
                        <i className="ri-route-line" />
                      </button>
                      {request.status === ApprovalStatus.PENDING_APPROVAL && (
                        <>
                          <button
                            className="approveBtn"
                            onClick={() => openApproveModal(request)}
                            title="Approve"
                          >
                            <i className="ri-check-line" />
                          </button>
                          <button
                            className="rejectBtn"
                            onClick={() => openRejectModal(request)}
                            title="Reject"
                          >
                            <i className="ri-close-line" />
                          </button>
                        </>
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
        <ViewPurchaseRequest
          purchaseRequest={selectedRequest}
          onClose={closeAllModals}
        />
      )}

      {showAuditModal && selectedRequest && (
        <AuditTrailPurchaseRequest
          requestId={selectedRequest.request_id}
          requestTitle={selectedRequest.title}
          onClose={closeAllModals}
        />
      )}

      {showTrackModal && selectedRequest && (
        <TrackStatusPurchaseRequest
          requestId={selectedRequest.request_id}
          requestTitle={selectedRequest.title}
          onClose={closeAllModals}
        />
      )}

      {showApproveModal && selectedRequest && (
        <ApprovalModal
          request={{
            request_id: selectedRequest.request_id,
            title: selectedRequest.title,
            requester_name: selectedRequest.requester_name,
            total_amount: selectedRequest.total_amount,
            department: formatDepartment(selectedRequest.department)
          }}
          onApprove={handleApproveRequest}
          onClose={closeAllModals}
        />
      )}

      {showRejectModal && selectedRequest && (
        <RejectionModal
          request={{
            request_id: selectedRequest.request_id,
            title: selectedRequest.title,
            requester_name: selectedRequest.requester_name,
            total_amount: selectedRequest.total_amount,
            department: formatDepartment(selectedRequest.department)
          }}
          onReject={handleRejectRequest}
          onClose={closeAllModals}
        />
      )}

      {/* Legacy modal - can be removed once all modals are properly integrated */}
      {showApprovalModal && selectedRequest && (
        <PurchaseApprovalModal
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