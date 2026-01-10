'use client';

import React from 'react';
import { PurchaseExpense } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import '../../../../styles/components/modal2.css';
import '../../../../styles/components/forms.css';
import '../../../../styles/components/chips.css';

interface ViewPurchaseExpenseProps {
  expense: PurchaseExpense;
  onClose: () => void;
  onRecordPayment?: () => void;
}

const ViewPurchaseExpense: React.FC<ViewPurchaseExpenseProps> = ({ expense, onClose }) => {

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">View Purchase Request Approval</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      <p className="details-title">Expense Information</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Expense Code</label>
              <p>{expense.expense_code || expense.id}</p>
            </div>
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{formatDate(expense.date)}</p>
            </div>
            <div className="form-group">
              <label>Status</label>
              <span>
                <span className={`chip ${expense.status.toLowerCase()}`}>
                  {expense.status}
                </span>
              </span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Amount</label>
              <p className="amount-text">{formatMoney(expense.amount)}</p>
            </div>
            <div className="form-group">
              <label>Department</label>
              <p>{expense.category || 'N/A'}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Description</label>
              <p>{expense.description}</p>
            </div>
          </div>
        </form>
      </div>

      <p className="details-title">Finance Decision</p>
      <div className="modal-content view">
        {expense.items && expense.items.length > 0 ? (
          <>
            <p className="details-subtitle" style={{ marginBottom: '10px', fontWeight: '500' }}>Approved Purchase Items</p>
            <div className="table-wrapper" style={{ maxHeight: '300px', marginBottom: '20px' }}>
              <table className="modal-table">
                <thead className="modal-table-heading">
                  <tr>
                    <th>Item</th>
                    <th>Supplier</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody className="modal-table-body">
                  {expense.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.item_name}</td>
                      <td>{item.supplier || 'N/A'}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit_measure}</td>
                      <td>{formatMoney(item.unit_cost)}</td>
                      <td>{formatMoney(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="no-data">No items available</p>
        )}
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Approved Budget</label>
              <p className="amount-text">{expense.budget_allocated ? formatMoney(expense.budget_allocated) : formatMoney(expense.amount)}</p>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Remarks</label>
              <p>{expense.remarks || 'N/A'}</p>
            </div>
          </div>
        </form>
      </div>

      <p className="details-title">Audit Information</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Requested by</label>
              <p>{expense.created_by}</p>
            </div>
            <div className="form-group">
              <label>Requested on</label>
              <p>{formatDate(expense.created_at)}</p>
            </div>
          </div>

          {expense.approved_by && (
            <div className="form-row">
              <div className="form-group">
                <label>Approved by</label>
                <p>{expense.approved_by}</p>
              </div>
              <div className="form-group">
                <label>Approved on</label>
                <p>{expense.approved_at ? formatDate(expense.approved_at) : 'N/A'}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="modal-actions">
        <button className="cancel-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
};

export default ViewPurchaseExpense;
