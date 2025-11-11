/**
 * Trip Revenue Configuration Modal Component
 * 
 * ============================================================================
 * BACKEND INTEGRATION NOTES
 * ============================================================================
 * 
 * This component manages configuration settings for trip revenue management:
 * - Minimum wage per employee
 * - Duration before remittance is considered late (in hours)
 * - Duration before remittance is converted to loan (in hours)
 * - Default loan share split between conductor and driver
 * 
 * CONFIGURATION STORAGE:
 * These settings should be stored in a configuration table in the database
 * and retrieved when the application loads. The configuration affects:
 * - Remittance validation rules
 * - Automatic loan conversion timing
 * - Default loan distribution
 * 
 * BACKEND ENDPOINT:
 * - GET /api/admin/revenue/config (to load current configuration)
 * - POST /api/admin/revenue/config (to save configuration)
 * 
 * VALIDATION RULES:
 * - Minimum wage must be > 0
 * - Duration to late must be > 0
 * - Duration to loan must be > duration to late (at least 1 hour difference)
 * - Conductor and driver shares must add up to 100%
 * 
 * NOTE: When configuration is updated, it should apply to:
 * - New trip assignments going forward
 * - Pending remittances (not yet recorded)
 * - Should NOT affect already finalized remittances or loans
 * 
 * ============================================================================
 */

"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";
import { showError, showSuccess } from "@/utils/Alerts";

interface ConfigModalProps {
  onClose: () => void;
  onSave: (configData: ConfigData) => void;
  currentConfig?: ConfigData;
}

export interface ConfigData {
  minimumWage: number; // Minimum wage for driver & conductor
  durationToLate: number; // Hours until considered late
  durationToLoan: number; // Hours until converted to loan
  defaultConductorShare: number; // Percentage share for conductor (0-100)
  defaultDriverShare: number; // Percentage share for driver (0-100)
}

interface FormErrors {
  minimumWage: string;
  durationToLate: string;
  durationToLoan: string;
  defaultConductorShare: string;
  defaultDriverShare: string;
}

export default function ConfigModal({ onClose, onSave, currentConfig }: ConfigModalProps) {
  const [formData, setFormData] = useState<ConfigData>({
    minimumWage: currentConfig?.minimumWage || 600,
    durationToLate: currentConfig?.durationToLate || 72,
    durationToLoan: currentConfig?.durationToLoan || 168,
    defaultConductorShare: currentConfig?.defaultConductorShare || 50,
    defaultDriverShare: currentConfig?.defaultDriverShare || 50,
  });

  // Update formData when currentConfig changes (modal reopens)
  useEffect(() => {
    if (currentConfig) {
      console.log('ConfigModal: Loading current config:', currentConfig);
      setFormData({
        minimumWage: currentConfig.minimumWage,
        durationToLate: currentConfig.durationToLate,
        durationToLoan: currentConfig.durationToLoan,
        defaultConductorShare: currentConfig.defaultConductorShare,
        defaultDriverShare: currentConfig.defaultDriverShare,
      });
    }
  }, [currentConfig]);

  const [formErrors, setFormErrors] = useState<FormErrors>({
    minimumWage: '',
    durationToLate: '',
    durationToLoan: '',
    defaultConductorShare: '',
    defaultDriverShare: '',
  });

  const [isFormValid, setIsFormValid] = useState(false);

  // Validate individual field
  const validateFormField = (fieldName: keyof ConfigData, value: any): boolean => {
    let errorMessage = '';

    switch (fieldName) {
      case 'minimumWage':
        if (!value || value <= 0) {
          errorMessage = 'Minimum wage must be greater than 0';
        }
        break;
      
      case 'durationToLate':
        if (!value || value <= 0) {
          errorMessage = 'Duration to late must be greater than 0';
        } else if (formData.durationToLoan && value >= formData.durationToLoan) {
          errorMessage = 'Duration to late must be less than duration to loan';
        }
        break;
      
      case 'durationToLoan':
        if (!value || value <= 0) {
          errorMessage = 'Duration to loan must be greater than 0';
        } else if (formData.durationToLate && value <= formData.durationToLate) {
          errorMessage = 'Duration to loan must be at least 1 hour greater than duration to late';
        }
        break;
      
      case 'defaultConductorShare':
        if (value === null || value === undefined || value < 0) {
          errorMessage = 'Conductor share must be 0 or greater';
        } else if (value > 100) {
          errorMessage = 'Conductor share cannot exceed 100%';
        }
        break;
      
      case 'defaultDriverShare':
        if (value === null || value === undefined || value < 0) {
          errorMessage = 'Driver share must be 0 or greater';
        } else if (value > 100) {
          errorMessage = 'Driver share cannot exceed 100%';
        }
        break;
    }

    setFormErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));

    return errorMessage === '';
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const minimumWageValid = validateFormField('minimumWage', formData.minimumWage);
    const durationToLateValid = validateFormField('durationToLate', formData.durationToLate);
    const durationToLoanValid = validateFormField('durationToLoan', formData.durationToLoan);
    const conductorShareValid = validateFormField('defaultConductorShare', formData.defaultConductorShare);
    const driverShareValid = validateFormField('defaultDriverShare', formData.defaultDriverShare);

    // Check if shares add up to 100%
    if (formData.defaultConductorShare + formData.defaultDriverShare !== 100) {
      showError('Conductor and Driver shares must add up to 100%', 'Validation Error');
      return false;
    }

    return minimumWageValid && durationToLateValid && durationToLoanValid && conductorShareValid && driverShareValid;
  };

  // Check form validity on data changes
  useEffect(() => {
    const isValid = 
      formData.minimumWage > 0 &&
      formData.durationToLate > 0 &&
      formData.durationToLoan > 0 &&
      formData.durationToLoan > formData.durationToLate &&
      formData.defaultConductorShare >= 0 &&
      formData.defaultDriverShare >= 0 &&
      formData.defaultConductorShare + formData.defaultDriverShare === 100 &&
      formErrors.minimumWage === '' &&
      formErrors.durationToLate === '' &&
      formErrors.durationToLoan === '' &&
      formErrors.defaultConductorShare === '' &&
      formErrors.defaultDriverShare === '';
    
    setIsFormValid(isValid);
  }, [formData, formErrors]);

  // Handle input change
  const handleInputChange = (field: keyof ConfigData, value: any) => {
    const numValue = parseFloat(value) || 0;

    // Special handling for conductor/driver share - auto-adjust the other share
    if (field === 'defaultConductorShare') {
      const newConductorShare = Math.min(100, Math.max(0, numValue));
      const newDriverShare = 100 - newConductorShare;
      
      setFormData(prev => ({
        ...prev,
        defaultConductorShare: newConductorShare,
        defaultDriverShare: newDriverShare
      }));
      
      // Clear errors for both fields
      setFormErrors(prev => ({
        ...prev,
        defaultConductorShare: '',
        defaultDriverShare: ''
      }));
      return;
    }
    
    if (field === 'defaultDriverShare') {
      const newDriverShare = Math.min(100, Math.max(0, numValue));
      const newConductorShare = 100 - newDriverShare;
      
      setFormData(prev => ({
        ...prev,
        defaultDriverShare: newDriverShare,
        defaultConductorShare: newConductorShare
      }));
      
      // Clear errors for both fields
      setFormErrors(prev => ({
        ...prev,
        defaultConductorShare: '',
        defaultDriverShare: ''
      }));
      return;
    }
    
    // Default handling for other fields
    setFormData(prev => ({
      ...prev,
      [field]: numValue
    }));

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle input blur (validation)
  const handleInputBlur = (field: keyof ConfigData) => {
    validateFormField(field, formData[field]);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Please fix all validation errors before submitting', 'Validation Error');
      return;
    }

    // Ensure shares are properly set before saving
    const finalData = {
      ...formData,
      defaultConductorShare: formData.defaultConductorShare,
      defaultDriverShare: 100 - formData.defaultConductorShare // Recalculate to ensure consistency
    };

    console.log('ConfigModal: Submitting final data:', finalData);
    onSave(finalData);
    showSuccess('Configuration saved successfully', 'Success');
    onClose();
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">Bus Trip Configuration</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Minimum Wage Configuration */}
      <p className="details-title">Minimum Wage (Driver & Conductor)</p>
      <div className="modal-content add">
        <form className="add-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>
                Minimum Wage (₱)<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.minimumWage}
                onChange={(e) => handleInputChange('minimumWage', e.target.value)}
                onBlur={() => handleInputBlur('minimumWage')}
                min="1"
                className={formErrors.minimumWage ? 'invalid-input' : ''}
                placeholder="600"
                required
              />
              <small className="hint-message">
                Minimum wage per employee (Driver & Conductor)
              </small>
              <p className="add-error-message">{formErrors.minimumWage}</p>
            </div>
          </div>
        </form>
      </div>

      {/* Bus Trip Rules Configuration */}
      <p className="details-title">Bus Trip Rules</p>
      <div className="modal-content add">
        <form className="add-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>
                Duration to Late (Hours)<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.durationToLate}
                onChange={(e) => handleInputChange('durationToLate', e.target.value)}
                onBlur={() => handleInputBlur('durationToLate')}
                min="1"
                className={formErrors.durationToLate ? 'invalid-input' : ''}
                placeholder="72"
                required
              />
              <small className="hint-message">
                Hours after assignment before remittance is considered late
              </small>
              <p className="add-error-message">{formErrors.durationToLate}</p>
            </div>

            <div className="form-group">
              <label>
                Duration to Loan (Hours)<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.durationToLoan}
                onChange={(e) => handleInputChange('durationToLoan', e.target.value)}
                onBlur={() => handleInputBlur('durationToLoan')}
                min="1"
                className={formErrors.durationToLoan ? 'invalid-input' : ''}
                placeholder="168"
                required
              />
              <small className="hint-message">
                Hours after assignment before remittance is converted to loan (must be at least 1hr higher than Duration to Late)
              </small>
              <p className="add-error-message">{formErrors.durationToLoan}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Default Conductor Share (%)<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.defaultConductorShare}
                onChange={(e) => handleInputChange('defaultConductorShare', e.target.value)}
                onBlur={() => handleInputBlur('defaultConductorShare')}
                min="0"
                max="100"
                className={formErrors.defaultConductorShare ? 'invalid-input' : ''}
                placeholder="50"
                required
              />
              <small className="hint-message">
                Conductor's share of loan for trip deficit (auto-adjusts driver share to equal 100%)
              </small>
              <p className="add-error-message">{formErrors.defaultConductorShare}</p>
            </div>

            <div className="form-group">
              <label>
                Default Driver Share (%)<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.defaultDriverShare}
                onChange={(e) => handleInputChange('defaultDriverShare', e.target.value)}
                onBlur={() => handleInputBlur('defaultDriverShare')}
                min="0"
                max="100"
                className={formErrors.defaultDriverShare ? 'invalid-input' : ''}
                placeholder="50"
                required
              />
              <small className="hint-message">
                Driver's share of loan for trip deficit (auto-adjusts conductor share to equal 100%)
              </small>
              <p className="add-error-message">{formErrors.defaultDriverShare}</p>
            </div>
          </div>

          {/* Total Share Display */}
          <div className="form-row">
            <div className="form-group">
              <label>Total Share</label>
              <input
                type="text"
                value={`${formData.defaultConductorShare + formData.defaultDriverShare}%`}
                disabled
                className="disabled-field"
                style={{
                  color: formData.defaultConductorShare + formData.defaultDriverShare === 100 
                    ? 'var(--success-color)' 
                    : 'var(--error-color)',
                  fontWeight: 600
                }}
              />
              <small className="hint-message">
                {formData.defaultConductorShare + formData.defaultDriverShare === 100 
                  ? '✓ Shares add up to 100%' 
                  : '⚠️ Shares must add up to 100%'
                }
              </small>
            </div>
          </div>
        </form>
      </div>

      {/* Action Buttons */}
      <div className="modal-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="submit-btn"
          disabled={!isFormValid}
          onClick={handleSubmit}
        >
          Save Configuration
        </button>
      </div>
    </>
  );
}
