'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseExpense } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { showWarning, showConfirmation } from '../../../../utils/Alerts';
import SearchableDropdown, { DropdownOption } from '../../../../Components/SearchableDropdown';
import Swal from 'sweetalert2';
import '../../../../styles/components/modal2.css';
import '../../../../styles/components/forms.css';

interface RecordPurchaseExpenseProps {
  existingData: PurchaseExpense;
  onSave: (formData: PurchaseExpenseFormData) => void;
  onClose: () => void;
}

interface PurchaseExpenseFormData {
  id: string;
  account_code: string;
  remarks: string;
}

interface FormErrors {
  account_code: string;
}

// Sample purchase requests for dropdown
const SAMPLE_PURCHASE_REQUESTS = [
  { id: 'PR-2024-001', refNo: 'PR-2024-001', category: 'Maintenance', supplier: 'Auto Parts Supplier Inc.' },
  { id: 'PR-2024-002', refNo: 'PR-2024-002', category: 'Fuel', supplier: 'Petron Corporation' },
  { id: 'PR-2024-003', refNo: 'PR-2024-003', category: 'Supplies', supplier: 'Office Depot' },
];

// Sample account codes - converted to dropdown options
const SAMPLE_ACCOUNT_CODES: DropdownOption[] = [
  { value: 'ACC-5010', label: 'ACC-5010', description: 'Maintenance Expenses' },
  { value: 'ACC-5020', label: 'ACC-5020', description: 'Fuel Expenses' },
  { value: 'ACC-5030', label: 'ACC-5030', description: 'Office Supplies' },
  { value: 'ACC-5040', label: 'ACC-5040', description: 'Administrative Expenses' },
  { value: 'ACC-5050', label: 'ACC-5050', description: 'Utilities and Communication' },
  { value: 'ACC-5060', label: 'ACC-5060', description: 'Professional Fees' },
  { value: 'ACC-5070', label: 'ACC-5070', description: 'Travel and Transportation' },
  { value: 'ACC-5080', label: 'ACC-5080', description: 'Repairs and Maintenance' },
];

const RecordPurchaseExpense: React.FC<RecordPurchaseExpenseProps> = ({
  existingData,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<PurchaseExpenseFormData>({
    id: existingData.id,
    account_code: existingData.account_code || '',
    remarks: existingData.remarks || '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({
    account_code: '',
  });

  const [isFormValid, setIsFormValid] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Track form changes
  useEffect(() => {
    setIsDirty(true);
  }, [formData]);

  // Validate individual field
  const validateFormField = (fieldName: keyof FormErrors, value: any): boolean => {
    let error = '';

    if (fieldName === 'account_code') {
      if (!value || value.trim() === '') {
        error = 'Please select an account code';
      }
    }

    setFormErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));

    return error === '';
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const fields: (keyof FormErrors)[] = ['account_code'];

    let allValid = true;
    fields.forEach((field) => {
      const isValid = validateFormField(field, formData[field]);
      if (!isValid) allValid = false;
    });

    return allValid;
  };

  // Check form validity
  useEffect(() => {
    const hasErrors = Object.values(formErrors).some((error) => error !== '');
    const hasRequiredFields = formData.account_code;

    setIsFormValid(!hasErrors && !!hasRequiredFields);
  }, [formData, formErrors]);

  // Handle input change
  const handleInputChange = (field: keyof PurchaseExpenseFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (field in formErrors) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Handle input blur (validation)
  const handleInputBlur = (field: keyof FormErrors) => {
    validateFormField(field, formData[field]);
  };

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (isDirty) {
      Swal.fire({
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Are you sure you want to close?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#961C1E',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, close',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) {
          onClose();
        }
      });
    } else {
      onClose();
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      showWarning('Validation Error', 'Please fill in all required fields correctly');
      return;
    }

    const result = await Swal.fire({
      title: 'Update Purchase Expense',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>Expense Code:</strong> ${existingData.expense_code}</p>
          <p><strong>PR Number:</strong> ${existingData.pr_number}</p>
          <p><strong>Account Code:</strong> ${formData.account_code}</p>
          <p><strong>Remarks:</strong> ${formData.remarks || 'N/A'}</p>
        </div>
        <p style="margin-top: 15px;">Are you sure you want to update this purchase expense?</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#961C1E',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, update it',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      onSave(formData);
      setIsDirty(false);
    }
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">Edit Purchase Expense</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={handleClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      <p className="details-title">Expense Information (Read-Only)</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            <div className="form-group">
              <label>Expense Code</label>
              <p>{existingData.expense_code}</p>
            </div>
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{formatDate(existingData.date)}</p>
            </div>
          </div>
        </form>
      </div>

      <p className="details-title">Purchase Request Details (Read-Only)</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            <div className="form-group">
              <label>PR Number</label>
              <p>{existingData.pr_number}</p>
            </div>
            <div className="form-group">
              <label>Category</label>
              <p>{existingData.category || 'N/A'}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Supplier</label>
              <p>{existingData.supplier || 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Amount</label>
              <p className="amount-text">{formatMoney(existingData.amount)}</p>
            </div>
          </div>
        </form>
      </div>

      <p className="details-title">Editable Fields</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            <div className="form-group">
              <label>
                Account Code <span style={{ color: 'red' }}>*</span>
              </label>
              <SearchableDropdown
                options={SAMPLE_ACCOUNT_CODES}
                value={formData.account_code}
                onChange={(value) => handleInputChange('account_code', value)}
                onBlur={() => handleInputBlur('account_code')}
                placeholder="Select Account Code"
                className={formErrors.account_code ? 'invalid' : ''}
                showDescription={true}
              />
              {formErrors.account_code && (
                <span className="error-text">{formErrors.account_code}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                rows={4}
                placeholder="Enter any additional remarks or notes"
              />
            </div>
          </div>
        </form>
      </div>

      <div className="modal-actions">
        <button className="cancel-btn" onClick={handleClose}>
          Cancel
        </button>
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!isFormValid}
        >
          <i className="ri-save-line"></i>
          Update Expense
        </button>
      </div>
    </>
  );
};

export default RecordPurchaseExpense;
