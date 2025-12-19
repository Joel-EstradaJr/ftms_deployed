"use client";

import React, { useState, useEffect, useMemo } from "react";
import "@/app/styles/components/forms.css";
import "@/app/styles/components/modal2.css";

import { formatDate, formatMoney } from "@/app/utils/formatting";
import { showWarning, showError, showConfirmation, showSuccess } from "@/app/utils/Alerts";
import { isValidAmount } from "@/app/utils/validation";
import { Asset } from "@/app/types/asset";
import BusInventorySelector, { BusInventoryItem } from "@/app/Components/BusInventorySelector";
import ItemBatchSelector, { ItemBatchInventory } from "@/app/Components/ItemBatchSelector";
import ModalManager from "@/app/Components/modalManager";

interface RecordAssetModalProps {
  mode: "add" | "edit";
  existingData?: Asset | null;
  onSave: (formData: Asset, mode: "add" | "edit") => void;
  onClose: () => void;
  assetTypes: Array<{ id: string; name: string }>;
  unitMeasures: Array<{ id: string; name: string; abbreviation: string }>;
  currentUser: string;
}

interface FormErrors {
  asset_type_name: string;
  name: string;
  date_acquired: string;
  original_value: string;
  estimated_life_years: string;
  asset_location: string;
  unit_measure: string;
  quantity: string;
  notes: string;
  disposal_date: string;
  disposal_value: string;
}

// Mock Bus Data (will be from inventory API in production)
interface BusInventoryData {
  bus_code: string;
  plate_number: string;
  body_number: string;
  bus_type: string;
  condition: string;
  acquisition_method: string;
  registration_status: string;
  chassis_number: string;
  engine_number: string;
  seat_capacity: number;
  model: string;
  year_model: string;
  warranty_expiration_date: string;
  body_builder: string;
  manufacturer: string;
  dealer_name: string;
  dealer_contact: string;
  previous_owner: string;
  source: string;
  odometer_reading: number;
}

// Mock Item/Equipment Batch Data (will be from inventory API in production)
interface ItemBatchData {
  batch_number: string;
  item_code: string;
  item_name: string;
  item_description: string;
  item_category_name: string;
  item_unit_measure_name: string;
  item_unit_measure_abbreviation: string;
  item_batch_quantity: number;
}

export default function RecordAssetModal({
  mode,
  existingData,
  onSave,
  onClose,
  assetTypes,
  unitMeasures,
  currentUser
}: RecordAssetModalProps) {

  // Generate asset code for new records
  const generateAssetCode = () => {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 90000) + 10000;
    return `FA-${dateStr}-${random}`;
  };

  // Generate disposal code
  const generateDisposalCode = () => {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 90000) + 10000;
    return `DISP-${dateStr}-${random}`;
  };

  const [formData, setFormData] = useState<Asset>({
    id: existingData?.id || '',
    asset_code: existingData?.asset_code || generateAssetCode(),
    name: existingData?.name || '',
    type: existingData?.type || 'OTHER',
    asset_type_name: existingData?.asset_type_name || '',
    date_acquired: existingData?.date_acquired || new Date().toISOString().split('T')[0],
    original_value: existingData?.original_value || 0,
    estimated_life_years: existingData?.estimated_life_years || 10,
    status: existingData?.status || 'PENDING',
    notes: existingData?.notes || '',
    depreciation_rate_annual: existingData?.depreciation_rate_annual || 10,
    total_depreciated: existingData?.total_depreciated || 0,
    current_value: existingData?.current_value || 0,
    book_value: existingData?.book_value || 0,
    is_disposed: existingData?.is_disposed || false,
    
    // Disposal fields
    disposal_code: existingData?.disposal_code || '',
    disposal_date: existingData?.disposal_date || '',
    disposal_value: existingData?.disposal_value || 0,
    disposal_gain_loss: existingData?.disposal_gain_loss || 0,
    disposal_entry_id: existingData?.disposal_entry_id || '',
    disposal_entry_status: existingData?.disposal_entry_status || 'DRAFT',
    
    // Accumulation fields
    accumulation_period_start: existingData?.accumulation_period_start || existingData?.date_acquired || new Date().toISOString().split('T')[0],
    accumulation_period_end: existingData?.accumulation_period_end || '',
    accumulation_monthly_amount: existingData?.accumulation_monthly_amount || 0,
    accumulated_amount: existingData?.accumulated_amount || 0,
    accumulation_type: existingData?.accumulation_type || 'DEPRECIATION',
    current_book_value: existingData?.current_book_value || 0,
  });

  // Extended form state for asset-specific fields
  const [assetLocation, setAssetLocation] = useState('');
  const [unitMeasure, setUnitMeasure] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Bus-specific data (auto-filled from inventory)
  const [busData, setBusData] = useState<BusInventoryData | null>(null);

  // Item/Equipment-specific data (auto-filled from inventory)
  const [itemBatchData, setItemBatchData] = useState<ItemBatchData | null>(null);

  // Inventory selector modals state
  const [showBusSelector, setShowBusSelector] = useState(false);
  const [showItemSelector, setShowItemSelector] = useState(false);

  const [formErrors, setFormErrors] = useState<FormErrors>({
    asset_type_name: '',
    name: '',
    date_acquired: '',
    original_value: '',
    estimated_life_years: '',
    asset_location: '',
    unit_measure: '',
    quantity: '',
    notes: '',
    disposal_date: '',
    disposal_value: '',
  });

  const [isFormValid, setIsFormValid] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Track form changes
  useEffect(() => {
    setIsDirty(true);
  }, [formData, assetLocation, unitMeasure, quantity]);

  // Calculate derived values for disposal and accumulation
  const derivedValues = useMemo(() => {
    // Calculate disposal gain/loss
    const disposalGainLoss = formData.disposal_value !== undefined && formData.book_value !== undefined
      ? formData.disposal_value - formData.book_value
      : 0;

    // Calculate accumulation period end
    const acquisitionDate = new Date(formData.date_acquired);
    const periodEnd = new Date(acquisitionDate);
    periodEnd.setFullYear(periodEnd.getFullYear() + (formData.estimated_life_years || 0));
    const accumulationPeriodEnd = periodEnd.toISOString().split('T')[0];

    // Calculate accumulation monthly amount
    const accumulationMonthlyAmount = formData.original_value && formData.estimated_life_years
      ? (formData.original_value / formData.estimated_life_years) / 12
      : 0;

    // Calculate months elapsed since acquisition
    const today = new Date();
    const startDate = new Date(formData.accumulation_period_start || formData.date_acquired);
    const monthsElapsed = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                          (today.getMonth() - startDate.getMonth());

    // Calculate accumulated amount
    const accumulatedAmount = accumulationMonthlyAmount * Math.max(0, monthsElapsed);

    // Calculate current book value based on accumulation type
    const currentBookValue = formData.accumulation_type === 'APPRECIATION'
      ? formData.original_value + accumulatedAmount
      : formData.original_value - accumulatedAmount;

    return {
      disposal_gain_loss: disposalGainLoss,
      accumulation_period_end: accumulationPeriodEnd,
      accumulation_monthly_amount: accumulationMonthlyAmount,
      accumulated_amount: accumulatedAmount,
      current_book_value: currentBookValue,
      months_elapsed: monthsElapsed,
    };
  }, [
    formData.disposal_value,
    formData.book_value,
    formData.date_acquired,
    formData.estimated_life_years,
    formData.original_value,
    formData.accumulation_period_start,
    formData.accumulation_type,
  ]);

  // Update formData with derived values
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      disposal_gain_loss: derivedValues.disposal_gain_loss,
      accumulation_period_end: derivedValues.accumulation_period_end,
      accumulation_monthly_amount: derivedValues.accumulation_monthly_amount,
      accumulated_amount: derivedValues.accumulated_amount,
      current_book_value: derivedValues.current_book_value,
    }));
  }, [derivedValues]);

  // Handle asset type change - trigger conditional sections
  useEffect(() => {
    if (formData.asset_type_name && mode === 'add') {
      // Determine asset type category
      const assetType = assetTypes.find(at => at.name === formData.asset_type_name);
      
      if (assetType) {
        // Check if it's a BUS type
        if (assetType.name.toLowerCase().includes('bus')) {
          setFormData(prev => ({ ...prev, type: 'BUS', status: 'ACTIVE' }));
          // Open bus inventory selector
          setShowBusSelector(true);
        }
        // Check if it's EQUIPMENT/ITEM type
        else if (assetType.name.toLowerCase().includes('equipment') || assetType.name.toLowerCase().includes('item')) {
          setFormData(prev => ({ ...prev, type: 'EQUIPMENT', status: 'ACTIVE' }));
          // Open item batch selector
          setShowItemSelector(true);
        }
        // Otherwise it's OTHER
        else {
          setFormData(prev => ({ ...prev, type: 'OTHER', status: 'ACTIVE' }));
          setBusData(null);
          setItemBatchData(null);
        }
      }
    }
  }, [formData.asset_type_name, mode]);

  // Handle bus selection from inventory
  const handleBusSelected = (bus: BusInventoryItem) => {
    // Map inventory bus to BusInventoryData format
    const mappedBusData: BusInventoryData = {
      bus_code: bus.bus_code,
      plate_number: bus.plate_number,
      body_number: bus.body_number,
      bus_type: bus.bus_type,
      condition: bus.condition,
      acquisition_method: bus.acquisition_method,
      registration_status: bus.registration_status,
      chassis_number: bus.chassis_number,
      engine_number: bus.engine_number,
      seat_capacity: parseInt(bus.seat_capacity),
      model: bus.model,
      year_model: bus.year_model,
      warranty_expiration_date: bus.warranty_expiration_date,
      body_builder: bus.body_builder.body_builder_name,
      manufacturer: bus.manufacturer.manufacturer_name,
      dealer_name: bus.brand_new_details?.dealer_name || 'N/A',
      dealer_contact: bus.brand_new_details?.dealer_contact || 'N/A',
      previous_owner: bus.second_hand_details?.previous_owner || 'N/A',
      source: bus.second_hand_details?.source || 'Direct Purchase',
      odometer_reading: parseInt(bus.second_hand_details?.odometer_reading || '0'),
    };
    setBusData(mappedBusData);
    
    // Auto-fill form fields from bus data
    setFormData(prev => ({
      ...prev,
      name: `${bus.model} | ${bus.plate_number}`,
      date_acquired: bus.acquisition_date,
      // TODO: Get actual acquisition cost from bus inventory (not in current payload)
      // For now, use a placeholder that user must update
      original_value: 0,
      linked_bus_id: bus.id,
    }));
  };

  // Handle item batch selection from inventory
  const handleItemSelected = (batch: ItemBatchInventory) => {
    // Map inventory batch to ItemBatchData format
    const mappedItemData: ItemBatchData = {
      batch_number: batch.batch_number,
      item_code: batch.item_code,
      item_name: batch.item_name,
      item_description: batch.description,
      item_category_name: batch.category.category_name,
      item_unit_measure_name: batch.unit.unit_name,
      item_unit_measure_abbreviation: batch.unit.abbreviation,
      item_batch_quantity: parseInt(batch.quantity),
    };
    setItemBatchData(mappedItemData);
    
    // Auto-fill form fields from batch data
    const totalCost = parseFloat(batch.acquisition_cost) * parseInt(batch.quantity);
    setFormData(prev => ({
      ...prev,
      name: batch.item_name,
      date_acquired: batch.acquisition_date,
      original_value: totalCost,
      linked_batch_asset_id: batch.batch_asset_id,
      linked_item_id: batch.item_id,
    }));
    setUnitMeasure(batch.unit.abbreviation);
    setQuantity(parseInt(batch.quantity));
  };

  // Validate individual field
  const validateFormField = (fieldName: keyof FormErrors, value: any): string => {
    let errorMessage = '';

    switch (fieldName) {
      case 'asset_type_name':
        if (!value || value.trim() === '') {
          errorMessage = 'Asset type is required';
        }
        break;

      case 'name':
        if (!value || value.trim() === '') {
          errorMessage = 'Asset name is required';
        } else if (value.trim().length < 2) {
          errorMessage = 'Asset name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          errorMessage = 'Asset name cannot exceed 100 characters';
        }
        break;

      case 'date_acquired':
        if (!value) {
          errorMessage = 'Acquisition date is required';
        } else {
          const selectedDate = new Date(value + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate > today) {
            errorMessage = 'Acquisition date cannot be in the future';
          }
        }
        break;

      case 'original_value':
        if (!value || value <= 0) {
          errorMessage = 'Acquisition cost must be greater than 0';
        } else if (!isValidAmount(value)) {
          errorMessage = 'Acquisition cost must be a valid positive number';
        }
        break;

      case 'estimated_life_years':
        const years = Number(value);
        if (!value || !Number.isInteger(years) || years <= 0) {
          errorMessage = 'Estimated years of life must be a positive integer';
        } else if (years > 100) {
          errorMessage = 'Estimated years of life cannot exceed 100';
        }
        break;

      case 'asset_location':
        if (!assetLocation || assetLocation.trim() === '') {
          errorMessage = 'Asset location is required';
        } else if (assetLocation.trim().length < 2) {
          errorMessage = 'Asset location must be at least 2 characters';
        } else if (assetLocation.trim().length > 100) {
          errorMessage = 'Asset location cannot exceed 100 characters';
        }
        break;

      case 'unit_measure':
        if (!unitMeasure || unitMeasure.trim() === '') {
          errorMessage = 'Unit measure is required';
        }
        break;

      case 'quantity':
        const qty = Number(quantity);
        if (!quantity || !Number.isInteger(qty) || qty <= 0) {
          errorMessage = 'Quantity must be a positive integer';
        }
        break;

      case 'notes':
        // Notes are optional, but if present must be at most 500 characters
        if (value && value.trim() !== '') {
          const len = value.trim().length;
          if (len > 500) {
            errorMessage = 'Remarks cannot exceed 500 characters';
          }
        }
        break;

      case 'disposal_date':
        if (formData.status === 'DISPOSED' && !value) {
          errorMessage = 'Disposal date is required for disposed assets';
        }
        break;

      case 'disposal_value':
        if (formData.status === 'DISPOSED') {
          if (!value && value !== 0) {
            errorMessage = 'Disposal value is required for disposed assets';
          } else if (value < 0) {
            errorMessage = 'Disposal value cannot be negative';
          }
        }
        break;
    }

    setFormErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));

    return errorMessage;
  };

  // Validate entire form
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const typeErr = validateFormField('asset_type_name', formData.asset_type_name);
    const nameErr = validateFormField('name', formData.name);
    const dateErr = validateFormField('date_acquired', formData.date_acquired);
    const valueErr = validateFormField('original_value', formData.original_value);
    const lifeErr = validateFormField('estimated_life_years', formData.estimated_life_years);
    const locationErr = validateFormField('asset_location', assetLocation);
    const unitErr = validateFormField('unit_measure', unitMeasure);
    const qtyErr = validateFormField('quantity', quantity);
    const notesErr = validateFormField('notes', formData.notes);
    
    // Disposal validation (only in edit mode when status is DISPOSED)
    let disposalDateErr = '';
    let disposalValueErr = '';
    if (mode === 'edit' && formData.status === 'DISPOSED') {
      disposalDateErr = validateFormField('disposal_date', formData.disposal_date);
      disposalValueErr = validateFormField('disposal_value', formData.disposal_value);
    }

    const errors: string[] = [];
    if (typeErr) errors.push(typeErr);
    if (nameErr) errors.push(nameErr);
    if (dateErr) errors.push(dateErr);
    if (valueErr) errors.push(valueErr);
    if (lifeErr) errors.push(lifeErr);
    if (locationErr) errors.push(locationErr);
    if (unitErr) errors.push(unitErr);
    if (qtyErr) errors.push(qtyErr);
    if (notesErr) errors.push(notesErr);
    if (disposalDateErr) errors.push(disposalDateErr);
    if (disposalValueErr) errors.push(disposalValueErr);

    const isValid = errors.length === 0;
    return { isValid, errors };
  };

  // Check form validity
  useEffect(() => {
    const basicValid =
      formData.asset_type_name !== '' &&
      formData.name !== '' &&
      formData.date_acquired !== '' &&
      formData.original_value > 0 &&
      !!formData.estimated_life_years && formData.estimated_life_years > 0 &&
      assetLocation !== '' &&
      unitMeasure !== '' &&
      quantity > 0 &&
      formErrors.asset_type_name === '' &&
      formErrors.name === '' &&
      formErrors.date_acquired === '' &&
      formErrors.original_value === '' &&
      formErrors.estimated_life_years === '' &&
      formErrors.asset_location === '' &&
      formErrors.unit_measure === '' &&
      formErrors.quantity === '' &&
      formErrors.notes === '';

    // Additional disposal validation in edit mode
    const disposalValid = mode === 'add' || formData.status !== 'DISPOSED' || (
      formData.disposal_date !== '' &&
      formData.disposal_value !== undefined &&
      formErrors.disposal_date === '' &&
      formErrors.disposal_value === ''
    );

    setIsFormValid(basicValid && disposalValid);
  }, [formData, assetLocation, unitMeasure, quantity, formErrors, mode]);

  // Handle input change
  const handleInputChange = (field: keyof Asset | 'asset_location' | 'unit_measure' | 'quantity', value: any) => {
    if (field === 'asset_location') {
      setAssetLocation(value);
    } else if (field === 'unit_measure') {
      setUnitMeasure(value);
    } else if (field === 'quantity') {
      setQuantity(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle input blur (validation)
  const handleInputBlur = (field: keyof FormErrors) => {
    if (field === 'asset_location') {
      validateFormField(field, assetLocation);
    } else if (field === 'unit_measure') {
      validateFormField(field, unitMeasure);
    } else if (field === 'quantity') {
      validateFormField(field, quantity);
    } else {
      validateFormField(field, formData[field as keyof Asset]);
    }
  };

  // Handle close with unsaved changes warning
  const handleClose = async () => {
    if (!isDirty || (mode === 'edit' && !isDirty)) {
      onClose();
      return;
    }

    const result = await showConfirmation(
      'You have unsaved changes. Are you sure you want to close?',
      'Unsaved Changes'
    );

    if (result.isConfirmed) {
      onClose();
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.isValid) {
      showError(validation.errors?.[0] || 'Please fix all validation errors before submitting', 'Validation Error');

      // Focus/scroll to the first invalid input
      setTimeout(() => {
        const firstInvalid: HTMLElement | null = document.querySelector('.invalid-input') as HTMLElement | null;
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          try { firstInvalid.focus(); } catch (err) { /* ignore */ }
        }
      }, 20);
      return;
    }

    // Show confirmation dialog
    const result = await showConfirmation(
      `Are you sure you want to ${mode === 'add' ? 'add' : 'update'} this asset record?`,
      `Confirm ${mode === 'add' ? 'Add' : 'Update'}`
    );

    if (!result.isConfirmed) {
      return;
    }

    // Prepare final data (merge extended fields)
    const finalData: Asset = {
      ...formData,
      // Add extended fields to notes or separate table in production
      notes: formData.notes + `\n[Location: ${assetLocation}] [Unit: ${unitMeasure}] [Qty: ${quantity}]`
    };

    onSave(finalData, mode);
    showSuccess(`Asset ${mode === 'add' ? 'added' : 'updated'} successfully`, 'Success');
  };

  // Determine if fields should be editable
  const isBusOrItem = formData.type === 'BUS' || formData.type === 'EQUIPMENT';
  const isDisposalDraft = formData.disposal_entry_status === 'DRAFT';

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">
          {mode === 'add' ? 'Record Fixed Asset' : 'Edit Fixed Asset'}
        </h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={handleClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* I. Common Asset Information */}
      <p className="details-title">I. Common Asset Information</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            {/* Asset Code */}
            <div className="form-group">
              <label>Asset Code</label>
              <input
                type="text"
                value={formData.asset_code}
                disabled
                className="disabled-field"
              />
              <small className="hint-message">Auto-generated</small>
            </div>

            {/* Asset Type */}
            <div className="form-group">
              <label>
                Asset Type<span className="requiredTags"> *</span>
              </label>
              <select
                value={formData.asset_type_name}
                onChange={(e) => handleInputChange('asset_type_name', e.target.value)}
                onBlur={() => handleInputBlur('asset_type_name')}
                className={formErrors.asset_type_name ? 'invalid-input' : ''}
                disabled={mode === 'edit' && isBusOrItem}
                required
              >
                <option value="">Select Asset Type</option>
                {assetTypes.map(type => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
              {mode === 'edit' && isBusOrItem && (
                <small className="hint-message">Not editable for BUS and ITEM assets</small>
              )}
              <p className="add-error-message">{formErrors.asset_type_name}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Asset Name */}
            <div className="form-group">
              <label>
                Asset Name<span className="requiredTags"> *</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleInputBlur('name')}
                className={formErrors.name ? 'invalid-input' : ''}
                placeholder="Enter asset name"
                disabled={isBusOrItem}
                required
              />
              {isBusOrItem && (
                <small className="hint-message">Auto-filled from inventory</small>
              )}
              <p className="add-error-message">{formErrors.name}</p>
            </div>

            {/* Acquisition Date */}
            <div className="form-group">
              <label>
                Acquisition Date<span className="requiredTags"> *</span>
              </label>
              <input
                type="date"
                value={formData.date_acquired}
                onChange={(e) => handleInputChange('date_acquired', e.target.value)}
                onBlur={() => handleInputBlur('date_acquired')}
                max={new Date().toISOString().split('T')[0]}
                className={formErrors.date_acquired ? 'invalid-input' : ''}
                disabled={isBusOrItem}
                required
              />
              {formData.date_acquired && (
                <small className="formatted-date-preview">
                  {formatDate(formData.date_acquired)}
                </small>
              )}
              {isBusOrItem && (
                <small className="hint-message">Auto-filled from inventory</small>
              )}
              <p className="add-error-message">{formErrors.date_acquired}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Acquisition Cost */}
            <div className="form-group">
              <label>
                Acquisition Cost<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.original_value}
                onChange={(e) => handleInputChange('original_value', parseFloat(e.target.value) || 0)}
                onBlur={() => handleInputBlur('original_value')}
                min="0.01"
                step="0.01"
                className={formErrors.original_value ? 'invalid-input' : ''}
                placeholder="0.00"
                disabled={formData.type === 'EQUIPMENT'}
                required
              />
              {formData.original_value > 0 && (
                <small className="formatted-date-preview">
                  {formatMoney(formData.original_value)}
                </small>
              )}
              {formData.type === 'EQUIPMENT' && (
                <small className="hint-message">Auto-filled from inventory</small>
              )}
              <p className="add-error-message">{formErrors.original_value}</p>
            </div>

            {/* Estimated Years of Life */}
            <div className="form-group">
              <label>
                Estimated Years of Life<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.estimated_life_years || ''}
                onChange={(e) => handleInputChange('estimated_life_years', parseInt(e.target.value) || 0)}
                onBlur={() => handleInputBlur('estimated_life_years')}
                min="1"
                max="100"
                className={formErrors.estimated_life_years ? 'invalid-input' : ''}
                placeholder="10"
                required
              />
              <small className="hint-message">Enter number of years (1-100)</small>
              <p className="add-error-message">{formErrors.estimated_life_years}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Status */}
            <div className="form-group">
              <label>Status</label>
              <input
                type="text"
                value={formData.status || 'PENDING'}
                disabled
                className="disabled-field"
              />
              <small className="hint-message">Auto-determined based on asset lifecycle</small>
            </div>

            {/* Asset Location */}
            <div className="form-group">
              <label>
                Asset Location<span className="requiredTags"> *</span>
              </label>
              <input
                type="text"
                value={assetLocation}
                onChange={(e) => handleInputChange('asset_location', e.target.value)}
                onBlur={() => handleInputBlur('asset_location')}
                className={formErrors.asset_location ? 'invalid-input' : ''}
                placeholder="e.g., Main Office, Warehouse"
                required
              />
              <p className="add-error-message">{formErrors.asset_location}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Unit Measure */}
            <div className="form-group">
              <label>
                Unit Measure<span className="requiredTags"> *</span>
              </label>
              <select
                value={unitMeasure}
                onChange={(e) => handleInputChange('unit_measure', e.target.value)}
                onBlur={() => handleInputBlur('unit_measure')}
                className={formErrors.unit_measure ? 'invalid-input' : ''}
                disabled={formData.type === 'EQUIPMENT'}
                required
              >
                <option value="">Select Unit</option>
                {unitMeasures.map(unit => (
                  <option key={unit.id} value={unit.abbreviation}>
                    {unit.name} ({unit.abbreviation})
                  </option>
                ))}
              </select>
              {formData.type === 'EQUIPMENT' && (
                <small className="hint-message">Auto-filled from inventory</small>
              )}
              <p className="add-error-message">{formErrors.unit_measure}</p>
            </div>

            {/* Quantity */}
            <div className="form-group">
              <label>
                Quantity<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                onBlur={() => handleInputBlur('quantity')}
                min="1"
                className={formErrors.quantity ? 'invalid-input' : ''}
                disabled={formData.type === 'EQUIPMENT'}
                required
              />
              {formData.type === 'EQUIPMENT' && (
                <small className="hint-message">Auto-filled from inventory</small>
              )}
              <p className="add-error-message">{formErrors.quantity}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label>Remarks</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                onBlur={() => handleInputBlur('notes')}
                className={formErrors.notes ? 'invalid-input' : ''}
                maxLength={500}
                rows={3}
                placeholder="Additional notes or remarks (optional)..."
              />
              <small className="hint-message">{formData.notes?.length || 0}/500 characters</small>
              <p className="add-error-message">{formErrors.notes}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. BUS Information (Conditional) */}
      {formData.type === 'BUS' && busData && (
        <>
          <p className="details-title">II. BUS Information (From Inventory)</p>
          <div className="modal-content view">
            <form className="view-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Bus Code</label>
                  <input type="text" value={busData.bus_code} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Plate Number</label>
                  <input type="text" value={busData.plate_number} disabled className="disabled-field" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Body Number</label>
                  <input type="text" value={busData.body_number} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Bus Type</label>
                  <input type="text" value={busData.bus_type} disabled className="disabled-field" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Condition</label>
                  <input type="text" value={busData.condition} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Acquisition Method</label>
                  <input type="text" value={busData.acquisition_method} disabled className="disabled-field" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Registration Status</label>
                  <input type="text" value={busData.registration_status} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Chassis Number</label>
                  <input type="text" value={busData.chassis_number} disabled className="disabled-field" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Engine Number</label>
                  <input type="text" value={busData.engine_number} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Seat Capacity</label>
                  <input type="text" value={busData.seat_capacity} disabled className="disabled-field" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Model</label>
                  <input type="text" value={busData.model} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Year Model</label>
                  <input type="text" value={busData.year_model} disabled className="disabled-field" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Warranty Expiration Date</label>
                  <input type="text" value={formatDate(busData.warranty_expiration_date)} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Body Builder</label>
                  <input type="text" value={busData.body_builder} disabled className="disabled-field" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Manufacturer</label>
                  <input type="text" value={busData.manufacturer} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Dealer Name</label>
                  <input type="text" value={busData.dealer_name} disabled className="disabled-field" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Dealer Contact</label>
                  <input type="text" value={busData.dealer_contact} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Previous Owner</label>
                  <input type="text" value={busData.previous_owner} disabled className="disabled-field" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Source</label>
                  <input type="text" value={busData.source} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Odometer Reading</label>
                  <input type="text" value={`${busData.odometer_reading.toLocaleString()} km`} disabled className="disabled-field" />
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* III. Batch/Item Information (Conditional) */}
      {formData.type === 'EQUIPMENT' && itemBatchData && (
        <>
          <p className="details-title">III. Batch/Item Information (From Inventory)</p>
          <div className="modal-content view">
            <form className="view-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Batch Number</label>
                  <input type="text" value={itemBatchData.batch_number} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Item Code</label>
                  <input type="text" value={itemBatchData.item_code} disabled className="disabled-field" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Item Name</label>
                  <input type="text" value={itemBatchData.item_name} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Item Category</label>
                  <input type="text" value={itemBatchData.item_category_name} disabled className="disabled-field" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Item Description</label>
                  <textarea
                    value={itemBatchData.item_description}
                    disabled
                    className="disabled-field"
                    rows={2}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Item Unit Measure</label>
                  <input type="text" value={`${itemBatchData.item_unit_measure_name} (${itemBatchData.item_unit_measure_abbreviation})`} disabled className="disabled-field" />
                </div>
                <div className="form-group">
                  <label>Item Batch Quantity</label>
                  <input type="text" value={itemBatchData.item_batch_quantity} disabled className="disabled-field" />
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* IV. Disposal Information (Edit mode only, when status is DISPOSED) */}
      {mode === 'edit' && formData.status === 'DISPOSED' && (
        <>
          <p className="details-title">IV. Disposal Information</p>
          <div className="modal-content add">
            <form className="add-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Disposal Code</label>
                  <input
                    type="text"
                    value={formData.disposal_code || generateDisposalCode()}
                    disabled
                    className="disabled-field"
                  />
                  <small className="hint-message">Auto-generated when asset is disposed</small>
                </div>

                <div className="form-group">
                  <label>
                    Disposal Date<span className="requiredTags"> *</span>
                  </label>
                  <input
                    type="date"
                    value={formData.disposal_date}
                    onChange={(e) => handleInputChange('disposal_date', e.target.value)}
                    onBlur={() => handleInputBlur('disposal_date')}
                    className={formErrors.disposal_date ? 'invalid-input' : ''}
                    disabled={!isDisposalDraft}
                    required
                  />
                  {!isDisposalDraft && (
                    <small className="hint-message">Editable only if linked Entry is DRAFT</small>
                  )}
                  <p className="add-error-message">{formErrors.disposal_date}</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    Disposal Value<span className="requiredTags"> *</span>
                  </label>
                  <input
                    type="number"
                    value={formData.disposal_value}
                    onChange={(e) => handleInputChange('disposal_value', parseFloat(e.target.value) || 0)}
                    onBlur={() => handleInputBlur('disposal_value')}
                    min="0"
                    step="0.01"
                    className={formErrors.disposal_value ? 'invalid-input' : ''}
                    disabled={!isDisposalDraft}
                    required
                  />
                  {formData.disposal_value !== undefined && formData.disposal_value > 0 && (
                    <small className="formatted-date-preview">
                      {formatMoney(formData.disposal_value)}
                    </small>
                  )}
                  {!isDisposalDraft && (
                    <small className="hint-message">Editable only if linked Entry is DRAFT</small>
                  )}
                  <p className="add-error-message">{formErrors.disposal_value}</p>
                </div>

                <div className="form-group">
                  <label>Disposal Gain / Loss</label>
                  <input
                    type="text"
                    value={formatMoney(derivedValues.disposal_gain_loss)}
                    disabled
                    className="disabled-field"
                    style={{ 
                      color: derivedValues.disposal_gain_loss >= 0 ? 'green' : 'red',
                      fontWeight: 'bold'
                    }}
                  />
                  <small className="hint-message">
                    Derived from Disposal Value - Book Value ({derivedValues.disposal_gain_loss >= 0 ? 'Gain' : 'Loss'})
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Linked Entry Status</label>
                  <input
                    type="text"
                    value={formData.disposal_entry_status || 'N/A'}
                    disabled
                    className="disabled-field"
                  />
                  <small className="hint-message">Status of linked journal entry</small>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* V. Accumulation/Depreciation (Edit mode only, when status is not PENDING) */}
      {mode === 'edit' && formData.status && formData.status !== 'PENDING' && (
        <>
          <p className="details-title">V. Depreciation / Appreciation</p>
          <div className="modal-content add">
            <form className="add-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Accumulation Period Start</label>
                  <input
                    type="date"
                    value={formData.accumulation_period_start}
                    onChange={(e) => handleInputChange('accumulation_period_start', e.target.value)}
                    className=""
                  />
                  <small className="hint-message">Default: Acquisition Date (overridable)</small>
                </div>

                <div className="form-group">
                  <label>Accumulation Period End</label>
                  <input
                    type="text"
                    value={formatDate(derivedValues.accumulation_period_end)}
                    disabled
                    className="disabled-field"
                  />
                  <small className="hint-message">Derived: Acquisition Date + Estimated Years of Life</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Accumulation Monthly Amount</label>
                  <input
                    type="text"
                    value={formatMoney(derivedValues.accumulation_monthly_amount)}
                    disabled
                    className="disabled-field"
                  />
                  <small className="hint-message">Derived: (Acquisition Cost / Estimated Years) / 12</small>
                </div>

                <div className="form-group">
                  <label>Accumulated Amount</label>
                  <input
                    type="text"
                    value={formatMoney(derivedValues.accumulated_amount)}
                    disabled
                    className="disabled-field"
                  />
                  <small className="hint-message">
                    Derived: Monthly Amount × {derivedValues.months_elapsed} months elapsed
                  </small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Accumulation Type</label>
                  <select
                    value={formData.accumulation_type}
                    onChange={(e) => handleInputChange('accumulation_type', e.target.value as 'APPRECIATION' | 'DEPRECIATION')}
                  >
                    <option value="DEPRECIATION">Depreciation</option>
                    <option value="APPRECIATION">Appreciation</option>
                  </select>
                  <small className="hint-message">How the asset value changes over time</small>
                </div>

                <div className="form-group">
                  <label>Current Book Value</label>
                  <input
                    type="text"
                    value={formatMoney(derivedValues.current_book_value)}
                    disabled
                    className="disabled-field"
                    style={{ fontWeight: 'bold' }}
                  />
                  <small className="hint-message">
                    {formData.accumulation_type === 'APPRECIATION' 
                      ? 'Acquisition Cost + Accumulated Amount' 
                      : 'Acquisition Cost - Accumulated Amount'}
                  </small>
                </div>
              </div>

              {/* Progress Bar for Depreciation */}
              <div className="form-row">
                <div className="form-group full-width">
                  <label>
                    {formData.accumulation_type === 'DEPRECIATION' ? 'Depreciation' : 'Appreciation'} Progress
                  </label>
                  <div style={{
                    width: '100%',
                    height: '24px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginTop: '8px'
                  }}>
                    <div style={{
                      width: `${Math.min((derivedValues.accumulated_amount / formData.original_value) * 100, 100)}%`,
                      height: '100%',
                      backgroundColor: formData.accumulation_type === 'DEPRECIATION' ? '#ff6b6b' : '#51cf66',
                      transition: 'width 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}>
                      {((derivedValues.accumulated_amount / formData.original_value) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <small className="hint-message">
                    {formData.accumulation_type === 'DEPRECIATION' 
                      ? 'Percentage of asset value depreciated' 
                      : 'Percentage of asset value appreciated'}
                  </small>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="modal-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={handleClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="submit-btn"
          disabled={!isFormValid}
          onClick={handleSubmit}
        >
          {mode === 'add' ? 'Add Asset' : 'Update Asset'}
        </button>
      </div>

      {/* Inventory Selector Modals */}
      <ModalManager
        isOpen={showBusSelector}
        onClose={() => setShowBusSelector(false)}
        modalContent={
          <BusInventorySelector
            isOpen={showBusSelector}
            onClose={() => setShowBusSelector(false)}
            onSelect={handleBusSelected}
            selectedBusType={
              formData.asset_type_name?.toLowerCase().includes('airconditioned') 
                ? 'Airconditioned' 
                : formData.asset_type_name?.toLowerCase().includes('ordinary')
                ? 'Ordinary'
                : undefined
            }
          />
        }
      />
      <ModalManager
        isOpen={showItemSelector}
        onClose={() => setShowItemSelector(false)}
        modalContent={
          <ItemBatchSelector
            isOpen={showItemSelector}
            onClose={() => setShowItemSelector(false)}
            onSelect={handleItemSelected}
          />
        }
      />
    </>
  );
}
