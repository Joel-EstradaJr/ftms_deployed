'use client';

import React, { useState } from 'react';
import ModalHeader from '@/app/Components/ModalHeader';
import { showSuccess, showError } from '@/app/utils/Alerts';
import '@/app/styles/jev/validateBalance.css';
import '@/app/styles/components/modal2.css';
import '@/app/styles/components/forms.css';

interface ValidateBalanceModalProps {
  onClose: () => void;
  onValidate: () => void;
}

const ValidateBalanceModal: React.FC<ValidateBalanceModalProps> = ({ onClose, onValidate }) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);

  // Sample validation results (replace with API call)
  const sampleResults = {
    balanced: false,
    issues: [
      'Found 2 orphaned child accounts without valid parent',
      'Account code 1025 is duplicated',
      'Parent account 1020 balance (₱500,000) does not match sum of children (₱450,000)'
    ],
    orphaned_accounts: [
      { code: '1099', name: 'Temporary Account' },
      { code: '5099', name: 'Miscellaneous Expense' }
    ],
    duplicate_codes: ['1025'],
    balance_mismatches: [
      {
        account_code: '1020',
        account_name: 'Cash in Bank',
        expected: 450000,
        actual: 500000
      }
    ]
  };

  const handleValidate = async () => {
    setIsValidating(true);
    
    // Simulate API call
    setTimeout(() => {
      setValidationResults(sampleResults);
      setIsValidating(false);
      
      if (sampleResults.balanced) {
        showSuccess('All accounts are balanced and valid!', 'Validation Successful');
      } else {
        showError(`Found ${sampleResults.issues.length} issue(s) that need attention`, 'Validation Issues');
      }
    }, 1500);
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">Validate Accounts</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="modal-content">
        <div className="validation-info">
          <p>This validation will check for:</p>
          <ul>
            <li>Orphaned child accounts (without valid parent)</li>
            <li>Duplicate account codes</li>
            <li>Parent account balances matching sum of children</li>
            <li>Invalid account hierarchies</li>
          </ul>
        </div>

        {!validationResults && (
          <div className="validation-action">
            <button
              onClick={handleValidate}
              className="addButton"
              disabled={isValidating}
            >
              {isValidating ? (
                <>
                  <span className="loading-spinner"></span>
                  Validating...
                </>
              ) : (
                <>
                  <i className="ri-checkbox-circle-line"></i>
                  Run Validation
                </>
              )}
            </button>
          </div>
        )}

        {validationResults && (
          <div className="validation-results">
            <h3 className={validationResults.balanced ? 'success' : 'error'}>
              <i className={validationResults.balanced ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'}></i>
              {validationResults.balanced ? 'All Validated Successfully!' : 'Issues Found'}
            </h3>

            {validationResults.issues.length > 0 && (
              <div className="issues-section">
                <h4>Issues Detected:</h4>
                <ul>
                  {validationResults.issues.map((issue: string, idx: number) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationResults.orphaned_accounts && validationResults.orphaned_accounts.length > 0 && (
              <div className="detail-section">
                <h4>Orphaned Accounts:</h4>
                <table className="modal-table">
                  <thead className="modal-table-heading">
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                    </tr>
                  </thead>
                  <tbody className="modal-table-body">
                    {validationResults.orphaned_accounts.map((acc: any, idx: number) => (
                      <tr key={idx}>
                        <td>{acc.code}</td>
                        <td>{acc.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {validationResults.balance_mismatches && validationResults.balance_mismatches.length > 0 && (
              <div className="detail-section">
                <h4>Balance Mismatches:</h4>
                <table className="modal-table">
                  <thead className="modal-table-heading">
                    <tr>
                      <th>Account</th>
                      <th>Expected</th>
                      <th>Actual</th>
                      <th>Difference</th>
                    </tr>
                  </thead>
                  <tbody className="modal-table-body">
                    {validationResults.balance_mismatches.map((mismatch: any, idx: number) => (
                      <tr key={idx}>
                        <td>{mismatch.account_code} - {mismatch.account_name}</td>
                        <td>₱{mismatch.expected.toLocaleString()}</td>
                        <td>₱{mismatch.actual.toLocaleString()}</td>
                        <td className="error">₱{Math.abs(mismatch.expected - mismatch.actual).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button onClick={handleValidate} className="addButton" style={{ marginTop: '1rem' }}>
              <i className="ri-refresh-line"></i>
              Run Again
            </button>
          </div>
        )}

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default ValidateBalanceModal;
