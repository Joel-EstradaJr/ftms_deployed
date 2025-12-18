'use client';

import React from 'react';
import { formatDate } from '@/app/utils/formatting';
import { ChartOfAccount } from '@/app/types/jev';
import { getAccountStatusInfo, getNormalBalance } from '@/app/lib/jev/accountHelpers';
import '@/app/styles/components/forms.css';
import '@/app/styles/components/modal.css';

interface ViewAccountModalProps {
  account: ChartOfAccount;
  onClose: () => void;
}

const ViewAccountModal: React.FC<ViewAccountModalProps> = ({ account, onClose }) => {
  const statusInfo = getAccountStatusInfo(account);

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">Account Details</h1>
        <button className="close-modal-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Account Header Section */}
      <div style={{ padding: '20px', backgroundColor: 'var(--table-header-color)', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-text-color)', margin: 0 }}>
              {account.account_code}
            </h2>
            <span className={`chip ${statusInfo.chipClass}`}>
              {statusInfo.label}
            </span>
            {account.is_system_account && (
              <span className="chip Draft">System Account</span>
            )}
          </div>
          <h3 style={{ fontSize: '18px', color: 'var(--secondary-text-color)', margin: 0 }}>
            {account.account_name}
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--secondary-text-color)', marginBottom: '5px' }}>
            Account Type
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-text-color)' }}>
            {account.account_type}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--secondary-text-color)', marginTop: '5px' }}>
            Normal Balance: <strong>{getNormalBalance(account.account_type)}</strong>
          </div>
        </div>
      </div>

      {/* Display Fields */}
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Account Code</label>
              <p>{account.account_code}</p>
            </div>
            <div className="form-group">
              <label>Account Name</label>
              <p>{account.account_name}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Account Type</label>
              <p>{account.account_type}</p>
            </div>
            <div className="form-group">
              <label>Normal Balance</label>
              <p>{getNormalBalance(account.account_type)}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label>Description</label>
              <p>{account.description || '-'}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <p>
                {account.is_active ? (
                  <span className="chip active">Active</span>
                ) : (
                  <span className="chip closed">Archived</span>
                )}
              </p>
            </div>
            <div className="form-group">
              <label>No. of linked entries</label>
              <p>{account.journal_entry_lines?.length || 0}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Created By</label>
              <p>{account.created_by || '-'}</p>
            </div>
            <div className="form-group">
              <label>Created At</label>
              <p>{account.created_at ? formatDate(account.created_at) : '-'}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Last Updated By</label>
              <p>{account.updated_by || '-'}</p>
            </div>
            <div className="form-group">
              <label>Last Updated At</label>
              <p>{account.updated_at ? formatDate(account.updated_at) : '-'}</p>
            </div>
          </div>

          {!account.is_active && (
            <div className="form-row">
              <div className="form-group">
                <label>Archived By</label>
                <p>{account.deleted_by || '-'}</p>
              </div>
              <div className="form-group">
                <label>Archived At</label>
                <p>{account.deleted_at ? formatDate(account.deleted_at) : '-'}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Action Buttons */
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

export default ViewAccountModal;
