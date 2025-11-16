'use client';

import React from 'react';
import { formatDate, formatMoney } from '@/app/utils/formatting';
import { JournalEntry, EntryType, JournalStatus } from '@/app/types/jev';
import '@/app/styles/general/forms.css';
import '@/app/styles/JEV/journal-entries.css';

interface ViewJournalEntryModalProps {
  entry: JournalEntry;
  onClose: () => void;
}

const ViewJournalEntryModal: React.FC<ViewJournalEntryModalProps> = ({
  entry,
  onClose,
}) => {
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

  const getStatusBadge = (status: JournalStatus) => {
    const badges = {
      [JournalStatus.DRAFT]: <span className="chip draft">Draft</span>,
      [JournalStatus.POSTED]: <span className="chip posted">Posted</span>,
      [JournalStatus.REVERSED]: <span className="chip reversed">Reversed</span>,
    };
    return badges[status];
  };

  return (
    <>
      <div className="modal-heading">
        <h2>Journal Entry Details</h2>
        <button onClick={onClose} className="closeBtn">
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="modal-content view">
        {/* Header Information */}
        <div className="form-section">
          <h3>Entry Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Journal Number</label>
              <div className="value-display">{entry.journal_number}</div>
            </div>

            <div className="form-group">
              <label>Status</label>
              <div className="value-display">{getStatusBadge(entry.status)}</div>
            </div>

            <div className="form-group">
              <label>Entry Type</label>
              <div className="value-display">{getEntryTypeLabel(entry.entry_type)}</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Transaction Date</label>
              <div className="value-display">{formatDate(entry.transaction_date)}</div>
            </div>

            {entry.posting_date && (
              <div className="form-group">
                <label>Posting Date</label>
                <div className="value-display">{formatDate(entry.posting_date)}</div>
              </div>
            )}

            {entry.reference_number && (
              <div className="form-group">
                <label>Reference Number</label>
                <div className="value-display">{entry.reference_number}</div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Description</label>
            <div className="value-display description-box">{entry.description}</div>
          </div>

          {entry.source_module && (
            <div className="form-row">
              <div className="form-group">
                <label>Source Module</label>
                <div className="value-display">{entry.source_module}</div>
              </div>

              {entry.source_id && (
                <div className="form-group">
                  <label>Source ID</label>
                  <div className="value-display">{entry.source_id}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Journal Lines */}
        <div className="form-section">
          <h3>Journal Lines</h3>
          
          <div className="journal-lines-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>#</th>
                  <th style={{ width: '15%' }}>Account Code</th>
                  <th style={{ width: '25%' }}>Account Name</th>
                  <th style={{ width: '30%' }}>Description</th>
                  <th style={{ width: '12.5%' }}>Debit</th>
                  <th style={{ width: '12.5%' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {entry.journal_lines.map((line, index) => (
                  <tr key={line.line_id || index}>
                    <td className="line-number">{line.line_number}</td>
                    <td>{line.account?.account_code}</td>
                    <td>{line.account?.account_name}</td>
                    <td>{line.description || '-'}</td>
                    <td className="amount-cell debit">
                      {line.debit_amount ? formatMoney(line.debit_amount) : '-'}
                    </td>
                    <td className="amount-cell credit">
                      {line.credit_amount ? formatMoney(line.credit_amount) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={4} className="totals-label">Totals:</td>
                  <td className="total-debit">{formatMoney(entry.total_debit)}</td>
                  <td className="total-credit">{formatMoney(entry.total_credit)}</td>
                </tr>
                <tr className={`balance-row ${entry.is_balanced ? 'balanced' : 'unbalanced'}`}>
                  <td colSpan={4} className="balance-label">
                    {entry.is_balanced ? (
                      <><i className="ri-checkbox-circle-fill"></i> Balanced</>
                    ) : (
                      <><i className="ri-error-warning-fill"></i> Out of Balance</>
                    )}
                  </td>
                  <td colSpan={2} className="balance-amount">
                    {!entry.is_balanced && `Difference: ${formatMoney(Math.abs(entry.total_debit - entry.total_credit))}`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Metadata Section */}
        <div className="form-section">
          <h3>Metadata</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Created By</label>
              <div className="value-display">{entry.created_by}</div>
            </div>

            <div className="form-group">
              <label>Created At</label>
              <div className="value-display">{formatDate(entry.created_at)}</div>
            </div>
          </div>

          {entry.posted_by && (
            <div className="form-row">
              <div className="form-group">
                <label>Posted By</label>
                <div className="value-display">{entry.posted_by}</div>
              </div>

              {entry.posted_at && (
                <div className="form-group">
                  <label>Posted At</label>
                  <div className="value-display">{formatDate(entry.posted_at)}</div>
                </div>
              )}
            </div>
          )}

          {entry.updated_at && (
            <div className="form-row">
              <div className="form-group">
                <label>Last Updated</label>
                <div className="value-display">{formatDate(entry.updated_at)}</div>
              </div>

              {entry.updated_by && (
                <div className="form-group">
                  <label>Updated By</label>
                  <div className="value-display">{entry.updated_by}</div>
                </div>
              )}
            </div>
          )}

          {entry.reversed_by_id && (
            <div className="form-group">
              <label>Reversed By Entry</label>
              <div className="value-display reversed-info">
                <i className="ri-arrow-go-back-line"></i>
                This entry was reversed by JE #{entry.reversed_by_id}
              </div>
            </div>
          )}
        </div>

        {/* Attachments Section (if any) */}
        {entry.attachments && entry.attachments.length > 0 && (
          <div className="form-section">
            <h3>Attachments</h3>
            <div className="attachments-list">
              {entry.attachments.map((attachment, index) => (
                <div key={index} className="attachment-item">
                  <i className="ri-attachment-line"></i>
                  <span>{attachment}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="modal-actions">
        <button onClick={onClose} className="cancelBtn">
          Close
        </button>
      </div>
    </>
  );
};

export default ViewJournalEntryModal;
