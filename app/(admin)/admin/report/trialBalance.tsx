"use client";
import React from "react";

// Types for Financial Position / Trial Balance
export type FinancialPositionLine = {
  accountName: string;
  amount: number;
  isAccumulatedDepreciation?: boolean;
};

export type FinancialPositionSection = {
  title: string;
  items: FinancialPositionLine[];
  subtotal: number;
};

export type FinancialPositionData = {
  companyName: string;
  reportTitle: string;
  asOfDate: string;
  // Assets
  currentAssets: FinancialPositionSection;
  nonCurrentAssets: FinancialPositionSection;
  totalAssets: number;
  // Liabilities
  currentLiabilities: FinancialPositionSection;
  longTermLiabilities: FinancialPositionSection;
  totalLiabilities: number;
  // Equity
  equity: FinancialPositionSection;
  totalLiabilitiesAndEquity: number;
};

// Mock data for demonstration
export const mockFinancialPositionData: FinancialPositionData = {
  companyName: "Hilltop Tours Inc.",
  reportTitle: "Statement of Financial Position",
  asOfDate: "As of December 31, 20xx",
  currentAssets: {
    title: "Current Assets",
    items: [
      { accountName: "Cash on Hand and In Bank", amount: 100.00 },
      { accountName: "Spareparts Inventory", amount: 100.00 },
      { accountName: "Diesel Inventory", amount: 100.00 },
      { accountName: "Tires, Batteries & Lubricants Inventory", amount: 100.00 },
      { accountName: "Prepaid Expenses", amount: 100.00 },
      { accountName: "Supplies on Hand", amount: 100.00 },
    ],
    subtotal: 600.00,
  },
  nonCurrentAssets: {
    title: "Non-Current Assets",
    items: [
      { accountName: "Franchise", amount: 100.00 },
      { accountName: "Land", amount: 100.00 },
      { accountName: "Transportation Equipment", amount: 100.00 },
      { accountName: "Accumulated Depreciation - TE", amount: -50.00, isAccumulatedDepreciation: true },
      { accountName: "Building / PUB Garage", amount: 100.00 },
      { accountName: "Accumulated Depreciation - Building", amount: -50.00, isAccumulatedDepreciation: true },
      { accountName: "Overhead Tank & Diesel Pump", amount: 100.00 },
      { accountName: "Accumulated Depreciation - Tank & Diesel Pump", amount: -50.00, isAccumulatedDepreciation: true },
      { accountName: "Miscellaneous Assets", amount: 100.00 },
    ],
    subtotal: 450.00,
  },
  totalAssets: 1050.00,
  currentLiabilities: {
    title: "Current Liabilities",
    items: [
      { accountName: "Accounts Payable - Trade", amount: 10.00 },
      { accountName: "SSS & Philhealth Payable", amount: 10.00 },
      { accountName: "Income Tax Payable", amount: 10.00 },
      { accountName: "Accrued Interest Payable", amount: 10.00 },
      { accountName: "Accrued Expenses Payable", amount: 10.00 },
    ],
    subtotal: 50.00,
  },
  longTermLiabilities: {
    title: "Long-term Liabilities",
    items: [
      { accountName: "Notes Payable - Officers", amount: 150.00 },
      { accountName: "Advances from Officers", amount: 50.00 },
    ],
    subtotal: 200.00,
  },
  totalLiabilities: 250.00,
  equity: {
    title: "Equity",
    items: [
      { accountName: "Paid Up Capital", amount: 500.00 },
      { accountName: "Deposit for Capital Stock Subscription", amount: 200.00 },
      { accountName: "Retained Earnings", amount: 100.00 },
    ],
    subtotal: 800.00,
  },
  totalLiabilitiesAndEquity: 1050.00,
};

type FinancialPositionReportProps = {
  data?: FinancialPositionData;
};

const FinancialPositionReport: React.FC<FinancialPositionReportProps> = ({ 
  data = mockFinancialPositionData 
}) => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    const isNegative = amount < 0;
    const formatted = new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    
    return isNegative ? `(${formatted})` : formatted;
  };

  const renderSection = (section: FinancialPositionSection, showSubtotalLabel: boolean = true) => (
    <>
      <tr className="section-header-row">
        <td className="section-title">{section.title}</td>
        <td></td>
        <td></td>
      </tr>
      {section.items.map((item, index) => (
        <tr key={`${section.title}-${index}`} className={`line-item ${item.isAccumulatedDepreciation ? 'contra-account' : ''}`}>
          <td className="account-name indent-1">{item.accountName}</td>
          <td className={`amount-col ${item.isAccumulatedDepreciation ? 'negative' : ''}`}>
            {formatCurrency(item.amount)}
          </td>
          <td></td>
        </tr>
      ))}
      <tr className="subtotal-row">
        <td className="subtotal-label">{showSubtotalLabel ? `Total ${section.title}` : ''}</td>
        <td></td>
        <td className="subtotal-amount">{formatCurrency(section.subtotal)}</td>
      </tr>
    </>
  );

  return (
    <div className="financial-position-report">
      {/* Report Header */}
      <div className="financial-report-header">
        <h2 className="company-name">{data.companyName}</h2>
        <h3 className="report-title">{data.reportTitle}</h3>
        <p className="period-ending">{data.asOfDate}</p>
      </div>

      {/* Financial Position Table */}
      <div className="table-wrapper financial-statement-wrapper">
        <div className="tableContainer">
          <table className="financial-statement-table balance-sheet-table">
            <tbody>
              {/* ASSETS Section */}
              <tr className="major-section-header">
                <td className="major-section-title" colSpan={3}>ASSETS</td>
              </tr>
              
              {/* Current Assets */}
              {renderSection(data.currentAssets)}
              
              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={3}></td></tr>
              
              {/* Non-Current Assets */}
              {renderSection(data.nonCurrentAssets)}
              
              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={3}></td></tr>
              
              {/* Total Assets */}
              <tr className="total-row">
                <td className="total-label">TOTAL ASSETS</td>
                <td></td>
                <td className="total-amount">{formatCurrency(data.totalAssets)}</td>
              </tr>

              {/* Empty Row - Separator */}
              <tr className="section-separator"><td colSpan={3}></td></tr>
              <tr className="empty-row"><td colSpan={3}></td></tr>

              {/* LIABILITIES AND EQUITY Section */}
              <tr className="major-section-header">
                <td className="major-section-title" colSpan={3}>LIABILITIES AND EQUITY</td>
              </tr>

              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={3}></td></tr>

              {/* Current Liabilities */}
              {renderSection(data.currentLiabilities)}

              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={3}></td></tr>

              {/* Long-term Liabilities */}
              {renderSection(data.longTermLiabilities)}

              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={3}></td></tr>

              {/* Equity */}
              {renderSection(data.equity)}

              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={3}></td></tr>

              {/* Total Liabilities and Equity */}
              <tr className="total-row">
                <td className="total-label">TOTAL LIABILITIES AND EQUITY</td>
                <td></td>
                <td className="total-amount">{formatCurrency(data.totalLiabilitiesAndEquity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Check */}
      <div className="balance-check">
        {data.totalAssets === data.totalLiabilitiesAndEquity ? (
          <span className="balanced">✓ Balanced (Assets = Liabilities + Equity)</span>
        ) : (
          <span className="unbalanced">
            ⚠ Unbalanced: Difference of ₱{formatCurrency(Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity))}
          </span>
        )}
      </div>
    </div>
  );
};

export default FinancialPositionReport;
