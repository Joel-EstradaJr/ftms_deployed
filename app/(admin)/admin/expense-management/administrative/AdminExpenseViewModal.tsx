'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ModalHeader from '../../../../Components/ModalHeader';
import ItemsTable from '../../../../Components/itemTable';
import '../../../../styles/components/modal.css';
import { AdministrativeExpense } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { showConfirmation, showSuccess, showError, showWarning } from '../../../../utils/Alerts';
import { validateField, isNotFutureDate, isValidAmount } from '../../../../utils/validation';

interface AdminExpenseViewModalProps {
  expense?: AdministrativeExpense | null;
  mode?: 'view' | 'add' | 'edit';
  onSave?: (expense: AdministrativeExpense) => void;
  onClose: () => void;
}

const AdminExpenseViewModal: React.FC<AdminExpenseViewModalProps> = ({
  expense,
  mode = 'view',
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState<Partial<AdministrativeExpense>>({
    date: new Date().toISOString().split('T')[0],
    expense_type: 'OFFICE_SUPPLIES',
    amount: 0,
    description: '',
    department: 'Administration',
    vendor: '',
    invoice_number: '',
    items: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidFields, setIsValidFields] = useState({
    form: false,
    items: false
  });
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && expense) {
      setFormData({
        ...expense,
        date: expense.date.split('T')[0]
      });
    } else if (mode === 'add') {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        expense_type: 'OFFICE_SUPPLIES',
        amount: 0,
        description: '',
        department: 'Administration',
        vendor: '',
        invoice_number: '',
        created_by: 'Current User',
        created_at: new Date().toISOString(),
        items: []
      });
    }
  }, [mode, expense]);

  // Effect to validate form fields
  useEffect(() => {
    const isFormValid = !!(formData.date && 
           formData.expense_type && 
           formData.description?.trim() &&
           formData.department?.trim() &&
           formData.items && formData.items.length > 0 &&
           (formData.amount !== undefined && formData.amount > 0));
    setIsValidFields(prev => ({ ...prev, form: isFormValid }));
  }, [formData]);

  // Observer Pattern: Monitors all field validity states and controls button enablement
  // This ensures the submit button is only enabled when ALL required fields are valid
  useEffect(() => {
    const allFieldsValid = isValidFields.form && isValidFields.items;
    setIsButtonEnabled(allFieldsValid);
    
    // Debug logging (remove in production)
    console.log('Form Validity Observer:', {
      formValid: isValidFields.form,
      itemsValid: isValidFields.items,
      buttonEnabled: allFieldsValid
    });
  }, [isValidFields.form, isValidFields.items]);

  const handleInputChange = (field: keyof AdministrativeExpense, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputBlur = (field: keyof AdministrativeExpense, value: any) => {
    if (field === 'date') {
      if (!isNotFutureDate(value)) {
        showWarning('Date cannot be in the future. Please select today or a past date.', 'Invalid Input');
      }
    } else if (field === 'description') {
      const errors = validateField(value, {
        required: true,
        minLength: 3,
        maxLength: 500,
        label: 'Description'
      });
      if (errors.length > 0) {
        showWarning(errors[0], 'Invalid Input');
      }
    } else if (field === 'vendor') {
      const errors = validateField(value, {
        minLength: 2,
        maxLength: 100,
        label: 'Vendor'
      });
      if (errors.length > 0) {
        showWarning(errors[0], 'Invalid Input');
      }
    } else if (field === 'invoice_number') {
      const errors = validateField(value, {
        minLength: 3,
        maxLength: 50,
        label: 'Invoice Number'
      });
      if (errors.length > 0) {
        showWarning(errors[0], 'Invalid Input');
      }
    }
  };

  const handleItemsChange = (items: any[]) => {
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    setFormData(prev => ({ ...prev, items, amount: totalAmount }));
  };

  const validateAllFields = (): string[] => {
    const errors: string[] = [];

    // Date validation
    if (!formData.date) {
      errors.push('Date is required');
    } else if (!isNotFutureDate(formData.date)) {
      errors.push('Date cannot be in the future. Please select today or a past date.');
    }

    // Description validation
    if (!formData.description?.trim()) {
      errors.push('Description is required');
    } else {
      const descErrors = validateField(formData.description, {
        required: true,
        minLength: 3,
        maxLength: 500,
        label: 'Description'
      });
      errors.push(...descErrors);
    }

    // Department validation
    if (!formData.department?.trim()) {
      errors.push('Department is required');
    }

    // Vendor validation (optional field)
    if (formData.vendor) {
      const vendorErrors = validateField(formData.vendor, {
        minLength: 2,
        maxLength: 100,
        label: 'Vendor'
      });
      errors.push(...vendorErrors);
    }

    // Invoice Number validation (optional field)
    if (formData.invoice_number) {
      const invoiceErrors = validateField(formData.invoice_number, {
        minLength: 3,
        maxLength: 50,
        label: 'Invoice Number'
      });
      errors.push(...invoiceErrors);
    }

    // Items validation
    if (!formData.items || formData.items.length === 0) {
      errors.push('At least one expense item is required');
    } else {
      const totalAmount = formData.items.reduce((sum, item) => sum + item.subtotal, 0);
      if (totalAmount <= 0) {
        errors.push('Total amount must be greater than zero. Please check item quantities and prices.');
      }
    }

    // Amount validation
    if (!formData.amount || formData.amount <= 0) {
      errors.push('Amount must be greater than zero (add items to calculate amount)');
    }

    return errors;
  };

  const handleSubmit = async () => {
    if (mode === 'view') return;
    
    // Comprehensive validation before submission
    const validationErrors = validateAllFields();
    if (validationErrors.length > 0) {
      showError(validationErrors.join('\n'), 'Validation Error');
      return;
    }

    const confirmed = await showConfirmation(
      mode === 'add' ? 'Add Expense' : 'Update Expense',
      `Are you sure you want to ${mode === 'add' ? 'add' : 'update'} this expense?`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const expenseData: AdministrativeExpense = {
        ...formData,
        id: mode === 'edit' ? (expense?.id || `exp-${Date.now()}`) : `exp-${Date.now()}`,
        created_by: mode === 'edit' ? (expense?.created_by || 'Current User') : 'Current User',
        created_at: mode === 'edit' ? (expense?.created_at || new Date().toISOString()) : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as AdministrativeExpense;

      onSave && onSave(expenseData);
      showSuccess(`Expense ${mode === 'add' ? 'added' : 'updated'} successfully`, 'Success');
      onClose();
    } catch (error) {
      showError(`Failed to ${mode} expense`, 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    if (mode === 'view') return `Administrative Expense - ${expense?.invoice_number || expense?.id}`;
    return `${mode === 'add' ? 'Add' : 'Edit'} Administrative Expense`;
  };

  const isEditable = mode !== 'view';

  const displayData = isEditable ? formData : expense;

  if (typeof document !== 'undefined') {
    return createPortal((
      <div className="modalOverlay">
        <div className="modalStandard">
          <ModalHeader
            title={getTitle()}
            onClose={onClose}
          />

          <div className="modalContent">
            <h3 className="sectionTitle">Expense Details</h3>
            <div className="formRow">
              <div className="formField">
                <label>Date:<span className="requiredTags">*</span></label>
                <input 
                  type={isEditable ? "date" : "text"} 
                  value={isEditable ? formData.date : formatDate(displayData?.date || '')} 
                  onChange={(e) => handleInputChange('date', e.target.value)} 
                  onBlur={(e) => handleInputBlur('date', e.target.value)}
                  readOnly={!isEditable}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="formField">
                <label>Expense Type:</label>
                {isEditable ? (
                  <select value={formData.expense_type} onChange={(e) => handleInputChange('expense_type', e.target.value)}>
                    <option value="OFFICE_SUPPLIES">Office Supplies</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="PROFESSIONAL_FEES">Professional Fees</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="LICENSING">Licensing</option>
                    <option value="PERMITS">Permits</option>
                    <option value="GENERAL_ADMIN">General Admin</option>
                  </select>
                ) : (
                  <div style={{ padding: '0.5rem 0' }}>
                    <span className={`chip ${displayData?.expense_type?.toLowerCase()}`}>
                      {displayData?.expense_type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
              <div className="formField">
                <label>Amount:</label>
                <input 
                  type="text" 
                  value={formatMoney(displayData?.amount || 0)} 
                  readOnly 
                  className="amount-text"
                />
              </div>
            </div>

            <div className="formRow">
              <div className="formField full-width">
                <label>Description:<span className="requiredTags">*</span></label>
                <textarea 
                  value={displayData?.description || ''} 
                  onChange={(e) => handleInputChange('description', e.target.value)} 
                  onBlur={(e) => handleInputBlur('description', e.target.value)}
                  readOnly={!isEditable} 
                  rows={3} 
                />
              </div>
            </div>
          </div>

          <div className="modalContent">
            <h3 className="sectionTitle">Vendor & Department Information</h3>
            <div className="formRow">
              <div className="formField">
                <label>Department:<span className="requiredTags">*</span></label>
                <input 
                  type="text" 
                  value={displayData?.department || 'Administration'} 
                  readOnly 
                />
              </div>
              <div className="formField">
                <label>Vendor:</label>
                <input 
                  type="text" 
                  value={displayData?.vendor || ''} 
                  onChange={(e) => handleInputChange('vendor', e.target.value)} 
                  onBlur={(e) => handleInputBlur('vendor', e.target.value)}
                  readOnly={!isEditable} 
                />
              </div>
              <div className="formField">
                <label>Invoice Number:</label>
                <input 
                  type="text" 
                  value={displayData?.invoice_number || ''} 
                  onChange={(e) => handleInputChange('invoice_number', e.target.value)} 
                  onBlur={(e) => handleInputBlur('invoice_number', e.target.value)}
                  readOnly={!isEditable} 
                />
              </div>
            </div>
            <div className="formRow">
              <div className="formField">
                <label>Created By:</label>
                <input type="text" value={displayData?.created_by || ''} readOnly />
              </div>
              <div className="formField">
                <label>Created At:</label>
                <input type="text" value={formatDate(displayData?.created_at || '')} readOnly />
              </div>
            </div>
            {displayData?.approved_by && (
              <div className="formRow">
                <div className="formField">
                  <label>Approved By:</label>
                  <input type="text" value={displayData.approved_by} readOnly />
                </div>
                <div className="formField">
                  <label>Approved At:</label>
                  <input type="text" value={formatDate(displayData?.approved_at || '')} readOnly />
                </div>
              </div>
            )}
          </div>

          
            {/* Items Table */}
            {(isEditable || (displayData?.items && displayData.items.length > 0)) && (
              <div className="modalContent">
                  <div style={{ marginTop: '1.5rem' }}>
                  <ItemsTable
                      items={isEditable ? (formData.items || []) : (displayData?.items || [])}
                      onItemsChange={isEditable ? handleItemsChange : () => {}}
                      showItems={true}
                      onToggleItems={() => {}} // Always show in edit mode
                      readOnly={!isEditable}
                      title="Expense Items"
                      onValidityChange={isEditable ? (isValid) => setIsValidFields(prev => ({ ...prev, items: isValid })) : undefined}
                  />
                  </div>
              </div>
            )}

            {isEditable && (
              <div className="modalButtons">
                <button className="cancelButton" onClick={onClose}>
                  Cancel
                </button>
                <button 
                  className="addButton" 
                  onClick={handleSubmit}
                  disabled={!isButtonEnabled}
                >
                  {mode === 'add' ? 'Create Expense' : 'Update Expense'}
                </button>
                
              </div>
            )}

        </div>
      </div>
    ), document.body);
  }

  return <div>Test</div>;
};

export default AdminExpenseViewModal;
