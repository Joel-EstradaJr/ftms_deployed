"use client";
import React, { useState } from "react";
import "../../../styles/report/report.css";
import "../../../styles/report/financial-reports.css";
import "../../../styles/components/table.css";
import JournalEntryReport, { mockJournalTransactions, JournalTransaction } from './journalEntry';
import IncomeStatementReport, { mockIncomeStatementData, IncomeStatementData } from './incomeStatement';
import FinancialPositionReport, { mockFinancialPositionData, FinancialPositionData } from './trialBalance';
import ErrorDisplay from '../../../Components/errordisplay';
import { formatDate } from '../../../utils/formatting';
import Loading from '../../../Components/loading';
import Swal from 'sweetalert2';

const ReportPage = () => {
  const [dateFilter, setDateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState<'journal' | 'income' | 'position'>('journal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);
  
  // Data states for each report
  const [journalData, setJournalData] = useState<JournalTransaction[]>(mockJournalTransactions);
  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementData>(mockIncomeStatementData);
  const [financialPositionData, setFinancialPositionData] = useState<FinancialPositionData>(mockFinancialPositionData);

  // Export handler
  const handleExportData = async () => {
    const reportNames = {
      journal: 'Journal Entry Report',
      income: 'Income Statement Report',
      position: 'Financial Position Report'
    };

    const result = await Swal.fire({
      title: `Export ${reportNames[activeTab]}`,
      html: `
        <div style="text-align: left; padding: 1rem;">
          <p><strong>Report Type:</strong> ${reportNames[activeTab]}</p>
          <p><strong>Date Range:</strong> ${dateFrom ? formatDate(dateFrom) : 'All'} to ${dateTo ? formatDate(dateTo) : 'Present'}</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#13CE66',
      cancelButtonColor: '#961C1E',
      confirmButtonText: 'Export CSV',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        let csvContent = '';
        const fileName = `${activeTab}_report_${formatDate(new Date()).replace(/\//g, '-')}.csv`;

        if (activeTab === 'journal') {
          csvContent = exportJournalEntry();
        } else if (activeTab === 'income') {
          csvContent = exportIncomeStatement();
        } else {
          csvContent = exportFinancialPosition();
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        Swal.fire({
          title: 'Success!',
          text: 'Report exported successfully',
          icon: 'success',
          confirmButtonColor: '#13CE66'
        });
      } catch (error) {
        console.error('Export error:', error);
        Swal.fire({
          title: 'Export Failed',
          text: 'Failed to export data',
          icon: 'error',
          confirmButtonColor: '#961C1E'
        });
      }
    }
  };

  // Export functions for each report type
  const exportJournalEntry = (): string => {
    const rows = [
      ['JOURNAL ENTRY REPORT'],
      [`Generated: ${formatDate(new Date())}`],
      [''],
      ['Date', 'Scenario', 'Account Code', 'Account Name', 'Debit (₱)', 'Credit (₱)'],
    ];

    journalData.forEach((txn, index) => {
      rows.push([`Transaction ${index + 1}: ${txn.lines[0]?.scenario || 'Journal Entry'}`, '', '', '', '', '']);
      txn.lines.forEach(line => {
        rows.push([
          line.date,
          line.scenario,
          line.accountCode,
          line.accountName,
          line.debit?.toFixed(2) || '',
          line.credit?.toFixed(2) || ''
        ]);
      });
      if (txn.remarks) {
        rows.push([`Remarks: ${txn.remarks}`, '', '', '', '', '']);
      }
      rows.push(['', '', '', '', '', '']);
    });

    const totals = journalData.reduce(
      (acc, txn) => {
        txn.lines.forEach((line) => {
          acc.debit += line.debit || 0;
          acc.credit += line.credit || 0;
        });
        return acc;
      },
      { debit: 0, credit: 0 }
    );

    rows.push(['', '', '', 'TOTAL', totals.debit.toFixed(2), totals.credit.toFixed(2)]);

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const exportIncomeStatement = (): string => {
    const data = incomeStatementData;
    const rows = [
      [data.companyName],
      [data.reportTitle],
      [data.periodEnding],
      [''],
      ['Account', 'Amount (₱)', 'Subtotal (₱)'],
      ['TOTAL REVENUE', '', ''],
    ];

    data.revenue.items.forEach((item, i) => {
      rows.push([
        `  ${item.accountName}`,
        item.amount.toFixed(2),
        i === data.revenue.items.length - 1 ? (data.revenue.subtotal || 0).toFixed(2) : ''
      ]);
    });

    rows.push(['LESS: COST OF SERVICE', '', '']);
    data.costOfService.items.forEach((item, i) => {
      rows.push([
        `  ${item.accountName}`,
        item.amount.toFixed(2),
        i === data.costOfService.items.length - 1 ? `(${(data.costOfService.subtotal || 0).toFixed(2)})` : ''
      ]);
    });

    rows.push(['GROSS PROFIT', '', data.grossProfit.toFixed(2)]);
    rows.push(['LESS: OPERATING EXPENSES', '', '']);
    data.operatingExpenses.items.forEach((item, i) => {
      rows.push([
        `  ${item.accountName}`,
        item.amount.toFixed(2),
        i === data.operatingExpenses.items.length - 1 ? `(${(data.operatingExpenses.subtotal || 0).toFixed(2)})` : ''
      ]);
    });

    rows.push(['NET OPERATING INCOME', '', data.netOperatingIncome.toFixed(2)]);
    rows.push(['OTHER INCOME', '', '']);
    data.otherIncome.items.forEach(item => {
      rows.push([`  ${item.accountName}`, '', item.amount.toFixed(2)]);
    });

    rows.push(['NET INCOME BEFORE INCOME TAX', '', data.netIncomeBeforeTax.toFixed(2)]);
    rows.push(['Provision for Income Tax', '', data.incomeTaxProvision.toFixed(2)]);
    rows.push(['NET INCOME', '', data.netIncome.toFixed(2)]);

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const exportFinancialPosition = (): string => {
    const data = financialPositionData;
    const rows = [
      [data.companyName],
      [data.reportTitle],
      [data.asOfDate],
      [''],
      ['Account', 'Amount (₱)', 'Total (₱)'],
      ['ASSETS', '', ''],
      ['Current Assets', '', ''],
    ];

    data.currentAssets.items.forEach(item => {
      rows.push([`  ${item.accountName}`, item.amount.toFixed(2), '']);
    });
    rows.push(['Total Current Assets', '', data.currentAssets.subtotal.toFixed(2)]);

    rows.push(['Non-Current Assets', '', '']);
    data.nonCurrentAssets.items.forEach(item => {
      const amt = item.amount < 0 ? `(${Math.abs(item.amount).toFixed(2)})` : item.amount.toFixed(2);
      rows.push([`  ${item.accountName}`, amt, '']);
    });
    rows.push(['Total Non-Current Assets', '', data.nonCurrentAssets.subtotal.toFixed(2)]);
    rows.push(['TOTAL ASSETS', '', data.totalAssets.toFixed(2)]);

    rows.push(['', '', '']);
    rows.push(['LIABILITIES AND EQUITY', '', '']);
    rows.push(['Current Liabilities', '', '']);
    data.currentLiabilities.items.forEach(item => {
      rows.push([`  ${item.accountName}`, item.amount.toFixed(2), '']);
    });
    rows.push(['Total Current Liabilities', '', data.currentLiabilities.subtotal.toFixed(2)]);

    rows.push(['Long-term Liabilities', '', '']);
    data.longTermLiabilities.items.forEach(item => {
      rows.push([`  ${item.accountName}`, item.amount.toFixed(2), '']);
    });
    rows.push(['Total Long-term Liabilities', '', data.longTermLiabilities.subtotal.toFixed(2)]);

    rows.push(['Equity', '', '']);
    data.equity.items.forEach(item => {
      rows.push([`  ${item.accountName}`, item.amount.toFixed(2), '']);
    });
    rows.push(['Total Equity', '', data.equity.subtotal.toFixed(2)]);
    rows.push(['TOTAL LIABILITIES AND EQUITY', '', data.totalLiabilitiesAndEquity.toFixed(2)]);

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  // Get tab class for sliding indicator
  const getTabClass = () => {
    switch (activeTab) {
      case 'journal': return 'tab-1';
      case 'income': return 'tab-2';
      case 'position': return 'tab-3';
      default: return 'tab-1';
    }
  };

  if (errorCode) {
    return (
      <div className="card">
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={async () => {
            setError(null);
            setErrorCode(null);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Financial Reports</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className='card'>
      <div className='elements'>
        <h1 className='title'>Financial Reports</h1>
        
        {/* CONTAINER FOR THE SETTINGS */}
        <div className="settings">
          <div className="filterDate">
            <div className="filter">
              <label htmlFor="dateFilter">Filter By:</label>
              <select
                value={dateFilter}
                id="dateFilter"
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value !== 'Custom') {
                    setDateFrom('');
                    setDateTo('');
                  }
                }}
              >
                <option value="">All</option>
                <option value="Day">Today</option>
                <option value="Month">This Month</option>
                <option value="Year">This Year</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {dateFilter === "Custom" && (
              <div className="dateRangePicker">
                <div className="date">
                  <label htmlFor="startDate">Start Date:</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="date">
                  <label htmlFor="endDate">End Date:</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <button id="exportData" onClick={handleExportData}>
            <i className="ri-file-download-line" />
            Export Data
          </button>
        </div>

        {/* TAB BAR - 3 Financial Reports */}
        <div className="tabBar-wrapper">
          <div className={`tabBar ${getTabClass()}`}>
            <button
              className={activeTab === 'journal' ? 'active' : ''}
              onClick={() => setActiveTab('journal')}
            >
              Journal Entry
            </button>

            <button
              className={activeTab === 'income' ? 'active' : ''}
              onClick={() => setActiveTab('income')}
            >
              Income Statement
            </button>

            <button
              className={activeTab === 'position' ? 'active' : ''}
              onClick={() => setActiveTab('position')}
            >
              Financial Position
            </button>
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="tabContent">
          {/* ============ Journal Entry Report Tab ============ */}
          {activeTab === 'journal' && (
            <div className="reportTabContent">
              <JournalEntryReport 
                transactions={journalData}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            </div>
          )}

          {/* ============ Income Statement Report Tab ============ */}
          {activeTab === 'income' && (
            <div className="reportTabContent">
              <IncomeStatementReport data={incomeStatementData} />
            </div>
          )}

          {/* ============ Financial Position Report Tab ============ */}
          {activeTab === 'position' && (
            <div className="reportTabContent">
              <FinancialPositionReport data={financialPositionData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportPage;
