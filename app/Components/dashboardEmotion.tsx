"use client";
import React, { useState, useEffect, useCallback } from 'react';
import '../styles/components/dashboardEmotion.css';

interface EmotionSettings {
  veryPoor: number;
  poor: number;
  good: number;
  excellent: number;
}

interface EmotionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: EmotionSettings) => void;
  currentSettings: EmotionSettings;
}

const EmotionSettingsModal: React.FC<EmotionSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings
}) => {
  const [settings, setSettings] = useState<EmotionSettings>(currentSettings);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    setSettings(currentSettings);
    setErrors({});
  }, [currentSettings]);

  const validateSettings = useCallback(() => {
    const newErrors: {[key: string]: string} = {};

    // Check if values are negative
    if (settings.veryPoor < 0) {
      newErrors.veryPoor = "Value cannot be negative";
    }
    if (settings.poor < 0) {
      newErrors.poor = "Value cannot be negative";
    }
    if (settings.good < 0) {
      newErrors.good = "Value cannot be negative";
    }

    // Check if thresholds are in ascending order
    if (settings.poor <= settings.veryPoor) {
      newErrors.poor = "Poor threshold must be greater than Very Poor";
    }
    if (settings.good <= settings.poor) {
      newErrors.good = "Good threshold must be greater than Poor";
    }

    // Check maximum limits
    const MAX_VALUE = 10000000;
    if (settings.veryPoor > MAX_VALUE) {
      newErrors.veryPoor = `Value cannot exceed ₱${MAX_VALUE.toLocaleString()}`;
    }
    if (settings.poor > MAX_VALUE) {
      newErrors.poor = `Value cannot exceed ₱${MAX_VALUE.toLocaleString()}`;
    }
    if (settings.good > MAX_VALUE) {
      newErrors.good = `Value cannot exceed ₱${MAX_VALUE.toLocaleString()}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [settings]);

  // Debounced validation effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateSettings();
    }, 800); // 0.8 second delay

    return () => clearTimeout(timeoutId);
  }, [settings, validateSettings]);

  const handleSave = () => {
    if (validateSettings()) {
      onSave(settings);
      onClose();
    }
  };

  const handleInputChange = (field: keyof EmotionSettings, value: string) => {
    const numValue = Number(value);
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }

    setSettings({ ...settings, [field]: numValue });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="emotion-modal">
        <div className="modal-header">
          <h3>Emotion Settings</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p>Set profit thresholds for different emotions:</p>
          <small className="helper-text">Values must be in ascending order and cannot be negative.</small>
          
          <div className="emotion-setting">
            <div className="emotion-setting-row">
              <label>😢 Very Poor (Below):</label>
              <div className="input-group">
                <span>₱</span>
                <input
                  type="number"
                  value={settings.veryPoor}
                  onChange={(e) => handleInputChange('veryPoor', e.target.value)}
                  placeholder="0"
                  min="0"
                  max="10000000"
                  className={errors.veryPoor ? 'input-error' : ''}
                />
              </div>
            </div>
            {errors.veryPoor && <span className="error-message">{errors.veryPoor}</span>}
          </div>

          <div className="emotion-setting">
            <div className="emotion-setting-row">
              <label>😐 Poor (₱{(settings.veryPoor + 1).toLocaleString()} - ):</label>
              <div className="input-group">
                <span>₱</span>
                <input
                  type="number"
                  value={settings.poor}
                  onChange={(e) => handleInputChange('poor', e.target.value)}
                  placeholder="10000"
                  min={settings.veryPoor + 1}
                  max="10000000"
                  className={errors.poor ? 'input-error' : ''}
                />
              </div>
            </div>
            {errors.poor && <span className="error-message">{errors.poor}</span>}
          </div>

          <div className="emotion-setting">
            <div className="emotion-setting-row">
              <label>😊 Good (₱{(settings.poor + 1).toLocaleString()} - ):</label>
              <div className="input-group">
                <span>₱</span>
                <input
                  type="number"
                  value={settings.good}
                  onChange={(e) => handleInputChange('good', e.target.value)}
                  placeholder="50000"
                  min={settings.poor + 1}
                  max="10000000"
                  className={errors.good ? 'input-error' : ''}
                />
              </div>
            </div>
            {errors.good && <span className="error-message">{errors.good}</span>}
          </div>

          <div className="emotion-setting">
            <label>🤑 Excellent (Above ₱{settings.good.toLocaleString()}):</label>
            <span className="threshold-info">No limit</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={Object.keys(errors).length > 0}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmotionSettingsModal;