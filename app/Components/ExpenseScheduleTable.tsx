'use client';

import React, { useState } from 'react';
import { ExpenseScheduleItem, ExpenseScheduleFrequency, PaymentStatus } from '../types/expenses';
import { formatMoney, formatDate } from '../utils/formatting';
import { distributeAmount, smartDistributeAmount, validateDateRange } from '../utils/expenseScheduleCalculations';
import '../styles/components/table.css';
import '../styles/components/chips.css';
import '../styles/components/forms.css';

interface ExpenseScheduleTableProps {
  scheduleItems: ExpenseScheduleItem[];
  mode: 'add' | 'edit' | 'view';
  onItemChange?: (items: ExpenseScheduleItem[]) => void;
  totalAmount: number;
  hasPayable: boolean;
  frequency?: ExpenseScheduleFrequency;
  onRecordPayment?: (item: ExpenseScheduleItem) => void;
  expenseStatus?: string; // Only show payment actions when APPROVED
}

const ExpenseScheduleTable: React.FC<ExpenseScheduleTableProps> = ({
  scheduleItems,
  mode,
  onItemChange,
  totalAmount,
  hasPayable,
  frequency,
  onRecordPayment,
  expenseStatus
}) => {
  // Only show payment actions for APPROVED expenses
  const canRecordPayment = onRecordPayment && String(expenseStatus).toUpperCase() === 'APPROVED';
  const [editingDateIndex, setEditingDateIndex] = useState<number | null>(null);
  const [editingAmountIndex, setEditingAmountIndex] = useState<number | null>(null);
  const [dateError, setDateError] = useState<string>('');

  if (!hasPayable || scheduleItems.length === 0) {
    return (
      <div className="modal-content view">
        <p className="no-data">No payment schedule configured</p>
      </div>
    );
  }

  const handleDateChange = (index: number, newDate: string) => {
    if (!onItemChange) return;

    const prevDate = index > 0 ? scheduleItems[index - 1].due_date : undefined;
    const nextDate = index < scheduleItems.length - 1 ? scheduleItems[index + 1].due_date : undefined;

    const validation = validateDateRange(newDate, prevDate, nextDate);

    if (!validation.isValid) {
      setDateError(validation.errorMessage || 'Invalid date');
      return;
    }

    setDateError('');
    const updatedItems = [...scheduleItems];
    updatedItems[index].due_date = newDate;
    onItemChange(updatedItems);
  };

  const handleAmountChange = (index: number, newAmount: number) => {
    if (!onItemChange) return;

    const updatedItems = smartDistributeAmount(totalAmount, scheduleItems, index, newAmount);
    onItemChange(updatedItems);
  };

  const handleAddDate = () => {
    if (!onItemChange) return;

    const today = new Date();
    const lastItem = scheduleItems[scheduleItems.length - 1];
    const lastDate = lastItem ? new Date(lastItem.due_date + 'T00:00:00') : today;

    // Default to 1 day after last item or today
    const newDate = new Date(lastDate);
    newDate.setDate(newDate.getDate() + 1);

    const newItem: ExpenseScheduleItem = {
      id: `temp-${Date.now()}`,
      installment_number: scheduleItems.length + 1,
      due_date: formatDateInput(newDate),
      amount_due: 0,
      amount_paid: 0,
      balance: 0,
      status: PaymentStatus.PENDING
    };

    const updatedItems = [...scheduleItems, newItem];
    const redistributed = distributeAmount(totalAmount, updatedItems);
    onItemChange(redistributed);
  };

  const handleRemoveDate = (index: number) => {
    if (!onItemChange) return;

    // Can only remove if it's the last item and not paid
    const item = scheduleItems[index];
    if (index !== scheduleItems.length - 1 || item.status === PaymentStatus.PAID || item.status === PaymentStatus.PARTIALLY_PAID) {
      return;
    }

    const updatedItems = scheduleItems.filter((_, i) => i !== index);
    // Renumber installments
    updatedItems.forEach((itm, i) => {
      itm.installment_number = i + 1;
    });
    const redistributed = distributeAmount(totalAmount, updatedItems);
    onItemChange(redistributed);
  };

  const getStatusChipClass = (status: PaymentStatus | string | undefined): string => {
    const statusStr = status?.toString() || 'PENDING';
    switch (statusStr) {
      case PaymentStatus.PAID:
      case 'PAID':
        return 'paid';
      case PaymentStatus.PARTIALLY_PAID:
      case 'PARTIALLY_PAID':
        return 'partially-paid';
      case PaymentStatus.OVERDUE:
      case 'OVERDUE':
        return 'overdue';
      case PaymentStatus.PENDING:
      case 'PENDING':
        return 'pending';
      case PaymentStatus.CANCELLED:
      case 'CANCELLED':
        return 'cancelled';
      case PaymentStatus.WRITTEN_OFF:
      case 'WRITTEN_OFF':
        return 'written-off';
      default:
        return 'pending';
    }
  };

  const formatStatusLabel = (status: PaymentStatus | string | undefined): string => {
    return (status?.toString() || 'PENDING').replace('_', ' ');
  };

  // Calculate totals
  const totalDue = scheduleItems.reduce((sum, item) => sum + (item.amount_due || 0), 0);
  const totalPaid = scheduleItems.reduce((sum, item) => sum + (item.amount_paid || 0), 0);
  const totalBalance = totalDue - totalPaid;

  const isEditable = mode === 'add' || mode === 'edit';
  const showPaidColumn = mode === 'edit' || mode === 'view';

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
      `}</style>

      <div className="table-wrapper" style={{ maxHeight: '400px', marginBottom: '20px' }}>
        <table className="modal-table">
          <thead className="modal-table-heading">
            <tr>
              <th style={{ width: '60px' }}>No.</th>
              <th style={{ width: '140px' }}>Due Date</th>
              <th style={{ width: '120px' }}>Amount Due</th>
              {showPaidColumn && <th style={{ width: '120px' }}>Paid Amount</th>}
              <th style={{ width: '120px' }}>Balance</th>
              <th style={{ width: '140px' }}>Status</th>
              {canRecordPayment && (
                <th style={{ width: '80px' }}>Action</th>
              )}
            </tr>
          </thead>
          <tbody className="modal-table-body">
            {scheduleItems.map((item, index) => {
              const itemBalance = item.balance ?? (item.amount_due - (item.amount_paid || 0));
              const isDateEditable = isEditable && item.status === PaymentStatus.PENDING;
              const isAmountEditable = isEditable && item.status === PaymentStatus.PENDING;
              const canRemove = index === scheduleItems.length - 1 && item.status === PaymentStatus.PENDING;

              return (
                <tr key={item.id || index}>
                  {/* Installment Number */}
                  <td style={{ textAlign: 'center' }}>
                    <span>{item.installment_number}</span>
                  </td>

                  {/* Due Date */}
                  <td>
                    {isDateEditable && editingDateIndex === index ? (
                      <div>
                        <input
                          type="date"
                          value={item.due_date}
                          onChange={(e) => handleDateChange(index, e.target.value)}
                          onBlur={() => setEditingDateIndex(null)}
                          min={new Date().toISOString().split('T')[0]}
                          autoFocus
                          className={dateError ? 'invalid-input' : ''}
                          style={{ width: '100%', padding: '4px' }}
                        />
                        {dateError && <small className="error-text">{dateError}</small>}
                      </div>
                    ) : (
                      <span
                        onClick={() => isDateEditable && setEditingDateIndex(index)}
                        style={{
                          cursor: isDateEditable ? 'pointer' : 'default',
                          textDecoration: isDateEditable ? 'underline' : 'none'
                        }}
                      >
                        {formatDate(item.due_date)}
                        {!isDateEditable && item.status !== PaymentStatus.PENDING && <i className="ri-lock-line" style={{ marginLeft: '5px', fontSize: '12px' }}></i>}
                      </span>
                    )}
                  </td>

                  {/* Amount Due */}
                  <td>
                    {isAmountEditable && editingAmountIndex === index ? (
                      <input
                        type="number"
                        value={item.amount_due}
                        onChange={(e) => handleAmountChange(index, parseFloat(e.target.value) || 0)}
                        onBlur={() => setEditingAmountIndex(null)}
                        min="0.01"
                        step="0.01"
                        autoFocus
                      />
                    ) : (
                      <span
                        onClick={() => isAmountEditable && setEditingAmountIndex(index)}
                        style={{
                          cursor: isAmountEditable ? 'pointer' : 'default',
                          textDecoration: isAmountEditable ? 'underline' : 'none'
                        }}
                      >
                        {formatMoney(item.amount_due)}
                      </span>
                    )}
                  </td>

                  {/* Paid Amount (edit/view mode) */}
                  {showPaidColumn && (
                    <td style={{ backgroundColor: (item.amount_paid || 0) > 0 ? '#E8F5E9' : 'transparent' }}>
                      {formatMoney(item.amount_paid || 0)}
                    </td>
                  )}

                  {/* Balance */}
                  <td style={{ fontWeight: itemBalance > 0 ? '600' : 'normal' }}>
                    {formatMoney(itemBalance)}
                  </td>

                  {/* Status */}
                  <td style={{ textAlign: 'center' }}>
                    <span className={`chip ${getStatusChipClass(item.status)}`}>
                      {formatStatusLabel(item.status)}
                    </span>
                  </td>
                  {canRecordPayment && (
                    <td className="actionButtons">
                      <div className="actionButtonsContainer">
                        {item.status !== PaymentStatus.PAID && (
                          <button
                            onClick={() => onRecordPayment(item)}
                            className="payBtn"
                            title="Record Payment"
                          >
                            <i className="ri-money-dollar-circle-line"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {/* Totals Row */}
            <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: '600', backgroundColor: 'var(--table-header-color)' }}>
              <td colSpan={2}>
                TOTAL:
              </td>
              <td>{formatMoney(totalDue)}</td>
              {showPaidColumn && <td>{formatMoney(totalPaid)}</td>}
              <td style={{ color: totalBalance > 0 ? '#FF4949' : '#4CAF50' }}>{formatMoney(totalBalance)}</td>
              <td colSpan={isEditable ? 2 : 1}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add Date Button
      {isEditable && (
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            onClick={handleAddDate}
            className="modal-table-add-btn"
          >
            <i className="ri-add-line"></i>
            Add Installment Date
          </button>
        </div>
      )} */}

      {/* Warning if total mismatch */}
      {Math.abs(totalDue - totalAmount) > 0.01 && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#FFF3CD', borderRadius: '4px', border: '1px solid #FFE69C' }}>
          <i className="ri-alert-line" style={{ color: '#856404', marginRight: '5px' }}></i>
          <span style={{ color: '#856404', fontSize: '14px' }}>
            Warning: Total due ({formatMoney(totalDue)}) does not match total amount ({formatMoney(totalAmount)})
          </span>
        </div>
      )}
    </>
  );
};

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default ExpenseScheduleTable;
