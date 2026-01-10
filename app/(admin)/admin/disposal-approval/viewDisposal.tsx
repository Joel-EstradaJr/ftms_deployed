'use client';

import React from 'react';
import '@/styles/components/forms.css';
import '@/styles/components/modal2.css';
import '@/styles/components/chips.css';
import { formatDate, formatMoney } from '@/utils/formatting';

interface DisposalRecord {
  id: number;
  disposalCode: string;
  disposalMethod: string;
  disposalDate: string;
  quantity: number;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  
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
  revenue?: {
    disposalValue: number;
    bookValue: number;
    gainLoss: number;
  };
  
  // Legacy fields for backward compatibility
  gainLoss?: number;
  itemCode?: string;
  batchNumber?: string;
  busCode?: string;
}

interface ViewDisposalProps {
  disposal: DisposalRecord;
  onClose: () => void;
}

const ViewDisposal: React.FC<ViewDisposalProps> = ({ disposal, onClose }) => {
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

  // Determine disposal type
  const disposalType = disposal.stock ? 'stock' : disposal.batch ? 'batch' : disposal.bus ? 'bus' : 'unknown';

  return (
    <>
      <div className="modal-heading">
        <h2 className="modal-title">View Disposal Record</h2>
        <button
          className="close-modal-btn view"
          onClick={onClose}
          aria-label="Close modal"
        >
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Disposal Information Section */}
      <div className="modal-content view">
        <h3 className="modal-subtitle">Disposal Information</h3>
        
        <div className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Disposal Code</label>
              <p>{disposal.disposalCode}</p>
            </div>

            <div className="form-group">
              <label>Status</label>
              <p>
                <span className={getStatusClass(disposal.status)}>
                  {disposal.status}
                </span>
              </p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Disposal Method</label>
              <p>
                <span className="chip normal">
                  {disposal.disposalMethod}
                </span>
              </p>
            </div>

            <div className="form-group">
              <label>Disposal Date</label>
              <p>{formatDate(disposal.disposalDate)}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <p>{disposal.quantity}</p>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <p>{disposal.description || '—'}</p>
          </div>
        </div>
      </div>

      {/* Stock Details Section - Only for Stock Disposal */}
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
                <p>{disposal.stock.item?.item_name}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Unit of Measure</label>
                <p>{disposal.stock.item?.unit?.unit_name}</p>
              </div>

              <div className="form-group">
                <label>Category</label>
                <p>{disposal.stock.item?.category?.category_name}</p>
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
                  <span className={`chip ${disposal.stock.status?.toLowerCase()}`}>
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
              <label>Description</label>
              <p>{disposal.stock.item?.description || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Batch Details Section - Only for Batch Disposal */}
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
                <p>{disposal.batch.stock?.item_code}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Item Name</label>
                <p>{disposal.batch.stock?.item?.item_name}</p>
              </div>

              <div className="form-group">
                <label>Unit of Measure</label>
                <p>{disposal.batch.stock?.item?.unit?.unit_name}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <p>{disposal.batch.stock?.item?.category?.category_name}</p>
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

      {/* Bus Details Section - Only for Bus Disposal */}
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
                  <span className={`chip ${disposal.bus.status?.toLowerCase()}`}>
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
                <p>{disposal.bus.manufacturer?.manufacturer_name}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Body Builder</label>
                <p>{disposal.bus.body_builder?.body_builder_name}</p>
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

            {/* Optional fields based on acquisition method */}
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

      {/* Disposal Value Section - Display if exists */}
      {disposal.disposal_revenue && (
        <div className="modal-content view">
          <h3 className="modal-subtitle">Financial Summary</h3>
          
          <div className="view-form">
            <div className="form-row">
              <div className="form-group">
                <label>Disposal Value</label>
                <p>{formatMoney(disposal.disposal_revenue.disposal_value)}</p>
              </div>

              <div className="form-group">
                <label>Book Value</label>
                <p>{formatMoney(disposal.disposal_revenue.book_value)}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gain or Loss</label>
                <p style={{
                  color: disposal.disposal_revenue.gain_loss >= 0 ? '#4CAF50' : '#FF4949',
                  fontWeight: '600'
                }}>
                  {formatMoney(disposal.disposal_revenue.gain_loss)}
                </p>
              </div>
            </div>

            <div className="form-group">
              <label>Financial Impact</label>
              <p>
                {disposal.disposal_revenue.gain_loss >= 0 ? (
                  <span style={{ color: '#4CAF50' }}>
                    ✓ Gain of {formatMoney(disposal.disposal_revenue.gain_loss)}
                  </span>
                ) : (
                  <span style={{ color: '#FF4949' }}>
                    ✗ Loss of {formatMoney(Math.abs(disposal.disposal_revenue.gain_loss))}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Section */}
      <div className="modal-content view">
        <h3 className="modal-subtitle">Summary</h3>
        
        <div className="view-form">
          <div className="form-group">
            <label>Disposal Type</label>
            <p>
              <span className="chip normal">
                {disposalType.toUpperCase()}
              </span>
            </p>
          </div>

          <div className="form-group">
            <label>Current Status</label>
            <p>
              {disposal.status === 'PENDING' && 'Awaiting approval from administrator'}
              {disposal.status === 'APPROVED' && 'Disposal has been approved and processed'}
              {disposal.status === 'REJECTED' && 'Disposal has been rejected'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="modal-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </>
  );
};

export default ViewDisposal;