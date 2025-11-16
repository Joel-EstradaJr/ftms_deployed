'use client';

import React, { useState } from 'react';
import { showError, showConfirmation } from '@/app/utils/Alerts';
import { AccountType, AccountFormData, ChartOfAccount } from '@/app/types/jev';
import { getNormalBalance, getAvailableParentAccounts } from '@/app/lib/jev/accountHelpers';
import { validateAccountForm, validateParentChildRelationship } from '@/app/lib/jev/accountValidation';
import '@/app/styles/components/forms.css';
import '@/app/styles/components/modal.css';

interface AddAccountModalProps {
  onClose: () => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
  accounts: ChartOfAccount[];
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose, onSubmit, accounts }) => {
  const [formData, setFormData] = useState<AccountFormData>({
    account_code: '',
    account_name: '',
    account_type: AccountType.ASSET,
    description: '',
    notes: '',
    parent_account_id: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accountTypes = [
    { value: AccountType.ASSET, label: 'Asset' },
    { value: AccountType.LIABILITY, label: 'Liability' },
    { value: AccountType.EQUITY, label: 'Equity' },
    { value: AccountType.REVENUE, label: 'Revenue' },
    { value: AccountType.EXPENSE, label: 'Expense' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: value === '' ? undefined : value 
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setErrors({});
      
      // Validate basic form fields
      const basicValidation = await validateAccountForm({
        account_code: formData.account_code,
        account_name: formData.account_name,
        account_type: formData.account_type,
      });

      if (!basicValidation.valid) {
        const newErrors: Record<string, string> = {};
        basicValidation.errors.forEach(error => {
          if (error.includes('code')) newErrors.account_code = error;
          else if (error.includes('name')) newErrors.account_name = error;
          else if (error.includes('type')) newErrors.account_type = error;
        });
        setErrors(newErrors);
        await showError(basicValidation.errors.join('<br/>'), 'Validation Error');
        return;
      }

      // Validate parent-child relationship if parent is selected
      if (formData.parent_account_id) {
        const parentValidation = validateParentChildRelationship(
          formData.parent_account_id,
          formData.account_type,
          accounts
        );

        if (!parentValidation.valid) {
          setErrors({ parent_account_id: parentValidation.errors[0] });
          await showError(parentValidation.errors.join('<br/>'), 'Invalid Parent Account');
          return;
        }
      }

      // Show confirmation dialog
      const result = await showConfirmation(
        'Are you sure you want to add this account?',
        'Confirm Add Account'
      );

      if (!result.isConfirmed) {
        return;
      }

      await onSubmit(formData);
    } catch (error) {
      console.error('Error creating account:', error);
      await showError('Failed to create account. Please try again.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountCodeGuidelines = () => [
    { prefix: '1000-1999', type: 'Assets', examples: 'Cash, Inventory, Equipment' },
    { prefix: '2000-2999', type: 'Liabilities', examples: 'Accounts Payable, Loans' },
    { prefix: '3000-3999', type: 'Equity', examples: "Owner's Equity, Retained Earnings" },
    { prefix: '4000-4999', type: 'Revenue', examples: 'Sales, Service Revenue' },
    { prefix: '5000-5999', type: 'Expenses', examples: 'Salaries, Rent, Utilities' },
  ];

  const guidelines = getAccountCodeGuidelines();

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">Add New Account</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* I. Account Information */}
      <p className="details-title">I. Account Information</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            {/* Account Code */}
            <div className="form-group">
              <label htmlFor="account_code">
                Account Code<span className="requiredTags"> *</span>
              </label>
              <input
                type="text"
                id="account_code"
                name="account_code"
                value={formData.account_code}
                onChange={handleInputChange}
                placeholder="e.g., 1010"
                maxLength={4}
                className={errors.account_code ? 'invalid-input' : ''}
                required
              />
              <small className="hint-message">4-digit code following account type guidelines below</small>
              <p className="add-error-message">{errors.account_code}</p>
            </div>

            {/* Account Name */}
            <div className="form-group">
              <label htmlFor="account_name">
                Account Name<span className="requiredTags"> *</span>
              </label>
              <input
                type="text"
                id="account_name"
                name="account_name"
                value={formData.account_name}
                onChange={handleInputChange}
                placeholder="e.g., Cash on Hand"
                className={errors.account_name ? 'invalid-input' : ''}
                required
              />
              <p className="add-error-message">{errors.account_name}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Account Type */}
            <div className="form-group">
              <label htmlFor="account_type">
                Account Type<span className="requiredTags"> *</span>
              </label>
              <select
                id="account_type"
                name="account_type"
                value={formData.account_type}
                onChange={handleInputChange}
                className={errors.account_type ? 'invalid-input' : ''}
                required
              >
                {accountTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <small className="hint-message">
                {getNormalBalance(formData.account_type) === 'DEBIT' ? 
                  '✓ Increases with debits' : 
                  '✓ Increases with credits'}
              </small>
              <p className="add-error-message">{errors.account_type}</p>
            </div>

            {/* Parent Account */}
            <div className="form-group">
              <label htmlFor="parent_account_id">
                Parent Account (Optional)
              </label>
              <select
                id="parent_account_id"
                name="parent_account_id"
                value={formData.parent_account_id || ''}
                onChange={handleInputChange}
                className={errors.parent_account_id ? 'invalid-input' : ''}
              >
                <option value="">-- None (Root Level) --</option>
                {getAvailableParentAccounts(accounts, formData.account_type).map(acc => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.account_code} - {acc.account_name}
                  </option>
                ))}
              </select>
              <small className="hint-message">Create a subcategory (e.g., "BDO" under "Cash in Bank")</small>
              <p className="add-error-message">{errors.parent_account_id}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Additional Information (Optional) */}
      <p className="details-title">II. Additional Information (Optional)</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                placeholder="Provide details about this account's purpose..."
                rows={3}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="notes">Internal Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes || ''}
                onChange={handleInputChange}
                placeholder="Internal reminders or special instructions..."
                rows={3}
              />
            </div>
          </div>
        </form>
      </div>

      {/* III. Account Code Guidelines */}
      <p className="details-title">III. Account Code Guidelines</p>
      <div className="modal-content add">
        <div style={{ padding: '15px', backgroundColor: 'var(--table-header-color)', borderRadius: '6px' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {guidelines.map((guide, idx) => (
              <li key={idx} style={{ marginBottom: '8px', color: 'var(--primary-text-color)' }}>
                <strong>{guide.prefix}:</strong> {guide.type} <em style={{ color: 'var(--secondary-text-color)' }}>({guide.examples})</em>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: '15px', fontSize: '13px', color: 'var(--secondary-text-color)', marginBottom: 0 }}>
            <strong>Tip:</strong> Use parent accounts for categories (e.g., 1020 - Cash in Bank) 
            and child accounts for specific items (e.g., 1021 - BDO Account).
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="modal-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Creating...' : 'Create Account'}
        </button>
      </div>
    </>
  );
};

export default AddAccountModal;