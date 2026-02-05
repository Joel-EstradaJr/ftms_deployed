"use client";

import React from "react";
import "@/styles/components/forms.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { OperationalExpenseData } from "./recordOperationalExpense";

interface ViewOperationalExpenseModalProps {
  expenseData: OperationalExpenseData & {
    payment_method_name?: string;
    account_code?: string;
    account_name?: string;
    body_number?: string;
    bus_type?: string;
    date_assigned?: string;
    creditor_name?: string;
    employee_reference?: string;
    journal_entry_id?: number;
    journal_entry_code?: string;
    // Rejection/Approval audit
    rejected_by?: string;
    rejected_at?: string;
    // Remarks
    approval_remarks?: string;
    rejection_remarks?: string;
    deletion_remarks?: string;
  };
  onClose: () => void;
}

const APPROVAL_STATUS_MAP: { [key: string]: string } = {
  'PENDING': 'Pending',
  'APPROVED': 'Approved',
  'REJECTED': 'Rejected',
};

const PAYMENT_STATUS_MAP: { [key: string]: string } = {
  'PENDING': 'Pending',
  'PARTIALLY_PAID': 'Partially Paid',
  'COMPLETED': 'Completed',
  'OVERDUE': 'Overdue',
  'CANCELLED': 'Cancelled',
  'WRITTEN_OFF': 'Written Off',
};

export default function ViewOperationalExpenseModal({ expenseData, onClose }: ViewOperationalExpenseModalProps) {

  // Get approval status badge
  const getApprovalStatusBadge = () => {
    const status = expenseData.approval_status || 'PENDING';
    const statusText = APPROVAL_STATUS_MAP[status] || status;

    const statusClass = {
      'APPROVED': 'completed',
      'PENDING': 'pending',
      'REJECTED': 'cancelled'
    }[status] || 'pending';

    return <span className={`chip ${statusClass}`}>{statusText}</span>;
  };

  // Calculate payment status based on business rules
  const getPaymentStatus = () => {
    if (expenseData.approval_status === 'REJECTED') {
      return 'CANCELLED';
    } else if (expenseData.payment_method === 'REIMBURSEMENT') {
      return 'PARTIALLY_PAID';
    } else if (expenseData.approval_status === 'APPROVED') {
      return 'COMPLETED';
    }
    return 'PENDING';
  };

  // Get payment status badge
  const getPaymentStatusBadge = () => {
    const status = getPaymentStatus();
    const statusText = PAYMENT_STATUS_MAP[status] || status;

    const statusClass = status.toLowerCase().replace('_', '-');

    return <span className={`chip ${statusClass}`}>{statusText}</span>;
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">View Operational Expense Details</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>

        <button className="close-modal-btn view" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Header Section with Code and Status */}
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Expense Code</label>
              <p><strong>{expenseData.code}</strong></p>
            </div>
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{formatDate(expenseData.date_recorded)}</p>
            </div>
            <div className="form-group">
              <label>Approval Status</label>
              <span>{getApprovalStatusBadge()}</span>
            </div>
          </div>
        </form>
      </div>

      {/* I. Basic Expense Information */}
      <div className="modal-content view">
        <p className="details-title">I. Expense Information</p>
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Expense Name</label>
              <p>{expenseData.expense_type_name || 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Amount</label>
              <p className="amount-field">{formatMoney(expenseData.amount)}</p>
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <p>{expenseData.payment_method_name || expenseData.payment_method || 'N/A'}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Trip Assignment Details */}
      {(expenseData.date_assigned || expenseData.body_number || expenseData.bus_type || expenseData.bus_route || expenseData.plate_number) && (
        <div className="modal-content view">
          <p className="details-title">II. Trip Assignment Details</p>
          <form className="view-form">
            <div className="form-row">
              <div className="form-group">
                <label>Date Assigned</label>
                <p>{expenseData.date_assigned ? formatDate(expenseData.date_assigned) : 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Body Number</label>
                <p>{expenseData.body_number || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Bus Type</label>
                <p>{expenseData.bus_type || 'N/A'}</p>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Route</label>
                <p>{expenseData.bus_route || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Plate Number</label>
                <p>{expenseData.plate_number || 'N/A'}</p>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* III. Accounting Details */}
      <div className="modal-content view">
        <p className="details-title">
          {(expenseData.date_assigned || expenseData.body_number) ? 'III' : 'II'}. Accounting Details
        </p>
        <form className="view-form">
          <div className="form-row">
            {(expenseData.account_code || expenseData.account_name) && (
              <div className="form-group">
                <label>Accounting Code</label>
                <p>{expenseData.account_code && expenseData.account_name
                  ? `${expenseData.account_code} - ${expenseData.account_name}`
                  : 'N/A'}</p>
              </div>
            )}
            <div className="form-group">
              <label>Payment Status</label>
              <p className="chip-container">
                {getPaymentStatusBadge()}
              </p>
            </div>
            {expenseData.journal_entry_code && (
              <div className="form-group">
                <label>Journal Entry</label>
                <p><strong>{expenseData.journal_entry_code}</strong></p>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Reimbursable Details (if applicable) */}
      {expenseData.is_reimbursable && (expenseData.employee_reference || expenseData.creditor_name) && (
        <div className="modal-content view">
          <p className="details-title">Reimbursement Details</p>
          <form className="view-form">
            <div className="form-row">
              <div className="form-group">
                <label>Employee to Reimburse</label>
                <p>
                  {expenseData.employee_reference && (
                    <span style={{ fontWeight: 600 }}>{expenseData.employee_reference}</span>
                  )}
                  {expenseData.employee_reference && expenseData.creditor_name && ' - '}
                  {expenseData.creditor_name || 'N/A'}
                </p>
              </div>
              {expenseData.payable_description && (
                <div className="form-group">
                  <label>Purpose</label>
                  <p>{expenseData.payable_description}</p>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Description/Remarks */}
      {expenseData.description && (
        <div className="modal-content view">
          <p className="details-title">Additional Information</p>
          <form className="view-form">
            <div className="form-row">
              <div className="form-group full-width">
                <label>Description / Remarks</label>
                <p style={{ whiteSpace: 'pre-wrap' }}>{expenseData.description}</p>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Audit Trail */}
      <div className="modal-content view">
        <p className="details-title">Audit Trail</p>
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Requested By</label>
              <p>{expenseData.created_by || 'N/A'}</p>
            </div>
            {expenseData.created_at && (
              <div className="form-group">
                <label>Requested On</label>
                <p>{formatDate(expenseData.created_at)}</p>
              </div>
            )}
          </div>

          {expenseData.approved_by && (
            <div className="form-row">
              <div className="form-group">
                <label>Approved By</label>
                <p>{expenseData.approved_by}</p>
              </div>
              {expenseData.approved_at && (
                <div className="form-group">
                  <label>Approved On</label>
                  <p>{formatDate(expenseData.approved_at)}</p>
                </div>
              )}
              {expenseData.approval_remarks && (
                <div className="form-group">
                  <label>Approval Remarks</label>
                  <p>{expenseData.approval_remarks}</p>
                </div>
              )}
            </div>
          )}

          {expenseData.rejected_by && (
            <div className="form-row">
              <div className="form-group">
                <label>Rejected By</label>
                <p>{expenseData.rejected_by}</p>
              </div>
              {expenseData.rejected_at && (
                <div className="form-group">
                  <label>Rejected On</label>
                  <p>{formatDate(expenseData.rejected_at)}</p>
                </div>
              )}
              {expenseData.rejection_remarks && (
                <div className="form-group">
                  <label>Rejection Reason</label>
                  <p>{expenseData.rejection_remarks}</p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="modal-actions">
        <button className="cancel-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
          Close
        </button>
      </div>
    </>
  );
}
