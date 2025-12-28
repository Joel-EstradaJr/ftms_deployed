/**
 * Trip Revenue Configuration Modal Component
 * 
 * ============================================================================
 * BACKEND INTEGRATION NOTES
 * ============================================================================
 * 
 * This component manages configuration settings for trip revenue management:
 * - Minimum wage per employee
 * - Duration before remittance is converted to receivabl (in hours)
 * - receivable due date (in days)
 * - Default receivable share split between conductor and driver
 * 
 * CONFIGURATION STORAGE:
 * These settings should be stored in a configuration table in the database
 * and retrieved when the application loads. The configuration affects:
 * - Remittance validation rules
 * - Automatic receivable conversion timing
 * - Default receivable distribution
 * 
 * BACKEND ENDPOINT:
 * - GET /api/admin/revenue/config (to load current configuration)
 * - POST /api/admin/revenue/config (to save configuration)
 * 
 * VALIDATION RULES:
 * - Minimum wage must be > 0
 * - Duration to receivable must be > 0
 * - receivable due date must be > 0
 * - Conductor and driver shares must add up to 100%
 * 
 * NOTE: When configuration is updated, it should apply to:
 * - New trip assignments going forward
 * - Pending remittances (not yet recorded)
 * - Should NOT affect already finalized remittances or receivables
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
  minimum_wage: number; // Minimum wage for driver & conductor
  duration_to_late: number; // Hours until converted to receivable/receivable
  receivable_due_date: number; // Days until receivable is due
  driver_share: number; // Percentage share for driver (0-100)
  conductor_share: number; // Percentage share for conductor (0-100)
}

interface FormErrors {
  minimum_wage: string;
  duration_to_late: string;
  receivable_due_date: string;
  driver_share: string;
  conductor_share: string;
}

export default function ConfigModal({ onClose, onSave, currentConfig }: ConfigModalProps) {
  const [formData, setFormData] = useState<ConfigData>({
    minimum_wage: currentConfig?.minimum_wage || 600,
    duration_to_late: currentConfig?.duration_to_late || 168,
    receivable_due_date: currentConfig?.receivable_due_date || 30,
    driver_share: currentConfig?.driver_share || 50,
    conductor_share: currentConfig?.conductor_share || 50,
  });

  // Update formData when currentConfig changes (modal reopens)
  useEffect(() => {
    if (currentConfig) {
      console.log('ConfigModal: Loading current config:', currentConfig);
      setFormData({
        minimum_wage: currentConfig.minimum_wage,
        duration_to_late: currentConfig.duration_to_late,
        receivable_due_date: currentConfig.receivable_due_date,
        driver_share: currentConfig.driver_share,
        conductor_share: currentConfig.conductor_share,
      });
    }
  }, [currentConfig]);

  const [formErrors, setFormErrors] = useState<FormErrors>({
    minimum_wage: '',
    duration_to_late: '',
    receivable_due_date: '',
    driver_share: '',
    conductor_share: '',
  });

  const [isFormValid, setIsFormValid] = useState(false);

  // Validate individual field
  const validateFormField = (fieldName: keyof ConfigData, value: any): boolean => {
    let errorMessage = '';

    switch (fieldName) {
      case 'minimum_wage':
        if (!value || value <= 0) {
          errorMessage = 'Minimum wage must be greater than 0';
        }
        break;
      
      case 'duration_to_late':
        if (!value || value <= 0) {
          errorMessage = 'Duration to receivable must be greater than 0';
        }
        break;
      
      case 'receivable_due_date':
        if (!value || value <= 0) {
          errorMessage = 'Receivable due date must be greater than 0';
        } else if (value > 365) {
          errorMessage = 'Receivable due date cannot exceed 365 days (1 year)';
        }
        break;
      
      case 'driver_share':
        if (value === null || value === undefined || value < 0) {
          errorMessage = 'Driver share must be 0 or greater';
        } else if (value > 100) {
          errorMessage = 'Driver share cannot exceed 100%';
        }
        break;
      
      case 'conductor_share':
        if (value === null || value === undefined || value < 0) {
          errorMessage = 'Conductor share must be 0 or greater';
        } else if (value > 100) {
          errorMessage = 'Conductor share cannot exceed 100%';
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
    const minimumWageValid = validateFormField('minimum_wage', formData.minimum_wage);
    const durationToLateValid = validateFormField('duration_to_late', formData.duration_to_late);
    const receivableDueDateValid = validateFormField('receivable_due_date', formData.receivable_due_date);
    const driverShareValid = validateFormField('driver_share', formData.driver_share);
    const conductorShareValid = validateFormField('conductor_share', formData.conductor_share);

    // Check if shares add up to 100%
    if (formData.conductor_share + formData.driver_share !== 100) {
      showError('Conductor and Driver shares must add up to 100%', 'Validation Error');
      return false;
    }

    return minimumWageValid && durationToLateValid && receivableDueDateValid && driverShareValid && conductorShareValid;
  };

  // Check form validity on data changes
  useEffect(() => {
    const isValid = 
      formData.minimum_wage > 0 &&
      formData.duration_to_late > 0 &&
      formData.receivable_due_date > 0 &&
      formData.driver_share >= 0 &&
      formData.conductor_share >= 0 &&
      formData.conductor_share + formData.driver_share === 100 &&
      formErrors.minimum_wage === '' &&
      formErrors.duration_to_late === '' &&
      formErrors.receivable_due_date === '' &&
      formErrors.driver_share === '' &&
      formErrors.conductor_share === '';
    
    setIsFormValid(isValid);
  }, [formData, formErrors]);

  // Handle input change
  const handleInputChange = (field: keyof ConfigData, value: any) => {
    const numValue = parseFloat(value) || 0;

    // Special handling for conductor/driver share - auto-adjust the other share
    if (field === 'conductor_share') {
      const newConductorShare = Math.min(100, Math.max(0, numValue));
      const newDriverShare = 100 - newConductorShare;
      
      setFormData(prev => ({
        ...prev,
        conductor_share: newConductorShare,
        driver_share: newDriverShare
      }));
      
      // Clear errors for both fields
      setFormErrors(prev => ({
        ...prev,
        conductor_share: '',
        driver_share: ''
      }));
      return;
    }
    
    if (field === 'driver_share') {
      const newDriverShare = Math.min(100, Math.max(0, numValue));
      const newConductorShare = 100 - newDriverShare;
      
      setFormData(prev => ({
        ...prev,
        driver_share: newDriverShare,
        conductor_share: newConductorShare
      }));
      
      // Clear errors for both fields
      setFormErrors(prev => ({
        ...prev,
        conductor_share: '',
        driver_share: ''
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
      conductor_share: formData.conductor_share,
      driver_share: 100 - formData.conductor_share // Recalculate to ensure consistency
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

      {/* Configuration Form */}
      <div className="modal-content add">
        <form className="add-form" onSubmit={handleSubmit}>
          {/* Minimum Wage */}
          <div className="form-row">
            <div className="form-group">
              <label>
                Minimum Wage (₱)<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.minimum_wage}
                onChange={(e) => handleInputChange('minimum_wage', e.target.value)}
                onBlur={() => handleInputBlur('minimum_wage')}
                min="1"
                className={formErrors.minimum_wage ? 'invalid-input' : ''}
                placeholder="600"
                required
              />
              <small className="hint-message">
                Minimum wage per employee (Driver & Conductor)
              </small>
              {formErrors.minimum_wage && (
                <p className="add-error-message">{formErrors.minimum_wage}</p>
              )}
            </div>

            <div className="form-group">
              <label>
                Duration to Receivable (Hours)<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.duration_to_late}
                onChange={(e) => handleInputChange('duration_to_late', e.target.value)}
                onBlur={() => handleInputBlur('duration_to_late')}
                min="1"
                className={formErrors.duration_to_late ? 'invalid-input' : ''}
                placeholder="168"
                required
              />
              <small className="hint-message">
                Hours after assignment before remittance is converted to receivable.
              </small>
              {formErrors.duration_to_late && (
                <p className="add-error-message">{formErrors.duration_to_late}</p>
              )}
            </div>
          </div>

          {/* Receivable Due Date */}
          <div className="form-row">
            <div className="form-group">
              <label>
                Receivable Due Date (Days)<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.receivable_due_date}
                onChange={(e) => handleInputChange('receivable_due_date', e.target.value)}
                onBlur={() => handleInputBlur('receivable_due_date')}
                min="1"
                max="365"
                className={formErrors.receivable_due_date ? 'invalid-input' : ''}
                placeholder="30"
                required
              />
              <small className="hint-message">
                Days from receivable creation until payment is due (maximum 365 days)
              </small>
              {formErrors.receivable_due_date && (
                <p className="add-error-message">{formErrors.receivable_due_date}</p>
              )}
            </div>
          </div>

          {/* Share Distribution */}
          <div className="form-row">
            <div className="form-group">
              <label>
                Default Driver Share (%)<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.driver_share}
                onChange={(e) => handleInputChange('driver_share', e.target.value)}
                onBlur={() => handleInputBlur('driver_share')}
                min="0"
                max="100"
                className={formErrors.driver_share ? 'invalid-input' : ''}
                placeholder="50"
                required
              />
              <small className="hint-message">
                Driver's share of receivable for trip deficit (auto-adjusts conductor share to equal 100%)
              </small>
              {formErrors.driver_share && (
                <p className="add-error-message">{formErrors.driver_share}</p>
              )}
            </div>

            <div className="form-group">
              <label>
                Default Conductor Share (%)<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.conductor_share}
                onChange={(e) => handleInputChange('conductor_share', e.target.value)}
                onBlur={() => handleInputBlur('conductor_share')}
                min="0"
                max="100"
                className={formErrors.conductor_share ? 'invalid-input' : ''}
                placeholder="50"
                required
              />
              <small className="hint-message">
                Conductor's share of receivable for trip deficit (auto-adjusts driver share to equal 100%)
              </small>
              {formErrors.conductor_share && (
                <p className="add-error-message">{formErrors.conductor_share}</p>
              )}
            </div>
          </div>

          {/* Total Share Display */}
          <div className="form-row">
            <div className="form-group">
              <label>Total Share</label>
              <input
                type="text"
                value={`${formData.conductor_share + formData.driver_share}%`}
                disabled
                className="disabled-field"
                style={{
                  color: formData.conductor_share + formData.driver_share === 100 
                    ? 'var(--success-color)' 
                    : 'var(--error-color)',
                  fontWeight: 600
                }}
              />
              <small className="hint-message">
                {formData.conductor_share + formData.driver_share === 100 
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