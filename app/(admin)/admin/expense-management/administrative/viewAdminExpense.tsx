"use client";

import React from "react";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/components/chips.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { AdministrativeExpense, ExpenseScheduleItem, PaymentStatus } from "@/app/types/expenses";
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
  
  const getStatusChipClass = (status?: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID: return 'paid';
      case PaymentStatus.PARTIALLY_PAID: return 'partially-paid';
      case PaymentStatus.OVERDUE: return 'overdue';
      case PaymentStatus.PENDING: return 'pending';
      case PaymentStatus.CANCELLED: return 'cancelled';
      default: return 'pending';
    }
  };

  return (
    <>
      <div className="modal-heading modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 className="modal-title">Expense Details</h1>
          {data.paymentStatus && (
            <span className={`chip ${getStatusChipClass(data.paymentStatus)}`}>
              {data.paymentStatus.replace('_', ' ')}
            </span>
          )}
        </div>
        <div className="modal-date-time">
          <p>{new Date(data.created_at).toLocaleDateString()}</p>
          <p>{new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button onClick={onClose} className="close-modal-btn view"><i className="ri-close-line" /></button>
      </div>

      <div className="modal-content view">
          <div className="view-section">
            <h3>General Information</h3>
            <div className="view-grid">
              <div className="view-item">
                <label>Date</label>
                <p>{formatDate(data.date)}</p>
              </div>
              <div className="view-item">
                <label>Category</label>
                <p>{data.category}</p>
              </div>
              <div className="view-item">
                <label>Subcategory</label>
                <p>{data.subcategory || '-'}</p>
              </div>
              <div className="view-item">
                <label>Amount</label>
                <p className="amount-text">{formatMoney(data.amount)}</p>
              </div>
              <div className="view-item">
                <label>Vendor / Payee</label>
                <p>{data.vendor}</p>
              </div>
              <div className="view-item">
                <label>Invoice / Ref No.</label>
                <p>{data.invoice_number || '-'}</p>
              </div>
            </div>
            
            {data.description && (
              <div className="view-item full-width" style={{ marginTop: '10px' }}>
                <label>Description</label>
                <p>{data.description}</p>
              </div>
            )}
          </div>

          {data.isPrepaid && data.scheduleItems && data.scheduleItems.length > 0 && (
            <div className="view-section">
              <h3>Payment Schedule</h3>
              <div className="view-grid">
                <div className="view-item">
                  <label>Frequency</label>
                  <p>{data.frequency}</p>
                </div>
                <div className="view-item">
                  <label>Start Date</label>
                  <p>{formatDate(data.startDate || '')}</p>
                </div>
              </div>
              
              <div style={{ marginTop: '15px' }}>
                <ExpenseScheduleTable
                  scheduleItems={data.scheduleItems}
                  mode="view"
                  totalAmount={data.amount}
                  isPrepaid={true}
                  frequency={data.frequency}
                  onRecordPayment={(item) => {
                    (onRecordPaymentProp as any)?.(item);
                    if (!onRecordPaymentProp) {
                      // default: call with first pending installment if no handler
                      const pending = (data.scheduleItems || []).find(it => it.paymentStatus === PaymentStatus.PENDING || it.paymentStatus === PaymentStatus.PARTIALLY_PAID);
                      if (pending) (onRecordPaymentProp as any)?.(pending);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {!data.isPrepaid && (
            <div className="view-section">
              <h3>Payment Details</h3>
              <div className="view-grid">
                <div className="view-item">
                  <label>Payment Method</label>
                  <p>{data.paymentMethod || '-'}</p>
                </div>
                <div className="view-item">
                  <label>Reference No.</label>
                  <p>{data.referenceNo || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {data.remarks && (
            <div className="view-section">
              <h3>Remarks</h3>
              <p>{data.remarks}</p>
            </div>
          )}

          <div className="view-section">
            <h3>Audit Trail</h3>
            <div className="view-grid">
              <div className="view-item">
                <label>Created By</label>
                <p>{data.created_by}</p>
              </div>
              <div className="view-item">
                <label>Created At</label>
                <p>{new Date(data.created_at).toLocaleString()}</p>
              </div>
            </div>
        </div>
      </div>

      <div className="modal-actions">
        {onEdit && (
          <button 
            onClick={() => onEdit(data)} 
            className="edit-btn"
            style={{ marginRight: 'auto' }}
          >
            <i className="ri-pencil-line"></i> Edit Expense
          </button>
        )}
        {data.isPrepaid && data.scheduleItems && data.scheduleItems.length > 0 && (
          <button 
            onClick={() => {
              const pending = (data.scheduleItems || []).find(it => it.paymentStatus === PaymentStatus.PENDING || it.paymentStatus === PaymentStatus.PARTIALLY_PAID);
              if (pending) (onRecordPaymentProp as any)?.(pending);
            }}
            className="primary-btn"
            style={{ marginRight: '8px' }}
          >
            <i className="ri-money-dollar-circle-line"></i> Record Payment
          </button>
        )}
        <button onClick={onClose} className="secondary-btn">Close</button>
      </div>
    </>
  );
}