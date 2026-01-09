'use client';

import React, { useState, useEffect } from 'react';
import Modal from './modal2';
import '@/styles/components/modal2.css';
import '@/styles/components/forms.css';
import '@/styles/components/table.css';

/**
 * ItemField Interface
 * 
 * Field Mappings for Purchase Request Integration:
 * 
 * When isLinkedToPurchaseRequest = true (PR-Linked Mode):
 * - code                    → purchase_request.purchase_request_code
 * - department              → purchase_request.requestor.department_name
 * - item_code               → items[].item_code OR 'N/A' (if new_item is used)
 * - item_name               → items[].item.item_name OR items[].new_item
 * - unit_measure            → items[].item.unit.unit_name OR items[].new_unit
 * - supplier_code           → items[].supplier_code OR 'N/A' (if new_supplier is used)
 * - supplier_name           → items[].supplier.supplier_name OR items[].new_supplier
 * - supplier_unit_measure   → items[].supplier_item.supplier_unit.unit_name OR items[].new_unit
 * - conversion              → items[].supplier_item.conversion_amount
 * - unit_price              → items[].supplier_item.unit_price OR items[].new_unit_price
 * - quantity                → items[].quantity
 * - subtotal                → calculated (quantity * unit_price)
 * 
 * When isLinkedToPurchaseRequest = false (Manual Entry Mode):
 * - quantity                → User input
 * - item_name               → User input
 * - unit_measure            → User input
 * - unit_price              → User input
 * - supplier_name           → User input
 * - subtotal                → Calculated (quantity * unit_price)
 */
export interface ItemField {
  code?: string;
  department?: string;
  item_code?: string;
  item_name?: string;
  unit_measure?: string;
  supplier_code?: string;
  supplier_name?: string;
  supplier_unit_measure?: string;
  conversion?: number;
  unit_price?: number;
  subtotal?: number;
  quantity?: number;
  [key: string]: any;
}

export type ModalMode = 'view' | 'edit' | 'add';

export interface ItemTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  title: string;
  items: ItemField[];
  onSave?: (items: ItemField[]) => void;
  readOnlyFields?: string[];
  requiredFields?: string[];
  isLinkedToPurchaseRequest?: boolean;
  embedded?: boolean;
}

const ItemTableModal: React.FC<ItemTableModalProps> = ({
  isOpen,
  onClose,
  mode,
  title,
  items: initialItems,
  onSave,
  readOnlyFields = [],
  requiredFields = [],
  isLinkedToPurchaseRequest = false,
  embedded = false
}) => {
  // Field visibility configuration based on purchase request link status
  const getVisibleFields = (): string[] => {
    if (!isLinkedToPurchaseRequest) {
      return ['quantity', 'item_name', 'unit_measure', 'unit_price', 'supplier_name', 'subtotal'];
    }
    // PR-linked shows all fields
    return ['code', 'department', 'item_code', 'item_name', 'unit_measure', 'supplier_code', 'supplier_name', 'supplier_unit_measure', 'conversion', 'unit_price', 'quantity', 'subtotal'];
  };

  const visibleFields = getVisibleFields();
  
  // Filter required fields to only include visible fields
  const filteredRequiredFields = requiredFields.filter(field => visibleFields.includes(field));
  
  const [items, setItems] = useState<ItemField[]>(initialItems);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<ItemField>({
    code: '',
    department: '',
    item_code: '',
    item_name: '',
    unit_measure: '',
    supplier_code: '',
    supplier_name: '',
    supplier_unit_measure: '',
    conversion: 1,
    unit_price: 0,
    subtotal: 0,
    quantity: 0
  });

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    const calculatedSubtotal = (formData.quantity || 0) * (formData.unit_price || 0);
    if (formData.subtotal !== calculatedSubtotal) {
      setFormData(prev => ({ ...prev, subtotal: calculatedSubtotal }));
    }
  }, [formData.quantity, formData.unit_price]);

  const isReadOnly = (fieldName: string) => {
    return mode === 'view' || readOnlyFields.includes(fieldName);
  };

  const isRequired = (fieldName: string) => {
    return filteredRequiredFields.includes(fieldName);
  };

  const handleFieldChange = (field: keyof ItemField, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRowSelect = (index: number) => {
    if (mode === 'view') return;
    setSelectedIndex(index);
    setFormData({ ...items[index] });
  };

  const handleCancel = () => {
    setSelectedIndex(null);
    setFormData({
      code: '',
      department: '',
      item_code: '',
      item_name: '',
      unit_measure: '',
      supplier_code: '',
      supplier_name: '',
      supplier_unit_measure: '',
      conversion: 1,
      unit_price: 0,
      subtotal: 0,
      quantity: 0
    });
  };

  const handleAddOrUpdate = () => {
    if (selectedIndex !== null) {
      const updatedItems = [...items];
      updatedItems[selectedIndex] = { ...formData };
      setItems(updatedItems);
      handleCancel();
    } else {
      setItems([...items, { ...formData }]);
      handleCancel();
    }
  };

  const handleDelete = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    if (selectedIndex === index) {
      handleCancel();
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(items);
    }
    onClose();
  };

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.item_name?.toLowerCase().includes(searchLower)) ||
      (item.item_code?.toLowerCase().includes(searchLower)) ||
      (item.supplier_name?.toLowerCase().includes(searchLower))
    );
  });

  const isFormValid = () => {
    return filteredRequiredFields.every(field => {
      const value = formData[field as keyof ItemField];
      return value !== undefined && value !== '' && value !== null;
    });
  };

  // Content to render (shared between modal and embedded modes)
  const renderContent = () => (
    <>
      {!embedded && (
        <div className="modal-heading">
          <h2 className="modal-title">{title}</h2>
          <button className="close-modal-btn" onClick={onClose}>
            <i className="ri-close-line" />
          </button>
        </div>
      )}

      <div className={embedded ? "embedded-item-table" : "modal-content"}>
        {/* Only show add/edit form when NOT PR-linked AND not in view mode */}
        {!isLinkedToPurchaseRequest && mode !== 'view' && (
        <form className="add-form">
          {isLinkedToPurchaseRequest ? (
            // PR-Linked Mode - All Fields
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Code {isRequired('code') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="text" value={formData.code || ''} onChange={(e) => handleFieldChange('code', e.target.value)} disabled={isReadOnly('code')} placeholder="PR Code" />
                </div>
                <div className="form-group">
                  <label>Department {isRequired('department') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="text" value={formData.department || ''} onChange={(e) => handleFieldChange('department', e.target.value)} disabled={isReadOnly('department')} placeholder="Department" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Item Code {isRequired('item_code') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="text" value={formData.item_code || ''} onChange={(e) => handleFieldChange('item_code', e.target.value)} disabled={isReadOnly('item_code')} placeholder="Item Code or N/A" />
                </div>
                <div className="form-group">
                  <label>Item Name {isRequired('item_name') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="text" value={formData.item_name || ''} onChange={(e) => handleFieldChange('item_name', e.target.value)} disabled={isReadOnly('item_name')} placeholder="Item Name" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unit Measure {isRequired('unit_measure') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="text" value={formData.unit_measure || ''} onChange={(e) => handleFieldChange('unit_measure', e.target.value)} disabled={isReadOnly('unit_measure')} placeholder="e.g., pcs, kg" />
                </div>
                <div className="form-group">
                  <label>Supplier Code {isRequired('supplier_code') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="text" value={formData.supplier_code || ''} onChange={(e) => handleFieldChange('supplier_code', e.target.value)} disabled={isReadOnly('supplier_code')} placeholder="Supplier Code or N/A" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Supplier Name {isRequired('supplier_name') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="text" value={formData.supplier_name || ''} onChange={(e) => handleFieldChange('supplier_name', e.target.value)} disabled={isReadOnly('supplier_name')} placeholder="Supplier Name" />
                </div>
                <div className="form-group">
                  <label>Supplier Unit Measure {isRequired('supplier_unit_measure') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="text" value={formData.supplier_unit_measure || ''} onChange={(e) => handleFieldChange('supplier_unit_measure', e.target.value)} disabled={isReadOnly('supplier_unit_measure')} placeholder="Supplier Unit" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Conversion {isRequired('conversion') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="number" value={formData.conversion || 1} onChange={(e) => handleFieldChange('conversion', parseFloat(e.target.value) || 1)} disabled={isReadOnly('conversion')} min="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Unit Price {isRequired('unit_price') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="number" value={formData.unit_price || 0} onChange={(e) => handleFieldChange('unit_price', parseFloat(e.target.value) || 0)} disabled={isReadOnly('unit_price')} min="0" step="0.01" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity {isRequired('quantity') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="number" value={formData.quantity || 0} onChange={(e) => handleFieldChange('quantity', parseFloat(e.target.value) || 0)} disabled={isReadOnly('quantity')} min="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Subtotal</label>
                  <input type="number" value={formData.subtotal || 0} disabled style={{ backgroundColor: 'var(--background-color)', cursor: 'not-allowed' }} />
                </div>
              </div>
            </>
          ) : (
            // NoLinked Mode - Simplified Fields
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Item Name {isRequired('item_name') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="text" value={formData.item_name || ''} onChange={(e) => handleFieldChange('item_name', e.target.value)} disabled={isReadOnly('item_name')} placeholder="Item Name" />
                </div>
                <div className="form-group">
                  <label>Quantity {isRequired('quantity') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="number" value={formData.quantity || 0} onChange={(e) => handleFieldChange('quantity', parseFloat(e.target.value) || 0)} disabled={isReadOnly('quantity')} min="0" step="0.01" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unit {isRequired('unit_measure') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="text" value={formData.unit_measure || ''} onChange={(e) => handleFieldChange('unit_measure', e.target.value)} disabled={isReadOnly('unit_measure')} placeholder="e.g., pcs, kg" />
                </div>
                <div className="form-group">
                  <label>Unit Cost {isRequired('unit_price') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="number" value={formData.unit_price || 0} onChange={(e) => handleFieldChange('unit_price', parseFloat(e.target.value) || 0)} disabled={isReadOnly('unit_price')} min="0" step="0.01" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Supplier {isRequired('supplier_name') && <span style={{ color: 'red' }}>*</span>}</label>
                  <input type="text" value={formData.supplier_name || ''} onChange={(e) => handleFieldChange('supplier_name', e.target.value)} disabled={isReadOnly('supplier_name')} placeholder="Supplier Name" />
                </div>
                <div className="form-group">
                  <label>Subtotal</label>
                  <input type="number" value={formData.subtotal || 0} disabled style={{ backgroundColor: 'var(--background-color)', cursor: 'not-allowed' }} />
                </div>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={handleCancel} disabled={selectedIndex === null}>Cancel</button>
            <button type="button" className="submit-btn" onClick={handleAddOrUpdate} disabled={!isFormValid()}>
              <i className={`ri-${selectedIndex !== null ? 'refresh' : 'add'}-line`} />
              {selectedIndex !== null ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
        )}

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label>Search Items</label>
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by item name, code, or supplier..." />
        </div>

        <div className="table-wrapper" style={{ marginTop: '10px', maxHeight: '400px' }}>
          <div className="tableContainer">
            <table>
              <thead>
                <tr>
                  {isLinkedToPurchaseRequest ? (
                    <>
                      <th>Item Name</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Subtotal</th>
                    </>
                  ) : (
                    <>
                      <th>Item Name</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Unit Cost</th>
                      <th>Supplier</th>
                      <th>Subtotal</th>
                    </>
                  )}
                  {mode !== 'view' && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr><td colSpan={isLinkedToPurchaseRequest ? (mode !== 'view' ? 5 : 4) : (mode !== 'view' ? 7 : 6)} className="empty-cell">No items found</td></tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr key={index} onClick={() => handleRowSelect(index)} style={{ cursor: mode !== 'view' ? 'pointer' : 'default', backgroundColor: selectedIndex === index ? 'var(--table-row-hover-color)' : undefined }}>
                      {isLinkedToPurchaseRequest ? (
                        <>
                          <td>{item.item_name || 'N/A'}</td>
                          <td>{item.quantity || 0}</td>
                          <td>₱{(item.unit_price || 0).toFixed(2)}</td>
                          <td>₱{(item.subtotal || 0).toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td>{item.item_name || 'N/A'}</td>
                          <td>{item.quantity || 0}</td>
                          <td>{item.unit_measure || 'N/A'}</td>
                          <td>₱{(item.unit_price || 0).toFixed(2)}</td>
                          <td>{item.supplier_name || 'N/A'}</td>
                          <td>₱{(item.subtotal || 0).toFixed(2)}</td>
                        </>
                      )}
                      {mode !== 'view' && (
                        <td className="actionButtons">
                          <div className="actionButtonsContainer">
                            <button className="deleteBtn" onClick={(e) => { e.stopPropagation(); handleDelete(index); }} title="Delete Item">
                              <i className="ri-delete-bin-line" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {items.length > 0 && (
          <div style={{ marginTop: '15px', textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }}>
            Total: ₱{items.reduce((sum, item) => sum + (item.subtotal || 0), 0).toFixed(2)}
          </div>
        )}
      </div>

      {/* Only show save/close buttons when not embedded and not PR-linked */}
      {!embedded && mode !== 'view' && !isLinkedToPurchaseRequest && (
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>Close</button>
          <button type="button" className="submit-btn" onClick={handleSave}><i className="ri-save-line" />Save All Items</button>
        </div>
      )}

      {!embedded && mode === 'view' && (
        <div className="modal-actions">
          <button type="button" className="cancel-btn" onClick={onClose}>Close</button>
        </div>
      )}
    </>
  );

  // Return embedded content directly or wrap in Modal
  if (embedded) {
    return <div className="item-table-embedded">{renderContent()}</div>;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {renderContent()}
    </Modal>
  );
};

export default ItemTableModal;