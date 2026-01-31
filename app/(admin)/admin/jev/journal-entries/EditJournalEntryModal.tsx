'use client';

import React, { useState, useEffect } from 'react';
import { showError, showConfirmation, showSuccess } from '@/app/utils/Alerts';
import { ChartOfAccount, JournalEntry, JournalEntryFormData, JournalEntryLine, JournalStatus } from '@/app/types/jev';
import JournalLinesTable, { JournalLine as JLTableLine } from '@/app/Components/JournalLinesTable';
import '@/app/styles/components/forms.css';
import '@/app/styles/JEV/journal-modals.css';

interface ChangeRecord {
  timestamp: number;
  field: string;
  oldValue: any;
  newValue: any;
  lineIndex?: number;
}

interface EditJournalEntryModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onSubmit: (entryId: string, data: JournalEntryFormData) => Promise<void>;
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
          <h2 className="modal-title">Edit Journal Entry</h2>
          <button onClick={onClose} className="close-modal-btn">
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="modal-content view-form">
          <div className="error-message">
            <i className="ri-error-warning-line"></i>
            Only draft entries can be edited. This entry has been {entry.status.toLowerCase()}.
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="cancel-btn">Close</button>
        </div>
      </>
    );
  }

  // Store original data for reset functionality
  const [originalData] = useState<JournalEntryFormData>({
    date: entry.transaction_date?.split('T')[0] || '',
    transaction_date: entry.transaction_date?.split('T')[0] || '',
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

  const [formData, setFormData] = useState<JournalEntryFormData>({ ...originalData });
  const [changeHistory, setChangeHistory] = useState<ChangeRecord[]>([]);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [undoHighlight, setUndoHighlight] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<{
    transaction_date?: string;
    description?: string;
    balance?: string;
    lines: {
      [lineIndex: number]: {
        account_id?: string;
        line_description?: string;
        debit_amount?: string;
        credit_amount?: string;
      }
    };
  }>({ lines: {} });

  // Calculate totals
  const totalDebit = formData.journal_lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const totalCredit = formData.journal_lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0;

  // Map to JournalLinesTable format
  const tableLines: JLTableLine[] = formData.journal_lines.map((line) => ({
    account_id: line.account_id,
    line_description: line.description || '',
    debit_amount: line.debit_amount || 0,
    credit_amount: line.credit_amount || 0,
  }));

  const tableAccounts = accounts
    .filter((acc) => acc.is_active)
    .map((acc) => ({
      account_id: acc.account_id,
      account_code: acc.account_code,
      account_name: acc.account_name,
      account_type: acc.account_type as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
      normal_balance: (acc.normal_balance || 'DEBIT') as 'DEBIT' | 'CREDIT',
      is_active: acc.is_active,
    }));

  // Check if field has changed from original
  const isFieldChanged = (field: string, lineIndex?: number): boolean => {
    if (lineIndex !== undefined) {
      const currentLine = formData.journal_lines[lineIndex];
      const originalLine = originalData.journal_lines[lineIndex];
      if (!currentLine || !originalLine) return false;

      const fieldKey = field as keyof JournalEntryLine;
      return JSON.stringify(currentLine[fieldKey]) !== JSON.stringify(originalLine[fieldKey]);
    }
    const fieldKey = field as keyof JournalEntryFormData;
    return JSON.stringify(formData[fieldKey]) !== JSON.stringify(originalData[fieldKey]);
  };

  // Track changed line indices
  const changedLineIndices = new Set<number>();
  formData.journal_lines.forEach((line, index) => {
    if (originalData.journal_lines[index]) {
      const hasChanges =
        line.account_id !== originalData.journal_lines[index].account_id ||
        line.description !== originalData.journal_lines[index].description ||
        line.debit_amount !== originalData.journal_lines[index].debit_amount ||
        line.credit_amount !== originalData.journal_lines[index].credit_amount;
      if (hasChanges) changedLineIndices.add(index);
    }
  });

  // Validation helpers
  const validateField = (field: string, value: any): string | undefined => {
    if (field === 'transaction_date' && !value) {
      return 'Transaction date is required';
    }
    if (field === 'description' && !value?.trim()) {
      return 'Description is required';
    }
    if (field === 'description' && value?.length > 500) {
      return 'Description cannot exceed 500 characters';
    }
    return undefined;
  };

  const validateLine = (index: number, field: string, lines: JLTableLine[]): string | undefined => {
    const line = lines[index];

    if (field === 'account_id' && !line.account_id) {
      return 'Account is required';
    }
    if (field === 'line_description' && line.line_description.length > 200) {
      return 'Description cannot exceed 200 characters';
    }
    if ((field === 'debit_amount' || field === 'credit_amount') &&
      line.debit_amount === 0 && line.credit_amount === 0) {
      return 'Either debit or credit amount is required';
    }
    return undefined;
  };

  const recordChange = (field: string, oldValue: any, newValue: any, lineIndex?: number) => {
    const change: ChangeRecord = {
      timestamp: Date.now(),
      field,
      oldValue,
      newValue,
      lineIndex,
    };

    const newHistory = [...changeHistory, change];
    // Limit history to 50 changes
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    setChangeHistory(newHistory);

    const fieldKey = lineIndex !== undefined ? `line_${lineIndex}_${field}` : field;
    setChangedFields(new Set(changedFields).add(fieldKey));
  };

  const handleInputChange = (field: keyof JournalEntryFormData, value: any) => {
    const oldValue = formData[field];
    if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
      recordChange(field, oldValue, value);
    }

    setFormData({ ...formData, [field]: value });

    if (field === 'transaction_date' || field === 'description') {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const handleInputBlur = (field: string) => {
    setTouchedFields(new Set(touchedFields).add(field));
    const error = validateField(field, formData[field as keyof JournalEntryFormData]);
    if (error) {
      setErrors({ ...errors, [field]: error });
    }
  };

  const handleLineChange = (index: number, field: string, value: string | number | null) => {
    const updatedLines = [...formData.journal_lines];
    const oldValue = updatedLines[index][field as keyof JournalEntryLine];

    if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
      recordChange(field, oldValue, value, index);
    }

    updatedLines[index] = {
      ...updatedLines[index],
      [field]: value
    };
    setFormData({ ...formData, journal_lines: updatedLines });

    const newErrors = { ...errors };
    if (newErrors.lines[index]) {
      delete newErrors.lines[index][field as keyof typeof newErrors.lines[number]];
      if (Object.keys(newErrors.lines[index]).length === 0) {
        delete newErrors.lines[index];
      }
    }
    setErrors(newErrors);
  };

  const handleLineBlur = (index: number, field: string) => {
    setTouchedFields(new Set(touchedFields).add(`line_${index}_${field}`));
    const error = validateLine(index, field, tableLines);
    if (error) {
      const newErrors = { ...errors };
      if (!newErrors.lines[index]) {
        newErrors.lines[index] = {};
      }
      newErrors.lines[index][field as keyof typeof newErrors.lines[number]] = error;
      setErrors(newErrors);
    }
  };

  const addLine = () => {
    const newLine: JournalEntryLine = {
      account_id: '',
      line_number: formData.journal_lines.length + 1,
      description: '',
      debit_amount: 0,
      credit_amount: 0,
    };
    recordChange('journal_lines', formData.journal_lines, [...formData.journal_lines, newLine]);
    setFormData({ ...formData, journal_lines: [...formData.journal_lines, newLine] });
  };

  const removeLine = (index: number) => {
    if (formData.journal_lines.length <= 2) {
      showError('Journal entry must have at least 2 lines', 'Validation Error');
      return;
    }
    const oldLines = [...formData.journal_lines];
    const updatedLines = formData.journal_lines.filter((_, i) => i !== index);
    updatedLines.forEach((line, idx) => {
      line.line_number = idx + 1;
    });
    recordChange('journal_lines', oldLines, updatedLines);
    setFormData({ ...formData, journal_lines: updatedLines });

    const newErrors = { ...errors };
    if (newErrors.lines[index]) {
      delete newErrors.lines[index];
    }
    setErrors(newErrors);
  };

  const validate = (): boolean => {
    const allFields = new Set([
      'transaction_date',
      'description',
      ...formData.journal_lines.flatMap((_, idx) => [
        `line_${idx}_account_id`,
        `line_${idx}_debit_amount`,
        `line_${idx}_credit_amount`,
      ]),
    ]);
    setTouchedFields(allFields);

    const newErrors: typeof errors = { lines: {} };

    const dateError = validateField('transaction_date', formData.transaction_date);
    if (dateError) newErrors.transaction_date = dateError;

    const descError = validateField('description', formData.description);
    if (descError) newErrors.description = descError;

    let hasValidLine = false;
    formData.journal_lines.forEach((line, index) => {
      if (!line.account_id) {
        if (!newErrors.lines[index]) newErrors.lines[index] = {};
        newErrors.lines[index].account_id = 'Account is required';
      }

      const debitAmt = line.debit_amount || 0;
      const creditAmt = line.credit_amount || 0;

      if (debitAmt === 0 && creditAmt === 0) {
        if (!newErrors.lines[index]) newErrors.lines[index] = {};
        newErrors.lines[index].debit_amount = 'Either debit or credit is required';
      } else {
        hasValidLine = true;
      }
    });

    if (!hasValidLine) {
      newErrors.balance = 'At least one journal line with an amount is required';
    }

    if (!isBalanced && hasValidLine) {
      newErrors.balance = `Entry is not balanced by PHP ${difference.toFixed(2)}`;
    }

    setErrors(newErrors);
    return (
      !newErrors.transaction_date &&
      !newErrors.description &&
      !newErrors.balance &&
      Object.keys(newErrors.lines).length === 0
    );
  };

  const handleSubmit = async () => {
    if (!validate()) {
      await showError('Please fix the validation errors', 'Validation Error');
      return;
    }

    const formatMoney = (amt: number) => `PHP ${amt.toFixed(2)}`;

    const result = await showConfirmation(
      `Update this journal entry?<br/>
      <strong>Total Debit:</strong> ${formatMoney(totalDebit)}<br/>
      <strong>Total Credit:</strong> ${formatMoney(totalCredit)}<br/>
      <strong>Changes Made:</strong> ${changeHistory.length}`,
      'Confirm Update'
    );

    if (result.isConfirmed) {
      await onSubmit(entry.journal_entry_id, formData);
    }
  };

  const handleCancel = async () => {
    if (changeHistory.length > 0) {
      const result = await showConfirmation(
        `Discard ${changeHistory.length} unsaved change(s)?`,
        'Confirm Cancel'
      );
      if (result.isConfirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleReset = async () => {
    const result = await showConfirmation(
      'Reset all changes to original values?',
      'Confirm Reset'
    );
    if (result.isConfirmed) {
      setFormData({ ...originalData });
      setChangeHistory([]);
      setChangedFields(new Set());
      setErrors({ lines: {} });
      await showSuccess('All changes have been reset', 'Reset Complete');
    }
  };

  const handleUndo = () => {
    if (changeHistory.length === 0) return;

    const lastChange = changeHistory[changeHistory.length - 1];
    const newHistory = changeHistory.slice(0, -1);

    if (lastChange.lineIndex !== undefined) {
      const updatedLines = [...formData.journal_lines];
      if (lastChange.field === 'journal_lines') {
        setFormData({ ...formData, journal_lines: lastChange.oldValue });
      } else {
        updatedLines[lastChange.lineIndex] = {
          ...updatedLines[lastChange.lineIndex],
          [lastChange.field]: lastChange.oldValue,
        };
        setFormData({ ...formData, journal_lines: updatedLines });
      }
    } else {
      setFormData({ ...formData, [lastChange.field]: lastChange.oldValue });
    }

    setChangeHistory(newHistory);

    const fieldKey = lastChange.lineIndex !== undefined
      ? `line_${lastChange.lineIndex}_${lastChange.field}`
      : lastChange.field;
    setUndoHighlight(fieldKey);
    setTimeout(() => setUndoHighlight(null), 2000);
  };

  useEffect(() => {
    if (undoHighlight) {
      const timer = setTimeout(() => setUndoHighlight(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [undoHighlight]);

  return (
    <>
      <div className="modal-heading">
        <h2 className="modal-title">Edit Journal Entry - {entry.journal_number}</h2>
        <button onClick={handleCancel} className="close-modal-btn">
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="modal-content edit-form">
        {/* Entry Information Section */}
        <div className="form-section">
          <h3 className="details-title">Basic Information</h3>

          <div className="form-row">
            <div className={`form-group ${isFieldChanged('transaction_date') ? 'field-changed' : ''} ${undoHighlight === 'transaction_date' ? 'undo-highlight' : ''}`}>
              <label htmlFor="transaction_date">
                {isFieldChanged('transaction_date') && <i className="ri-edit-line changed-indicator"></i>}
                Transaction Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="transaction_date"
                value={formData.transaction_date}
                onChange={(e) => handleInputChange('transaction_date', e.target.value)}
                onBlur={() => handleInputBlur('transaction_date')}
                className={errors.transaction_date && touchedFields.has('transaction_date') ? 'input-error' : ''}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.transaction_date && touchedFields.has('transaction_date') && (
                <span className="error-message">{errors.transaction_date}</span>
              )}
            </div>

            <div className={`form-group ${isFieldChanged('reference_number') ? 'field-changed' : ''} ${undoHighlight === 'reference_number' ? 'undo-highlight' : ''}`}>
              <label htmlFor="reference_number">
                {isFieldChanged('reference_number') && <i className="ri-edit-line changed-indicator"></i>}
                Reference Number
              </label>
              <input
                type="text"
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => handleInputChange('reference_number', e.target.value)}
                placeholder="Optional reference"
                maxLength={50}
              />
            </div>
          </div>

          <div className={`form-group ${isFieldChanged('description') ? 'field-changed' : ''} ${undoHighlight === 'description' ? 'undo-highlight' : ''}`}>
            <label htmlFor="description">
              {isFieldChanged('description') && <i className="ri-edit-line changed-indicator"></i>}
              Description <span className="required">*</span>
              <span className="char-counter">{formData.description.length}/500</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              onBlur={() => handleInputBlur('description')}
              className={errors.description && touchedFields.has('description') ? 'input-error' : ''}
              placeholder="Describe this journal entry..."
              rows={3}
              maxLength={500}
            />
            {errors.description && touchedFields.has('description') && (
              <span className="error-message">{errors.description}</span>
            )}
          </div>
        </div>

        {/* Journal Lines Section */}
        <div className="form-section">
          <h3 className="details-title">Journal Lines</h3>
          <JournalLinesTable
            lines={tableLines}
            accounts={tableAccounts}
            onChange={handleLineChange}
            onBlur={handleLineBlur}
            onAddLine={addLine}
            onRemoveLine={removeLine}
            errors={errors.lines}
            readonly={false}
            changedLineIndices={changedLineIndices}
          />
          {errors.balance && (
            <div className="error-message" style={{ marginTop: '10px' }}>{errors.balance}</div>
          )}
        </div>
      </div>

      <div className="modal-actions">
        <div className="left-actions">
          <button
            onClick={handleUndo}
            className="undo-btn"
            disabled={changeHistory.length === 0}
            title={changeHistory.length > 0 ? `Undo last change (${changeHistory.length} changes)` : 'No changes to undo'}
          >
            <i className="ri-arrow-go-back-line"></i>
            Undo Last Change
          </button>
          <button
            onClick={handleReset}
            className="reset-btn"
            disabled={changeHistory.length === 0}
            title={changeHistory.length > 0 ? 'Reset all changes to original values' : 'No changes to reset'}
          >
            <i className="ri-refresh-line"></i>
            Reset to Original
          </button>
        </div>
        <div className="right-actions">
          <button onClick={handleCancel} className="cancel-btn">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={!isBalanced}
            title={!isBalanced ? 'Entry must be balanced before updating' : `Update entry with ${changeHistory.length} change(s)`}
          >
            Update Entry
          </button>
        </div>
      </div>
    </>
  );
};

export default EditJournalEntryModal;
