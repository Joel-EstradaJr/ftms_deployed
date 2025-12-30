"use client";

import React from "react";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/components/chips.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { AdministrativeExpense, ExpenseScheduleItem, PaymentStatus } from "@/app/types/expenses";
import ExpenseScheduleTable from "@/Components/ExpenseScheduleTable";
import ItemsTable, { Item } from "@/Components/itemTable";

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: 'calc(100% - 200px)' }}>
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
        <button onClick={onClose} className="close-modal-btn"><i className="ri-close-line" /></button>
      </div>

      {/* I. Expense Information */}
      <p className="details-title">I. Expense Information</p>
      <div className="modal-content view">
        <form className="view-form">
          {/* Row: Date + Category */}
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <p>{formatDate(data.date)}</p>
            </div>
            <div className="form-group">
              <label>Category</label>
              <p>{data.category}</p>
            </div>
          </div>

          {/* Row: Subcategory + Amount */}
          <div className="form-row">
            <div className="form-group">
              <label>Subcategory</label>
              <p>{data.subcategory || '-'}</p>
            </div>
            <div className="form-group">
              <label>Amount</label>
              <p style={{ fontWeight: 'bold', color: '#961C1E' }}>{formatMoney(data.amount)}</p>
            </div>
          </div>

          {/* Row: Vendor + Invoice */}
          <div className="form-row">
            <div className="form-group">
              <label>Vendor / Payee</label>
              <p>{data.vendor}</p>
            </div>
            <div className="form-group">
              <label>Invoice / Ref No.</label>
              <p>{data.invoice_number || '-'}</p>
            </div>
          </div>

          {/* Row: Description (full width) */}
          {data.description && (
            <div className="form-row">
              <div className="form-group full-width">
                <label>Description</label>
                <p>{data.description}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* II. Expense Items */}
      {data.items && data.items.length > 0 && (
        <>
          <p className="details-title">II. Expense Items</p>
          <div className="modal-content view" style={{ display: 'flex', justifyContent: 'center', backgroundColor: 'white' }}>
            <ItemsTable
              items={data.items.map(item => ({
                item_name: item.item_name || '',
                quantity: item.quantity || 1,
                unit_measure: item.unit_measure || 'pcs',
                unit_cost: item.unit_cost || 0,
                supplier: item.supplier || '',
                subtotal: item.subtotal || 0,
                type: item.type || 'supply'
              }))}
              onItemsChange={() => {}}
              showItems={true}
              onToggleItems={() => {}}
              readOnly={true}
              title="Expense Items"
            />
          </div>
        </>
      )}

      {/* III. Payment Schedule */}
      {data.isPrepaid && data.scheduleItems && data.scheduleItems.length > 0 && (
        <>
          <p className="details-title">III. Payment Schedule</p>
          <div className="modal-content view">
            <form className="view-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Frequency</label>
                  <p>{data.frequency}</p>
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <p>{formatDate(data.startDate || '')}</p>
                </div>
              </div>
              
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
                      (onRecordPaymentProp as any)?.(item);
                      if (!onRecordPaymentProp) {
                        const pending = (data.scheduleItems || []).find(it => it.paymentStatus === PaymentStatus.PENDING || it.paymentStatus === PaymentStatus.PARTIALLY_PAID);
                        if (pending) (onRecordPaymentProp as any)?.(pending);
                      }
                    }}
                  />
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* IV. Additional Info */}
      <p className="details-title">IV. Additional Info</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group full-width">
              <label>Remarks</label>
              <p>{data.remarks || 'No remarks'}</p>
            </div>
          </div>
        </form>
      </div>

      {/* V. Audit Trail */}
      <p className="details-title">V. Audit Trail</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Created By</label>
              <p>{data.created_by}</p>
            </div>
            <div className="form-group">
              <label>Created At</label>
              <p>{new Date(data.created_at).toLocaleString()}</p>
            </div>
          </div>
        </form>
      </div>

      <div className="modal-actions">
        {onEdit && (
          <button 
            onClick={() => onEdit(data)} 
            className="submit-btn"
            style={{ marginRight: 'auto', backgroundColor: 'var(--info-color)' }}
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