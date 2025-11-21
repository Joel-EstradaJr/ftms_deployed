'use client';

import React from 'react';
import { formatDate, formatMoney, formatDateTime } from '@/app/utils/formatting';
import { JournalEntry, EntryType, JournalStatus } from '@/app/types/jev';
import JournalLinesTable, { JournalLine as JLTableLine } from '@/app/Components/JournalLinesTable';
import '@/app/styles/components/forms.css';
import '@/app/styles/JEV/journal-modals.css';

interface ViewJournalEntryModalProps {
  entry: JournalEntry;
  onClose: () => void;
}

const ViewJournalEntryModal: React.FC<ViewJournalEntryModalProps> = ({
  entry,
  onClose,
}) => {
  // Map entry lines to JournalLinesTable format
  const journalLines: JLTableLine[] = entry.journal_lines.map((line) => ({
    line_id: line.line_id,
    account_id: line.account_id,
    line_description: line.description || '',
    debit_amount: line.debit_amount || 0,
    credit_amount: line.credit_amount || 0,
  }));

  // Extract chart of accounts from journal lines
  const accounts = entry.journal_lines
    .map((line) => line.account)
    .filter((acc) => acc !== undefined && acc !== null)
    .map((acc) => ({
      account_id: acc!.account_id,
      account_code: acc!.account_code,
      account_name: acc!.account_name,
      account_type: acc!.account_type as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
      normal_balance: (acc!.normal_balance || 'DEBIT') as 'DEBIT' | 'CREDIT',
      is_active: acc!.is_active ?? true,
    }));

  const getEntryTypeLabel = (type: EntryType): string => {
    const labels: Record<EntryType, string> = {
      [EntryType.MANUAL]: 'Manual Entry',
      [EntryType.AUTO_REVENUE]: 'Auto - Revenue',
      [EntryType.AUTO_EXPENSE]: 'Auto - Expense',
      [EntryType.AUTO_PAYROLL]: 'Auto - Payroll',
      [EntryType.AUTO_LOAN]: 'Auto - Loan',
      [EntryType.AUTO_PURCHASE]: 'Auto - Purchase',
      [EntryType.AUTO_REFUND]: 'Auto - Refund',
      [EntryType.ADJUSTMENT]: 'Adjustment',
      [EntryType.CLOSING]: 'Closing Entry',
    };
    return labels[type] || type;
  };

  const getEntryTypeClass = (type: EntryType): string => {
    if (type === EntryType.MANUAL) return 'manual';
    if (type === EntryType.ADJUSTMENT) return 'adjustment';
    if (type === EntryType.CLOSING) return 'closing';
    return 'auto';
  };

  const getStatusClass = (status: JournalStatus): string => {
    return status.toLowerCase();
  };

  const getStatusBadge = (status: JournalStatus) => {
    const badges = {
      [JournalStatus.DRAFT]: <span className={`chip ${getStatusClass(status)}`}>Draft</span>,
      [JournalStatus.POSTED]: <span className={`chip ${getStatusClass(status)}`}>Posted</span>,
      [JournalStatus.REVERSED]: <span className={`chip ${getStatusClass(status)}`}>Reversed</span>,
    };
    return badges[status];
  };

  return (
    <>
      <div className="modal-heading">
        <h2 className="modal-title">Journal Entry Details</h2>
        <button onClick={onClose} className="close-modal-btn">
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="modal-content view-form">
        {/* Entry Information */}
        <div className="form-section">
          <h3 className="details-title">Entry Information</h3>
          <div className="mainDetails">
            <div className="detailRow">
              <span className="label">Journal Number:</span>
              <span className="value">{entry.journal_number}</span>
            </div>

            <div className="detailRow">
              <span className="label">Status:</span>
              <span className="value">{getStatusBadge(entry.status)}</span>
            </div>

            <div className="detailRow">
              <span className="label">Entry Type:</span>
              <span className="value">
                <span className={`chip ${getEntryTypeClass(entry.entry_type)}`}>
                  {getEntryTypeLabel(entry.entry_type)}
                </span>
              </span>
            </div>

            <div className="detailRow">
              <span className="label">Transaction Date:</span>
              <span className="value">{formatDate(entry.transaction_date)}</span>
            </div>

            {entry.posting_date && (
              <div className="detailRow">
                <span className="label">Posting Date:</span>
                <span className="value">{formatDate(entry.posting_date)}</span>
              </div>
            )}

            {entry.reference_number && (
              <div className="detailRow">
                <span className="label">Reference Number:</span>
                <span className="value">{entry.reference_number}</span>
              </div>
            )}

            <div className="detailRow">
              <span className="label">Description:</span>
              <span className="value">{entry.description}</span>
            </div>

            {entry.source_module && (
              <>
                <div className="detailRow">
                  <span className="label">Source Module:</span>
                  <span className="value">{entry.source_module}</span>
                </div>

                {entry.source_id && (
                  <div className="detailRow">
                    <span className="label">Source ID:</span>
                    <span className="value">{entry.source_id}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Journal Lines */}
        <div className="form-section">
          <h3 className="details-title">Journal Lines</h3>
          <JournalLinesTable
            lines={journalLines}
            accounts={accounts}
            onChange={() => {}}
            onBlur={() => {}}
            onAddLine={() => {}}
            onRemoveLine={() => {}}
            errors={{}}
            readonly={true}
          />
        </div>

        {/* Audit Trail */}
        <div className="form-section">
          <h3 className="details-title">Audit Trail</h3>
          <div className="mainDetails">
            <div className="detailRow">
              <span className="label">Created By:</span>
              <span className="value">{entry.created_by}</span>
            </div>

            <div className="detailRow">
              <span className="label">Created At:</span>
              <span className="value">{formatDateTime(entry.created_at)}</span>
            </div>

            {entry.posted_by && (
              <>
                <div className="detailRow">
                  <span className="label">Posted By:</span>
                  <span className="value">{entry.posted_by}</span>
                </div>

                {entry.posted_at && (
                  <div className="detailRow">
                    <span className="label">Posted At:</span>
                    <span className="value">{formatDateTime(entry.posted_at)}</span>
                  </div>
                )}
              </>
            )}

            {entry.updated_at && (
              <>
                <div className="detailRow">
                  <span className="label">Last Updated:</span>
                  <span className="value">{formatDateTime(entry.updated_at)}</span>
                </div>

                {entry.updated_by && (
                  <div className="detailRow">
                    <span className="label">Updated By:</span>
                    <span className="value">{entry.updated_by}</span>
                  </div>
                )}
              </>
            )}

            {entry.reversed_by_id && (
              <div className="detailRow">
                <span className="label">Reversed By:</span>
                <span className="value reversed-info">
                  <i className="ri-arrow-go-back-line"></i>
                  This entry was reversed by JE #{entry.reversed_by_id}
                </span>
              </div>
            )}

            {entry.attachments && entry.attachments.length > 0 && (
              <div className="detailRow">
                <span className="label">Attachments:</span>
                <span className="value">
                  {entry.attachments.map((attachment, index) => (
                    <div key={index} className="attachment-item">
                      <i className="ri-attachment-line"></i>
                      <span>{attachment}</span>
                    </div>
                  ))}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button onClick={onClose} className="cancel-btn">
          Close
        </button>
      </div>
    </>
  );
};

export default ViewJournalEntryModal;
