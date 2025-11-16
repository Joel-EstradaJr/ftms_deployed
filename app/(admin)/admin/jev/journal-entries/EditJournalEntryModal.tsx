'use client';

import React, { useState } from 'react';
import { showError, showConfirmation } from '@/app/utils/Alerts';
import { formatMoney } from '@/app/utils/formatting';
import { ChartOfAccount, JournalEntry, JournalEntryFormData, JournalEntryLine, JournalStatus } from '@/app/types/jev';
import '@/app/styles/general/forms.css';
import '@/app/styles/JEV/journal-entries.css';

interface EditJournalEntryModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onSubmit: (data: JournalEntryFormData) => Promise<void>;
  accounts: ChartOfAccount[];
}

const EditJournalEntryModal: React.FC<EditJournalEntryModalProps> = ({
  entry,
  onClose,
  onSubmit,
  accounts,
}) => {
  // Only allow editing draft entries
  if (entry.status !== JournalStatus.DRAFT) {
    return (
      <>
        <div className="modal-heading">
          <h2>Edit Journal Entry</h2>
          <button onClick={onClose} className="closeBtn">
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="modal-content view">
          <div className="error-message">
            <i className="ri-error-warning-line"></i>
            Only draft entries can be edited. This entry has been {entry.status.toLowerCase()}.
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="cancelBtn">Close</button>
        </div>
      </>
    );
  }

  const [formData, setFormData] = useState<JournalEntryFormData>({
    transaction_date: entry.transaction_date.split('T')[0],
    reference_number: entry.reference_number || '',
    description: entry.description,
    entry_type: entry.entry_type,
    source_module: entry.source_module,
    source_id: entry.source_id,
    journal_lines: entry.journal_lines.map(line => ({
      line_id: line.line_id,
      account_id: line.account_id,
      line_number: line.line_number,
      description: line.description,
      debit_amount: line.debit_amount || 0,
      credit_amount: line.credit_amount || 0,
    })),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate totals
  const totalDebit = formData.journal_lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const totalCredit = formData.journal_lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;
  const balanceDifference = totalDebit - totalCredit;

  const handleInputChange = (field: keyof JournalEntryFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: '' });
  };

  const handleLineChange = (index: number, field: keyof JournalEntryLine, value: any) => {
    const updatedLines = [...formData.journal_lines];
    
    if (field === 'debit_amount') {
      updatedLines[index] = {
        ...updatedLines[index],
        debit_amount: value ? parseFloat(value) : 0,
        credit_amount: 0,
      };
    } else if (field === 'credit_amount') {
      updatedLines[index] = {
        ...updatedLines[index],
        credit_amount: value ? parseFloat(value) : 0,
        debit_amount: 0,
      };
    } else {
      updatedLines[index] = { ...updatedLines[index], [field]: value };
    }

    setFormData({ ...formData, journal_lines: updatedLines });
  };

  const addLine = () => {
    const newLine: JournalEntryLine = {
      account_id: '',
      line_number: formData.journal_lines.length + 1,
      description: '',
      debit_amount: 0,
      credit_amount: 0,
    };
    setFormData({ ...formData, journal_lines: [...formData.journal_lines, newLine] });
  };

  const removeLine = (index: number) => {
    if (formData.journal_lines.length <= 2) {
      showError('Journal entry must have at least 2 lines', 'Validation Error');
      return;
    }
    const updatedLines = formData.journal_lines.filter((_, i) => i !== index);
    updatedLines.forEach((line, idx) => {
      line.line_number = idx + 1;
    });
    setFormData({ ...formData, journal_lines: updatedLines });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.transaction_date) {
      newErrors.transaction_date = 'Transaction date is required';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    let hasValidLine = false;
    formData.journal_lines.forEach((line, index) => {
      if (!line.account_id) {
        newErrors[`line_${index}_account`] = 'Account is required';
      }
      if ((line.debit_amount || 0) === 0 && (line.credit_amount || 0) === 0) {
        newErrors[`line_${index}_amount`] = 'Either debit or credit amount is required';
      } else {
        hasValidLine = true;
      }
    });

    if (!hasValidLine) {
      newErrors.journal_lines = 'At least one journal line with an amount is required';
    }

    if (!isBalanced) {
      newErrors.balance = `Entry is not balanced. Difference: ${formatMoney(Math.abs(balanceDifference))}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      await showError('Please fix the validation errors', 'Validation Error');
      return;
    }

    const result = await showConfirmation(
      `Update this journal entry?<br/>
      <strong>Total Debit:</strong> ${formatMoney(totalDebit)}<br/>
      <strong>Total Credit:</strong> ${formatMoney(totalCredit)}`,
      'Confirm Update'
    );

    if (result.isConfirmed) {
      await onSubmit(formData);
    }
  };

  const handleCancel = async () => {
    const result = await showConfirmation(
      'Discard unsaved changes?',
      'Confirm Cancel'
    );
    if (result.isConfirmed) {
      onClose();
    }
  };

  const activeAccounts = accounts.filter(acc => acc.is_active);

  return (
    <>
      <div className="modal-heading">
        <h2>Edit Journal Entry - {entry.journal_number}</h2>
        <button onClick={handleCancel} className="closeBtn">
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="modal-content edit">
        {/* Entry Information Section */}
        <div className="form-section">
          <h3>Entry Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="transaction_date">
                Transaction Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="transaction_date"
                value={formData.transaction_date}
                onChange={(e) => handleInputChange('transaction_date', e.target.value)}
                className={errors.transaction_date ? 'error' : ''}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.transaction_date && (
                <span className="error-message">{errors.transaction_date}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="reference_number">Reference Number</label>
              <input
                type="text"
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => handleInputChange('reference_number', e.target.value)}
                placeholder="Optional reference"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">
              Description <span className="required">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={errors.description ? 'error' : ''}
              placeholder="Describe this journal entry..."
              rows={3}
            />
            {errors.description && (
              <span className="error-message">{errors.description}</span>
            )}
          </div>
        </div>

        {/* Journal Lines Section */}
        <div className="form-section">
          <div className="section-header">
            <h3>Journal Lines</h3>
            <button type="button" onClick={addLine} className="btn-add-line">
              <i className="ri-add-line"></i> Add Line
            </button>
          </div>

          <div className="journal-lines-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>#</th>
                  <th style={{ width: '25%' }}>Account <span className="required">*</span></th>
                  <th style={{ width: '30%' }}>Description</th>
                  <th style={{ width: '15%' }}>Debit</th>
                  <th style={{ width: '15%' }}>Credit</th>
                  <th style={{ width: '10%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {formData.journal_lines.map((line, index) => (
                  <tr key={line.line_id || index} className={errors[`line_${index}_account`] || errors[`line_${index}_amount`] ? 'error-row' : ''}>
                    <td className="line-number">{line.line_number}</td>
                    <td>
                      <select
                        value={line.account_id}
                        onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}
                        className={errors[`line_${index}_account`] ? 'error' : ''}
                      >
                        <option value="">Select Account...</option>
                        {activeAccounts.map(acc => (
                          <option key={acc.account_id} value={acc.account_id}>
                            {acc.account_code} - {acc.account_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={line.description || ''}
                        onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                        placeholder="Line description..."
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={line.debit_amount || ''}
                        onChange={(e) => handleLineChange(index, 'debit_amount', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={line.credit_amount || ''}
                        onChange={(e) => handleLineChange(index, 'credit_amount', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="btn-remove-line"
                        disabled={formData.journal_lines.length <= 2}
                        title="Remove line"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td colSpan={3} className="totals-label">Totals:</td>
                  <td className="total-debit">{formatMoney(totalDebit)}</td>
                  <td className="total-credit">{formatMoney(totalCredit)}</td>
                  <td></td>
                </tr>
                <tr className={`balance-row ${isBalanced ? 'balanced' : 'unbalanced'}`}>
                  <td colSpan={3} className="balance-label">
                    {isBalanced ? (
                      <><i className="ri-checkbox-circle-fill"></i> Balanced</>
                    ) : (
                      <><i className="ri-error-warning-fill"></i> Out of Balance</>
                    )}
                  </td>
                  <td colSpan={2} className="balance-amount">
                    {!isBalanced && `Difference: ${formatMoney(Math.abs(balanceDifference))}`}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {errors.journal_lines && (
            <span className="error-message">{errors.journal_lines}</span>
          )}
          {errors.balance && (
            <span className="error-message">{errors.balance}</span>
          )}
        </div>
      </div>

      <div className="modal-actions">
        <button onClick={handleCancel} className="cancelBtn">
          Cancel
        </button>
        <button 
          onClick={handleSubmit} 
          className="submitBtn"
          disabled={!isBalanced}
        >
          Update Entry
        </button>
      </div>
    </>
  );
};

export default EditJournalEntryModal;
