'use client';

import React, { useState, useEffect } from 'react';
import { showError, showConfirmation } from '@/app/utils/Alerts';
import { ChartOfAccount, AccountType, AccountSubType, NormalBalance } from '@/app/types/jev';
import { formatDate } from '@/app/utils/formatting';
import '@/app/styles/components/forms.css';

interface RecordChartOfAccountProps {
  account?: ChartOfAccount;
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

  const [formData, setFormData] = useState<Partial<ChartOfAccount>>({
    account_code: account?.account_code || '',
    account_name: account?.account_name || '',
    account_type: account?.account_type || AccountType.ASSET,
    category: account?.category || undefined,
    parent_account_id: account?.parent_account_id || undefined,
    normal_balance: account?.normal_balance || NormalBalance.DEBIT,
    is_contra_account: account?.is_contra_account || false,
    contra_to_code: account?.contra_to_code || undefined,
    expense_category: account?.expense_category || undefined,
    statement_section: account?.statement_section || undefined,
    display_order: account?.display_order || 0,
    is_active: account?.is_active ?? true,
    description: account?.description || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Category options based on account type
  const getCategoryOptions = () => {
    switch (formData.account_type) {
      case AccountType.ASSET:
        return [
          { value: AccountSubType.CURRENT_ASSET, label: 'Current Asset' },
          { value: AccountSubType.NON_CURRENT_ASSET, label: 'Non-Current Asset' },
        ];
      case AccountType.LIABILITY:
        return [
          { value: AccountSubType.CURRENT_LIABILITY, label: 'Current Liability' },
          { value: AccountSubType.NON_CURRENT_LIABILITY, label: 'Non-Current Liability' },
        ];
      case AccountType.EQUITY:
        return [
          { value: AccountSubType.CAPITAL, label: 'Capital' },
          { value: AccountSubType.RETAINED_EARNINGS, label: 'Retained Earnings' },
        ];
      case AccountType.REVENUE:
        return [
          { value: AccountSubType.OPERATING_REVENUE, label: 'Operating Revenue' },
          { value: AccountSubType.NON_OPERATING_REVENUE, label: 'Non-Operating Revenue' },
        ];
      case AccountType.EXPENSE:
        return [
          { value: AccountSubType.OPERATING_EXPENSE, label: 'Operating Expense' },
          { value: AccountSubType.NON_OPERATING_EXPENSE, label: 'Non-Operating Expense' },
        ];
      default:
        return [];
    }
  };

  const expenseCategoryOptions = [
    { value: 'salaries_wages', label: 'Salaries & Wages' },
    { value: 'fuel', label: 'Fuel' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'depreciation', label: 'Depreciation' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'administrative', label: 'Administrative' },
    { value: 'other', label: 'Other' },
  ];

  const statementSectionOptions = [
    { value: 'balance_sheet_current', label: 'Balance Sheet - Current' },
    { value: 'balance_sheet_non_current', label: 'Balance Sheet - Non-Current' },
    { value: 'income_statement_revenue', label: 'Income Statement - Revenue' },
    { value: 'income_statement_expense', label: 'Income Statement - Expense' },
    { value: 'statement_of_equity', label: 'Statement of Equity' },
  ];

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

  // Get available parent accounts (same type, not self, not children)
  const availableParentAccounts = accounts.filter(acc => 
    acc.account_type === formData.account_type && 
    acc.account_id !== account?.account_id &&
    acc.is_active
  );

  // Get available contra accounts (same type)
  const availableContraAccounts = accounts.filter(acc =>
    acc.account_type === formData.account_type &&
    acc.account_id !== account?.account_id &&
    !acc.is_contra_account &&
    acc.is_active
  );

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
      
      // Flip for contra accounts
      if (formData.is_contra_account) {
        defaultBalance = defaultBalance === NormalBalance.DEBIT ? NormalBalance.CREDIT : NormalBalance.DEBIT;
      }
      
      setFormData(prev => ({ ...prev, normal_balance: defaultBalance }));
    }
  }, [formData.account_type, formData.is_contra_account, isAddMode, isEditMode]);

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

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.is_contra_account && !formData.contra_to_code) {
      newErrors.contra_to_code = 'Contra account must specify the account it offsets';
    }

    if (formData.account_type === AccountType.EXPENSE && !formData.expense_category) {
      newErrors.expense_category = 'Expense category is required for expense accounts';
    }

    if (!formData.statement_section) {
      newErrors.statement_section = 'Statement section is required';
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
                      <td style={{ padding: '8px', fontWeight: '500', color: 'var(--primary-color)' }}>{guideline.prefix}</td>
                      <td style={{ padding: '8px' }}>{guideline.label}</td>
                      <td style={{ padding: '8px', color: 'var(--secondary-text-color)', fontSize: '13px' }}>{guideline.examples}</td>
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
                    disabled={isEditMode && account?.is_system_account}
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
                  disabled={isEditMode && account?.is_system_account}
                >
                  <option value={AccountType.ASSET}>Asset</option>
                  <option value={AccountType.LIABILITY}>Liability</option>
                  <option value={AccountType.EQUITY}>Equity</option>
                  <option value={AccountType.REVENUE}>Revenue</option>
                  <option value={AccountType.EXPENSE}>Expense</option>
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="category">
                Category<span className="requiredTags"> *</span>
              </label>
              {isViewMode ? (
                <div className="value-display">{formData.category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
              ) : (
                <>
                  <select
                    id="category"
                    value={formData.category || ''}
                    onChange={(e) => handleInputChange('category', e.target.value as AccountSubType)}
                    className={errors.category ? 'invalid-input' : ''}
                  >
                    <option value="">Select category...</option>
                    {getCategoryOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.category && <p className="add-error-message">{errors.category}</p>}
                </>
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
              />
            )}
          </div>
        </form>
      </div>

      {/* II. Classification & Hierarchy */}
      <p className="details-title">II. Classification & Hierarchy</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="parent_account_id">Parent Account</label>
              {isViewMode ? (
                <div className="value-display">
                  {account?.parent_account_name ? 
                    `${account.parent_account_code} - ${account.parent_account_name}` : 
                    'Root Account'}
                </div>
              ) : (
                <select
                  id="parent_account_id"
                  value={formData.parent_account_id || ''}
                  onChange={(e) => handleInputChange('parent_account_id', e.target.value || undefined)}
                >
                  <option value="">None (Root Account)</option>
                  {availableParentAccounts.map(acc => (
                    <option key={acc.account_id} value={acc.account_id}>
                      {acc.account_code} - {acc.account_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="normal_balance">Normal Balance</label>
              {isViewMode ? (
                <div className="value-display">
                  <span className={`chip ${formData.normal_balance?.toLowerCase()}`}>
                    {formData.normal_balance}
                  </span>
                </div>
              ) : (
                <select
                  id="normal_balance"
                  value={formData.normal_balance}
                  onChange={(e) => handleInputChange('normal_balance', e.target.value as NormalBalance)}
                  disabled
                  title="Auto-determined based on account type"
                >
                  <option value={NormalBalance.DEBIT}>Debit</option>
                  <option value={NormalBalance.CREDIT}>Credit</option>
                </select>
              )}
              {!isViewMode && (
                <small className="hint-message">Auto-determined based on account type</small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label>
                {isViewMode ? (
                  <div className="value-display">
                    {formData.is_contra_account ? 'Yes' : 'No'}
                  </div>
                ) : (
                  <input
                    type="checkbox"
                    checked={formData.is_contra_account}
                    onChange={(e) => handleInputChange('is_contra_account', e.target.checked)}
                  />
                )}
                <span>Is Contra Account</span>
              </label>
              {!isViewMode && (
                <small className="hint-message">Reverses normal balance of account type</small>
              )}
            </div>

            {formData.is_contra_account && (
              <div className="form-group">
                <label htmlFor="contra_to_code">
                  Contra To Account<span className="requiredTags"> *</span>
                </label>
                {isViewMode ? (
                  <div className="value-display">{formData.contra_to_code}</div>
                ) : (
                  <>
                    <select
                      id="contra_to_code"
                      value={formData.contra_to_code || ''}
                      onChange={(e) => handleInputChange('contra_to_code', e.target.value)}
                      className={errors.contra_to_code ? 'invalid-input' : ''}
                    >
                      <option value="">Select account...</option>
                      {availableContraAccounts.map(acc => (
                        <option key={acc.account_id} value={acc.account_code}>
                          {acc.account_code} - {acc.account_name}
                        </option>
                      ))}
                    </select>
                    {errors.contra_to_code && <p className="add-error-message">{errors.contra_to_code}</p>}
                  </>
                )}
              </div>
            )}
          </div>

          {formData.account_type === AccountType.EXPENSE && (
            <div className="form-group">
              <label htmlFor="expense_category">
                Expense Category<span className="requiredTags"> *</span>
              </label>
              {isViewMode ? (
                <div className="value-display">
                  {expenseCategoryOptions.find(opt => opt.value === formData.expense_category)?.label || formData.expense_category}
                </div>
              ) : (
                <>
                  <select
                    id="expense_category"
                    value={formData.expense_category || ''}
                    onChange={(e) => handleInputChange('expense_category', e.target.value)}
                    className={errors.expense_category ? 'invalid-input' : ''}
                  >
                    <option value="">Select expense category...</option>
                    {expenseCategoryOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.expense_category && <p className="add-error-message">{errors.expense_category}</p>}
                </>
              )}
            </div>
          )}
        </form>
      </div>

      {/* III. Financial Statement Mapping */}
      <p className="details-title">III. Financial Statement Mapping</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="statement_section">
                Statement Section<span className="requiredTags"> *</span>
              </label>
              {isViewMode ? (
                <div className="value-display">
                  {statementSectionOptions.find(opt => opt.value === formData.statement_section)?.label || formData.statement_section}
                </div>
              ) : (
                <>
                  <select
                    id="statement_section"
                    value={formData.statement_section || ''}
                    onChange={(e) => handleInputChange('statement_section', e.target.value)}
                    className={errors.statement_section ? 'invalid-input' : ''}
                  >
                    <option value="">Select statement section...</option>
                    {statementSectionOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.statement_section && <p className="add-error-message">{errors.statement_section}</p>}
                </>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="display_order">Display Order</label>
              {isViewMode ? (
                <div className="value-display">{formData.display_order}</div>
              ) : (
                <input
                  type="number"
                  id="display_order"
                  value={formData.display_order}
                  onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                />
              )}
              {!isViewMode && (
                <small className="hint-message">Order in financial statements (lower appears first)</small>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* IV. Status */}
      <p className="details-title">IV. Status</p>
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
                  disabled={account?.is_system_account}
                />
              )}
              <span>Active</span>
            </label>
            {!isViewMode && account?.is_system_account && (
              <small className="hint-message">System accounts cannot be deactivated</small>
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

      {/* V. Transaction History (View Only) */}
      {isViewMode && (
        <>
          <p className="details-title">V. Transaction History</p>
          <div className="modal-content add">
            <div className="info-box">
              <i className="ri-information-line"></i>
              <span>Transaction history and balance trends will be displayed here once backend integration is complete.</span>
            </div>
          </div>
        </>
      )}

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
          >
            {isAddMode ? 'Add Account' : 'Update Account'}
          </button>
        )}
      </div>
    </>
  );
};

export default RecordChartOfAccount;
