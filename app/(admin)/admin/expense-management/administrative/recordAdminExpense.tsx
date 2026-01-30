"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/expense-management/administrative.css";
import "@/styles/components/chips.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { showWarning, showError, showConfirmation } from "@/utils/Alerts";
import { isValidAmount } from "@/utils/validation";
import { 
  AdministrativeExpense, 
  AdministrativeExpenseType, 
  ExpenseScheduleFrequency, 
  ExpenseScheduleItem,
  PaymentStatus 
} from "@/app/types/expenses";
import { generateScheduleDates, generateScheduleItems, validateSchedule } from "@/app/utils/expenseScheduleCalculations";
import ExpenseScheduleTable from "@/Components/ExpenseScheduleTable";
import CustomDropdown from "@/Components/CustomDropdown";

interface RecordAdminExpenseModalProps {
  mode: "add" | "edit";
  existingData?: AdministrativeExpense | null;
  onSave: (formData: AdministrativeExpense, mode: "add" | "edit") => void;
  onClose: () => void;
  currentUser: string;
}

interface FormErrors {
  date_recorded: string;
  expense_type_id: string;
  amount: string;
  description: string;
  vendor: string;
  invoice_number: string;
  payment_method: string;
  payment_reference: string;
  numberOfPayments: string;
  startDate: string;
}

const EXPENSE_CATEGORIES = Object.values(AdministrativeExpenseType).map(type => ({
  value: type,
  label: type.replace(/_/g, ' ')
}));

// Sample Chart of Accounts - In production, this should be fetched from API
const CHART_OF_ACCOUNTS = [
  { account_id: '5010', account_code: '5010', account_name: 'Office Supplies Expense' },
  { account_id: '5020', account_code: '5020', account_name: 'Utilities Expense' },
  { account_id: '5030', account_code: '5030', account_name: 'Professional Fees' },
  { account_id: '5040', account_code: '5040', account_name: 'Insurance Expense' },
  { account_id: '5050', account_code: '5050', account_name: 'Licensing and Permits' },
  { account_id: '5060', account_code: '5060', account_name: 'General Administrative Expense' },
];

export default function RecordAdminExpenseModal({ 
  mode, 
  existingData, 
  onSave, 
  onClose, 
  currentUser 
}: RecordAdminExpenseModalProps) {
  
  const [formData, setFormData] = useState<AdministrativeExpense>({
    id: existingData?.id || 0,
    code: existingData?.code || '',
    expense_type_id: existingData?.expense_type_id || 0,
    date_recorded: existingData?.date_recorded || new Date().toISOString().split('T')[0],
    amount: existingData?.amount || 0,
    description: existingData?.description || '',
    vendor: existingData?.vendor || '',
    invoice_number: existingData?.invoice_number || '',
    
    // Payable relationship
    payable_id: existingData?.payable_id || null,
    frequency: existingData?.frequency || undefined,
    scheduleItems: existingData?.scheduleItems || [],
    
    // Payment details
    payment_method: existingData?.payment_method || '',
    payment_reference: existingData?.payment_reference || '',
    paymentStatus: existingData?.paymentStatus || PaymentStatus.PENDING,
    
    created_by: existingData?.created_by || currentUser,
    created_at: existingData?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const [scheduleItems, setScheduleItems] = useState<ExpenseScheduleItem[]>(existingData?.scheduleItems || []);
  const [numberOfPayments, setNumberOfPayments] = useState<number>(existingData?.scheduleItems?.length || 2);
  // Derived: has payable if payable_id exists or schedule items exist
  const hasPayable = formData.payable_id !== null || (formData.scheduleItems && formData.scheduleItems.length > 0);
  const [enablePayable, setEnablePayable] = useState<boolean>(hasPayable);

  const [formErrors, setFormErrors] = useState<FormErrors>({
    date_recorded: '',
    expense_type_id: '',
    amount: '',
    description: '',
    vendor: '',
    invoice_number: '',
    payment_method: '',
    payment_reference: '',
    numberOfPayments: '',
    startDate: ''
  });

  const [isDirty, setIsDirty] = useState(false);

  // Generate schedule when relevant fields change
  useEffect(() => {
    if (
      enablePayable &&
      formData.frequency &&
      numberOfPayments &&
      numberOfPayments > 0 &&
      formData.amount > 0
    ) {
      // Use the first schedule item's due_date as start date, or today
      const startDate = scheduleItems[0]?.due_date || new Date().toISOString().split('T')[0];
      const dates = generateScheduleDates(
        formData.frequency,
        startDate,
        numberOfPayments
      );
      const items = generateScheduleItems(dates, formData.amount);
      setScheduleItems(items);
      setFormData(prev => ({ ...prev, scheduleItems: items }));
    } else if (!enablePayable) {
      setScheduleItems([]);
      setFormData(prev => ({ ...prev, scheduleItems: [], payable_id: null }));
    }
  }, [
    enablePayable,
    formData.frequency,
    numberOfPayments,
    formData.amount
  ]);

  // Track form changes
  useEffect(() => {
    setIsDirty(true);
  }, [formData]);

  const validateFormField = (fieldName: keyof FormErrors, value: any): string => {
    let errorMessage = '';

    switch (fieldName) {
      case 'date_recorded':
        if (!value) errorMessage = 'Date is required';
        break;
      case 'expense_type_id':
        if (!value || value === 0) errorMessage = 'Expense type is required';
        break;
      case 'amount':
        if (!value || value <= 0) errorMessage = 'Amount must be greater than 0';
        break;
      case 'vendor':
        if (!value) errorMessage = 'Vendor is required';
        break;
      case 'numberOfPayments':
        if (enablePayable) {
          const n = Number(value);
          if (!n || !Number.isInteger(n) || n < 2 || n > 100) {
            errorMessage = 'Number of payments must be between 2 and 100';
          }
        }
        break;
      case 'startDate':
        if (enablePayable && !value) {
          errorMessage = 'Start date is required';
        } else if (value) {
          const startDate = new Date(value + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          startDate.setHours(0, 0, 0, 0);
          if (startDate < today) {
            errorMessage = 'Start date cannot be in the past';
          }
        }
        break;
    }

    setFormErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
    return errorMessage;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: any = value;

    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'amount') {
      newValue = parseFloat(value) || 0;
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
    validateFormField(name as keyof FormErrors, newValue);
  };

  const handleScheduleChange = (newItems: ExpenseScheduleItem[]) => {
    setScheduleItems(newItems);
    setFormData(prev => ({ ...prev, scheduleItems: newItems }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e && typeof (e as any).preventDefault === 'function') (e as any).preventDefault();

    // Validate all fields
    const errors: FormErrors = {
      date_recorded: validateFormField('date_recorded', formData.date_recorded),
      expense_type_id: validateFormField('expense_type_id', formData.expense_type_id),
      amount: validateFormField('amount', formData.amount),
      description: '',
      vendor: validateFormField('vendor', formData.vendor),
      invoice_number: '',
      payment_method: '',
      payment_reference: '',
      numberOfPayments: validateFormField('numberOfPayments', numberOfPayments),
      startDate: ''
    };

    if (Object.values(errors).some(err => err !== '')) {
      showError('Please fix the errors in the form','error');
      return;
    }

    if (enablePayable) {
      const scheduleValidation = validateSchedule(scheduleItems, formData.amount);
      if (!scheduleValidation.isValid) {
        showError(scheduleValidation.errors[0], 'error');
        return;
      }
    }

    onSave(formData, mode);
  };

  return (
    <>
      <div className="modal-heading modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 className="modal-title">{mode === 'add' ? 'Record Administrative Expense' : 'Edit Administrative Expense'}</h1>
        </div>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString()}</p>
          <p>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button onClick={onClose} className="close-modal-btn"><i className="ri-close-line" /></button>
      </div>

      <p className="details-title">I. Expense Information</p>
      <div className={`modal-content ${mode}`}>
        <form className={`${mode}-form`}>
          {/* Row: Expense Code + Date Recorded */}
          <div className="form-row">
            <div className="form-group">
              <label>Expense Code</label>
              <input
                type="text"
                value={formData.code || 'Auto-generated'}
                readOnly
                className="readonly-input"
              />
            </div>
            <div className="form-group">
              <label>Date Recorded <span className="requiredTags">*</span></label>
              <input
                type="date"
                name="date_recorded"
                value={formData.date_recorded}
                onChange={handleInputChange}
                className={formErrors.date_recorded ? 'error' : ''}
                readOnly={mode === 'edit'}
              />
              {formErrors.date_recorded && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.date_recorded}</p>}
            </div>
          </div>

          {/* Row: Vendor + Amount */}
          <div className="form-row">
            <div className="form-group">
              <label>Vendor <span className="requiredTags">*</span></label>
              <CustomDropdown
                options={EXPENSE_CATEGORIES}
                value={formData.vendor || ''}
                onChange={(val) => setFormData(prev => ({ ...prev, vendor: val }))}
                placeholder="Select or type vendor name"
                allowCustomInput={true}
              />
              {formErrors.vendor && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.vendor}</p>}
            </div>
            <div className="form-group">
              <label>Amount <span className="requiredTags">*</span></label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className={formErrors.amount ? 'error' : ''}
                step="0.01"
                min="0"
              />
              {formErrors.amount && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.amount}</p>}
            </div>
          </div>

          {/* Row: Invoice Number + Payment Method */}
          <div className="form-row">
            <div className="form-group">
              <label>Invoice Number</label>
              <input
                type="text"
                name="invoice_number"
                value={formData.invoice_number || ''}
                onChange={handleInputChange}
                placeholder="Enter invoice number"
              />
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleInputChange}
              >
                <option value="">Select Payment Method</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="E_WALLET">E-Wallet</option>
                <option value="REIMBURSEMENT">Reimbursement</option>
              </select>
            </div>
          </div>

          {/* Row: Description */}
          <div className="form-row">
            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                rows={2}
                placeholder="Enter expense description or remarks"
              />
            </div>
          </div>

          {/* Row: Expense Type */}
          <div className="form-row">
            <div className="form-group">
              <label>Expense Type <span className="requiredTags">*</span></label>
              <select
                name="expense_type_id"
                value={formData.expense_type_id}
                onChange={handleInputChange}
                className={formErrors.expense_type_id ? 'error' : ''}
              >
                <option value={0}>Select Expense Type</option>
                {CHART_OF_ACCOUNTS.map(account => (
                  <option key={account.account_id} value={parseInt(account.account_id)}>
                    {account.account_code} - {account.account_name}
                  </option>
                ))}
              </select>
              {formErrors.expense_type_id && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.expense_type_id}</p>}
            </div>
          </div>
        </form>
      </div>

      {/* II. Payables */}
      <p className="details-title">II. Payables</p>
      <div className={`modal-content ${mode}`}>
        <form className={`${mode}-form`}>
          {/* Enable Payable Section */}
          <div className="form-row">
            <div className="form-group full-width section-divider">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="enablePayable"
                  name="enablePayable"
                  checked={enablePayable}
                  onChange={(e) => setEnablePayable(e.target.checked)}
                />
                <label htmlFor="enablePayable" style={{ fontWeight: '600' }}>
                  Enable Payment Schedule
                </label>
              </div>
            </div>
          </div>

          {enablePayable && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Frequency <span className="requiredTags">*</span></label>
                  <select
                    name="frequency"
                    value={formData.frequency || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Frequency</option>
                    {Object.values(ExpenseScheduleFrequency).map(freq => (
                      <option key={freq} value={freq}>{freq}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Number of Payments <span className="requiredTags">*</span></label>
                  <input
                    type="number"
                    value={numberOfPayments}
                    onChange={(e) => {
                      setNumberOfPayments(parseInt(e.target.value) || 0);
                      validateFormField('numberOfPayments', e.target.value);
                    }}
                    min="2"
                    max="100"
                    className={formErrors.numberOfPayments ? 'error' : ''}
                  />
                  {formErrors.numberOfPayments && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.numberOfPayments}</p>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Payment Schedule</label>
                  <ExpenseScheduleTable
                    scheduleItems={scheduleItems}
                    mode={mode}
                    onItemChange={handleScheduleChange}
                    totalAmount={formData.amount}
                    isPrepaid={enablePayable}
                    frequency={formData.frequency}
                  />
                </div>
              </div>
            </>
          )}
        </form>
      </div>

      <div className="modal-actions">
        <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="submit-btn" onClick={(e) => handleSubmit(e as any)}>
          {mode === 'add' ? 'Record Expense' : 'Save Changes'}
        </button>
      </div>
    </>
  );
}
