'use client';

import React, { useState } from 'react';
import { showError, showConfirmation } from '@/app/utils/Alerts';
import { ChartOfAccount, EntryType, JournalStatus, JournalEntryFormData, JournalEntryLine } from '@/app/types/jev';
import JournalLinesTable, { JournalLine as JLTableLine } from '@/app/Components/JournalLinesTable';
import '@/app/styles/components/forms.css';
import '@/app/styles/JEV/journal-modals.css';

interface AddJournalEntryModalProps {
  onClose: () => void;
  onSubmit: (data: JournalEntryFormData) => Promise<void>;
  accounts: ChartOfAccount[];
}

const AddJournalEntryModal: React.FC<AddJournalEntryModalProps> = ({
  onClose,
  onSubmit,
  accounts,
}) => {
  const [formData, setFormData] = useState<JournalEntryFormData>({
    date: new Date().toISOString().split('T')[0],
    reference: '',
    description: '',
    entry_type: EntryType.MANUAL,
    status: JournalStatus.DRAFT,
    journal_lines: [
      { account_id: '', line_number: 1, description: '', debit: 0, credit: 0 },
      { account_id: '', line_number: 2, description: '', debit: 0, credit: 0 },
    ],
  });

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<{
    date?: string;
    description?: string;
    balance?: string;
    lines: { [lineIndex: number]: { 
      account_id?: string; 
      line_description?: string; 
      debit?: string; 
      credit?: string; 
    }};
  }>({ lines: {} });

  // Calculate totals
  const totalDebit = formData.journal_lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = formData.journal_lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0;

  // Map formData lines to JournalLinesTable format
  const tableLines: JLTableLine[] = formData.journal_lines.map((line) => ({
    account_id: line.account_id,
    line_description: line.description || '',
    debit_amount: line.debit || 0,
    credit_amount: line.credit || 0,
  }));

  // Map accounts to JournalLinesTable format
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

  // Validation helpers
  const validateField = (field: string, value: any): string | undefined => {
    if (field === 'date' && !value) {
      return 'Date is required';
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
    if ((field === 'debit' || field === 'credit') && 
        line.debit_amount === 0 && line.credit_amount === 0) {
      return 'Either debit or credit amount is required';
    }
    return undefined;
  };

  const handleInputChange = (field: keyof JournalEntryFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error for this field
    if (field === 'date' || field === 'description') {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const handleInputBlur = (field: string) => {
    setTouchedFields(new Set(touchedFields).add(field));
    
    // Clear error for this field
    if (field === 'date' || field === 'description') {
      const error = validateField(field, formData[field as keyof JournalEntryFormData]);
      if (error) {
        setErrors({ ...errors, [field]: error });
      }
    }
  };

  const handleLineChange = (index: number, field: string, value: string | number | null) => {
    const updatedLines = [...formData.journal_lines];
    
    // Map table field names to formData field names
    const fieldMap: { [key: string]: string } = {
      'debit_amount': 'debit',
      'credit_amount': 'credit',
      'line_description': 'description',
    };
    
    const actualField = fieldMap[field] || field;
    
    updatedLines[index] = { 
      ...updatedLines[index], 
      [actualField]: value 
    };
    setFormData({ ...formData, journal_lines: updatedLines });

    // Clear error for this specific line field
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
      debit: 0,
      credit: 0,
    };
    setFormData({ ...formData, journal_lines: [...formData.journal_lines, newLine] });
  };

  const removeLine = (index: number) => {
    if (formData.journal_lines.length <= 2) {
      showError('Journal entry must have at least 2 lines', 'Validation Error');
      return;
    }
    const updatedLines = formData.journal_lines.filter((_, i) => i !== index);
    // Renumber lines
    updatedLines.forEach((line, idx) => {
      line.line_number = idx + 1;
    });
    setFormData({ ...formData, journal_lines: updatedLines });

    // Remove errors for this line
    const newErrors = { ...errors };
    if (newErrors.lines[index]) {
      delete newErrors.lines[index];
    }
    setErrors(newErrors);
  };

  const validate = (): boolean => {
    // Mark all fields as touched
    const allFields = new Set([
      'date',
      'description',
      ...formData.journal_lines.flatMap((_, idx) => [
        `line_${idx}_account_id`,
        `line_${idx}_debit`,
        `line_${idx}_credit`,
      ]),
    ]);
    setTouchedFields(allFields);

    const newErrors: typeof errors = { lines: {} };

    // Validate header fields
    const dateError = validateField('date', formData.date);
    if (dateError) newErrors.date = dateError;

    const descError = validateField('description', formData.description);
    if (descError) newErrors.description = descError;

    // Validate journal lines
    let hasValidLine = false;
    formData.journal_lines.forEach((line, index) => {
      if (!line.account_id) {
        if (!newErrors.lines[index]) newErrors.lines[index] = {};
        newErrors.lines[index].account_id = 'Account is required';
      }
      
      const debitAmt = line.debit || 0;
      const creditAmt = line.credit || 0;
      
      if (debitAmt === 0 && creditAmt === 0) {
        if (!newErrors.lines[index]) newErrors.lines[index] = {};
        newErrors.lines[index].debit = 'Either debit or credit is required';
      } else {
        hasValidLine = true;
      }
    });

    if (!hasValidLine) {
      newErrors.balance = 'At least one journal line with an amount is required';
    }

    // Check balance
    if (!isBalanced && hasValidLine) {
      newErrors.balance = `Entry is not balanced by PHP ${difference.toFixed(2)}`;
    }

    setErrors(newErrors);
    return (
      !newErrors.date &&
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
      `Post this journal entry?<br/>
      <strong>Total Debit:</strong> ${formatMoney(totalDebit)}<br/>
      <strong>Total Credit:</strong> ${formatMoney(totalCredit)}`,
      'Confirm Posting'
    );

    if (result.isConfirmed) {
      await onSubmit(formData);
    }
  };

  const handleCancel = async () => {
    const hasData = formData.description || formData.journal_lines.some(
      line => line.account_id || line.debit || line.credit
    );

    if (hasData) {
      const result = await showConfirmation(
        'Discard unsaved changes?',
        'Confirm Cancel'
      );
      if (result.isConfirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="modal-heading">
        <h2 className="modal-title">Add Journal Entry</h2>
        <button onClick={handleCancel} className="close-modal-btn">
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="modal-content add-form">
        <div className="form-section">
          <h3 className="details-title">Basic Information</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="je_code">
                JE Code
              </label>
              <input
                type="text"
                id="je_code"
                value="Auto-generated"
                disabled
                className="disabled-input"
              />
              <small className="field-note">Will be auto-generated upon saving</small>
            </div>

            <div className="form-group">
              <label htmlFor="date">
                Date <span className="requiredTags">*</span>
              </label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                onBlur={() => handleInputBlur('date')}
                className={errors.date && touchedFields.has('date') ? 'input-error' : ''}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.date && touchedFields.has('date') && (
                <span className="error-message">{errors.date}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reference">Reference</label>
              <input
                type="text"
                id="reference"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                placeholder="Optional reference"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label htmlFor="entry_type">Entry Type</label>
              <input
                type="text"
                id="entry_type"
                value={formData.entry_type}
                disabled
                className="disabled-input"
              />
            </div>
          </div>
        </div>

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
          />
          {errors.balance && (
            <div className="error-message" style={{ marginTop: '10px' }}>{errors.balance}</div>
          )}
        </div>

        <div className="form-section">
          <h3 className="details-title">Remarks</h3>
          <div className="form-group">
            <label htmlFor="description">
              Description <span className="requiredTags">*</span>
              <span className="char-counter">  {formData.description.length}/500</span>
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
      </div>


      <div className="modal-actions">
          <button onClick={handleCancel} className="cancel-btn">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="submit-btn"
            disabled={!isBalanced}
            title={!isBalanced ? 'Entry must be balanced before posting' : ''}
          >
            Post Entry
          </button>
      </div>
    </>
  );
};

export default AddJournalEntryModal;
