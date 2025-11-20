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
import ItemsTable, { Item } from "@/Components/itemTable";

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
}

const EXPENSE_CATEGORIES = Object.values(AdministrativeExpenseType).map(type => ({
  value: type,
  label: type.replace(/_/g, ' ')
}));

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
  const [items, setItems] = useState<Item[]>(
    existingData?.items?.map(item => ({
      item_name: item.item_name || '',
      quantity: item.quantity || 1,
      unit_measure: item.unit_measure || 'pcs',
      unit_cost: item.unit_cost || 0,
      supplier: item.supplier || '',
      subtotal: item.subtotal || 0,
      type: item.type || 'supply'
    })) || []
  );
  const [showItems, setShowItems] = useState<boolean>(!!existingData?.items && existingData.items.length > 0);
  const [itemsValid, setItemsValid] = useState(true);

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
    remarks: ''
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

  const handleItemsChange = (newItems: Item[]) => {
    setItems(newItems);
    const totalAmount = newItems.reduce((sum, item) => sum + item.subtotal, 0);
    setFormData(prev => ({ ...prev, amount: totalAmount, items: newItems as any[] }));
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
      remarks: ''
    };

    if (Object.values(errors).some(err => err !== '')) {
      showError('Please fix the errors in the form','error');
      return;
    }

    // Validate items if any are present
    if (showItems && items.length > 0 && !itemsValid) {
      showError('Please fix the errors in expense items', 'error');
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
          {/* Row: Date + Category */}
          <div className="form-row">
            <div className="form-group">
              <label>Date <span className="requiredTags">*</span></label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className={formErrors.date ? 'error' : ''}
              />
              {formErrors.date && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.date}</p>}
            </div>
            <div className="form-group">
              <label>Category <span className="requiredTags">*</span></label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={formErrors.category ? 'error' : ''}
              >
                <option value="">Select Category</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {formErrors.category && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.category}</p>}
            </div>
          </div>

          {/* Row: Subcategory + Amount */}
          <div className="form-row">
            <div className="form-group">
              <label>Subcategory</label>
              <input
                type="text"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleInputChange}
                placeholder="e.g. Office Supplies, Internet"
              />
            </div>
            <div className="form-group">
              <label>Amount <span className="requiredTags">*</span></label>
              <div className="form-row" style={{ alignItems: 'center' }}>
                <input
                  type="text"
                  value={formatMoney(formData.amount)}
                  readOnly
                  className="readonly-input"
                  style={{ fontWeight: 'bold', color: '#961C1E' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Auto-calculated from expense items</p>
            </div>
          </div>

          {/* Row: Vendor + Invoice */}
          <div className="form-row">
            <div className="form-group">
              <label>Vendor / Payee <span className="requiredTags">*</span></label>
              <input
                type="text"
                name="vendor"
                value={formData.vendor}
                onChange={handleInputChange}
                className={formErrors.vendor ? 'error' : ''}
              />
              {formErrors.vendor && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.vendor}</p>}
            </div>
            <div className="form-group">
              <label>Invoice / Ref No.</label>
              <input
                type="text"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Row: Description (full width) */}
          <div className="form-row">
            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
              />
            </div>
          </div>
        </form>

      </div>

      {/* II. Expense Items */}
      <p className="details-title">II. Expense Items (Optional)</p>
      <div className={`modal-content ${mode}`}>
        <ItemsTable
          items={items}
          onItemsChange={handleItemsChange}
          showItems={showItems}
          onToggleItems={() => setShowItems(!showItems)}
          readOnly={false}
          title="Expense Items"
          onValidityChange={setItemsValid}
        />
      </div>

      {/* III. Payment Schedule */}
      <p className="details-title">III. Payment Schedule</p>
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
                  Mark as Prepaid / Payable (Schedule Payments)
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

      {/* IV. Additional Info */}
      <p className="details-title">IV. Additional Info</p>
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

        
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="submit-btn" onClick={(e) => handleSubmit(e as any)}>
                {mode === 'add' ? 'Record Expense' : 'Save Changes'}
            </button>
        </div>
    </>
  );
}
