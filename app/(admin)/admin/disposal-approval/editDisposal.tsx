'use client';

import React, { useState } from 'react';
import '@/styles/components/forms.css';
import '@/styles/components/modal2.css';
import '@/styles/components/chips.css';
import { formatDate, formatMoney } from '@/utils/formatting';
import { showError } from '@/utils/Alerts';

interface DisposalRecord {
  id: number;
  disposal_code: string;
  disposal_method: string;
  disposal_date: string;
  quantity: number;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  
  // Legacy fields for backward compatibility
  gainLoss?: number;
  itemCode?: string;
  batchNumber?: string;
  busCode?: string;
  
  // Stock details (if disposal type is stock)
  stock?: {
    item_code: string;
    item?: {
      item_name: string;
      unit?: {
        unit_name: string;
      };
      category?: {
        category_name: string;
      };
      description?: string;
    };
    current_stock: number;
    status: string;
    created_at: string;
  };
  
  // Batch details (if disposal type is batch)
  batch?: {
    batch_number: string;
    stock?: {
      item_code: string;
      item?: {
        item_name: string;
        unit?: {
          unit_name: string;
        };
        category?: {
          category_name: string;
        };
      };
    };
    quantity: number;
    expiration_date?: string;
    received_date: string;
    remarks?: string;
  };
  
  // Bus details (if disposal type is bus)
  bus?: {
    bus_code: string;
    plate_number: string;
    body_number: string;
    bus_type: string;
    status: string;
    model: string;
    year_model: string;
    condition: string;
    acquisition_method: string;
    manufacturer?: {
      manufacturer_name: string;
    };
    body_builder?: {
      body_builder_name: string;
    };
    chassis_number: string;
    engine_number: string;
    seat_capacity: number;
    registration_status: string;
    brand_new_details?: {
      dealer_name: string;
    };
    second_hand_details?: {
      previous_owner: string;
    };
  };
  
  // Revenue details
  disposal_revenue?: {
    disposal_value: number;
    book_value: number;
    gain_loss: number;
  };
  revenue?: {
    disposalValue: number;
    bookValue: number;
    gainLoss: number;
  };
}

interface EditDisposalProps {
  disposal: DisposalRecord;
  onSave: (updatedDisposal: DisposalRecord) => Promise<void>;
  onClose: () => void;
}

const EditDisposal: React.FC<EditDisposalProps> = ({ disposal, onSave, onClose }) => {
  // Editable fields state
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>(disposal.status);
  const [disposalValue, setDisposalValue] = useState<string>(
    disposal.disposal_revenue?.disposal_value?.toString() || disposal.revenue?.disposalValue?.toString() || '0'
  );
  const [bookValue, setBookValue] = useState<string>(
    disposal.disposal_revenue?.book_value?.toString() || disposal.revenue?.bookValue?.toString() || '0'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ disposalValue?: string; bookValue?: string }>({});

  // Calculate gain or loss
  const calculatedGainLoss = Number(disposalValue || 0) - Number(bookValue || 0);

  // Get status chip class
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'chip pending';
      case 'APPROVED':
        return 'chip approved';
      case 'REJECTED':
        return 'chip rejected';
      default:
        return 'chip normal';
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { disposalValue?: string; bookValue?: string } = {};

    const dispValue = Number(disposalValue);
    const bkValue = Number(bookValue);

    if (isNaN(dispValue) || dispValue < 0) {
      newErrors.disposalValue = 'Please enter a valid disposal value (≥ 0)';
    }

    if (isNaN(bkValue) || bkValue < 0) {
      newErrors.bookValue = 'Please enter a valid book value (≥ 0)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Please fix the validation errors', 'Validation Error');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedDisposal: DisposalRecord = {
        ...disposal,
        status,
        revenue: {
          disposalValue: Number(disposalValue),
          bookValue: Number(bookValue),
          gainLoss: calculatedGainLoss
        }
      };

      await onSave(updatedDisposal);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-heading">
        <h2 className="modal-title">Edit Disposal</h2>
        <button
          className="close-modal-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <i className="ri-close-line"></i>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Disposal Information Section */}
        <div className="modal-content">
          <h3 className="modal-subtitle">Disposal Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Disposal Code</label>
              <input
                type="text"
                value={disposal.disposal_code}
                disabled
                className="disabled-input"
              />
              <span className="field-note">Not Editable</span>
            </div>

            <div className="form-group">
              <label>Status <span style={{ color: '#FF4949' }}>*</span></label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'PENDING' | 'APPROVED' | 'REJECTED')}
                required
              >
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <span className="field-note">Editable</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Disposal Method</label>
              <input
                type="text"
                value={disposal.disposal_method}
                disabled
                className="disabled-input"
              />
              <span className="field-note">Not Editable</span>
            </div>

            <div className="form-group">
              <label>Disposal Date</label>
              <input
                type="text"
                value={formatDate(disposal.disposal_date)}
                disabled
                className="disabled-input"
              />
              <span className="field-note">Not Editable</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="text"
                value={disposal.quantity}
                disabled
                className="disabled-input"
              />
              <span className="field-note">Not Editable</span>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={disposal.description || ''}
              disabled
              className="disabled-input"
              rows={3}
            />
            <span className="field-note">Not Editable</span>
          </div>
        </div>

        {/* Stock Details Section - Only for Stock Disposal (Read-only) */}
        {disposal.stock && (
          <div className="modal-content view">
            <h3 className="modal-subtitle">Stock Information (View Only)</h3>
            
            <div className="view-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Item Code</label>
                  <p>{disposal.stock.item_code}</p>
                </div>

                <div className="form-group">
                  <label>Item Name</label>
                  <p>{disposal.stock.item?.item_name || '—'}</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unit of Measure</label>
                  <p>{disposal.stock.item?.unit?.unit_name || '—'}</p>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <p>{disposal.stock.item?.category?.category_name || '—'}</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Current Stock</label>
                  <p>{disposal.stock.current_stock}</p>
                </div>

                <div className="form-group">
                  <label>Stock Status</label>
                  <p>
                    <span className={`chip ${disposal.stock.status.toLowerCase()}`}>
                      {disposal.stock.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Stock Recorded Date</label>
                  <p>{formatDate(disposal.stock.created_at)}</p>
                </div>
              </div>

              <div className="form-group">
                <label>Stock Description</label>
                <p>{disposal.stock.item?.description || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Batch Details Section - Only for Batch Disposal (Read-only) */}
        {disposal.batch && (
          <div className="modal-content view">
            <h3 className="modal-subtitle">Batch Information (View Only)</h3>
            
            <div className="view-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Batch Number</label>
                  <p>{disposal.batch.batch_number}</p>
                </div>

                <div className="form-group">
                  <label>Item Code</label>
                  <p>{disposal.batch.stock?.item_code || '—'}</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Item Name</label>
                  <p>{disposal.batch.stock?.item?.item_name || '—'}</p>
                </div>

                <div className="form-group">
                  <label>Unit of Measure</label>
                  <p>{disposal.batch.stock?.item?.unit?.unit_name || '—'}</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <p>{disposal.batch.stock?.item?.category?.category_name || '—'}</p>
                </div>

                <div className="form-group">
                  <label>Batch Quantity</label>
                  <p>{disposal.batch.quantity}</p>
                </div>
              </div>

              <div className="form-row">
                {disposal.batch.expiration_date && (
                  <div className="form-group">
                    <label>Expiration Date <span style={{ fontSize: '12px', color: '#666' }}>(For perishable items)</span></label>
                    <p>{formatDate(disposal.batch.expiration_date)}</p>
                  </div>
                )}

                <div className="form-group">
                  <label>Received Date</label>
                  <p>{formatDate(disposal.batch.received_date)}</p>
                </div>
              </div>

              {disposal.batch.remarks && (
                <div className="form-group">
                  <label>Batch Remarks</label>
                  <p>{disposal.batch.remarks}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bus Details Section - Only for Bus Disposal (Read-only) */}
        {disposal.bus && (
          <div className="modal-content view">
            <h3 className="modal-subtitle">Bus Information (View Only)</h3>
            
            <div className="view-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Bus Code</label>
                  <p>{disposal.bus.bus_code}</p>
                </div>

                <div className="form-group">
                  <label>Plate Number</label>
                  <p>{disposal.bus.plate_number}</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Body Number</label>
                  <p>{disposal.bus.body_number}</p>
                </div>

                <div className="form-group">
                  <label>Bus Type</label>
                  <p>{disposal.bus.bus_type}</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <p>
                    <span className={`chip ${disposal.bus.status.toLowerCase()}`}>
                      {disposal.bus.status}
                    </span>
                  </p>
                </div>

                <div className="form-group">
                  <label>Model</label>
                  <p>{disposal.bus.model}</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Year Model</label>
                  <p>{disposal.bus.year_model}</p>
                </div>

                <div className="form-group">
                  <label>Condition</label>
                  <p>
                    <span className="chip normal">
                      {disposal.bus.condition}
                    </span>
                  </p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Acquisition Method</label>
                  <p>
                    <span className="chip normal">
                      {disposal.bus.acquisition_method}
                    </span>
                  </p>
                </div>

                <div className="form-group">
                  <label>Manufacturer</label>
                  <p>{disposal.bus.manufacturer?.manufacturer_name || '—'}</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Body Builder</label>
                  <p>{disposal.bus.body_builder?.body_builder_name || '—'}</p>
                </div>

                <div className="form-group">
                  <label>Chassis Number</label>
                  <p>{disposal.bus.chassis_number}</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Engine Number</label>
                  <p>{disposal.bus.engine_number}</p>
                </div>

                <div className="form-group">
                  <label>Seat Capacity</label>
                  <p>{disposal.bus.seat_capacity}</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Registration Status</label>
                  <p>
                    <span className="chip normal">
                      {disposal.bus.registration_status}
                    </span>
                  </p>
                </div>
              </div>

              {disposal.bus.brand_new_details?.dealer_name && disposal.bus.acquisition_method === 'BRAND_NEW' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Dealer Name <span style={{ fontSize: '12px', color: '#666' }}>(Optional, if BRAND_NEW)</span></label>
                    <p>{disposal.bus.brand_new_details.dealer_name}</p>
                  </div>
                </div>
              )}

              {disposal.bus.second_hand_details?.previous_owner && disposal.bus.acquisition_method === 'SECOND_HAND' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Previous Owner <span style={{ fontSize: '12px', color: '#666' }}>(Optional, if SECOND_HAND)</span></label>
                    <p>{disposal.bus.second_hand_details.previous_owner}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disposal Value Section - Editable */}
        <div className="modal-content">
          <h3 className="modal-subtitle">Financial Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="disposalValue">
                Disposal Value <span style={{ color: '#FF4949' }}>*</span>
              </label>
              <input
                id="disposalValue"
                type="number"
                step="0.01"
                min="0"
                value={disposalValue}
                onChange={(e) => setDisposalValue(e.target.value)}
                placeholder="Enter disposal value"
                required
                className={errors.disposalValue ? 'error' : ''}
              />
              {errors.disposalValue && (
                <span className="error-text">{errors.disposalValue}</span>
              )}
              <span className="field-note">Editable</span>
            </div>

            <div className="form-group">
              <label htmlFor="bookValue">
                Book Value <span style={{ color: '#FF4949' }}>*</span>
              </label>
              <input
                id="bookValue"
                type="number"
                step="0.01"
                min="0"
                value={bookValue}
                onChange={(e) => setBookValue(e.target.value)}
                placeholder="Enter book value"
                required
                className={errors.bookValue ? 'error' : ''}
              />
              {errors.bookValue && (
                <span className="error-text">{errors.bookValue}</span>
              )}
              <span className="field-note">Editable</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Gain or Loss</label>
              <input
                type="text"
                value={formatMoney(calculatedGainLoss)}
                disabled
                className="disabled-input"
                style={{
                  color: calculatedGainLoss >= 0 ? '#4CAF50' : '#FF4949',
                  fontWeight: '600'
                }}
              />
              <span className="field-note">Derived: disposal_value - book_value</span>
            </div>
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
          >
            {isSubmitting ? (
              <>
                <i className="ri-loader-4-line"></i> Saving...
              </>
            ) : (
              <>
                <i className="ri-save-line"></i> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
};

export default EditDisposal;