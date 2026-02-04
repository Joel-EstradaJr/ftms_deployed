"use client";

import React from "react";
import "@/app/styles/expense/viewExpense.css";
import ModalHeader from "@/app/Components/ModalHeader";

interface ExpenseRecord {
  expense_id: string;
  category: {
    category_id: string;
    name: string;
  };
  total_amount: number;
  expense_date: string;
  assignment_id?: string;
  payment_method: {
    id: string;
    name: string;
  };
}

interface ViewExpenseModalProps {
  record: ExpenseRecord;
  onClose: () => void;
}

const formatDisplay = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? "-" : value;

const formatMoney = (amount: number) => 
  `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const ViewExpenseModal: React.FC<ViewExpenseModalProps> = ({ record, onClose }) => {
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="viewExpenseModal" onClick={(e) => e.stopPropagation()}>
        <ModalHeader title="Expense Details" onClose={onClose} />
        <div className="modalBody">
          <div className="mainDetails">
            <div className="detailRow">
              <span className="label">Expense ID:</span>
              <span className="value">{formatDisplay(record.expense_id)}</span>
            </div>
            <div className="detailRow">
              <span className="label">Category:</span>
              <span className="value">{formatDisplay(record.category?.name)}</span>
            </div>
            <div className="detailRow">
              <span className="label">Total Amount:</span>
              <span className="value">{formatMoney(record.total_amount)}</span>
            </div>
            <div className="detailRow">
              <span className="label">Expense Date:</span>
              <span className="value">{formatDate(record.expense_date)}</span>
            </div>
            {record.assignment_id && (
              <div className="detailRow">
                <span className="label">Assignment ID:</span>
                <span className="value">{formatDisplay(record.assignment_id)}</span>
              </div>
            )}
            <div className="detailRow">
              <span className="label">Payment Method:</span>
              <span className="value">{formatDisplay(record.payment_method?.name)}</span>
            </div>
          </div>
        </div>
        <div className="modalFooter">
          <button className="closeBtn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewExpenseModal;
