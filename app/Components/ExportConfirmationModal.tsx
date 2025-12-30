"use client";

import React, { useEffect, useRef } from 'react';
import styles from '../styles/components/ExportConfirmationModal.module.css';
import ModalHeader from './ModalHeader';

type DashboardCategoryData = Record<string, { name: string; amount: number }>;

interface ExportConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dateFilter: string;
  dateFrom: string;
  dateTo: string;
  dashboardData: {
    revenue: {
      total: number;
      byCategory: DashboardCategoryData;
    };
    expense: {
      total: number;
      byCategory: DashboardCategoryData;
    };
    profit: number;
  };
}

const ExportConfirmationModal: React.FC<ExportConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  dateFilter,
  dateFrom,
  dateTo,
  dashboardData,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the confirm button when modal opens
      confirmButtonRef.current?.focus();

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, onClose]);

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const getDateRangeText = () => {
    switch (dateFilter) {
      case 'Day':
        return 'Today';
      case 'Month':
        return 'This Month';
      case 'Year':
        return 'This Year';
      case 'Custom':
        return `${dateFrom} to ${dateTo}`;
      default:
        return 'All Time';
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      aria-describedby="export-modal-description"
    >
      <div
        className={styles.modalContent}
        ref={modalRef}
        role="document"
      >
        <ModalHeader title="Confirm Export" onClose={onClose} />

        <div
          className={styles.summarySection}
          id="export-modal-description"
        >
          <h3>Data Summary</h3>
          <div className={styles.dateRange}>
            <strong>Date Range:</strong> {getDateRangeText()}
          </div>
          
          <div className={styles.financialSummary}>
            <div className={styles.summaryItem}>
              <strong>Total Revenue:</strong> ₱{dashboardData.revenue.total.toLocaleString()}
            </div>
            <div className={styles.summaryItem}>
              <strong>Total Expenses:</strong> ₱{dashboardData.expense.total.toLocaleString()}
            </div>
            <div className={styles.summaryItem}>
              <strong>Net Profit:</strong> ₱{dashboardData.profit.toLocaleString()}
            </div>
          </div>

          <div className={styles.categoryBreakdown}>
            <div className={styles.categorySection}>
              <h4>Revenue Categories:</h4>
              {Object.entries(dashboardData.revenue.byCategory).map(([categoryKey, categoryData]) => (
                <div key={categoryKey} className={styles.categoryItem}>
                  <span>{categoryData.name.replace('_', ' ')}:</span>
                  <span>₱{categoryData.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className={styles.categorySection}>
              <h4>Expense Categories:</h4>
              {Object.entries(dashboardData.expense.byCategory).map(([categoryKey, categoryData]) => (
                <div key={categoryKey} className={styles.categoryItem}>
                  <span>{categoryData.name.replace('_', ' ')}:</span>
                  <span>₱{categoryData.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
            aria-label="Cancel export"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={styles.confirmButton}
            aria-label="Confirm and start export"
          >
            Confirm Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportConfirmationModal; 