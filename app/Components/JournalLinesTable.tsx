'use client';

import React from 'react';
import SearchableDropdown, { DropdownOption } from './SearchableDropdown';

export interface JournalLine {
  line_id?: number | string;
  account_id: string | null;
  line_description: string;
  debit_amount: number;
  credit_amount: number;
}

export interface ChartOfAccount {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normal_balance: 'DEBIT' | 'CREDIT';
  is_active: boolean;
}

interface LineErrors {
  account_id?: string;
  line_description?: string;
  debit_amount?: string;
  credit_amount?: string;
}

interface JournalLinesTableProps {
  lines: JournalLine[];
  accounts: ChartOfAccount[];
  onChange: (index: number, field: keyof JournalLine, value: string | number | null) => void;
  onBlur: (index: number, field: keyof JournalLine) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  errors: { [lineIndex: number]: LineErrors };
  readonly?: boolean;
  changedLineIndices?: Set<number>;
}

const JournalLinesTable: React.FC<JournalLinesTableProps> = ({
  lines,
  accounts,
  onChange,
  onBlur,
  onAddLine,
  onRemoveLine,
  errors,
  readonly = false,
  changedLineIndices = new Set(),
}) => {
  // Convert accounts to dropdown options
  const accountOptions: DropdownOption[] = accounts
    .filter((acc) => acc.is_active)
    .map((acc) => ({
      value: acc.account_id,
      label: `${acc.account_code} - ${acc.account_name}`,
      description: `${acc.account_type} (${acc.normal_balance})`,
    }));

  // Calculate totals
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;

  // Format money for display
  const formatMoney = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Get account name by ID
  const getAccountLabel = (accountId: string | null): string => {
    if (!accountId) return '—';
    const account = accounts.find((acc) => acc.account_id === accountId);
    return account ? `${account.account_code} - ${account.account_name}` : '—';
  };

  // Get account normal balance
  const getAccountNormalBalance = (accountId: string | null): 'DEBIT' | 'CREDIT' | null => {
    if (!accountId) return null;
    const account = accounts.find((acc) => acc.account_id === accountId);
    return account?.normal_balance || null;
  };

  // Handle debit input change
  const handleDebitChange = (index: number, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue)) return;

    // Clear credit if entering debit
    if (numValue > 0) {
      onChange(index, 'credit_amount', 0);
    }
    onChange(index, 'debit_amount', numValue);
  };

  // Handle credit input change
  const handleCreditChange = (index: number, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue)) return;

    // Clear debit if entering credit
    if (numValue > 0) {
      onChange(index, 'debit_amount', 0);
    }
    onChange(index, 'credit_amount', numValue);
  };

  return (
    <div>
      <div className="journal-lines-wrapper">
        <table className="journal-lines-table">
          <thead>
            <tr>
              <th>#</th>
              <th className="account-header">Account</th>
              <th className="amount-header">Debit</th>
              <th className="amount-header">Credit</th>
              {!readonly && <th className="actions-header">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={readonly ? 4 : 5} style={{ textAlign: 'center', padding: '20px' }}>
                  No journal lines added yet. Click "Add Line" to start.
                </td>
              </tr>
            ) : (
              lines.map((line, index) => (
                <tr
                  key={index}
                  className={changedLineIndices.has(index) ? 'line-changed' : ''}
                >
                  <td>{index + 1}</td>
                  <td className="account-cell">
                    {readonly ? (
                      <span>{getAccountLabel(line.account_id)}</span>
                    ) : (
                      <div>
                        <SearchableDropdown
                          options={accountOptions}
                          value={line.account_id || ''}
                          onChange={(value) => onChange(index, 'account_id', value as string)}
                          onBlur={() => onBlur(index, 'account_id')}
                          placeholder="Select account..."
                        />
                        {errors[index]?.account_id && (
                          <div className="error-message">{errors[index].account_id}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="amount-cell">
                    {readonly ? (
                      <span>{line.debit_amount > 0 ? formatMoney(line.debit_amount) : '—'}</span>
                    ) : (
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit_amount || ''}
                          onChange={(e) => handleDebitChange(index, e.target.value)}
                          onBlur={() => onBlur(index, 'debit_amount')}
                          placeholder="0.00"
                          disabled={line.credit_amount > 0 || getAccountNormalBalance(line.account_id) === 'CREDIT'}
                        />
                        {errors[index]?.debit_amount && (
                          <div className="error-message">{errors[index].debit_amount}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="amount-cell">
                    {readonly ? (
                      <span>{line.credit_amount > 0 ? formatMoney(line.credit_amount) : '—'}</span>
                    ) : (
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit_amount || ''}
                          onChange={(e) => handleCreditChange(index, e.target.value)}
                          onBlur={() => onBlur(index, 'credit_amount')}
                          placeholder="0.00"
                          disabled={line.debit_amount > 0 || getAccountNormalBalance(line.account_id) === 'DEBIT'}
                        />
                        {errors[index]?.credit_amount && (
                          <div className="error-message">{errors[index].credit_amount}</div>
                        )}
                      </div>
                    )}
                  </td>
                  {!readonly && (
                    <td className="actions-cell">
                      <button
                        type="button"
                        className="line-action-btn"
                        onClick={() => onRemoveLine(index)}
                        disabled={lines.length === 1}
                        title="Remove line"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>
                Totals:
              </td>
              <td className="amount-cell">{formatMoney(totalDebit)}</td>
              <td className="amount-cell">{formatMoney(totalCredit)}</td>
              {!readonly && <td></td>}
            </tr>
            <tr className={`balance-row ${isBalanced ? 'balanced' : 'unbalanced'}`}>
              <td colSpan={readonly ? 4 : 5} style={{ textAlign: 'center', padding: '12px' }}>
                <i className={isBalanced ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}></i>
                {isBalanced ? (
                  <span>Entry is balanced</span>
                ) : (
                  <span>
                    Entry is unbalanced by {formatMoney(difference)}
                    {totalDebit > totalCredit ? ' (Debit exceeds Credit)' : ' (Credit exceeds Debit)'}
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!readonly && (
        <button type="button" className="add-line-btn" onClick={onAddLine}>
          <i className="ri-add-line"></i>
          Add Line
        </button>
      )}
    </div>
  );
};

export default JournalLinesTable;
