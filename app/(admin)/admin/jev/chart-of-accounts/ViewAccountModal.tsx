'use client';

import React from 'react';
import { formatDate, formatMoney } from '@/app/utils/formatting';
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

  // Sample recent transactions for display (replace with API call)
  const recentTransactions = [
    {
      journal_number: 'JE-2024-10-0001',
      transaction_date: '2024-10-14',
      description: 'Revenue collection - Bus 101',
      debit: 15000.00,
      credit: 0,
      balance: 165000.00
    },
    {
      journal_number: 'JE-2024-10-0002',
      transaction_date: '2024-10-13',
      description: 'Fuel purchase',
      debit: 0,
      credit: 5000.00,
      balance: 150000.00
    },
    {
      journal_number: 'JE-2024-10-0003',
      transaction_date: '2024-10-12',
      description: 'Payroll disbursement',
      debit: 0,
      credit: 45000.00,
      balance: 155000.00
    }
  ];

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

      {/* I. Account Information */}
      <p className="details-title">I. Account Information</p>
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

          {account.parent_account_id && (
            <div className="form-row">
              <div className="form-group full-width">
                <label>Parent Account</label>
                <p>{account.parent_account_code} - {account.parent_account_name}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* II. Status Information */}
      <p className="details-title">II. Status Information</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Account Status</label>
              <p>
                {account.is_active ? (
                  <span className="chip active">Active</span>
                ) : (
                  <span className="chip closed">Archived</span>
                )}
              </p>
            </div>
            <div className="form-group">
              <label>System Account</label>
              <p>
                {account.is_system_account ? (
                  <span className="chip Draft">Yes</span>
                ) : (
                  <span className="chip">No</span>
                )}
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* III. Additional Information */}
      {(account.description || account.notes) && (
        <>
          <p className="details-title">III. Additional Information</p>
          <div className="modal-content view">
            <form className="view-form">
              {account.description && (
                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Description</label>
                    <p>{account.description}</p>
                  </div>
                </div>
              )}
              {account.notes && (
                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Internal Notes</label>
                    <p>{account.notes}</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </>
      )}

      {/* IV. Recent Transactions - TODO: Implement when journal entries are ready */}
      {false && (
        <>
          <p className="details-title">IV. Recent Transactions</p>
          <div className="modal-content view">
            <table className="modal-table">
              <thead className="modal-table-heading">
                <tr>
                  <th>Journal Entry</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody className="modal-table-body">
                {recentTransactions.map((txn, index) => (
                  <tr key={index}>
                    <td><strong>{txn.journal_number}</strong></td>
                    <td>{formatDate(txn.transaction_date)}</td>
                    <td>{txn.description}</td>
                    <td style={{ color: txn.debit > 0 ? 'var(--success-chip-text-color)' : 'var(--secondary-text-color)' }}>
                      {txn.debit > 0 ? formatMoney(txn.debit) : '-'}
                    </td>
                    <td style={{ color: txn.credit > 0 ? 'var(--error-chip-text-color)' : 'var(--secondary-text-color)' }}>
                      {txn.credit > 0 ? formatMoney(txn.credit) : '-'}
                    </td>
                    <td><strong>{formatMoney(txn.balance)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
};

export default ViewAccountModal;
