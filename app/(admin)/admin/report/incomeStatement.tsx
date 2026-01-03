"use client";
import React from "react";

// Types for Income Statement
export type IncomeStatementLine = {
  accountName: string;
  amount: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
};

export type IncomeStatementSection = {
  title: string;
  items: IncomeStatementLine[];
  subtotal?: number;
  isNegative?: boolean;
};

export type IncomeStatementData = {
  companyName: string;
  reportTitle: string;
  periodEnding: string;
  revenue: IncomeStatementSection;
  costOfService: IncomeStatementSection;
  grossProfit: number;
  operatingExpenses: IncomeStatementSection;
  netOperatingIncome: number;
  otherIncome: IncomeStatementSection;
  netIncomeBeforeTax: number;
  incomeTaxProvision: number;
  netIncome: number;
};

// Mock data for demonstration
export const mockIncomeStatementData: IncomeStatementData = {
  companyName: "Hilltop Tours Inc.",
  reportTitle: "Income Statement",
  periodEnding: "For the Year Ended December 31, 20xx",
  revenue: {
    title: "TOTAL REVENUE",
    items: [
      { accountName: "Trip Revenue - Boundary", amount: 10000.00 },
      { accountName: "Trip Revenue - Percentage", amount: 100.00 },
      { accountName: "Rental Revenue", amount: 100.00 },
    ],
    subtotal: 10200.00,
  },
  costOfService: {
    title: "LESS: COST OF SERVICE",
    items: [
      { accountName: "Salaries and Wages", amount: 100.00 },
      { accountName: "SSS, Philhealth & Pag-Ibig Contributions", amount: 100.00 },
      { accountName: "Taxes and Licenses", amount: 100.00 },
      { accountName: "Electricity and Water", amount: 100.00 },
      { accountName: "Communication", amount: 100.00 },
      { accountName: "Fuel and Oil", amount: 100.00 },
      { accountName: "Insurance Expense", amount: 100.00 },
      { accountName: "Repairs and Maintenance", amount: 100.00 },
    ],
    subtotal: 800.00,
    isNegative: true,
  },
  grossProfit: 9400.00,
  operatingExpenses: {
    title: "LESS: OPERATING EXPENSES",
    items: [
      { accountName: "Salaries and Wages - Office", amount: 100.00 },
      { accountName: "SSS, Philhealth & Pag-Ibig Contributions - Office", amount: 100.00 },
      { accountName: "Taxes and Licenses - Office", amount: 100.00 },
      { accountName: "Electricity and Water - Office", amount: 100.00 },
      { accountName: "Communication - Office", amount: 100.00 },
      { accountName: "Fuel and Oil - Office", amount: 100.00 },
      { accountName: "Professional and Legal Fees - Office", amount: 100.00 },
      { accountName: "Transportation - Office", amount: 100.00 },
      { accountName: "Representation Expense - Office", amount: 100.00 },
      { accountName: "Insurance Expense - Office", amount: 100.00 },
      { accountName: "Repairs and Maintenance - Office", amount: 100.00 },
      { accountName: "Office Supplies", amount: 100.00 },
    ],
    subtotal: 1200.00,
    isNegative: true,
  },
  netOperatingIncome: 8200.00,
  otherIncome: {
    title: "OTHER INCOME",
    items: [
      { accountName: "Interest Income", amount: 100.00 },
    ],
    subtotal: 100.00,
  },
  netIncomeBeforeTax: 8300.00,
  incomeTaxProvision: 1660.00,
  netIncome: 6640.00,
};

type IncomeStatementReportProps = {
  data?: IncomeStatementData;
};

const IncomeStatementReport: React.FC<IncomeStatementReportProps> = ({ 
  data = mockIncomeStatementData 
}) => {
  // Format currency
  const formatCurrency = (amount: number, showParentheses: boolean = false): string => {
    const formatted = new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    
    if (showParentheses && amount < 0) {
      return `(${formatted})`;
    }
    return showParentheses && amount !== 0 ? `(${formatted})` : formatted;
  };

  return (
    <div className="income-statement-report">
      {/* Report Header */}
      <div className="financial-report-header">
        <h2 className="company-name">{data.companyName}</h2>
        <h3 className="report-title">{data.reportTitle}</h3>
        <p className="period-ending">{data.periodEnding}</p>
      </div>

      {/* Income Statement Table */}
      <div className="table-wrapper financial-statement-wrapper">
        <div className="tableContainer">
          <table className="financial-statement-table">
            <tbody>
              {/* Revenue Section */}
              <tr className="section-header-row">
                <td className="section-title" colSpan={2}>{data.revenue.title}</td>
                <td></td>
              </tr>
              {data.revenue.items.map((item, index) => (
                <tr key={`revenue-${index}`} className="line-item">
                  <td className="indent-1"></td>
                  <td className="account-name">{item.accountName}</td>
                  <td className="amount-col">{formatCurrency(item.amount)}</td>
                  <td className="subtotal-col">
                    {index === data.revenue.items.length - 1 && (
                      <span>{formatCurrency(data.revenue.subtotal || 0)}</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={4}></td></tr>

              {/* Cost of Service Section */}
              <tr className="section-header-row">
                <td className="section-title" colSpan={2}>{data.costOfService.title}</td>
                <td></td>
              </tr>
              {data.costOfService.items.map((item, index) => (
                <tr key={`cos-${index}`} className="line-item">
                  <td className="indent-1"></td>
                  <td className="account-name">{item.accountName}</td>
                  <td className="amount-col">{formatCurrency(item.amount)}</td>
                  <td className="subtotal-col">
                    {index === data.costOfService.items.length - 1 && (
                      <span className="negative">{formatCurrency(data.costOfService.subtotal || 0, true)}</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Gross Profit */}
              <tr className="subtotal-row">
                <td colSpan={2} className="subtotal-label">GROSS PROFIT</td>
                <td></td>
                <td className="subtotal-amount">{formatCurrency(data.grossProfit)}</td>
              </tr>

              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={4}></td></tr>

              {/* Operating Expenses Section */}
              <tr className="section-header-row">
                <td className="section-title" colSpan={2}>{data.operatingExpenses.title}</td>
                <td></td>
              </tr>
              {data.operatingExpenses.items.map((item, index) => (
                <tr key={`opex-${index}`} className="line-item">
                  <td className="indent-1"></td>
                  <td className="account-name">{item.accountName}</td>
                  <td className="amount-col">{formatCurrency(item.amount)}</td>
                  <td className="subtotal-col">
                    {index === data.operatingExpenses.items.length - 1 && (
                      <span className="negative">{formatCurrency(data.operatingExpenses.subtotal || 0, true)}</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Net Operating Income */}
              <tr className="subtotal-row">
                <td colSpan={2} className="subtotal-label">NET OPERATING INCOME</td>
                <td></td>
                <td className="subtotal-amount">{formatCurrency(data.netOperatingIncome)}</td>
              </tr>

              {/* Empty Row */}
              <tr className="empty-row"><td colSpan={4}></td></tr>

              {/* Other Income Section */}
              <tr className="section-header-row">
                <td className="section-title" colSpan={2}>{data.otherIncome.title}</td>
                <td></td>
              </tr>
              {data.otherIncome.items.map((item, index) => (
                <tr key={`other-${index}`} className="line-item">
                  <td className="indent-1"></td>
                  <td className="account-name">{item.accountName}</td>
                  <td></td>
                  <td className="amount-col">{formatCurrency(item.amount)}</td>
                </tr>
              ))}

              {/* Net Income Before Tax */}
              <tr className="subtotal-row">
                <td colSpan={2} className="subtotal-label">NET INCOME BEFORE INCOME TAX</td>
                <td></td>
                <td className="subtotal-amount">{formatCurrency(data.netIncomeBeforeTax)}</td>
              </tr>

              {/* Income Tax Provision */}
              <tr className="line-item">
                <td colSpan={2} className="account-name">Provision for Income Tax</td>
                <td></td>
                <td className="amount-col">{formatCurrency(data.incomeTaxProvision)}</td>
              </tr>

              {/* Net Income */}
              <tr className="total-row net-income-row">
                <td colSpan={2} className="total-label">NET INCOME</td>
                <td></td>
                <td className="total-amount">{formatCurrency(data.netIncome)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IncomeStatementReport;
