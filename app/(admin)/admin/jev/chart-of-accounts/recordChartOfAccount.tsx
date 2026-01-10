'use client';

import React, { useState, useEffect } from 'react';
import { showError, showConfirmation } from '@/app/utils/Alerts';
import { ChartOfAccount, AccountType, AccountSubType, NormalBalance } from '@/app/types/jev';
import { formatDate } from '@/app/utils/formatting';
import '@/app/styles/components/forms.css';

// Extended interface to include audit fields
interface ExtendedChartOfAccount extends ChartOfAccount {
  journal_entry_lines_count?: number;
}

interface RecordChartOfAccountProps {
  account?: ExtendedChartOfAccount;
  mode: 'add' | 'edit' | 'view';
  accounts: ChartOfAccount[];
  onClose: () => void;
  onSave: (data: Partial<ChartOfAccount>) => Promise<void>;
}

const RecordChartOfAccount: React.FC<RecordChartOfAccountProps> = ({
  account,
  mode,
  accounts,
  onClose,
  onSave,
}) => {
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isAddMode = mode === 'add';

  // Check if account has linked journal entries (prevents editing in edit mode)
  const hasLinkedEntries = isEditMode && (account?.journal_entry_lines_count ?? 0) > 0;
  const isFieldDisabled = isEditMode && hasLinkedEntries;

  const [formData, setFormData] = useState<Partial<ChartOfAccount>>({
    account_code: account?.account_code || '',
    account_name: account?.account_name || '',
    account_type: account?.account_type || AccountType.ASSET,
    normal_balance: account?.normal_balance || NormalBalance.DEBIT,
    is_active: account?.is_active ?? true,
    description: account?.description || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Account code guidelines
  const getAccountCodeGuidelines = () => [
    { prefix: '1000-1999', type: AccountType.ASSET, label: 'Assets', examples: 'Cash, Inventory, Equipment' },
    { prefix: '2000-2999', type: AccountType.LIABILITY, label: 'Liabilities', examples: 'Accounts Payable, Loans' },
    { prefix: '3000-3999', type: AccountType.EQUITY, label: 'Equity', examples: "Owner's Equity, Retained Earnings" },
    { prefix: '4000-4999', type: AccountType.REVENUE, label: 'Revenue', examples: 'Sales, Service Revenue' },
    { prefix: '5000-5999', type: AccountType.EXPENSE, label: 'Expenses', examples: 'Salaries, Rent, Utilities' },
  ];

  // Validate account code range based on account type
  const isValidAccountCodeRange = (code: string, accountType: AccountType): boolean => {
    const codeNum = parseInt(code);
    if (isNaN(codeNum)) return false;

    switch (accountType) {
      case AccountType.ASSET:
        return codeNum >= 1000 && codeNum <= 1999;
      case AccountType.LIABILITY:
        return codeNum >= 2000 && codeNum <= 2999;
      case AccountType.EQUITY:
        return codeNum >= 3000 && codeNum <= 3999;
      case AccountType.REVENUE:
        return codeNum >= 4000 && codeNum <= 4999;
      case AccountType.EXPENSE:
        return codeNum >= 5000 && codeNum <= 5999;
      default:
        return false;
    }
  };

  // Auto-set normal balance based on account type
  useEffect(() => {
    if (isAddMode || isEditMode) {
      let defaultBalance = NormalBalance.DEBIT;
      switch (formData.account_type) {
        case AccountType.ASSET:
        case AccountType.EXPENSE:
          defaultBalance = NormalBalance.DEBIT;
          break;
        case AccountType.LIABILITY:
        case AccountType.EQUITY:
        case AccountType.REVENUE:
          defaultBalance = NormalBalance.CREDIT;
          break;
      }
      
      setFormData(prev => ({ ...prev, normal_balance: defaultBalance }));
    }
  }, [formData.account_type, isAddMode, isEditMode]);

  const handleInputChange = (field: keyof ChartOfAccount, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear existing error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Real-time validation for account_code
    if (field === 'account_code') {
      const code = value as string;
      
      // Only allow digits
      if (code && !/^\d*$/.test(code)) {
        setErrors(prev => ({ ...prev, account_code: 'Only digits allowed' }));
        return;
      }

      // Check for duplicates when 4 digits are entered
      if (code.length === 4) {
        const duplicate = accounts.find(acc => 
          acc.account_code === code && 
          acc.account_id !== account?.account_id
        );
        if (duplicate) {
          setErrors(prev => ({ 
            ...prev, 
            account_code: `Code ${code} is already taken by "${duplicate.account_name}"` 
          }));
          return;
        }

        // Validate range when 4 digits and account type selected
        if (formData.account_type && !isValidAccountCodeRange(code, formData.account_type)) {
          const guideline = getAccountCodeGuidelines().find(g => g.type === formData.account_type);
          setErrors(prev => ({ 
            ...prev, 
            account_code: `Invalid code for ${formData.account_type}. Use ${guideline?.prefix}` 
          }));
        }
      }
    }

    // Real-time validation for account_name
    if (field === 'account_name') {
      const name = (value as string).trim();
      if (name) {
        const duplicateName = accounts.find(acc => 
          acc.account_name.toLowerCase() === name.toLowerCase() && 
          acc.account_id !== account?.account_id
        );
        if (duplicateName) {
          setErrors(prev => ({ 
            ...prev, 
            account_name: `Name "${name}" already exists (Code: ${duplicateName.account_code})` 
          }));
        }
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate account code
    if (!formData.account_code?.trim()) {
      newErrors.account_code = 'Account code is required';
    } else if (!/^\d{4}$/.test(formData.account_code)) {
      newErrors.account_code = 'Account code must be 4 digits';
    } else {
      // Check for duplicate code (excluding current account in edit mode)
      const duplicate = accounts.find(acc => 
        acc.account_code === formData.account_code && 
        acc.account_id !== account?.account_id
      );
      if (duplicate) {
        newErrors.account_code = `Account code ${formData.account_code} is already taken by "${duplicate.account_name}"`;
      } else if (!isValidAccountCodeRange(formData.account_code, formData.account_type!)) {
        // Validate code range matches account type
        const guideline = getAccountCodeGuidelines().find(g => g.type === formData.account_type);
        newErrors.account_code = `Invalid code for ${formData.account_type} accounts. Use range ${guideline?.prefix} (e.g., ${guideline?.examples})`;
      }
    }

    // Validate account name
    if (!formData.account_name?.trim()) {
      newErrors.account_name = 'Account name is required';
    } else {
      // Check for duplicate name (excluding current account in edit mode)
      const duplicateName = accounts.find(acc => 
        acc.account_name.toLowerCase() === formData.account_name?.toLowerCase().trim() && 
        acc.account_id !== account?.account_id
      );
      if (duplicateName) {
        newErrors.account_name = `Account name "${formData.account_name}" is already taken (Code: ${duplicateName.account_code})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      await showError('Please fix the validation errors', 'Validation Error');
      return;
    }

    const action = isAddMode ? 'add' : 'update';
    const result = await showConfirmation(
      `Are you sure you want to ${action} this account?`,
      `Confirm ${action === 'add' ? 'Add' : 'Update'}`
    );

    if (result.isConfirmed) {
      await onSave(formData);
    }
  };

  const handleCancel = async () => {
    if (!isViewMode) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(account || {});
      if (hasChanges) {
        const result = await showConfirmation(
          'Discard unsaved changes?',
          'Confirm Cancel'
        );
        if (!result.isConfirmed) return;
      }
    }
    onClose();
  };

  const getModalTitle = () => {
    if (isViewMode) return 'Account Details';
    if (isEditMode) return 'Edit Account';
    return 'Add New Account';
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">{getModalTitle()}</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={handleCancel}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Warning for accounts with linked entries in edit mode */}
      {isEditMode && hasLinkedEntries && (
        <>
          <div className="modal-content add" style={{ marginTop: '1rem' }}>
            <div className="info-box" style={{ padding: '16px', backgroundColor: 'var(--error-chip-bg-color)', borderLeft: '4px solid var(--error-color)' }}>
              <i className="ri-alert-line" style={{ marginRight: '8px', color: 'var(--error-color)' }}></i>
              <span style={{ color: 'var(--error-chip-text-color)' }}>
                <strong>This account cannot be edited</strong> because it has {account?.journal_entry_lines_count} linked journal {account?.journal_entry_lines_count === 1 ? 'entry' : 'entries'}. 
                All fields are read-only.
              </span>
            </div>
          </div>
        </>
      )}

      {/* Account Code Guidelines */}
      {!isViewMode && (
        <>
          <p className="details-title">
            <i className="ri-book-line" style={{ marginRight: '8px' }}></i>
            Account Code Guidelines
          </p>
          <div className="modal-content add">
            <div className="info-box" style={{ padding: '16px', backgroundColor: 'var(--table-row-hover-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th><b>Code Range</b></th>
                    <th><b>Account Type</b></th>
                    <th><b>Examples</b></th>
                  </tr>
                </thead>
                <tbody>
                  {getAccountCodeGuidelines().map((guideline, index) => (
                    <tr 
                      key={guideline.type}
                      style={{ 
                        borderBottom: index < getAccountCodeGuidelines().length - 1 ? '1px solid var(--border-color)' : 'none',
                        backgroundColor: formData.account_type === guideline.type ? 'var(--table-header-color)' : 'transparent'
                      }}
                    >
                      <td style={{ color: 'var(--primary-color)' }}>{guideline.prefix}</td>
                      <td>{guideline.label}</td>
                      <td>{guideline.examples}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* I. Basic Information */}
      <p className="details-title">I. Basic Information</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="account_code">
                Account Code<span className="requiredTags"> *</span>
              </label>
              {isViewMode ? (
                <div className="value-display">{formData.account_code}</div>
              ) : (
                <>
                  <input
                    type="text"
                    id="account_code"
                    value={formData.account_code}
                    onChange={(e) => handleInputChange('account_code', e.target.value)}
                    onBlur={(e) => {
                      const code = e.target.value;
                      if (code && code.length !== 4) {
                        setErrors(prev => ({ ...prev, account_code: 'Account code must be exactly 4 digits' }));
                      }
                    }}
                    placeholder="e.g., 1010"
                    maxLength={4}
                    className={errors.account_code ? 'invalid-input' : ''}
                    disabled={isFieldDisabled}
                  />
                  {!errors.account_code && formData.account_type && (
                    <small className="hint-message">
                      {getAccountCodeGuidelines().find(g => g.type === formData.account_type)?.prefix} - {getAccountCodeGuidelines().find(g => g.type === formData.account_type)?.label}
                    </small>
                  )}
                  {errors.account_code && <p className="add-error-message">{errors.account_code}</p>}
                </>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="account_name">
                Account Name<span className="requiredTags"> *</span>
              </label>
              {isViewMode ? (
                <div className="value-display">{formData.account_name}</div>
              ) : (
                <>
                  <input
                    type="text"
                    id="account_name"
                    value={formData.account_name}
                    onChange={(e) => handleInputChange('account_name', e.target.value)}
                    onBlur={(e) => {
                      const trimmed = e.target.value.trim();
                      if (trimmed !== e.target.value) {
                        handleInputChange('account_name', trimmed);
                      }
                    }}
                    placeholder="Enter account name"
                    className={errors.account_name ? 'invalid-input' : ''}
                    disabled={isFieldDisabled}
                  />
                  {errors.account_name && <p className="add-error-message">{errors.account_name}</p>}
                </>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="account_type">
                Account Type<span className="requiredTags"> *</span>
              </label>
              {isViewMode ? (
                <div className="value-display">
                  <span className={`chip ${formData.account_type?.toLowerCase()}`}>
                    {formData.account_type}
                  </span>
                </div>
              ) : (
                <select
                  id="account_type"
                  value={formData.account_type}
                  onChange={(e) => handleInputChange('account_type', e.target.value as AccountType)}
                  disabled={isFieldDisabled}
                >
                  <option value={AccountType.ASSET}>Asset</option>
                  <option value={AccountType.LIABILITY}>Liability</option>
                  <option value={AccountType.EQUITY}>Equity</option>
                  <option value={AccountType.REVENUE}>Revenue</option>
                  <option value={AccountType.EXPENSE}>Expense</option>
                </select>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            {isViewMode ? (
              <div className="value-display description-box">{formData.description || '-'}</div>
            ) : (
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter account description"
                rows={3}
                disabled={isFieldDisabled}
              />
            )}
          </div>
        </form>
      </div>

      {/* II. Status */}
      <p className="details-title">II. Status</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-group checkbox-group">
            <label>
              {isViewMode ? (
                <div className="value-display">
                  <span className={`chip ${formData.is_active ? 'active' : 'closed'}`}>
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ) : (
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  disabled={isFieldDisabled}
                />
              )}
              <span>Active</span>
            </label>
            {!isViewMode && hasLinkedEntries && (
              <small className="hint-message">Cannot edit account with linked journal entries</small>
            )}
          </div>

          {isViewMode && account?.is_system_account && (
            <div className="info-box">
              <i className="ri-information-line"></i>
              <span>This is a system account and cannot be modified or deleted.</span>
            </div>
          )}
        </form>
      </div>

      {/* Action Buttons */}
      <div className="modal-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={handleCancel}
        >
          {isViewMode ? 'Close' : 'Cancel'}
        </button>
        {!isViewMode && (
          <button
            type="submit"
            className="submit-btn"
            onClick={handleSubmit}
            disabled={isFieldDisabled}
            title={hasLinkedEntries ? 'Cannot edit account with linked journal entries' : ''}
          >
            {isAddMode ? 'Add Account' : 'Update Account'}
          </button>
        )}
      </div>
    </>
  );
};

export default RecordChartOfAccount;
