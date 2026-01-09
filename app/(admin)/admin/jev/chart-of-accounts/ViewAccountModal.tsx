'use client';

import React from 'react';
import { ChartOfAccount, AccountType, NormalBalance } from '@/app/types/jev';
import { formatDate } from '@/app/utils/formatting';
import { getAccountTypeClass, getNormalBalance } from '@/app/lib/jev/accountHelpers';
import '@/app/styles/components/forms.css';
import '@/app/styles/components/chips.css';

// Extended interface to include audit fields
interface ExtendedChartOfAccount extends ChartOfAccount {
  created_by?: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
  deleted_by?: string;
  deleted_at?: string;
  journal_entry_lines_count?: number; // Number of linked journal entry lines
}

interface ViewAccountModalProps {
  account: ExtendedChartOfAccount;
  onClose: () => void;
}

const ViewAccountModal: React.FC<ViewAccountModalProps> = ({ account, onClose }) => {
  
  // Get status badge based on is_active field
  const getStatusBadge = () => {
    if (account.is_active) {
      return <span className="chip completed">Active</span>;
    }
    return <span className="chip rejected">Archived</span>;
  };

  // Format account type for display
  const formatAccountType = (type: AccountType): string => {
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  // Get account type chip
  const getAccountTypeChip = () => {
    const chipClass = getAccountTypeClass(account.account_type);
    return <span className={`chip ${chipClass}`}>{formatAccountType(account.account_type)}</span>;
  };

  // Format normal balance for display
  const formatNormalBalance = (): string => {
    if (account.normal_balance) {
      return account.normal_balance;
    }
    // Derive from account type if not explicitly set
    const derivedBalance = getNormalBalance(account.account_type);
    return derivedBalance;
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">View Account Details</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>

        <button className="close-modal-btn view" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            {/* Account Code */}
            <div className="form-group">
              <label>Account Code</label>
              <p>{account.account_code}</p>
            </div>

            {/* Account Type */}
            <div className="form-group">
              <label>Account Type</label>
              <p className='chip-container'><span>{getAccountTypeChip()}</span></p>
            </div>

            {/* Status */}
            <div className="form-group">
              <label>Status</label>
              <p className='chip-container'><span>{getStatusBadge()}</span></p>
            </div>
          </div>
        </form>
      </div>

      {/* I. Account Information */}
      <p className="details-title">I. Account Information</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            {/* Account Name */}
            <div className="form-group">
              <label>Account Name</label>
              <p>{account.account_name}</p>
            </div>

            {/* Normal Balance */}
            <div className="form-group">
              <label>Normal Balance</label>
              <p>{formatNormalBalance()}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Description */}
            <div className="form-group" style={{ flex: 1 }}>
              <label>Description</label>
              <p>{account.description || 'N/A'}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Usage Information */}
      <p className="details-title">II. Usage Information</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            {/* Number of Linked Entries */}
            <div className="form-group">
              <label>No. of Linked Entries</label>
              <p>{account.journal_entry_lines_count ?? 0}</p>
            </div>
          </div>
        </form>
      </div>

      {/* III. Audit Trail */}
      <p className="details-title">III. Audit Trail</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            {/* Created By */}
            <div className="form-group">
              <label>Created By</label>
              <p>{account.created_by || 'N/A'}</p>
            </div>

            {/* Created At */}
            <div className="form-group">
              <label>Created At</label>
              <p>{account.created_at ? formatDate(account.created_at) : 'N/A'}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Last Updated By */}
            <div className="form-group">
              <label>Last Updated By</label>
              <p>{account.updated_by || 'N/A'}</p>
            </div>

            {/* Last Updated At */}
            <div className="form-group">
              <label>Last Updated At</label>
              <p>{account.updated_at ? formatDate(account.updated_at) : 'N/A'}</p>
            </div>
          </div>

          {/* Archive Information (if archived) */}
          {!account.is_active && (account.deleted_by || account.deleted_at) && (
            <div className="form-row">
              {/* Archived By */}
              <div className="form-group">
                <label>Archived By</label>
                <p>{account.deleted_by || 'N/A'}</p>
              </div>

              {/* Archived At */}
              <div className="form-group">
                <label>Archived At</label>
                <p>{account.deleted_at ? formatDate(account.deleted_at) : 'N/A'}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Close Button */}
      <div className="modal-actions">
        <button
          type="button"
          className="submit-btn"
          onClick={onClose}
          style={{ backgroundColor: '#6c757d' }}
        >
          <i className="ri-close-line" /> Close
        </button>
      </div>
    </>
  );
};

export default ViewAccountModal;
