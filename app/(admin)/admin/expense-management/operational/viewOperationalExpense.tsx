"use client";

import React from "react";
import "@/styles/components/forms.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { OperationalExpenseData } from "./recordOperationalExpense";

interface ViewOperationalExpenseModalProps {
  expenseData: OperationalExpenseData & {
    paymentMethodName?: string;
    accountCode?: string;
    accountName?: string;
  };
  onClose: () => void;
}

const EXPENSE_CATEGORIES_MAP: { [key: string]: string } = {
  'FUEL': 'Fuel',
  'TOLLS': 'Tolls',
  'PARKING': 'Parking',
  'ALLOWANCES': 'Allowances',
  'PETTY_CASH': 'Petty Cash',
  'VIOLATIONS': 'Violations',
  'TERMINAL_FEES': 'Terminal Fees',
};

const STATUS_MAP: { [key: string]: string } = {
  'PENDING': 'Pending',
  'APPROVED': 'Approved',
  'REJECTED': 'Rejected',
  'POSTED': 'Posted',
};

export default function ViewOperationalExpenseModal({ expenseData, onClose }: ViewOperationalExpenseModalProps) {
  
  // Format category for display
  const formatCategory = (category: string): string => {
    return EXPENSE_CATEGORIES_MAP[category] || category;
  };

  // Get status badge
  const getStatusBadge = () => {
    const status = expenseData.status || 'PENDING';
    const statusText = STATUS_MAP[status] || status;
    
    const statusClass = {
      'APPROVED': 'completed',
      'POSTED': 'completed',
      'PENDING': 'pending',
      'REJECTED': 'cancelled'
    }[status] || 'pending';

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

      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            {/* Expense Code */}
            <div className="form-group">
              <label>Expense Code</label>
              <p>{expenseData.expenseCode}</p>
            </div>

            {/* Date Recorded */}
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{formatDate(expenseData.dateRecorded)}</p>
            </div>

            {/* Status */}
            <div className="form-group">
              <label>Status</label>
              <span>{getStatusBadge()}</span>
            </div>
          </div>
        </form>
      </div>

      {/* I. Basic Expense Information */}
      <div className="modal-content view">
        <p className="details-title">I. Basic Expense Information</p>
        <form className="view-form">
          <div className="form-row">
            {/* Expense Category */}
            <div className="form-group">
              <label>Expense Category</label>
              <p>{formatCategory(expenseData.expenseCategory)}</p>
            </div>

            {/* Expense Subcategory */}
            <div className="form-group">
              <label>Expense Subcategory</label>
              <p>{expenseData.expenseSubcategory || 'N/A'}</p>
            </div>

            {/* Amount */}
            <div className="form-group">
              <label>Amount</label>
              <p className="amount-field">{formatMoney(expenseData.amount)}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Payment Method */}
            <div className="form-group">
              <label>Payment Method</label>
              <p>{expenseData.paymentMethodName || 'N/A'}</p>
            </div>

            {/* Reimbursable Status */}
            <div className="form-group">
              <label>Reimbursable</label>
              <p>
                {expenseData.isReimbursable ? (
                  <span className="chip pending">Yes</span>
                ) : (
                  <span className="chip cancelled">No</span>
                )}
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Trip Assignment Details (if applicable) */}
      {(expenseData.cachedTripId || expenseData.busPlateNumber || expenseData.route || expenseData.department) && (
        <>
          <div className="modal-content view">
            <p className="details-title">II. Trip Assignment Details</p>
            <form className="view-form">
              <div className="form-row">
                {/* Bus Plate Number */}
                <div className="form-group">
                  <label>Bus Plate Number</label>
                  <p>{expenseData.busPlateNumber || 'N/A'}</p>
                </div>

                {/* Route */}
                <div className="form-group">
                  <label>Route</label>
                  <p>{expenseData.route || 'N/A'}</p>
                </div>

                {/* Department */}
                <div className="form-group">
                  <label>Department</label>
                  <p>{expenseData.department || 'N/A'}</p>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* III. Accounting Details */}
      {expenseData.accountCodeId && (
        <>
          <div className="modal-content view">
            <p className="details-title">
              {(expenseData.cachedTripId || expenseData.busPlateNumber) ? 'III' : 'II'}. Accounting Details
            </p>
            <form className="view-form">
              <div className="form-row">
                {/* Account Code */}
                <div className="form-group">
                  <label>Account Code</label>
                  <p>{expenseData.accountCode || 'N/A'}</p>
                </div>

                {/* Account Name */}
                <div className="form-group">
                  <label>Account Name</label>
                  <p>{expenseData.accountName || 'N/A'}</p>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* IV. Supporting Documents */}
      {expenseData.receiptUrl && (
        <>
          <div className="modal-content view">
            <p className="details-title">
              {(() => {
                let section = 2;
                if (expenseData.cachedTripId || expenseData.busPlateNumber) section++;
                if (expenseData.accountCodeId) section++;
                return `${['', 'I', 'II', 'III', 'IV', 'V'][section]}`;
              })()}. Supporting Documents
            </p>
            <form className="view-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Receipt Document</label>
                  <a href={expenseData.receiptUrl} target="_blank" rel="noopener noreferrer" className="document-link">
                    <i className="ri-file-line" /> View Receipt
                  </a>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* V. Approval Details (if approved) */}
      {expenseData.approvedBy && (
        <>
          <div className="modal-content view">
            <p className="details-title">
              {(() => {
                let section = 2;
                if (expenseData.cachedTripId || expenseData.busPlateNumber) section++;
                if (expenseData.accountCodeId) section++;
                if (expenseData.receiptUrl) section++;
                return `${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][section]}`;
              })()}. Approval Details
            </p>
            <form className="view-form">
              <div className="form-row">
                {/* Approved By */}
                <div className="form-group">
                  <label>Approved By</label>
                  <p>{expenseData.approvedBy}</p>
                </div>

                {/* Approved At */}
                <div className="form-group">
                  <label>Approved At</label>
                  <p>{formatDate(expenseData.approvedAt || '')}</p>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* VI. Additional Information */}
      {(expenseData.remarks || expenseData.createdBy) && (
        <>
          <div className="modal-content view">
            <p className="details-title">
              {(() => {
                let section = 2;
                if (expenseData.cachedTripId || expenseData.busPlateNumber) section++;
                if (expenseData.accountCodeId) section++;
                if (expenseData.receiptUrl) section++;
                if (expenseData.approvedBy) section++;
                return `${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][section]}`;
              })()}. Additional Information
            </p>
            <form className="view-form">
              {expenseData.remarks && (
                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Remarks</label>
                    <p>{expenseData.remarks}</p>
                  </div>
                </div>
              )}

              <div className="form-row">
                {/* Created By */}
                <div className="form-group">
                  <label>Created By</label>
                  <p>{expenseData.createdBy}</p>
                </div>

                {/* Created At */}
                {expenseData.createdAt && (
                  <div className="form-group">
                    <label>Created At</label>
                    <p>{formatDate(expenseData.createdAt)}</p>
                  </div>
                )}
              </div>
            </form>
          </div>
        </>
      )}

      <div className="modal-actions">
        <button className="cancel-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
          Close
        </button>
      </div>
    </>
  );
}
