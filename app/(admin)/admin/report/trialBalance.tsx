"use client";
import React, { useState, useMemo } from "react";
import FinancialPositionCharts from "./charts/FinancialPositionCharts";
import PaginationComponent from "../../../Components/pagination";

// Types for Financial Position / Trial Balance
export type FinancialPositionLine = {
  accountName: string;
  amount: number;
  // DEFERRED: Accumulated depreciation logic - commented out per configuration alignment
  // isAccumulatedDepreciation?: boolean;
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
  // REMOVED: Equity module - no equity logic in frontend per requirements
  // equity: FinancialPositionSection;
  // totalLiabilitiesAndEquity: number;
};

// Mock data for demonstration - aligned with seed_core_data.ts COA
export const mockFinancialPositionData: FinancialPositionData = {
  companyName: "Company Name", // TODO: Fetch from system_configuration.company_name
  reportTitle: "Statement of Financial Position",
  asOfDate: "As of December 31, 20xx",
  currentAssets: {
    title: "Current Assets",
    items: [
      { accountName: "Cash on Hand", amount: 100.00 },
      { accountName: "Bank Account", amount: 100.00 },
      { accountName: "E-Wallet", amount: 100.00 },
      { accountName: "AR - Bus Trip Boundary", amount: 100.00 },
      { accountName: "AR - Rental Revenue", amount: 100.00 },
    ],
    subtotal: 500.00,
  },
  nonCurrentAssets: {
    title: "Non-Current Assets",
    items: [
      // DEFERRED: Fixed Assets appreciation/depreciation - commented out per configuration
      // Fixed asset accounts would go here when implemented
      // { accountName: "Transportation Equipment", amount: 100.00 },
      // { accountName: "Accumulated Depreciation - TE", amount: -50.00, isAccumulatedDepreciation: true },
    ],
    subtotal: 0.00,
  },
  totalAssets: 500.00,
  currentLiabilities: {
    title: "Current Liabilities",
    items: [
      { accountName: "Accounts Payable - General", amount: 50.00 },
      { accountName: "AP - Operational Expenses", amount: 50.00 },
      { accountName: "AP - Personnel/Salaries", amount: 50.00 },
    ],
    subtotal: 150.00,
  },
  longTermLiabilities: {
    title: "Long-term Liabilities",
    items: [
      // Long-term liability accounts when applicable
    ],
    subtotal: 0.00,
  },
  totalLiabilities: 150.00,
  // REMOVED: Equity section - no equity logic in frontend per requirements
  // equity: { ... },
  // totalLiabilitiesAndEquity: 1050.00,
};

type FinancialPositionReportProps = {
  data?: FinancialPositionData;
  allData?: FinancialPositionData;
  paginatedItems?: any[];
  allItems?: any[];
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

const FinancialPositionReport: React.FC<FinancialPositionReportProps> = ({
  data = mockFinancialPositionData,
  allData,
  paginatedItems,
  allItems,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange
}) => {
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig || !paginatedItems) return data;

    // Create a copy of the data with sorted items
    const sortedItems = [...paginatedItems].sort((a, b) => {
      if (sortConfig.key === 'accountName') {
        return sortConfig.direction === 'asc'
          ? a.accountName.localeCompare(b.accountName)
          : b.accountName.localeCompare(a.accountName);
      }
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      return 0;
    });

    // Reconstruct data structure with sorted items
    const reconstructed: FinancialPositionData = {
      ...data,
      currentAssets: { ...data.currentAssets, items: sortedItems.filter(i => i.section === 'currentAssets') },
      nonCurrentAssets: { ...data.nonCurrentAssets, items: sortedItems.filter(i => i.section === 'nonCurrentAssets') },
      currentLiabilities: { ...data.currentLiabilities, items: sortedItems.filter(i => i.section === 'currentLiabilities') },
      longTermLiabilities: { ...data.longTermLiabilities, items: sortedItems.filter(i => i.section === 'longTermLiabilities') },
      // REMOVED: Equity section - no equity logic in frontend per requirements
      // equity: { ...data.equity, items: sortedItems.filter(i => i.section === 'equity') }
    };

    return reconstructed;
  }, [data, paginatedItems, sortConfig]);
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
        // DEFERRED: Accumulated depreciation styling - commented out per configuration
        // Original: className={`line-item ${item.isAccumulatedDepreciation ? 'contra-account' : ''}`}
        <tr key={`${section.title}-${index}`} className="line-item">
          <td className="account-name indent-1">{item.accountName}</td>
          {/* DEFERRED: Accumulated depreciation negative styling */}
          <td className="amount-col">
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
            <thead>
              <tr>
                <th 
                  onClick={() => handleSort('accountName')} 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Account Name {sortConfig?.key === 'accountName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('amount')} 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Amount {sortConfig?.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {/* ASSETS Section */}
              <tr className="major-section-header">
                <td className="major-section-title" colSpan={3}>ASSETS</td>
              </tr>

              {/* Current Assets */}
              {renderSection(sortedData.currentAssets)}

              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={3}></td></tr>

              {/* Non-Current Assets */}
              {renderSection(sortedData.nonCurrentAssets)}

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

              {/* LIABILITIES Section - EQUITY REMOVED per requirements */}
              <tr className="major-section-header">
                <td className="major-section-title" colSpan={3}>LIABILITIES</td>
              </tr>

              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={3}></td></tr>

              {/* Current Liabilities */}
              {renderSection(sortedData.currentLiabilities)}

              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={3}></td></tr>

              {/* Long-term Liabilities */}
              {renderSection(sortedData.longTermLiabilities)}

              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={3}></td></tr>

              {/* REMOVED: Equity Section - no equity logic in frontend per requirements */}
              {/* {renderSection(sortedData.equity)} */}

              {/* Total Liabilities - EQUITY REMOVED */}
              <tr className="total-row">
                <td className="total-label">TOTAL LIABILITIES</td>
                <td></td>
                <td className="total-amount">{formatCurrency(data.totalLiabilities)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Check - EQUITY REMOVED, now compares Assets vs Liabilities only */}
      <div className="balance-check">
        <span className="balanced">
          ✓ Total Assets: ₱{formatCurrency(data.totalAssets)} | Total Liabilities: ₱{formatCurrency(data.totalLiabilities)}
        </span>
        {/* REMOVED: Equity balance check - no equity logic in frontend per requirements */}
        {/* Original balance check compared totalAssets === totalLiabilitiesAndEquity */}
      </div>

      {/* Pagination - Above Visual Data Analysis */}
      {totalPages && onPageChange && onPageSizeChange && (
        <PaginationComponent
          currentPage={currentPage || 1}
          totalPages={totalPages}
          pageSize={pageSize || 10}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}

      {/* Visual Data Charts - Uses all data, not paginated */}
      <FinancialPositionCharts data={allData || data} />
    </div>
  );
};

export default FinancialPositionReport;
