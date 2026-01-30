"use client";

import React from "react";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/components/chips.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { AdministrativeExpense, ExpenseScheduleItem, PaymentStatus, ExpenseStatus } from "@/app/types/expenses";
import ExpenseScheduleTable from "@/Components/ExpenseScheduleTable";

interface ViewAdminExpenseModalProps {
  data: AdministrativeExpense;
  onClose: () => void;
  onEdit?: (data: AdministrativeExpense) => void;
  onRecordPayment?: (scheduleItem?: ExpenseScheduleItem) => void;
}

export default function ViewAdminExpenseModal({ 
  data, 
  onClose,
  onEdit,
  onRecordPayment: onRecordPaymentProp
}: ViewAdminExpenseModalProps) {
  
  const getStatusChipClass = (status?: PaymentStatus | ExpenseStatus | string) => {
    const statusStr = String(status || '').toUpperCase();
    switch (statusStr) {
      case 'PAID': return 'paid';
      case 'PARTIALLY_PAID': return 'partially-paid';
      case 'OVERDUE': return 'overdue';
      case 'PENDING': return 'pending';
      case 'CANCELLED': return 'cancelled';
      case 'APPROVED': return 'approved';
      case 'REJECTED': return 'rejected';
      default: return 'pending';
    }
  };

  // Determine if payable exists (has schedule items)
  const hasPayable = data.payable_id !== null && data.payable_id !== undefined || 
                     (data.scheduleItems && data.scheduleItems.length > 0);

  return (
    <>
      <div className="modal-heading modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: 'calc(100% - 200px)' }}>
          <h1 className="modal-title">Expense Details</h1>
          {data.status && (
            <span className={`chip ${getStatusChipClass(data.status)}`}>
              {String(data.status).replace('_', ' ')}
            </span>
          )}
        </div>
        <div className="modal-date-time">
          <p>{new Date(data.created_at).toLocaleDateString()}</p>
          <p>{new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button onClick={onClose} className="close-modal-btn"><i className="ri-close-line" /></button>
      </div>

      {/* I. Expense Information */}
      <p className="details-title">I. Expense Information</p>
      <div className="modal-content view">
        <form className="view-form">
          {/* Row: Expense Code + Date Recorded */}
          <div className="form-row">
            <div className="form-group">
              <label>Expense Code</label>
              <p>{data.code || data.id}</p>
            </div>
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{formatDate(data.date_recorded)}</p>
            </div>
          </div>

          {/* Row: Vendor + Amount */}
          <div className="form-row">
            <div className="form-group">
              <label>Vendor</label>
              <p>{data.vendor || '-'}</p>
            </div>
            <div className="form-group">
              <label>Amount</label>
              <p style={{ fontWeight: 'bold', color: '#961C1E' }}>{formatMoney(data.amount)}</p>
            </div>
          </div>

          {/* Row: Invoice Number + Payment Method */}
          <div className="form-row">
            <div className="form-group">
              <label>Invoice Number</label>
              <p>{data.invoice_number || '-'}</p>
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <p>{data.payment_method || '-'}</p>
            </div>
          </div>

          {/* Row: Description */}
          <div className="form-row">
            <div className="form-group full-width">
              <label>Description</label>
              <p>{data.description || 'No description'}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Payables */}
      {hasPayable && data.scheduleItems && data.scheduleItems.length > 0 && (
        <>
          <p className="details-title">II. Payables</p>
          <div className="modal-content view">
            <form className="view-form">
              {data.frequency && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Frequency</label>
                    <p>{data.frequency}</p>
                  </div>
                  <div className="form-group">
                    <label>Balance</label>
                    <p style={{ fontWeight: 'bold', color: '#961C1E' }}>{formatMoney(data.balance || 0)}</p>
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Payment Schedule</label>
                  <ExpenseScheduleTable
                    scheduleItems={data.scheduleItems}
                    mode="view"
                    totalAmount={data.amount}
                    isPrepaid={true}
                    frequency={data.frequency}
                    onRecordPayment={(item) => {
                      onRecordPaymentProp?.(item);
                    }}
                  />
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* III. Audit */}
      <p className="details-title">III. Audit</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Created By</label>
              <p>{data.created_by || '-'}</p>
            </div>
            <div className="form-group">
              <label>Created On</label>
              <p>{data.created_at ? new Date(data.created_at).toLocaleString() : '-'}</p>
            </div>
          </div>
          {data.approved_by && (
            <div className="form-row">
              <div className="form-group">
                <label>Approved By</label>
                <p>{data.approved_by}</p>
              </div>
              <div className="form-group">
                <label>Approved On</label>
                <p>{data.approved_at ? new Date(data.approved_at).toLocaleString() : '-'}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="modal-actions">
        {hasPayable && data.scheduleItems && data.scheduleItems.length > 0 && (
          <button 
            onClick={() => {
              const pending = (data.scheduleItems || []).find(
                it => it.status === PaymentStatus.PENDING || it.status === PaymentStatus.PARTIALLY_PAID
              );
              if (pending) onRecordPaymentProp?.(pending);
            }}
            className="pay-btn"
          >
            <i className="ri-money-dollar-circle-line"></i> Record Payment
          </button>
        )}
        <button onClick={onClose} className="cancel-btn">Close</button>
      </div>
    </>
  );
}