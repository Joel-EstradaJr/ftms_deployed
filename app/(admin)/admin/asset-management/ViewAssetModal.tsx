"use client";

import React from "react";
import "@/app/styles/components/forms.css";
import "@/app/styles/components/modal2.css";
import "@/app/styles/components/chips.css";
import { Asset } from "@/app/types/asset";

interface ViewAssetModalProps {
  asset: Asset;
  onClose: () => void;
  busData?: any;
  itemBatchData?: any;
}

export default function ViewAssetModal({
  asset,
  onClose,
  busData,
  itemBatchData,
}: ViewAssetModalProps) {
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatMoney = (amount?: number) => {
    if (amount === undefined || amount === null) return '₱0.00';
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getGainLossColor = (value?: number) => {
    if (!value) return 'var(--secondary-text-color)';
    return value >= 0 ? 'var(--success-color)' : 'var(--error-color)';
  };

  const getProgressPercentage = () => {
    if (!asset.original_value || !asset.accumulated_amount) return 0;
    return Math.min((asset.accumulated_amount / asset.original_value) * 100, 100);
  };

  return (
    <>
      <div className="modal-heading">
        <h2 className="modal-title">View Asset Details</h2>
      </div>

      {/* SECTION I: COMMON ASSET INFORMATION */}
      <div className="modal-content view">
        <div className="section-title">
          <i className="fas fa-box"></i>
          <span>Asset Information</span>
        </div>
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Asset Code</label>
              <p>{asset.asset_code || 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Asset Type</label>
              <p>{asset.asset_type_name || 'N/A'}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: '1 1 100%' }}>
              <label>Asset Name</label>
              <p>{asset.name}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Acquisition Date</label>
              <p>{formatDate(asset.date_acquired)}</p>
            </div>
            <div className="form-group">
              <label>Acquisition Cost</label>
              <p>{formatMoney(asset.original_value)}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Estimated Years of Life</label>
              <p>{asset.estimated_life_years || 'N/A'} years</p>
            </div>
            <div className="form-group">
              <label>Status</label>
              <p>
                <span className={`chip ${asset.status?.toLowerCase()}`}>
                  {asset.status || 'N/A'}
                </span>
              </p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Asset Location</label>
              <p>N/A</p>
            </div>
            <div className="form-group">
              <label>Unit Measure</label>
              <p>N/A</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <p>1</p>
            </div>
            <div className="form-group">
              <label>Attachment</label>
              <p>N/A</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: '1 1 100%' }}>
              <label>Remarks</label>
              <p>{asset.notes || 'No remarks'}</p>
            </div>
          </div>
        </form>
      </div>

      {/* SECTION II: BUS INFORMATION (Conditional) */}
      {asset.type === 'BUS' && busData && (
        <div className="modal-content view">
          <div className="section-title">
            <i className="fas fa-bus"></i>
            <span>Bus Information</span>
          </div>
          <form className="view-form">
            <div className="form-row">
              <div className="form-group">
                <label>Bus Code</label>
                <p>{busData.bus_code || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Plate Number</label>
                <p>{busData.plate_number || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Body Number</label>
                <p>{busData.body_number || 'N/A'}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Bus Type</label>
                <p>{busData.bus_type || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Condition</label>
                <p>{busData.condition || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Acquisition Method</label>
                <p>{busData.acquisition_method || 'N/A'}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Registration Status</label>
                <p>{busData.registration_status || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Chassis Number</label>
                <p>{busData.chassis_number || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Engine Number</label>
                <p>{busData.engine_number || 'N/A'}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Seat Capacity</label>
                <p>{busData.seat_capacity || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Model</label>
                <p>{busData.model || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Year Model</label>
                <p>{busData.year_model || 'N/A'}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Warranty Expiration Date</label>
                <p>{formatDate(busData.warranty_expiration_date)}</p>
              </div>
              <div className="form-group">
                <label>Body Builder</label>
                <p>{busData.body_builder || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Manufacturer</label>
                <p>{busData.manufacturer || 'N/A'}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Dealer Name</label>
                <p>{busData.dealer_name || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Dealer Contact</label>
                <p>{busData.dealer_contact || 'N/A'}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Previous Owner</label>
                <p>{busData.previous_owner || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Source</label>
                <p>{busData.source || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Odometer Reading</label>
                <p>{busData.odometer_reading ? `${busData.odometer_reading.toLocaleString()} km` : 'N/A'}</p>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* SECTION III: BATCH/ITEM INFORMATION (Conditional) */}
      {asset.type === 'EQUIPMENT' && itemBatchData && (
        <div className="modal-content view">
          <div className="section-title">
            <i className="fas fa-tools"></i>
            <span>Item/Batch Information</span>
          </div>
          <form className="view-form">
            <div className="form-row">
              <div className="form-group">
                <label>Batch Number</label>
                <p>{itemBatchData.batch_number || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Item Code</label>
                <p>{itemBatchData.item_code || 'N/A'}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Item Name</label>
                <p>{itemBatchData.item_name || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Item Description</label>
                <p>{itemBatchData.item_description || 'N/A'}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Item Category Name</label>
                <p>{itemBatchData.item_category_name || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Item Unit Measure Name & Abbreviation</label>
                <p>{itemBatchData.item_unit_measure_name ? `${itemBatchData.item_unit_measure_name} (${itemBatchData.item_unit_measure_abbreviation})` : 'N/A'}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Item Batch Quantity</label>
                <p>{itemBatchData.item_batch_quantity || 'N/A'}</p>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* SECTION IV: DISPOSAL INFORMATION (Conditional - DISPOSED Status Only) */}
      {asset.status === 'DISPOSED' && (
        <div className="modal-content view">
          <div className="section-title">
            <i className="fas fa-trash-alt"></i>
            <span>Disposal Information</span>
          </div>
          <form className="view-form">
            <div className="form-row">
              <div className="form-group">
                <label>Disposal Code</label>
                <p>{asset.disposal_code || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Disposal Date</label>
                <p>{formatDate(asset.disposal_date)}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Disposal Value</label>
                <p>{formatMoney(asset.disposal_value)}</p>
              </div>
              <div className="form-group">
                <label>Disposal Gain/Loss</label>
                <p style={{ color: getGainLossColor(asset.disposal_gain_loss), fontWeight: 'bold' }}>
                  {formatMoney(asset.disposal_gain_loss)}
                  {asset.disposal_gain_loss !== undefined && asset.disposal_gain_loss !== 0 && (
                    <span style={{ fontSize: '12px', marginLeft: '8px' }}>
                      ({asset.disposal_gain_loss > 0 ? 'Gain' : 'Loss'})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* SECTION V: ACCUMULATION/DEPRECIATION INFORMATION (Conditional - NON-PENDING Status) */}
      {asset.status !== 'PENDING' && (
        <div className="modal-content view">
          <div className="section-title">
            <i className="fas fa-chart-line"></i>
            <span>Accumulation/Depreciation Information</span>
          </div>
          <form className="view-form">
            <div className="form-row">
              <div className="form-group">
                <label>Accumulation Period Start</label>
                <p>{formatDate(asset.accumulation_period_start)}</p>
              </div>
              <div className="form-group">
                <label>Accumulation Period End</label>
                <p>{formatDate(asset.accumulation_period_end)}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Accumulation Monthly Amount</label>
                <p>{formatMoney(asset.accumulation_monthly_amount)}</p>
              </div>
              <div className="form-group">
                <label>Accumulated Amount</label>
                <p>{formatMoney(asset.accumulated_amount)}</p>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Accumulation Type</label>
                <p>
                  <span className={`chip ${asset.accumulation_type === 'DEPRECIATION' ? 'normal' : 'active'}`}>
                    {asset.accumulation_type || 'N/A'}
                  </span>
                </p>
              </div>
              <div className="form-group">
                <label>Current Book Value</label>
                <p style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {formatMoney(asset.current_book_value)}
                </p>
              </div>
            </div>

            {/* Progress Bar for Depreciation/Appreciation */}
            <div className="form-row">
              <div className="form-group" style={{ flex: '1 1 100%' }}>
                <label>
                  {asset.accumulation_type === 'DEPRECIATION' ? 'Depreciation' : 'Appreciation'} Progress
                </label>
                <div style={{
                  width: '100%',
                  height: '32px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginTop: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    width: `${getProgressPercentage()}%`,
                    height: '100%',
                    backgroundColor: asset.accumulation_type === 'DEPRECIATION' ? '#ff6b6b' : '#51cf66',
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    {getProgressPercentage().toFixed(1)}%
                  </div>
                </div>
                <small className="hint-message" style={{ marginTop: '8px', display: 'block' }}>
                  {asset.accumulation_type === 'DEPRECIATION' 
                    ? 'Percentage of asset value depreciated' 
                    : 'Percentage of asset value appreciated'}
                </small>
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
        >
          Close
        </button>
      </div>
    </>
  );
}
