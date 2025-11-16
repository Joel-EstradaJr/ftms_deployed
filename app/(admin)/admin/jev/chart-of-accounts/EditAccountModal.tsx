'use client';

import React, { useState } from 'react';
import { showError, showSuccess, showConfirmation } from '@/app/utils/Alerts';
import { ChartOfAccount, AccountFormData } from '@/app/types/jev';
import '@/app/styles/components/forms.css';
import '@/app/styles/components/modal.css';

interface EditAccountModalProps {
  account: ChartOfAccount;
  onClose: () => void;
  onSubmit: (data: Partial<AccountFormData>) => Promise<void>;
}

const EditAccountModal: React.FC<EditAccountModalProps> = ({ account, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<AccountFormData>>({
    account_name: account.account_name,
    description: account.description || '',
    notes: account.notes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (account.is_system_account) {
      await showError('System accounts cannot be modified', 'Error');
      return;
    }

    // Show confirmation dialog
    const result = await showConfirmation(
      'Are you sure you want to update this account?',
      'Confirm Update'
    );

    if (!result.isConfirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      await showSuccess('Account updated successfully', 'Success');
      onClose();
    } catch (error) {
      console.error('Error updating account:', error);
      await showError('Failed to update account. Please try again.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">Edit Account</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {account.is_system_account && (
        <div style={{ padding: '12px', backgroundColor: 'var(--warning-chip-bg-color)', borderLeft: '4px solid var(--warning-chip-text-color)', borderRadius: '4px', marginBottom: '15px' }}>
          <p style={{ margin: 0, color: 'var(--warning-chip-text-color)', fontWeight: 600 }}>
            <i className="ri-alert-line"></i> This is a system account. Modifications are restricted.
          </p>
        </div>
      )}

      {/* I. Account Identification (Read-Only) */}
      <p className="details-title">I. Account Identification</p>
      <div className="modal-content edit">
        <form className="edit-form">
          <div className="form-row">
            {/* Account Code */}
            <div className="form-group">
              <label>Account Code</label>
              <input
                type="text"
                value={account.account_code}
                disabled
              />
              <small className="hint-message">Account code cannot be modified</small>
            </div>

            {/* Account Type */}
            <div className="form-group">
              <label>Account Type</label>
              <input
                type="text"
                value={account.account_type}
                disabled
              />
              <small className="hint-message">Account type cannot be modified</small>
            </div>
          </div>
        </form>
      </div>

      {/* II. Editable Information */}
      <p className="details-title">II. Editable Information</p>
      <div className="modal-content edit">
        <form className="edit-form">
          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="account_name">
                Account Name<span className="requiredTags"> *</span>
              </label>
              <input
                type="text"
                id="account_name"
                name="account_name"
                value={formData.account_name}
                onChange={handleInputChange}
                required
                disabled={account.is_system_account}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="description">Description (Optional)</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Provide additional details about this account..."
                rows={3}
                disabled={account.is_system_account}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label htmlFor="notes">Internal Notes (Optional)</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes..."
                rows={3}
                disabled={account.is_system_account}
              />
            </div>
          </div>
        </form>
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
          disabled={isSubmitting || account.is_system_account}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Updating...' : 'Update Account'}
        </button>
      </div>
    </>
  );
};

export default EditAccountModal;
