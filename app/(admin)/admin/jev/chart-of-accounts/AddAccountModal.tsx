'use client';

import React, { useState, useEffect } from 'react';
import { showError, showConfirmation } from '@/app/utils/Alerts';
import { NormalBalance } from '@/app/types/jev';
import { fetchAccountTypes, getSuggestedAccountCode } from '@/app/services/chartOfAccountsService';
import '@/app/styles/components/forms.css';
import '@/app/styles/components/modal.css';

interface AccountType {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

interface AccountFormData {
  account_type_id: number;
  account_name: string;
  normal_balance: 'DEBIT' | 'CREDIT';
  description?: string;
  custom_suffix?: number;
}

interface AddAccountModalProps {
  onClose: () => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose, onSubmit }) => {
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [formData, setFormData] = useState<AccountFormData>({
    account_type_id: 0,
    account_name: '',
    normal_balance: 'DEBIT',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [accountCodePreview, setAccountCodePreview] = useState<string>('');
  const [suggestedCode, setSuggestedCode] = useState<string>('');

  // Load account types from backend on mount
  useEffect(() => {
    const loadAccountTypes = async () => {
      try {
        setIsLoadingTypes(true);
        const types = await fetchAccountTypes();
        setAccountTypes(types);
        if (types.length > 0) {
          setFormData(prev => ({ ...prev, account_type_id: types[0].id }));
        }
      } catch (error) {
        console.error('Error loading account types:', error);
        await showError('Failed to load account types', 'Error');
      } finally {
        setIsLoadingTypes(false);
      }
    };

    loadAccountTypes();
  }, []);

  // Update account code preview when account type changes
  useEffect(() => {
    const updateCodePreview = async () => {
      if (formData.account_type_id && formData.account_type_id !== 0) {
        const selectedType = accountTypes.find(t => t.id === formData.account_type_id);
        if (selectedType) {
          try {
            // Fetch suggested code from backend
            const suggested = await getSuggestedAccountCode(formData.account_type_id);
            setSuggestedCode(suggested);
            
            // Extract suffix from suggested code for display
            const suffix = suggested.slice(selectedType.code.length);
            setAccountCodePreview(
              `📋 Suggested: ${suggested} = Type Code "${selectedType.code}" + Suffix "${suffix}"`
            );
          } catch (error) {
            console.error('Error fetching suggested code:', error);
            setAccountCodePreview(
              `Format: Type Code "${selectedType.code}" + 3-digit suffix (e.g., ${selectedType.code}000, ${selectedType.code}005)`
            );
          }
        }
      } else {
        setAccountCodePreview('');
        setSuggestedCode('');
      }
    };

    updateCodePreview();
  }, [formData.account_type_id, accountTypes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'account_type_id') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: parseInt(value, 10)
      }));
    } else if (name === 'custom_suffix') {
      // Real-time validation: only accept 0-999
      if (value === '') {
        setFormData(prev => ({ ...prev, [name]: undefined }));
        setErrors(prev => ({ ...prev, [name]: '' }));
      } else {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 999) {
          setFormData(prev => ({ ...prev, [name]: numValue }));
          setErrors(prev => ({ ...prev, [name]: '' }));
        } else {
          // Show error immediately for invalid input
          setErrors(prev => ({ 
            ...prev, 
            [name]: 'Suffix must be between 0 and 999 (3 digits max)'
          }));
        }
      }
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value === '' ? undefined : value 
      }));
    }

    if (errors[name] && name !== 'custom_suffix') {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setErrors({});
      
      // Basic validation
      const newErrors: Record<string, string> = {};
      
      if (!formData.account_type_id) {
        newErrors.account_type_id = 'Account type is required';
      }
      
      if (!formData.account_name?.trim()) {
        newErrors.account_name = 'Account name is required';
      }
      
      if (!formData.normal_balance) {
        newErrors.normal_balance = 'Normal balance is required';
      }

      if (formData.custom_suffix !== undefined) {
        if (formData.custom_suffix < 0 || formData.custom_suffix > 999) {
          newErrors.custom_suffix = 'Suffix must be between 0 and 999';
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        await showError('Please fill in all required fields correctly', 'Validation Error');
        return;
      }

      // Show confirmation dialog
      const result = await showConfirmation(
        'Are you sure you want to add this account?',
        'Confirm Add Account'
      );

      if (!result.isConfirmed) {
        return;
      }

      // Submit to backend
      await onSubmit(formData);
    } catch (error) {
      console.error('Error creating account:', error);
      await showError('Failed to create account. Please try again.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Account Information */}
      <p className="details-title">Account Information</p>
      {isLoadingTypes ? (
        <div className="modal-content add">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading account types...</p>
          </div>
        </div>
      ) : (
        <div className="modal-content add">
          <form className="add-form">
            <div className="form-row">
              {/* Account Type */}
              <div className="form-group">
                <label htmlFor="account_type_id">
                  Account Type<span className="requiredTags"> *</span>
                </label>
                <select
                  id="account_type_id"
                  name="account_type_id"
                  value={formData.account_type_id}
                  onChange={handleInputChange}
                  className={errors.account_type_id ? 'invalid-input' : ''}
                  required
                  disabled={isSubmitting}
                >
                  <option value={0}>-- Select Account Type --</option>
                  {accountTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.code})
                    </option>
                  ))}
                </select>
                <p className="add-error-message">{errors.account_type_id}</p>
              </div>

              {/* Normal Balance */}
              <div className="form-group">
                <label htmlFor="normal_balance">
                  Normal Balance<span className="requiredTags"> *</span>
                </label>
                <select
                  id="normal_balance"
                  name="normal_balance"
                  value={formData.normal_balance}
                  onChange={handleInputChange}
                  className={errors.normal_balance ? 'invalid-input' : ''}
                  required
                  disabled={isSubmitting}
                >
                  <option value="DEBIT">Debit (Increases with Debits)</option>
                  <option value="CREDIT">Credit (Increases with Credits)</option>
                </select>
                <p className="add-error-message">{errors.normal_balance}</p>
              </div>
            </div>

            <div className="form-row">
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
                  disabled={isSubmitting}
                />
                <small className="hint-message">Must be unique within the account type</small>
                <p className="add-error-message">{errors.account_name}</p>
              </div>

              {/* Account Code - Custom Suffix (Optional) */}
              <div className="form-group">
                <label htmlFor="custom_suffix">
                  Code Suffix (Last 3 Digits) - Optional
                </label>
                <input
                  type="text"
                  id="custom_suffix"
                  name="custom_suffix"
                  value={formData.custom_suffix ?? ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 085 or leave empty for auto"
                  maxLength={3}
                  className={errors.custom_suffix ? 'invalid-input' : ''}
                  disabled={isSubmitting || formData.account_type_id === 0}
                />
                <small className="hint-message" style={{ display: 'block', marginTop: '4px' }}>
                  {accountCodePreview || 'Select an account type to see suggested code'}
                </small>
                {formData.account_type_id !== 0 && (
                  <small className="hint-message" style={{ display: 'block', color: '#666', fontSize: '0.85em' }}>
                    💡 Enter only 0-999 (e.g., "5" becomes "005"). Leave empty to use suggested code.
                  </small>
                )}
                <p className="add-error-message">{errors.custom_suffix}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  placeholder="Provide details about this account's purpose..."
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Action Buttons */}
      <div className="modal-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={onClose}
          disabled={isSubmitting || isLoadingTypes}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting || isLoadingTypes}
          onClick={handleSubmit}
        >
          {isLoadingTypes ? 'Loading...' : isSubmitting ? 'Creating...' : 'Create Account'}
        </button>
      </div>
    </>
  );
};

export default AddAccountModal;