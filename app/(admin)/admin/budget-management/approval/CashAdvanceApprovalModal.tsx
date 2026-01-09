'use client';

import React, { useState, useEffect } from 'react';
import { formatMoney, formatDate } from '../../../../utils/formatting';
import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';
import '../../../../styles/components/modal2.css';
import '../../../../styles/components/forms.css';
import '../../../../styles/components/chips.css';

import { CashAdvanceRequest } from './ViewCashAdvanceModal';

interface CashAdvanceApprovalModalProps {
  request: CashAdvanceRequest;
  onClose: () => void;
  onApprove: (request: CashAdvanceRequest, approvedAmount: number) => void;
  onReject: (request: CashAdvanceRequest, reason: string) => void;
}

export default function CashAdvanceApprovalModal({
  request,
  onClose,
  onApprove,
  onReject
}: CashAdvanceApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<number>(request.requested_amount);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAmountWarning, setShowAmountWarning] = useState(false);

  // Check if approved amount exceeds requested amount
  useEffect(() => {
    setShowAmountWarning(approvedAmount > request.requested_amount);
  }, [approvedAmount, request.requested_amount]);

  // Get request type class for chip styling
  const getRequestTypeClass = (type: string) => {
    switch (type) {
      case 'Regular': return 'normal';
      case 'Urgent': return 'urgent';
      case 'Emergency': return 'rejected';
      default: return 'normal';
    }
  };

  // Format contact info for display
  const formatContactInfo = () => {
    const hasPhone = request.contact_number && request.contact_number.trim() !== '';
    const hasEmail = request.email && request.email.trim() !== '';

    if (hasPhone && hasEmail) {
      return `${request.contact_number} | ${request.email}`;
    } else if (hasPhone) {
      return request.contact_number;
    } else if (hasEmail) {
      return request.email;
    } else {
      return 'N/A';
    }
  };

  const handleApprove = async () => {
    if (approvedAmount <= 0) {
      showError("Approved amount must be greater than zero.", "Invalid Amount");
      return;
    }

    const warningText = showAmountWarning 
      ? `<br/><br/><span style="color: #f39c12;">⚠️ Note: Approved amount (${formatMoney(approvedAmount)}) exceeds requested amount (${formatMoney(request.requested_amount)})</span>`
      : '';

    const result = await showConfirmation(
      `Are you sure you want to <b>APPROVE</b> this cash advance request for <b>${formatMoney(approvedAmount)}</b>?${warningText}`,
      "Approve Cash Advance"
    );

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        onApprove(request, approvedAmount);
        showSuccess("Cash advance request has been approved successfully.", "Request Approved");
        onClose();
      } catch (error) {
        showError("Failed to approve cash advance request.", "Approval Failed");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showError("Please provide a reason for rejection.", "Rejection Reason Required");
      return;
    }

    const result = await showConfirmation(
      `Are you sure you want to <b>REJECT</b> this cash advance request from <b>${request.employee_name}</b>?`,
      "Reject Cash Advance"
    );

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        onReject(request, rejectionReason);
        showSuccess("Cash advance request has been rejected.", "Request Rejected");
        onClose();
      } catch (error) {
        showError("Failed to reject cash advance request.", "Rejection Failed");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSubmit = () => {
    if (action === 'approve') {
      handleApprove();
    } else if (action === 'reject') {
      handleReject();
    }
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">
          {action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Review'} Cash Advance Request
        </h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>

        <button className="close-modal-btn view" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

        {!action ? (
            // Initial review screen
            <>
              <p className="details-title">Request Details</p>
              <div className="modal-content view">
                <form className="view-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Request ID</label>
                      <p>{request.request_id}</p>
                    </div>

                    <div className="form-group">
                      <label>Request Date</label>
                      <p>{formatDate(request.request_date)}</p>
                    </div>

                    <div className="form-group">
                      <label>Request Type</label>
                      <p className="chip-container">
                        <span className={`chip ${getRequestTypeClass(request.request_type)}`}>
                          {request.request_type}
                        </span>
                      </p>
                    </div>
                  </div>
                </form>
              </div>

              <p className="details-title">Employee Information</p>
              <div className="modal-content view">
                <form className="view-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Employee Number</label>
                      <p>{request.employee_number}</p>
                    </div>

                    <div className="form-group">
                      <label>Employee Name</label>
                      <p>{request.employee_name}</p>
                    </div>

                    <div className="form-group">
                      <label>Position</label>
                      <p>{request.position}</p>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Department</label>
                      <p>{request.department}</p>
                    </div>

                    <div className="form-group">
                      <label>Contact</label>
                      <p>{formatContactInfo()}</p>
                    </div>
                  </div>
                </form>
              </div>

              <p className="details-title">Amount Details</p>
              <div className="modal-content view">
                <form className="view-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Requested Amount</label>
                      <p style={{ fontWeight: 600, color: '#1890ff' }}>
                        {formatMoney(request.requested_amount)}
                      </p>
                    </div>

                    <div className="form-group" style={{ flex: 2 }}>
                      <label>Purpose</label>
                      <p>{request.purpose}</p>
                    </div>
                  </div>
                </form>
              </div>

              <div className="modal-actions">
                <button
                  className="submit-btn"
                  onClick={() => setAction('approve')}
                  disabled={isProcessing}
                  style={{ backgroundColor: 'var(--success-color)' }}
                >
                  <i className="ri-check-line"></i>
                  Approve Request
                </button>
                <button
                  className="submit-btn"
                  onClick={() => setAction('reject')}
                  disabled={isProcessing}
                  style={{ backgroundColor: 'var(--error-color)' }}
                >
                  <i className="ri-close-line"></i>
                  Reject Request
                </button>
                <button
                  className="cancel-btn"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : action === 'approve' ? (
            // Approval form with editable amount
            <>
              <p className="details-title">Approve Cash Advance</p>
              <div className="modal-content view">
                <form className="view-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Employee</label>
                      <p>{request.employee_name}</p>
                    </div>

                    <div className="form-group">
                      <label>Requested Amount</label>
                      <p>{formatMoney(request.requested_amount)}</p>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>Approved Amount <span style={{ color: 'var(--error-color)' }}>*</span></label>
                      <input
                        type="number"
                        value={approvedAmount}
                        onChange={(e) => setApprovedAmount(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        placeholder="Enter approved amount"
                      />
                      {showAmountWarning && (
                        <p className="hint-message" style={{ color: '#f39c12', marginTop: '8px' }}>
                          <i className="ri-alert-line"></i> Approved amount exceeds the requested amount
                        </p>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              <div className="modal-actions">
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={isProcessing || approvedAmount <= 0}
                  style={{ backgroundColor: 'var(--success-color)' }}
                >
                  <i className="ri-check-line"></i>
                  {isProcessing ? 'Processing...' : 'Confirm Approval'}
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => setAction(null)}
                  disabled={isProcessing}
                >
                  <i className="ri-arrow-left-line"></i>
                  Back
                </button>
              </div>
            </>
          ) : (
            // Rejection form
            <>
              <p className="details-title">Reject Cash Advance</p>
              <div className="modal-content view">
                <form className="view-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Employee</label>
                      <p>{request.employee_name}</p>
                    </div>

                    <div className="form-group">
                      <label>Requested Amount</label>
                      <p>{formatMoney(request.requested_amount)}</p>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>Reason for Rejection <span style={{ color: 'var(--error-color)' }}>*</span></label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a detailed reason for rejecting this cash advance request..."
                        rows={4}
                        required
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="modal-actions">
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={isProcessing || !rejectionReason.trim()}
                  style={{ backgroundColor: 'var(--error-color)' }}
                >
                  <i className="ri-close-line"></i>
                  {isProcessing ? 'Processing...' : 'Confirm Rejection'}
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => setAction(null)}
                  disabled={isProcessing}
                >
                  <i className="ri-arrow-left-line"></i>
                  Back
                </button>
              </div>
            </>
          )}
    </>
  );
}
