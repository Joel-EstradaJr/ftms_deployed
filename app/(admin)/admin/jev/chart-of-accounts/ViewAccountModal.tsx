'use client';

import React, { useEffect, useState } from 'react';
import { AccountType, NormalBalance } from '@/app/types/jev';
import { formatDate } from '@/app/utils/formatting';
import { getAccountTypeClass, getNormalBalance } from '@/app/lib/jev/accountHelpers';
import { fetchChartOfAccountDetailById, ExtendedChartOfAccount } from '@/app/services/chartOfAccountsService';
import '@/app/styles/components/forms.css';
import '@/app/styles/components/chips.css';

interface ViewAccountModalProps {
  accountId: string;
  onClose: () => void;
}

const ViewAccountModal: React.FC<ViewAccountModalProps> = ({ accountId, onClose }) => {
  const [account, setAccount] = useState<ExtendedChartOfAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch account details on mount
  useEffect(() => {
    const loadAccount = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchChartOfAccountDetailById(accountId);
        
        if (!data) {
          setError('Account not found');
        } else {
          setAccount(data);
        }
      } catch (err) {
        console.error('Error loading account:', err);
        setError('Failed to load account details');
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, [accountId]);
  
  // Get status badge based on is_active field
  const getStatusBadge = () => {
    if (!account) return null;
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
    if (!account) return null;
    const chipClass = getAccountTypeClass(account.account_type);
    return <span className={`chip ${chipClass}`}>{formatAccountType(account.account_type)}</span>;
  };

  // Format normal balance for display
  const formatNormalBalance = (): string => {
    if (!account) return '';
    if (account.normal_balance) {
      return account.normal_balance;
    }
    // Derive from account type if not explicitly set
    const derivedBalance = getNormalBalance(account.account_type);
    return derivedBalance;
  };

  // Show loading state
  if (loading) {
    return (
      <>
        <div className="modal-heading">
          <h1 className="modal-title">View Account Details</h1>
          <button className="close-modal-btn view" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="modal-content view" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading account details...</p>
        </div>
      </>
    );
  }

  // Show error state
  if (error || !account) {
    return (
      <>
        <div className="modal-heading">
          <h1 className="modal-title">View Account Details</h1>
          <button className="close-modal-btn view" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="modal-content view" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#e74c3c' }}>{error || 'Account not found'}</p>
          <button
            type="button"
            className="submit-btn"
            onClick={onClose}
            style={{ backgroundColor: '#6c757d', marginTop: '1rem' }}
          >
            <i className="ri-close-line" /> Close
          </button>
        </div>
      </>
    );
  }

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
