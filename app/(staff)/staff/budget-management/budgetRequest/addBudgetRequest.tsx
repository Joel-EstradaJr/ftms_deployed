'use client';

import React, { useState, useEffect } from 'react';
import "../../../../styles/budget-management/addBudgetRequest.css";
import { formatDate } from '../../../../utils/formatting';
import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';
import { validateField, isValidAmount, ValidationRule } from "../../../../utils/validation";
import ModalHeader from '../../../../Components/ModalHeader';
import ItemTableModal, { ItemField } from '../../../../Components/ItemTableModal';

// Types
interface BudgetItem {
  item_name: string;
  quantity: number;
  unit_measure: string;
  unit_cost: number;
  supplier: string;
  subtotal: number;
}

interface NewBudgetRequest {
  title: string;
  description: string;
  department: string;
  requester_name: string;
  requester_position: string;
  request_date: string;
  budget_period: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  items?: BudgetItem[];
  supporting_documents?: File[];
  status: 'Draft' | 'Pending Approval';
  created_by: string;
}

interface AddBudgetRequestProps {
  onClose: () => void;
  onAddBudgetRequest: (formData: NewBudgetRequest) => void;
  currentUser: string;
}

type FieldName = 'title' | 'description' | 'total_amount' | 'start_date' | 'end_date' | 'budget_period';

// Mock Purchase Request Data
interface MockPurchaseRequest {
  code: string;
  department: string;
  items: ItemField[];
}

const mockPurchaseRequests: MockPurchaseRequest[] = [
  {
    code: 'PR-2026-001',
    department: 'Operations',
    items: [
      { item_name: 'Diesel Fuel', quantity: 500, unit_measure: 'liters', unit_cost: 65.50, supplier_name: 'Shell Gas Station', subtotal: 32750.00 },
      { item_name: 'Engine Oil (15W-40)', quantity: 20, unit_measure: 'liters', unit_cost: 450.00, supplier_name: 'Auto Parts Plus', subtotal: 9000.00 },
      { item_name: 'Brake Pads Set', quantity: 10, unit_measure: 'sets', unit_cost: 2500.00, supplier_name: 'Auto Parts Plus', subtotal: 25000.00 },
    ]
  },
  {
    code: 'PR-2026-002',
    department: 'Administration',
    items: [
      { item_name: 'Printer Paper A4 (Ream)', quantity: 50, unit_measure: 'boxes', unit_cost: 185.00, supplier_name: 'Office Depot', subtotal: 9250.00 },
      { item_name: 'Ballpoint Pens (Box of 50)', quantity: 10, unit_measure: 'boxes', unit_cost: 350.00, supplier_name: 'Office Depot', subtotal: 3500.00 },
      { item_name: 'Stapler (Heavy Duty)', quantity: 15, unit_measure: 'pcs', unit_cost: 425.00, supplier_name: 'Office Supplies Co.', subtotal: 6375.00 },
      { item_name: 'File Folders (Pack of 100)', quantity: 5, unit_measure: 'pcs', unit_cost: 650.00, supplier_name: 'Office Depot', subtotal: 3250.00 },
    ]
  },
  {
    code: 'PR-2026-003',
    department: 'Maintenance',
    items: [
      { item_name: 'Air Filter (Heavy Duty)', quantity: 25, unit_measure: 'pcs', unit_cost: 850.00, supplier_name: 'Bus Parts Supplier', subtotal: 21250.00 },
      { item_name: 'Tire (22.5 Radial)', quantity: 12, unit_measure: 'pcs', unit_cost: 15500.00, supplier_name: 'Tire World', subtotal: 186000.00 },
    ]
  },
  {
    code: 'PR-2026-004',
    department: 'Finance',
    items: [
      { item_name: 'Accounting Software License (Annual)', quantity: 1, unit_measure: 'pcs', unit_cost: 45000.00, supplier_name: 'SoftTech Solutions', subtotal: 45000.00 },
      { item_name: 'Financial Calculator', quantity: 8, unit_measure: 'pcs', unit_cost: 2500.00, supplier_name: 'Office Supplies Co.', subtotal: 20000.00 },
    ]
  },
  {
    code: 'PR-2026-005',
    department: 'Operations',
    items: [
      { item_name: 'GPS Tracking Device', quantity: 15, unit_measure: 'pcs', unit_cost: 8500.00, supplier_name: 'Tech Innovations Inc.', subtotal: 127500.00 },
      { item_name: 'Two-Way Radio Set', quantity: 20, unit_measure: 'sets', unit_cost: 3500.00, supplier_name: 'Communications Corp', subtotal: 70000.00 },
      { item_name: 'Fire Extinguisher (5kg)', quantity: 30, unit_measure: 'pcs', unit_cost: 1200.00, supplier_name: 'Safety First Supplies', subtotal: 36000.00 },
    ]
  },
];

// Field mapping utilities
const budgetItemToItemField = (item: BudgetItem): ItemField => ({
  item_name: item.item_name,
  quantity: item.quantity,
  unit_measure: item.unit_measure,
  unit_cost: item.unit_cost,
  supplier_name: item.supplier,
  subtotal: item.subtotal
});

const itemFieldToBudgetItem = (item: ItemField): BudgetItem => ({
  item_name: item.item_name || '',
  quantity: item.quantity || 0,
  unit_measure: item.unit_measure || '',
  unit_cost: item.unit_cost || 0,
  supplier: item.supplier_name || '',
  subtotal: item.subtotal || 0
});

const AddBudgetRequest: React.FC<AddBudgetRequestProps> = ({
  onClose,
  onAddBudgetRequest,
  currentUser
}) => {
  const [errors, setErrors] = useState<Record<FieldName, string[]>>({
    title: [],
    description: [],
    total_amount: [],
    start_date: [],
    end_date: [],
    budget_period: []
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: 'Operations', // Auto-filled
    requester_name: 'Admin User', // Auto-filled
    requester_position: 'Administrator', // Auto-filled
    request_date: new Date().toISOString().split('T')[0],
    budget_period: 'One Time Use',
    total_amount: 0,
    start_date: '',
    end_date: '',
    created_by: currentUser
  });

  const [items, setItems] = useState<BudgetItem[]>([]);
  const [showItems, setShowItems] = useState(false);
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  
  // PR-linked mode state
  const [isLinkedToPurchaseRequest, setIsLinkedToPurchaseRequest] = useState(false);
  const [selectedPRCode, setSelectedPRCode] = useState('');
  const [prDepartment, setPrDepartment] = useState('');

  const validationRules: Record<FieldName, ValidationRule> = {
    title: { required: true, label: "Budget Title" },
    description: { required: true, label: "Description" },
    total_amount: {
      required: true,
      min: 0.01,
      label: "Total Amount",
      custom: (v: unknown) => {
        const numValue = typeof v === 'number' ? v : Number(v);
        return isValidAmount(numValue) ? null : "Amount must be greater than 0.";
      }
    },
    start_date: { required: true, label: "Start Date" },
    end_date: { required: true, label: "End Date" },
    budget_period: { required: true, label: "Budget Period" }
  };

  // Calculate total from items
  const calculateTotalFromItems = () => {
    return items.reduce((total, item) => total + item.subtotal, 0);
  };

  // Update total amount when items change
  useEffect(() => {
    if (items.length > 0) {
      const itemsTotal = calculateTotalFromItems();
      setFormData(prev => ({ ...prev, total_amount: itemsTotal }));
    }
  }, [items]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newValue: string | number = value;

    if (name === 'total_amount') {
      newValue = parseFloat(value) || 0;
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Validate field
    if (validationRules[name as FieldName]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(newValue, validationRules[name as FieldName])
      }));
    }
  };

  // Item management functions
  const addItem = () => {
    setItems(prev => [...prev, {
      item_name: '',
      quantity: 1,
      unit_measure: 'pcs',
      unit_cost: 0,
      supplier: '',
      subtotal: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BudgetItem, value: string | number) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Recalculate subtotal if quantity or unit_cost changes
      if (field === 'quantity' || field === 'unit_cost') {
        updated[index].subtotal = updated[index].quantity * updated[index].unit_cost;
      }
      
      return updated;
    });
  };

  // PR selection handler
  const handlePRSelection = (prCode: string) => {
    setSelectedPRCode(prCode);
    
    if (prCode) {
      const selectedPR = mockPurchaseRequests.find(pr => pr.code === prCode);
      if (selectedPR) {
        // Convert ItemField[] to BudgetItem[]
        const prItems = selectedPR.items.map(itemFieldToBudgetItem);
        setItems(prItems);
        setPrDepartment(selectedPR.department);
        setFormData(prev => ({ ...prev, department: selectedPR.department }));
      }
    } else {
      setItems([]);
      setPrDepartment('');
    }
  };

  // PR checkbox toggle handler
  const handlePRToggle = async (checked: boolean) => {
    if (!checked && items.length > 0) {
      const result = await showConfirmation(
        'Switching to manual mode will clear current items. Continue?',
        'Confirm Mode Switch'
      );
      if (!result.isConfirmed) return;
    }

    if (checked && items.length > 0) {
      const result = await showConfirmation(
        'Switching to PR-linked mode will clear current items. Continue?',
        'Confirm Mode Switch'
      );
      if (!result.isConfirmed) return;
    }

    setIsLinkedToPurchaseRequest(checked);
    setItems([]);
    setSelectedPRCode('');
    setPrDepartment('');
    if (!checked) {
      setFormData(prev => ({ ...prev, department: 'Operations' }));
    }
  };

  // Handle items save from ItemTableModal
  const handleItemsSave = (updatedItems: ItemField[]) => {
    const budgetItems = updatedItems.map(itemFieldToBudgetItem);
    setItems(budgetItems);
  };

  // File handling functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    // Filter for allowed file types (documents and images)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        showError(`File type not allowed: ${file.name}`, 'Invalid File');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showError(`File too large: ${file.name}. Maximum size is 10MB.`, 'File Too Large');
        return false;
      }
      return true;
    });

    setSupportingDocuments(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSupportingDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean = false) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = ['title', 'description', 'total_amount', 'start_date', 'end_date'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0 && !saveAsDraft) {
      showError('Please fill in all required fields', 'Validation Error');
      return;
    }

    // Validate date range
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (startDate >= endDate) {
        showError('End date must be after start date', 'Invalid Date Range');
        return;
      }
    }

    // Validate items if they exist (skip validation for PR-linked items)
    if (!isLinkedToPurchaseRequest && items.length > 0) {
      const invalidItems = items.filter(item => 
        !item.item_name || 
        item.quantity <= 0 || 
        item.unit_cost <= 0 || 
        !item.supplier
      );

      if (invalidItems.length > 0 && !saveAsDraft) {
        showError('Please complete all item fields or remove incomplete items', 'Invalid Items');
        return;
      }
    }

    const action = saveAsDraft ? 'save as draft' : 'submit for approval';
    const result = await showConfirmation(
      `Are you sure you want to ${action} this budget request?`,
      `Confirm ${saveAsDraft ? 'Draft' : 'Submit'}`
    );

    if (result.isConfirmed) {
      try {
        const payload: NewBudgetRequest = {
          ...formData,
          status: saveAsDraft ? 'Draft' : 'Pending Approval',
          items: items.length > 0 ? items : undefined,
          supporting_documents: supportingDocuments.length > 0 ? supportingDocuments : undefined
        };

        await onAddBudgetRequest(payload);
        showSuccess(
          `Budget request ${saveAsDraft ? 'saved as draft' : 'submitted for approval'} successfully`, 
          'Success'
        );
        onClose();
      } catch (error: unknown) {
        console.error('Error adding budget request:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        showError('Failed to add budget request: ' + errorMessage, 'Error');
      }
    }
  };

  return (
    <div className="modalOverlay">
      <div className="addBudgetRequestModal">
        <ModalHeader 
          title="Create Budget Request" 
          onClose={onClose} 
          showDateTime={true} 
        />

        <form onSubmit={(e) => handleSubmit(e, false)}>
          <div className="modalContent">
            <div className="formInputs">
              
              {/* Basic Information Section */}
              <div className="sectionHeader">Request Information</div>
              
              <div className="formRow">
                <div className="formField formFieldHalf">
                  <label htmlFor="department">Department</label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    readOnly
                    className="formInput"
                  />
                  <span className="autofill-note">Auto-filled based on current user</span>
                </div>
                
                <div className="formField formFieldHalf">
                  <label htmlFor="requester_name">Requester Name</label>
                  <input
                    type="text"
                    id="requester_name"
                    name="requester_name"
                    value={formData.requester_name}
                    readOnly
                    className="formInput"
                  />
                  <span className="autofill-note">Auto-filled based on current user</span>
                </div>
              </div>

              <div className="formRow">
                <div className="formField formFieldHalf">
                  <label htmlFor="requester_position">Requester Position</label>
                  <input
                    type="text"
                    id="requester_position"
                    name="requester_position"
                    value={formData.requester_position}
                    readOnly
                    className="formInput"
                  />
                  <span className="autofill-note">Auto-filled based on current user</span>
                </div>
                
                <div className="formField formFieldHalf">
                  <label htmlFor="request_date">Date of Request</label>
                  <input
                    type="date"
                    id="request_date"
                    name="request_date"
                    value={formData.request_date}
                    readOnly
                    className="formInput"
                  />
                  <span className="autofill-note">Auto-filled with current date</span>
                </div>
              </div>

              {/* Budget Details Section */}
              <div className="sectionHeader">Budget Details</div>
              
              <div className="formRow">
                <div className="formField formFieldHalf">
                  <label htmlFor="budget_period">Budget Period<span className='requiredTags'> *</span></label>
                  <select
                    id="budget_period"
                    name="budget_period"
                    value={formData.budget_period}
                    onChange={handleInputChange}
                    required
                    className="formSelect"
                  >
                    <option value="One Time Use">One Time Use</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                  {errors.budget_period?.map((msg, i) => (
                    <div className="error-message" key={i}>{msg}</div>
                  ))}
                </div>
                
                <div className="formField formFieldHalf">
                  <label htmlFor="total_amount">Total Amount Requested<span className='requiredTags'> *</span></label>
                  <input
                    type="number"
                    id="total_amount"
                    name="total_amount"
                    value={formData.total_amount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                    className="formInput"
                    readOnly={showItems && items.length > 0}
                  />
                  {showItems && items.length > 0 && (
                    <span className="autofill-note">Auto-calculated from items below</span>
                  )}
                  {errors.total_amount?.map((msg, i) => (
                    <div className="error-message" key={i}>{msg}</div>
                  ))}
                </div>
              </div>

              <div className="formField">
                <label htmlFor="title">Budget Title / Project Name<span className='requiredTags'> *</span></label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="formInput"
                  placeholder="Enter budget title or project name"
                />
                {errors.title?.map((msg, i) => (
                  <div className="error-message" key={i}>{msg}</div>
                ))}
              </div>

              <div className="formField">
                <label htmlFor="description">Description<span className='requiredTags'> *</span></label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  className="formInput"
                  placeholder="Provide a detailed description of the budget request"
                  rows={4}
                />
                {errors.description?.map((msg, i) => (
                  <div className="error-message" key={i}>{msg}</div>
                ))}
              </div>

              <div className="formRow">
                <div className="formField formFieldHalf">
                  <label htmlFor="start_date">Start Date<span className='requiredTags'> *</span></label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    className="formInput"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.start_date?.map((msg, i) => (
                    <div className="error-message" key={i}>{msg}</div>
                  ))}
                </div>
                
                <div className="formField formFieldHalf">
                  <label htmlFor="end_date">End Date<span className='requiredTags'> *</span></label>
                  <input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    required
                    className="formInput"
                    min={formData.start_date || new Date().toISOString().split('T')[0]}
                  />
                  {errors.end_date?.map((msg, i) => (
                    <div className="error-message" key={i}>{msg}</div>
                  ))}
                </div>
              </div>

              {/* Items Section */}
              <div className="sectionHeader">Budget Items (Optional)</div>
              
              <div className="itemsSection">
                <div className="formRow">
                  <div className="formField">
                    <label className="checkboxLabel">
                      <input
                        type="checkbox"
                        checked={isLinkedToPurchaseRequest}
                        onChange={(e) => handlePRToggle(e.target.checked)}
                      />
                      <span>Link to Purchase Request</span>
                    </label>
                  </div>
                </div>

                {isLinkedToPurchaseRequest && (
                  <div className="formRow">
                    <div className="formField formFieldHalf">
                      <label htmlFor="pr_code">Purchase Request Code<span className='requiredTags'> *</span></label>
                      <select
                        id="pr_code"
                        value={selectedPRCode}
                        onChange={(e) => handlePRSelection(e.target.value)}
                        className="formInput"
                      >
                        <option value="">Select Purchase Request</option>
                        {mockPurchaseRequests.map(pr => (
                          <option key={pr.code} value={pr.code}>
                            {pr.code} - {pr.department}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="formField formFieldHalf">
                      <label htmlFor="pr_department">Department</label>
                      <input
                        type="text"
                        id="pr_department"
                        value={prDepartment}
                        readOnly
                        className="formInput"
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                      />
                      <span className="autofill-note">Auto-filled from Purchase Request</span>
                    </div>
                  </div>
                )}

                <ItemTableModal
                  isOpen={true}
                  onClose={() => {}}
                  mode={isLinkedToPurchaseRequest ? 'view' : 'edit'}
                  title="Budget Items"
                  items={items.map(budgetItemToItemField)}
                  onSave={handleItemsSave}
                  requiredFields={['item_name', 'quantity', 'unit_measure', 'unit_cost', 'supplier_name']}
                  isLinkedToPurchaseRequest={isLinkedToPurchaseRequest}
                  embedded={true}
                />
              </div>

              {/* Supporting Documents Section */}
              <div className="sectionHeader">Supporting Documents (Optional)</div>
              
              <div 
                className={`fileUploadSection ${dragOver ? 'dragOver' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="fileUploadIcon">
                  <i className="ri-upload-cloud-line" />
                </div>
                <div className="fileUploadText">
                  Drag and drop files here, or click to select files
                  <br />
                  <small>Supported: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF (Max 10MB each)</small>
                </div>
                <input
                  type="file"
                  className="fileInput"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileSelect}
                  id="supportingDocuments"
                />
                <label htmlFor="supportingDocuments" className="fileUploadBtn">
                  <i className="ri-attachment-line" /> Choose Files
                </label>

                {supportingDocuments.length > 0 && (
                  <div className="fileList">
                    <h4>Selected Files:</h4>
                    {supportingDocuments.map((file, index) => (
                      <div key={index} className="fileItem">
                        <div>
                          <div className="fileName">{file.name}</div>
                          <div className="fileSize">{formatFileSize(file.size)}</div>
                        </div>
                        <button
                          type="button"
                          className="removeFileBtn"
                          onClick={() => removeFile(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button
              type="button"
              className="saveAsDraftButton"
              onClick={(e) => handleSubmit(e, true)}
            >
              <i className="ri-draft-line" /> Save as Draft
            </button>
            <button type="submit" className="submitButton">
              <i className="ri-send-plane-line" /> Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBudgetRequest;