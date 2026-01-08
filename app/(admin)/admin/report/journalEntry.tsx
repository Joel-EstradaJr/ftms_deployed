"use client";
import React from "react";
import JournalEntryCharts from "./charts/JournalEntryCharts";

// Types for Journal Entry
export type JournalEntryLine = {
  date: string;
  scenario: string;
  accountCode: string;
  accountName: string;
  debit: number | null;
  credit: number | null;
};

export type JournalTransaction = {
  id: string;
  lines: JournalEntryLine[];
  remarks: string;
};

type JournalEntryReportProps = {
  transactions: JournalTransaction[];
  dateFrom?: string;
  dateTo?: string;
};

// Mock data for demonstration
export const mockJournalTransactions: JournalTransaction[] = [
  {
    id: "TXN-001",
    lines: [
      { date: "Jan 15", scenario: "Boundary Trip - Normal", accountCode: "1010", accountName: "Cash on Hand", debit: 7000.00, credit: null },
      { date: "", scenario: "", accountCode: "5010", accountName: "Fuel Expense", debit: 2000.00, credit: null },
      { date: "", scenario: "", accountCode: "5045", accountName: "Driver - Conductor Boundary Share Expense", debit: 3000.00, credit: null },
      { date: "", scenario: "", accountCode: "4010", accountName: "Trip Revenue - Boundary", debit: null, credit: 12000.00 },
    ],
    remarks: "Boundary trip completed successfully with revenue of ₱12,000. Driver and conductor remitted the full ₱7,000 quota plus fuel reimbursement. Company records ₱12,000 revenue, recognizes ₱2,000 fuel expense and ₱3,000 driver/conductor commission. Net cash received: ₱7,000."
  },
  {
    id: "TXN-002",
    lines: [
      { date: "Jan 16", scenario: "Boundary Trip - Underperformance", accountCode: "1010", accountName: "Cash on Hand", debit: 6000.00, credit: null },
      { date: "", scenario: "", accountCode: "5010", accountName: "Fuel Expense", debit: 2000.00, credit: null },
      { date: "", scenario: "", accountCode: "5045", accountName: "Driver - Conductor Boundary Share Expense", debit: 3000.00, credit: null },
      { date: "", scenario: "", accountCode: "1120", accountName: "Accounts Receivable - Employees", debit: 1000.00, credit: null },
      { date: "", scenario: "", accountCode: "4010", accountName: "Trip Revenue - Boundary", debit: null, credit: 12000.00 },
    ],
    remarks: ""
  },
  {
    id: "TXN-003",
    lines: [
      { date: "Jan 16", scenario: "Convert deficit to loans", accountCode: "1120", accountName: "Accounts Receivable - Employees (Driver)", debit: 500.00, credit: null },
      { date: "", scenario: "", accountCode: "1120", accountName: "Accounts Receivable - Employees (Conductor)", debit: 500.00, credit: null },
      { date: "", scenario: "", accountCode: "1120", accountName: "Accounts Receivable - Employees", debit: null, credit: 1000.00 },
    ],
    remarks: "Boundary trip underperformed with actual revenue of ₱8,000 vs expected ₱12,000. Driver remitted ₱6,000 available cash (₱8k earned - ₱2k fuel). Company still records full ₱12,000 revenue per boundary agreement, creating ₱1,000 receivable deficit (₱7k quota - ₱6k received). System automatically creates two loan accounts of ₱500 each for driver and conductor to track repayment."
  },
];

const JournalEntryReport: React.FC<JournalEntryReportProps> = ({ 
  transactions = mockJournalTransactions,
  dateFrom,
  dateTo 
}) => {
  // Calculate totals
  const totals = transactions.reduce(
    (acc, txn) => {
      txn.lines.forEach((line) => {
        acc.debit += line.debit || 0;
        acc.credit += line.credit || 0;
      });
      return acc;
    },
    { debit: 0, credit: 0 }
  );

  // Format currency
  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === 0) return "";
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="journal-entry-report">
      {/* Report Header */}
      <div className="report-header">
        <h2>JOURNAL ENTRY REPORT</h2>
        {dateFrom && dateTo && (
          <p className="report-date-range">
            Period: {dateFrom} to {dateTo}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <div className="tableContainer">
          <table className="journal-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Scenario</th>
                <th>Account Code</th>
                <th>Account Name</th>
                <th className="amount-col">Debit (₱)</th>
                <th className="amount-col">Credit (₱)</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, txnIndex) => (
                <React.Fragment key={transaction.id}>
                  {/* Transaction Header Row */}
                  <tr className="transaction-header-row">
                    <td colSpan={6} className="transaction-title">
                      Transaction {txnIndex + 1}: {transaction.lines[0]?.scenario || "Journal Entry"}
                    </td>
                  </tr>
                  
                  {/* Transaction Lines */}
                  {transaction.lines.map((line, lineIndex) => (
                    <tr key={`${transaction.id}-${lineIndex}`} className="journal-line">
                      <td>{line.date}</td>
                      <td>{line.scenario}</td>
                      <td>{line.accountCode}</td>
                      <td className={line.credit ? "account-name-credit" : ""}>{line.accountName}</td>
                      <td className="amount-col">{formatCurrency(line.debit)}</td>
                      <td className="amount-col">{formatCurrency(line.credit)}</td>
                    </tr>
                  ))}
                  
                  {/* Remarks Row */}
                  {transaction.remarks && (
                    <tr className="remarks-row">
                      <td colSpan={6}>
                        <div className="remarks-content">
                          <strong>Remarks:</strong> {transaction.remarks}
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {/* Spacer Row between transactions */}
                  {txnIndex < transactions.length - 1 && (
                    <tr className="spacer-row">
                      <td colSpan={6}></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {/* Total Row */}
              <tr className="total-row">
                <td colSpan={4} className="total-label">TOTAL</td>
                <td className="amount-col total-amount">{formatCurrency(totals.debit)}</td>
                <td className="amount-col total-amount">{formatCurrency(totals.credit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Check */}
      <div className="balance-check">
        {totals.debit === totals.credit ? (
          <span className="balanced">✓ Balanced (Debit = Credit)</span>
        ) : (
          <span className="unbalanced">⚠ Unbalanced: Difference of ₱{formatCurrency(Math.abs(totals.debit - totals.credit))}</span>
        )}
      </div>

      {/* Visual Data Charts */}
      <JournalEntryCharts transactions={transactions} />
    </div>
  );
};

export default JournalEntryReport;
