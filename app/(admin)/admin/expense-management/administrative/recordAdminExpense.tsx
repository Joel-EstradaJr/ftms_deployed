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
  date: string;
  category: string;
  subcategory: string;
  amount: string;
  description: string;
  vendor: string;
  invoice_number: string;
  paymentMethod: string;
  referenceNo: string;
  numberOfPayments: string;
  startDate: string;
  remarks: string;
  accountingCode: string;
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
    id: existingData?.id || '',
    expense_type: existingData?.expense_type || 'ADMINISTRATIVE',
    category: existingData?.category || '',
    subcategory: existingData?.subcategory || '',
    date: existingData?.date || new Date().toISOString().split('T')[0],
    amount: existingData?.amount || 0,
    description: existingData?.description || '',
    vendor: existingData?.vendor || '',
    invoice_number: existingData?.invoice_number || '',
    
    // Prepaid fields
    isPrepaid: existingData?.isPrepaid || false,
    frequency: existingData?.frequency || undefined,
    startDate: existingData?.startDate || new Date().toISOString().split('T')[0],
    scheduleItems: existingData?.scheduleItems || [],
    
    // Payment details
    paymentMethod: existingData?.paymentMethod || '',
    referenceNo: existingData?.referenceNo || '',
    receiptUrl: existingData?.receiptUrl || '',
    remarks: existingData?.remarks || '',
    paymentStatus: existingData?.paymentStatus || PaymentStatus.PENDING,
    
    created_by: existingData?.created_by || currentUser,
    created_at: existingData?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const [scheduleItems, setScheduleItems] = useState<ExpenseScheduleItem[]>(existingData?.scheduleItems || []);
  const [numberOfPayments, setNumberOfPayments] = useState<number>(existingData?.scheduleItems?.length || 2);

  const [formErrors, setFormErrors] = useState<FormErrors>({
    date: '',
    category: '',
    subcategory: '',
    amount: '',
    description: '',
    vendor: '',
    invoice_number: '',
    paymentMethod: '',
    referenceNo: '',
    numberOfPayments: '',
    startDate: '',
    remarks: '',
    accountingCode: ''
  });

  const [isDirty, setIsDirty] = useState(false);

  // Generate schedule when relevant fields change
  useEffect(() => {
    if (
      formData.isPrepaid &&
      formData.frequency &&
      formData.frequency !== ExpenseScheduleFrequency.CUSTOM &&
      formData.startDate &&
      numberOfPayments &&
      numberOfPayments > 0 &&
      formData.amount > 0
    ) {
      const dates = generateScheduleDates(
        formData.frequency,
        formData.startDate,
        numberOfPayments
      );
      const items = generateScheduleItems(dates, formData.amount);
      setScheduleItems(items);
      setFormData(prev => ({ ...prev, scheduleItems: items }));
    } else if (formData.isPrepaid && formData.frequency === ExpenseScheduleFrequency.CUSTOM) {
      // For custom, keep existing items or create one default item
      if (scheduleItems.length === 0 && formData.amount > 0) {
        const today = new Date().toISOString().split('T')[0];
        const items = generateScheduleItems([today], formData.amount);
        setScheduleItems(items);
        setFormData(prev => ({ ...prev, scheduleItems: items }));
      }
    } else if (!formData.isPrepaid) {
      setScheduleItems([]);
      setFormData(prev => ({ ...prev, scheduleItems: [] }));
    }
  }, [
    formData.isPrepaid,
    formData.frequency,
    formData.startDate,
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
      case 'date':
        if (!value) errorMessage = 'Date is required';
        break;
      case 'category':
        if (!value) errorMessage = 'Category is required';
        break;
      case 'amount':
        if (!value || value <= 0) errorMessage = 'Amount must be greater than 0';
        break;
      case 'vendor':
        if (!value) errorMessage = 'Vendor is required';
        break;
      case 'numberOfPayments':
        if (formData.isPrepaid && formData.frequency !== ExpenseScheduleFrequency.CUSTOM) {
          const n = Number(value);
          if (!n || !Number.isInteger(n) || n < 2 || n > 100) {
            errorMessage = 'Number of payments must be between 2 and 100';
          }
        }
        break;
      case 'startDate':
        if (formData.isPrepaid && !value) {
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
      case 'accountingCode':
        if (!value) errorMessage = 'Accounting Code is required';
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
      date: validateFormField('date', formData.date),
      category: validateFormField('category', formData.category),
      subcategory: '',
      amount: validateFormField('amount', formData.amount),
      description: '',
      vendor: validateFormField('vendor', formData.vendor),
      invoice_number: '',
      paymentMethod: '',
      referenceNo: '',
      numberOfPayments: validateFormField('numberOfPayments', numberOfPayments),
      startDate: validateFormField('startDate', formData.startDate),
      remarks: '',
      accountingCode: validateFormField('accountingCode', formData.category)
    };

    if (Object.values(errors).some(err => err !== '')) {
      showError('Please fix the errors in the form','error');
      return;
    }

    if (formData.isPrepaid) {
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
                value={formData.id || 'Auto-generated'}
                readOnly
                className="readonly-input"
              />
            </div>
            <div className="form-group">
              <label>Date Recorded <span className="requiredTags">*</span></label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className={formErrors.date ? 'error' : ''}
                readOnly={mode === 'edit'}
              />
              {formErrors.date && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.date}</p>}
            </div>
          </div>

          {/* Row: Expense Name + Amount */}
          <div className="form-row">
            <div className="form-group">
              <label>Expense Name <span className="requiredTags">*</span></label>
              <CustomDropdown
                options={EXPENSE_CATEGORIES}
                value={formData.vendor || ''}
                onChange={(val) => setFormData(prev => ({ ...prev, vendor: val }))}
                placeholder="Select or type expense name"
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

          {/* Row: Payment Method */}
          <div className="form-row">
            <div className="form-group">
              <label>Payment Method</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
              >
                <option value="">Select Payment Method</option>
                <option value="CASH">Cash</option>
                <option value="CHECK">Check</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="OTHERS">Others</option>
              </select>
            </div>
          </div>
        </form>

      </div>

      {/* II. Payables */}
      <p className="details-title">II. Payables</p>
      <div className={`modal-content ${mode}`}>
        <form className={`${mode}-form`}>
          {/* Prepaid / Payable Section */}
          <div className="form-row">
            <div className="form-group full-width section-divider">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="isPrepaid"
                  name="isPrepaid"
                  checked={formData.isPrepaid}
                  onChange={handleInputChange}
                />
                <label htmlFor="isPrepaid" style={{ fontWeight: '600' }}>
                  Payables? (Schedule Payments)
                </label>
              </div>
            </div>
          </div>

          {formData.isPrepaid && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Frequency <span className="requiredTags">*</span></label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Frequency</option>
                    {Object.values(ExpenseScheduleFrequency).map(freq => (
                      <option key={freq} value={freq}>{freq}</option>
                    ))}
                  </select>
                </div>
                {formData.frequency !== ExpenseScheduleFrequency.CUSTOM && (
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
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date <span className="requiredTags">*</span></label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={formErrors.startDate ? 'error' : ''}
                  />
                  {formErrors.startDate && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.startDate}</p>}
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
                    isPrepaid={formData.isPrepaid}
                    frequency={formData.frequency}
                  />
                </div>
              </div>
            </>) }
          </form>
      </div>

      {/* III. Additional Info */}
      <p className="details-title">III. Additional Info</p>
      <div className={`modal-content ${mode}`}>
        <form className={`${mode}-form`}>

          {/* Row: Remarks */}
          <div className="form-row">
            <div className="form-group full-width">
              <label>Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                rows={2}
              />
            </div>
          </div>
        </form>
      </div>

      {/* IV. Accounting Details */}
      <p className="details-title">IV. Accounting Details</p>
      <div className={`modal-content ${mode}`}>
        <form className={`${mode}-form`}>
          <div className="form-row">
            <div className="form-group">
              <label>Accounting Code <span className="requiredTags">*</span></label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={formErrors.accountingCode ? 'error' : ''}
              >
                <option value="">Select Account</option>
                {CHART_OF_ACCOUNTS.map(account => (
                  <option key={account.account_id} value={account.account_code}>
                    {account.account_code} - {account.account_name}
                  </option>
                ))}
              </select>
              {formErrors.accountingCode && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.accountingCode}</p>}
            </div>
          </div>
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
