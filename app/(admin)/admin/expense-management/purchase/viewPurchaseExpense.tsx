'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseExpense, PaymentInfo, PaymentStatus } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import '../../../../styles/components/modal2.css';
import '../../../../styles/components/forms.css';
import '../../../../styles/components/chips.css';

interface ViewPurchaseExpenseProps {
  expense: PurchaseExpense;
  onClose: () => void;
  onRecordPayment?: () => void;
}

const ViewPurchaseExpense: React.FC<ViewPurchaseExpenseProps> = ({ expense, onClose, onRecordPayment }) => {
  const [showItems, setShowItems] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  // Fetch payment information from CashTransaction API
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      setLoadingPayment(true);
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/cash-transactions/payment-status?expenseId=${expense.id}&expenseType=PURCHASE`);
        // const data = await response.json();
        // setPaymentInfo(data);

        // Mock payment data for demonstration
        const mockPaymentData: PaymentInfo = {
          payment_status: expense.id === 'PUR-001' ? PaymentStatus.PAID : 
                         expense.id === 'PUR-002' ? PaymentStatus.PARTIALLY_PAID : 
                         PaymentStatus.PENDING,
          total_paid: expense.id === 'PUR-001' ? expense.amount : 
                     expense.id === 'PUR-002' ? expense.amount * 0.5 : 0,
          balance: expense.id === 'PUR-001' ? 0 : 
                  expense.id === 'PUR-002' ? expense.amount * 0.5 : 
                  expense.amount,
          due_date: expense.id === 'PUR-003' ? '2024-02-15' : undefined,
          payment_terms: expense.id !== 'PUR-003' ? '30 days' : '15 days',
          payment_history: expense.id === 'PUR-001' ? [
            {
              id: 'PAY-001',
              payment_date: '2024-01-26',
              amount: expense.amount,
              payment_method: 'Bank Transfer',
              reference_number: 'BT-2024-001',
              created_by: 'finance@ftms.com'
            }
          ] : expense.id === 'PUR-002' ? [
            {
              id: 'PAY-002',
              payment_date: '2024-01-29',
              amount: expense.amount * 0.5,
              payment_method: 'Check',
              reference_number: 'CHK-2024-001',
              created_by: 'finance@ftms.com'
            }
          ] : []
        };
        setPaymentInfo(mockPaymentData);
      } catch (error) {
        console.error('Failed to fetch payment info:', error);
      } finally {
        setLoadingPayment(false);
      }
    };

    fetchPaymentInfo();
  }, [expense.id, expense.amount]);

  // Calculate budget utilization percentage
  const budgetUtilization =
    expense.budget_allocated && expense.budget_allocated > 0
      ? ((expense.budget_utilized || 0) / expense.budget_allocated) * 100
      : 0;

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">View Purchase Expense Details</h1>
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
              <label>Category</label>
              <p>{expense.category || 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Amount</label>
              <p className="amount-text">{formatMoney(expense.amount)}</p>
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

      <p className="details-title">Payment Information</p>
      <div className="modal-content view">
        {loadingPayment ? (
          <p>Loading payment information...</p>
        ) : paymentInfo ? (
          <form className="view-form">
            <div className="form-row">
              <div className="form-group">
                <label>Payment Status</label>
                <span>
                  <span className={`chip ${paymentInfo.payment_status.toLowerCase().replace('_', '-')}`}>
                    {paymentInfo.payment_status.replace('_', ' ')}
                  </span>
                </span>
              </div>
              <div className="form-group">
                <label>Total Paid</label>
                <p className="amount-text">{formatMoney(paymentInfo.total_paid)}</p>
              </div>
              <div className="form-group">
                <label>Balance</label>
                <p className="amount-text" style={{ color: paymentInfo.balance > 0 ? '#FF4949' : 'inherit' }}>
                  {formatMoney(paymentInfo.balance)}
                </p>
              </div>
            </div>

            {(paymentInfo.due_date || paymentInfo.payment_terms) && (
              <div className="form-row">
                {paymentInfo.due_date && (
                  <div className="form-group">
                    <label>Due Date</label>
                    <p>{formatDate(paymentInfo.due_date)}</p>
                  </div>
                )}
                {paymentInfo.payment_terms && (
                  <div className="form-group">
                    <label>Payment Terms</label>
                    <p>{paymentInfo.payment_terms}</p>
                  </div>
                )}
              </div>
            )}

            {paymentInfo.payment_history.length > 0 && (
              <>
                <div className="form-row">
                  <div className="form-group" style={{ width: '100%' }}>
                    <label>Payment History</label>
                  </div>
                </div>
                <div className="table-wrapper" style={{ maxHeight: '250px', marginTop: '10px' }}>
                  <table className="modal-table">
                    <thead className="modal-table-heading">
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="modal-table-body">
                      {paymentInfo.payment_history.map((payment) => (
                        <tr key={payment.id}>
                          <td>{formatDate(payment.payment_date)}</td>
                          <td>{formatMoney(payment.amount)}</td>
                          <td>{payment.payment_method}</td>
                          <td>{payment.reference_number || 'N/A'}</td>
                          <td>{payment.created_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {paymentInfo.balance > 0 && onRecordPayment && (
              <div className="form-row" style={{ marginTop: '15px' }}>
                <button 
                  type="button"
                  className="submit-btn"
                  onClick={onRecordPayment}
                  style={{ width: 'auto', padding: '10px 20px' }}
                >
                  <i className="ri-money-dollar-circle-line" style={{ marginRight: '8px' }}></i>
                  Record Payment
                </button>
              </div>
            )}
          </form>
        ) : (
          <p>No payment information available</p>
        )}
      </div>

      <p className="details-title">Purchase Request Details</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>PR Number</label>
              <p>{expense.pr_number}</p>
            </div>
            <div className="form-group">
              <label>PR Date</label>
              <p>{formatDate(expense.pr_date)}</p>
            </div>
            <div className="form-group">
              <label>Supplier</label>
              <p>{expense.supplier || 'N/A'}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Linked Purchase ID</label>
              <p>{expense.linked_purchase_id || 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Account Code</label>
              <p>{expense.account_code || 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Receipt Number</label>
              <p>{expense.receipt_number || 'N/A'}</p>
            </div>
          </div>
        </form>
      </div>

      <p className="details-title">Delivery Receipt Details</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>DR Number</label>
              <p>{expense.dr_number || 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>DR Date</label>
              <p>{expense.dr_date ? formatDate(expense.dr_date) : 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Goods Receipt Date</label>
              <p>{expense.goods_receipt_date ? formatDate(expense.goods_receipt_date) : 'N/A'}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Inventory Integration ID</label>
              <p>{expense.inventory_integration_id || 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Inventory Order Reference</label>
              <p>{expense.inventory_order_ref || 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Supplier Price Updated</label>
              <p>{expense.supplier_price_updated ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </form>
      </div>

      <p className="details-title">Budget Utilization</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Budget Code</label>
              <p>{expense.budget_code || 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Budget Allocated</label>
              <p>{expense.budget_allocated ? formatMoney(expense.budget_allocated) : 'N/A'}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Budget Utilized</label>
              <p>{expense.budget_utilized ? formatMoney(expense.budget_utilized) : 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Utilization Percentage</label>
              <span>
                <span
                  className={`chip ${
                    budgetUtilization > 80
                      ? 'urgent'
                      : budgetUtilization > 50
                      ? 'warning'
                      : 'normal'
                  }`}
                >
                  {budgetUtilization.toFixed(2)}%
                </span>
              </span>
            </div>
          </div>
        </form>
      </div>

      {(expense.status === 'REFUNDED' || expense.status === 'REPLACED') && expense.adjustment_reason && (
        <>
          <p className="details-title">Adjustment Details</p>
          <div className="modal-content view">
            <form className="view-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Adjustment Reason</label>
                  <p>{expense.adjustment_reason}</p>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Adjustment Amount</label>
                  <p>{expense.adjustment_amount ? formatMoney(expense.adjustment_amount) : 'N/A'}</p>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      <p className="details-title">Purchase Request Items</p>
      <div className="modal-content view">
        {expense.items && expense.items.length > 0 ? (
          <div className="table-wrapper" style={{ maxHeight: '300px', marginBottom: '20px' }}>
            <table className="modal-table">
              <thead className="modal-table-heading">
                <tr>
                  <th>Item Name</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Unit Cost</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody className="modal-table-body">
                {expense.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.item_name}</td>
                    <td>
                      <span className={`chip ${item.type === 'supply' ? 'normal' : 'active'}`}>
                        {item.type.toUpperCase()}
                      </span>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{item.unit_measure}</td>
                    <td>{formatMoney(item.unit_cost)}</td>
                    <td>{formatMoney(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No items available</p>
        )}
      </div>

      <p className="details-title">Audit Information</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Created By</label>
              <p>{expense.created_by}</p>
            </div>
            <div className="form-group">
              <label>Created At</label>
              <p>{formatDate(expense.created_at)}</p>
            </div>
          </div>

          {expense.approved_by && (
            <div className="form-row">
              <div className="form-group">
                <label>Approved By</label>
                <p>{expense.approved_by}</p>
              </div>
              <div className="form-group">
                <label>Approved At</label>
                <p>{expense.approved_at ? formatDate(expense.approved_at) : 'N/A'}</p>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Last Updated</label>
              <p>{formatDate(expense.updated_at)}</p>
            </div>
          </div>

          {expense.remarks && (
            <div className="form-row">
              <div className="form-group">
                <label>Remarks</label>
                <p>{expense.remarks}</p>
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
