'use client';

import React, { useState } from 'react';
import { showError, showConfirmation } from '@/app/utils/Alerts';
import { formatDate, formatMoney } from '@/app/utils/formatting';
import { JournalEntry, JournalStatus } from '@/app/types/jev';
import '@/app/styles/components/forms.css';
import '@/app/styles/JEV/journal-entries.css';

interface PostEntryModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onPost: (postingDate: string) => Promise<void>;
}

const PostEntryModal: React.FC<PostEntryModalProps> = ({
  entry,
  onClose,
  onPost,
}) => {
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPosting, setIsPosting] = useState(false);

  // Validation: Only draft entries can be posted
  if (entry.status !== JournalStatus.DRAFT) {
    return (
      <>
        <div className="modal-heading">
          <h2 className="modal-title">Post Journal Entry</h2>
          <button onClick={onClose} className="close-modal-btn">
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="modal-content view-form">
          <div className="error-message">
            <i className="ri-error-warning-line"></i>
            Only draft entries can be posted. This entry is already {entry.status.toLowerCase()}.
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="cancel-btn">Close</button>
        </div>
      </>
    );
  }

  // Validation: Entry must be balanced
  if (!entry.is_balanced) {
    return (
      <>
        <div className="modal-heading">
          <h2 className="modal-title">Post Journal Entry</h2>
          <button onClick={onClose} className="close-modal-btn">
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="modal-content view-form">
          <div className="error-message">
            <i className="ri-error-warning-line"></i>
            This entry cannot be posted because it is not balanced.
            <br/>
            <strong>Difference:</strong> {formatMoney(Math.abs(entry.total_debit - entry.total_credit))}
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="cancel-btn">Close</button>
        </div>
      </>
    );
  }

  const handlePost = async () => {
    if (!postingDate) {
      await showError('Posting date is required', 'Validation Error');
      return;
    }

    const result = await showConfirmation(
      `Are you sure you want to post this journal entry?<br/><br/>
      <strong>Journal Number:</strong> ${entry.journal_number}<br/>
      <strong>Transaction Date:</strong> ${formatDate(entry.transaction_date)}<br/>
      <strong>Posting Date:</strong> ${formatDate(postingDate)}<br/>
      <strong>Total Debit:</strong> ${formatMoney(entry.total_debit)}<br/>
      <strong>Total Credit:</strong> ${formatMoney(entry.total_credit)}<br/><br/>
      <span style="color: var(--warning-color);">
        <i class="ri-alert-line"></i> This action cannot be undone. Once posted, the entry can only be reversed.
      </span>`,
      'Confirm Posting'
    );

    if (result.isConfirmed) {
      setIsPosting(true);
      try {
        await onPost(postingDate);
      } catch (error) {
        setIsPosting(false);
      }
    }
  };

  return (
    <>
      <div className="modal-heading">
        <h2 className="modal-title">Post Journal Entry</h2>
        <button onClick={onClose} className="close-modal-btn" disabled={isPosting}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="modal-content add-form">
        {/* Entry Summary */}
        <div className="form-section">
          <h3 className="details-title">Entry Summary</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Journal Number</label>
              <div className="value-display">{entry.journal_number}</div>
            </div>

            <div className="form-group">
              <label>Transaction Date</label>
              <div className="value-display">{formatDate(entry.transaction_date)}</div>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <div className="value-display description-box">{entry.description}</div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Total Debit</label>
              <div className="value-display amount-highlight">{formatMoney(entry.total_debit)}</div>
            </div>

            <div className="form-group">
              <label>Total Credit</label>
              <div className="value-display amount-highlight">{formatMoney(entry.total_credit)}</div>
            </div>

            <div className="form-group">
              <label>Balance Status</label>
              <div className="value-display">
                <span className="chip balanced">
                  <i className="ri-checkbox-circle-fill"></i> Balanced
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Posting Date */}
        <div className="form-section">
          <h3 className="details-title">Posting Information</h3>
          
          <div className="form-group">
            <label htmlFor="posting_date">
              Posting Date <span className="required">*</span>
            </label>
            <input
              type="date"
              id="posting_date"
              value={postingDate}
              onChange={(e) => setPostingDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              disabled={isPosting}
            />
            <span className="field-note">
              The date when this entry will be recorded in the general ledger
            </span>
          </div>

          <div className="warning-box">
            <i className="ri-alert-line"></i>
            <div>
              <strong>Important:</strong> Once posted, this journal entry cannot be edited or deleted.
              You can only reverse it by creating a reversing entry.
            </div>
          </div>
        </div>

        {/* Journal Lines Preview */}
        <div className="form-section">
          <h3 className="details-title">Journal Lines ({entry.journal_lines.length})</h3>
          
          <div className="journal-lines-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Account Code</th>
                  <th style={{ width: '30%' }}>Account Name</th>
                  <th style={{ width: '35%' }}>Description</th>
                  <th style={{ width: '10%' }}>Debit</th>
                  <th style={{ width: '10%' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {entry.journal_lines.map((line, index) => (
                  <tr key={line.line_id || index}>
                    <td>{line.account?.account_code}</td>
                    <td>{line.account?.account_name}</td>
                    <td>{line.description || '-'}</td>
                    <td className="amount-cell">
                      {line.debit_amount ? formatMoney(line.debit_amount) : '-'}
                    </td>
                    <td className="amount-cell">
                      {line.credit_amount ? formatMoney(line.credit_amount) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button onClick={onClose} className="cancel-btn" disabled={isPosting}>
          Cancel
        </button>
        <button 
          onClick={handlePost} 
          className="submit-btn"
          disabled={isPosting || !postingDate}
        >
          {isPosting ? (
            <>
              <i className="ri-loader-4-line rotating"></i> Posting...
            </>
          ) : (
            <>
              <i className="ri-checkbox-circle-line"></i> Post Entry
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default PostEntryModal;
