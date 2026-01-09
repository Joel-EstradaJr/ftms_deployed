'use client';

import React from 'react';
import "../../../../styles/budget-management/viewBudgetRequest.css";
import { formatDate, formatDateTime } from '../../../../utils/formatting';
import ModalHeader from '../../../../Components/ModalHeader';
import ItemTableModal, { ItemField } from '../../../../Components/ItemTableModal';

// Types - using the same as your existing BudgetRequest interface
export interface BudgetItem {
  item_name: string;
  quantity: number;
  unit_measure: string;
  unit_cost: number;
  supplier: string;
  subtotal: number;
}

export interface BudgetRequest {
  request_id: string;
  title: string;
  description: string;
  requested_amount: number;
  approved_amount?: number;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Closed' | 'APPROVED' | 'REJECTED';
  category: string;
  requested_by: string;
  request_date: string;
  department: string;
  requested_type: 'Emergency' | 'Urgent' | 'Regular' | 'Project-Based';
  approval_date?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  // Extended fields that would come from your database
  requester_position?: string;
  budget_period?: string;
  start_date?: string;
  end_date?: string;
  items?: BudgetItem[];
  supporting_documents?: File[] | string[]; // Could be File objects or file URLs
  // Additional fields for comprehensive display
  request_code?: string;
  department_name?: string;
  department_id?: string;
  requested_for?: string;
  request_type?: string;
  pr_reference_code?: string;
  purpose?: string;
  remarks?: string;
  total_amount?: number;
  approved_at?: string;
  rejected_at?: string;
  rejected_by?: string;
}

interface ViewBudgetRequestProps {
  request: BudgetRequest;
  onClose: () => void;
  onEdit?: (request: BudgetRequest) => void;
  onExport?: (request: BudgetRequest) => void;
  showActions?: boolean;
}

const ViewBudgetRequest: React.FC<ViewBudgetRequestProps> = ({ 
  request, 
  onClose, 
  onEdit, 
  onExport,
  showActions = true 
}) => {
  // Helper to convert BudgetItem[] to ItemField[]
  const mapItemsToTableFormat = (items?: BudgetItem[]): ItemField[] => {
    if (!items || items.length === 0) return [];
    return items.map(item => ({
      item_name: item.item_name,
      quantity: item.quantity,
      unit_measure: item.unit_measure,
      unit_price: item.unit_cost,
      supplier_name: item.supplier,
      subtotal: item.subtotal
    }));
  };
  
  // Status badge component (reuse from your main page)
  const StatusBadge = ({ status }: { status: string }) => {
    const getStatusClass = (status: string) => {
      const normalizedStatus = status.toLowerCase();
      if (normalizedStatus === 'draft') return 'Draft';
      if (normalizedStatus === 'pending approval' || normalizedStatus === 'pending') return 'pending-approval';
      if (normalizedStatus === 'approved') return 'Approved';
      if (normalizedStatus === 'rejected') return 'Rejected';
      if (normalizedStatus === 'closed') return 'Closed';
      return 'Draft';
    };

    return (
      <span className={`chip ${getStatusClass(status)}`}>
        {status}
      </span>
    );
  };

  // Calculate total from items if available
  const calculateItemsTotal = () => {
    if (!request.items || request.items.length === 0) return 0;
    return request.items.reduce((total, item) => total + item.subtotal, 0);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file download (placeholder)
  const handleFileDownload = (file: File | string, index: number) => {
    console.log('Download file:', file);
    // Implement actual download logic here
  };

  // Generate action history based on request status
  const getActionHistory = () => {
    const history = [
      {
        action: 'Request Created',
        user: request.requested_by,
        date: request.created_at,
        details: `Created as ${request.status}`
      }
    ];

    if ((request.status === 'Approved' || request.status === 'APPROVED') && (request.approval_date || request.approved_at) && request.approved_by) {
      history.push({
        action: 'Request Approved',
        user: request.approved_by,
        date: request.approval_date || request.approved_at || '',
        details: 'Budget request approved and funds allocated'
      });
    }

    if ((request.status === 'Rejected' || request.status === 'REJECTED') && (request.approved_by || request.rejected_by)) {
      history.push({
        action: 'Request Rejected',
        user: request.rejected_by || request.approved_by || '',
        date: request.rejected_at || request.approval_date || request.updated_at || '',
        details: request.rejection_reason || 'No reason provided'
      });
    }

    if (request.status === 'Closed') {
      history.push({
        action: 'Request Closed',
        user: request.approved_by || 'System',
        date: request.updated_at || '',
        details: 'Budget request completed and closed'
      });
    }

    return history;
  };

  return (
    <div className="modalOverlay">
      <div className="viewBudgetRequestModal">
        {/* Use ModalHeader component with custom content */}
        <div className="modalHeader">
          <div className="header-left">
            <h1>Budget Request Details</h1>
            <div className="statusBadgeHeader">
              <span className="statusLabel">Status:</span>
              <StatusBadge status={request.status} />
            </div>

            <div className="header-right">
                <button type="button" className="closeButton" onClick={onClose}>
                    <i className="ri-close-line"></i>
                </button>
            </div>
          </div>
          
          
        </div>

        <div className="modalContent">
          <div className="displayInputs">
            
            {/* Request Information Section */}
            <div className="sectionHeader">Request Information</div>
            
            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Request Code</label>
                <div className="displayValue highlightValue">{request.request_code || request.request_id}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Date of Request</label>
                <div className="displayValue">{formatDate(request.request_date)}</div>
              </div>
            </div>

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Department</label>
                <div className="displayValue">{request.department_name || request.department_id || request.department || 'Operations'}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Requested For</label>
                <div className="displayValue">{request.requested_for || request.requested_by}</div>
              </div>
            </div>

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Request Type</label>
                <div className="displayValue">{request.request_type || request.requested_type || request.category}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>PR Reference Code</label>
                <div className="displayValue">{request.pr_reference_code || <span className="displayValueEmpty">Not linked to PR</span>}</div>
              </div>
            </div>

            {/* Budget Details Section */}
            <div className="sectionHeader">Budget Details</div>
            
            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Budget Period</label>
                <div className="displayValue">{request.budget_period || 'One Time Use'}</div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>Total Amount</label>
                <div className="displayValue highlightValue">
                  ₱{(request.total_amount || request.requested_amount).toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>
            </div>

            <div className="displayField">
              <label>Budget Title / Project Name</label>
              <div className="displayValue highlightValue">{request.title}</div>
            </div>

            <div className="displayField">
              <label>Purpose</label>
              <div className="displayValue displayValueTextarea">{request.purpose || request.description}</div>
            </div>

            {request.remarks && (
              <div className="displayField">
                <label>Remarks</label>
                <div className="displayValue displayValueTextarea">{request.remarks}</div>
              </div>
            )}

            <div className="displayRow">
              <div className="displayField displayFieldHalf">
                <label>Start Date</label>
                <div className="displayValue">
                  {request.start_date ? formatDate(request.start_date) : 
                   <span className="displayValueEmpty">Not specified</span>}
                </div>
              </div>
              
              <div className="displayField displayFieldHalf">
                <label>End Date</label>
                <div className="displayValue">
                  {request.end_date ? formatDate(request.end_date) : 
                   <span className="displayValueEmpty">Not specified</span>}
                </div>
              </div>
            </div>

            {/* Items Section */}
            {request.items && request.items.length > 0 && (
              <div className="itemsDisplaySection">
                <div className="sectionHeader">Budget Items ({request.items.length})</div>
                <ItemTableModal
                  isOpen={true}
                  onClose={() => {}}
                  mode="view"
                  title="Budget Items"
                  items={mapItemsToTableFormat(request.items)}
                  isLinkedToPurchaseRequest={!!request.pr_reference_code}
                  embedded={true}
                />
              </div>
            )}

            {/* Supporting Documents Section */}
            <div className="sectionHeader">Supporting Documents</div>
            
            <div className="fileDisplaySection">
              {request.supporting_documents && request.supporting_documents.length > 0 ? (
                <div className="fileDisplayList">
                  {request.supporting_documents.map((file, index) => (
                    <div key={index} className="fileDisplayItem">
                      <div>
                        <div className="fileDisplayName">
                          {typeof file === 'string' ? file : file.name}
                        </div>
                        {typeof file !== 'string' && (
                          <div className="fileDisplaySize">{formatFileSize(file.size)}</div>
                        )}
                      </div>
                      <button
                        className="downloadFileBtn"
                        onClick={() => handleFileDownload(file, index)}
                        title="Download File"
                      >
                        <i className="ri-download-line" /> Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="fileDisplayIcon">
                    <i className="ri-file-line" />
                  </div>
                  <div className="noFilesMessage">No supporting documents attached</div>
                </>
              )}
            </div>

            {/* Approval Information */}
            {(request.status === 'Approved' || request.status === 'Rejected') && (
              <>
                <div className="sectionHeader">Approval Information</div>
                <div className="displayRow">
                  <div className="displayField displayFieldHalf">
                    <label>{request.status === 'Approved' ? 'Approved By' : 'Rejected By'}</label>
                    <div className="displayValue">{request.approved_by || 'Not specified'}</div>
                  </div>
                  
                  <div className="displayField displayFieldHalf">
                    <label>{request.status === 'Approved' ? 'Approval Date' : 'Rejection Date'}</label>
                    <div className="displayValue">
                      {request.approval_date ? formatDate(request.approval_date) : 
                       <span className="displayValueEmpty">Not specified</span>}
                    </div>
                  </div>
                </div>

                {request.status === 'Rejected' && request.rejection_reason && (
                  <div className="displayField">
                    <label>Rejection Reason</label>
                    <div className="displayValue displayValueTextarea">{request.rejection_reason}</div>
                  </div>
                )}
              </>
            )}

            {/* Action History */}
            <div className="actionHistorySection">
              <div className="actionHistoryHeader">
                <h3>Action History</h3>
              </div>
              {getActionHistory().map((action, index) => (
                <div key={index} className="actionHistoryItem">
                  <div className="actionHistoryDetails">
                    <div className="actionHistoryAction">{action.action}</div>
                    <div className="actionHistoryMeta">
                      by {action.user} - {action.details}
                    </div>
                  </div>
                  <div className="actionHistoryDate">
                    {formatDateTime(action.date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="modalButtons">
            {onExport && (
              <button className="exportButton" onClick={() => onExport(request)}>
                <i className="ri-download-line" /> Export
              </button>
            )}
            {onEdit && request.status === 'Draft' && (
              <button className="editButton" onClick={() => onEdit(request)}>
                <i className="ri-edit-line" /> Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewBudgetRequest;