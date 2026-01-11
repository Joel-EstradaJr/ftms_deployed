"use client";
import React, { useState, useMemo } from "react";
import "../../../styles/report/report.css";
import "../../../styles/report/financial-reports.css";
import "../../../styles/components/table.css";
import JournalEntryReport, { mockJournalTransactions, JournalTransaction } from './journalEntry';
import IncomeStatementReport, { mockIncomeStatementData, IncomeStatementData } from './incomeStatement';
import FinancialPositionReport, { mockFinancialPositionData, FinancialPositionData } from './trialBalance';
import ErrorDisplay from '../../../Components/errordisplay';
import Loading from '../../../Components/loading';
import FilterDropdown, { FilterSection } from '../../../Components/filter';
import ExportButton from '../../../Components/ExportButton';

const ReportPage = () => {
  const [activeTab, setActiveTab] = useState<'journal' | 'income' | 'position'>('journal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Data states for each report
  const [journalData] = useState<JournalTransaction[]>(mockJournalTransactions);
  const [incomeStatementData] = useState<IncomeStatementData>(mockIncomeStatementData);
  const [financialPositionData] = useState<FinancialPositionData>(mockFinancialPositionData);

  // Filter state
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // Pagination state for Journal Entry
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Pagination state for Income Statement
  const [incomeCurrentPage, setIncomeCurrentPage] = useState(1);
  const [incomePageSize, setIncomePageSize] = useState(10);

  // Pagination state for Financial Position
  const [positionCurrentPage, setPositionCurrentPage] = useState(1);
  const [positionPageSize, setPositionPageSize] = useState(10);

  // Filter sections configuration
  const filterSections: FilterSection[] = useMemo(() => [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange'
    },
    {
      id: 'scenario',
      title: 'Scenario',
      type: 'checkbox',
      options: [
        { id: 'boundary-normal', label: 'Boundary Trip - Normal' },
        { id: 'boundary-under', label: 'Boundary Trip - Underperformance' },
        { id: 'convert-deficit', label: 'Convert deficit to loans' }
      ]
    },
    {
      id: 'accountType',
      title: 'Account Type',
      type: 'checkbox',
      options: [
        { id: 'cash', label: 'Cash Accounts' },
        { id: 'expense', label: 'Expenses' },
        { id: 'revenue', label: 'Revenue' },
        { id: 'receivable', label: 'Receivables' }
      ]
    },
    {
      id: 'amountRange',
      title: 'Amount Range (₱)',
      type: 'numberRange'
    }
  ], []);

  // Apply filters to journal data
  const filteredJournalData = useMemo(() => {
    let filtered = [...journalData];

    // Filter by date range
    if (activeFilters.dateRange?.from || activeFilters.dateRange?.to) {
      filtered = filtered.filter(txn => {
        const txnDate = txn.lines[0]?.date;
        if (!txnDate) return true;
        // Simple date comparison (would need proper date parsing in production)
        return true; // Placeholder - dates in mock data are like "Jan 15"
      });
    }

    // Filter by scenario
    if (activeFilters.scenario?.length > 0) {
      filtered = filtered.filter(txn => {
        const scenario = txn.lines[0]?.scenario?.toLowerCase() || '';
        return activeFilters.scenario.some((s: string) => {
          if (s === 'boundary-normal') return scenario.includes('normal');
          if (s === 'boundary-under') return scenario.includes('underperformance');
          if (s === 'convert-deficit') return scenario.includes('convert') || scenario.includes('deficit');
          return false;
        });
      });
    }

    // Filter by account type
    if (activeFilters.accountType?.length > 0) {
      filtered = filtered.filter(txn => {
        return txn.lines.some(line => {
          const accountName = line.accountName.toLowerCase();
          const accountCode = line.accountCode;
          return activeFilters.accountType.some((type: string) => {
            if (type === 'cash') return accountName.includes('cash') || accountCode.startsWith('10');
            if (type === 'expense') return accountName.includes('expense') || accountCode.startsWith('50');
            if (type === 'revenue') return accountName.includes('revenue') || accountCode.startsWith('40');
            if (type === 'receivable') return accountName.includes('receivable') || accountCode.startsWith('11');
            return false;
          });
        });
      });
    }

    // Filter by amount range
    if (activeFilters.amountRange?.min || activeFilters.amountRange?.max) {
      const min = parseFloat(activeFilters.amountRange.min) || 0;
      const max = parseFloat(activeFilters.amountRange.max) || Infinity;
      filtered = filtered.filter(txn => {
        return txn.lines.some(line => {
          const amount = line.debit || line.credit || 0;
          return amount >= min && amount <= max;
        });
      });
    }

    return filtered;
  }, [journalData, activeFilters]);

  // Paginated data
  const paginatedJournalData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredJournalData.slice(startIndex, startIndex + pageSize);
  }, [filteredJournalData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredJournalData.length / pageSize);

  // Flatten Income Statement data for pagination
  const flattenedIncomeData = useMemo(() => {
    const items: any[] = [];
    
    // Revenue items
    incomeStatementData.revenue.items.forEach(item => {
      items.push({ ...item, section: 'revenue' });
    });
    
    // Cost of Service items
    incomeStatementData.costOfService.items.forEach(item => {
      items.push({ ...item, section: 'costOfService' });
    });
    
    // Operating Expenses items
    incomeStatementData.operatingExpenses.items.forEach(item => {
      items.push({ ...item, section: 'operatingExpenses' });
    });
    
    // Other Income items
    incomeStatementData.otherIncome.items.forEach(item => {
      items.push({ ...item, section: 'otherIncome' });
    });
    
    return items;
  }, [incomeStatementData]);

  const paginatedIncomeData = useMemo(() => {
    const startIndex = (incomeCurrentPage - 1) * incomePageSize;
    return flattenedIncomeData.slice(startIndex, startIndex + incomePageSize);
  }, [flattenedIncomeData, incomeCurrentPage, incomePageSize]);

  const incomeTotalPages = Math.ceil(flattenedIncomeData.length / incomePageSize);

  // Flatten Financial Position data for pagination
  const flattenedPositionData = useMemo(() => {
    const items: any[] = [];
    
    // Current Assets
    financialPositionData.currentAssets.items.forEach(item => {
      items.push({ ...item, section: 'currentAssets' });
    });
    
    // Non-Current Assets
    financialPositionData.nonCurrentAssets.items.forEach(item => {
      items.push({ ...item, section: 'nonCurrentAssets' });
    });
    
    // Current Liabilities
    financialPositionData.currentLiabilities.items.forEach(item => {
      items.push({ ...item, section: 'currentLiabilities' });
    });
    
    // Long-term Liabilities
    financialPositionData.longTermLiabilities.items.forEach(item => {
      items.push({ ...item, section: 'longTermLiabilities' });
    });
    
    // Equity
    financialPositionData.equity.items.forEach(item => {
      items.push({ ...item, section: 'equity' });
    });
    
    return items;
  }, [financialPositionData]);

  const paginatedPositionData = useMemo(() => {
    const startIndex = (positionCurrentPage - 1) * positionPageSize;
    return flattenedPositionData.slice(startIndex, startIndex + positionPageSize);
  }, [flattenedPositionData, positionCurrentPage, positionPageSize]);

  const positionTotalPages = Math.ceil(flattenedPositionData.length / positionPageSize);

  // Handle filter changes
  const handleFilterApply = (filters: Record<string, any>) => {
    setActiveFilters(filters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Export data configuration
  const getExportData = () => {
    if (activeTab === 'journal') {
      const flatData: any[] = [];
      filteredJournalData.forEach((txn, index) => {
        txn.lines.forEach(line => {
          flatData.push({
            transaction: `TXN-${index + 1}`,
            date: line.date || '',
            scenario: line.scenario || '',
            accountCode: line.accountCode,
            accountName: line.accountName,
            debit: line.debit || '',
            credit: line.credit || ''
          });
        });
      });
      return flatData;
    }

    if (activeTab === 'income') {
      const data = incomeStatementData;
      const flatData: any[] = [];

      // Revenue
      data.revenue.items.forEach(item => {
        flatData.push({
          category: 'Revenue',
          account: item.accountName,
          amount: item.amount,
          subtotal: ''
        });
      });
      flatData.push({ category: 'Revenue', account: 'Total Revenue', amount: '', subtotal: data.revenue.subtotal });

      // Cost of Service
      data.costOfService.items.forEach(item => {
        flatData.push({
          category: 'Cost of Service',
          account: item.accountName,
          amount: item.amount,
          subtotal: ''
        });
      });
      flatData.push({ category: 'Cost of Service', account: 'Total Cost of Service', amount: '', subtotal: data.costOfService.subtotal });

      flatData.push({ category: 'Summary', account: 'Gross Profit', amount: '', subtotal: data.grossProfit });

      // Operating Expenses
      data.operatingExpenses.items.forEach(item => {
        flatData.push({
          category: 'Operating Expenses',
          account: item.accountName,
          amount: item.amount,
          subtotal: ''
        });
      });
      flatData.push({ category: 'Operating Expenses', account: 'Total Operating Expenses', amount: '', subtotal: data.operatingExpenses.subtotal });

      flatData.push({ category: 'Summary', account: 'Net Income', amount: '', subtotal: data.netIncome });

      return flatData;
    }

    if (activeTab === 'position') {
      const data = financialPositionData;
      const flatData: any[] = [];

      // Current Assets
      data.currentAssets.items.forEach(item => {
        flatData.push({
          category: 'Current Assets',
          account: item.accountName,
          amount: item.amount,
          total: ''
        });
      });
      flatData.push({ category: 'Current Assets', account: 'Total Current Assets', amount: '', total: data.currentAssets.subtotal });

      // Non-Current Assets
      data.nonCurrentAssets.items.forEach(item => {
        flatData.push({
          category: 'Non-Current Assets',
          account: item.accountName,
          amount: item.amount,
          total: ''
        });
      });
      flatData.push({ category: 'Non-Current Assets', account: 'Total Non-Current Assets', amount: '', total: data.nonCurrentAssets.subtotal });

      flatData.push({ category: 'Assets', account: 'Total Assets', amount: '', total: data.totalAssets });

      return flatData;
    }

    return [];
  };

  const getExportColumns = () => {
    if (activeTab === 'journal') {
      return [
        { header: 'Transaction', key: 'transaction' },
        { header: 'Date', key: 'date' },
        { header: 'Scenario', key: 'scenario' },
        { header: 'Account Code', key: 'accountCode' },
        { header: 'Account Name', key: 'accountName' },
        { header: 'Debit (₱)', key: 'debit' },
        { header: 'Credit (₱)', key: 'credit' }
      ];
    }

    if (activeTab === 'income') {
      return [
        { header: 'Category', key: 'category' },
        { header: 'Account', key: 'account' },
        { header: 'Amount (₱)', key: 'amount' },
        { header: 'Subtotal (₱)', key: 'subtotal' }
      ];
    }

    if (activeTab === 'position') {
      return [
        { header: 'Category', key: 'category' },
        { header: 'Account', key: 'account' },
        { header: 'Amount (₱)', key: 'amount' },
        { header: 'Total (₱)', key: 'total' }
      ];
    }

    return [];
  };

  const getExportTitle = () => {
    const titles = {
      journal: 'Journal Entry Report',
      income: 'Income Statement',
      position: 'Statement of Financial Position'
    };
    return titles[activeTab];
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
            <div></div>
            <FilterDropdown
              sections={filterSections}
              onApply={handleFilterApply}
              initialValues={activeFilters}
            />
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
              <div className="report-info-bar">
                <span className="transaction-count">
                  Showing {paginatedJournalData.length} of {filteredJournalData.length} transactions
                  {Object.values(activeFilters).some(v =>
                    (Array.isArray(v) && v.length > 0) ||
                    (typeof v === 'object' && v !== null && (v.from || v.to || v.min || v.max)) ||
                    (typeof v === 'string' && v)
                  ) && (
                      <span className="active-filters-badge">
                        Filters Active
                      </span>
                    )}
                </span>

                <ExportButton
                  data={getExportData()}
                  filename={`journal_report_${new Date().toISOString().split('T')[0]}`}
                  columns={getExportColumns()}
                  title="Journal Entry Report"
                />
              </div>

              <JournalEntryReport
                transactions={paginatedJournalData}
                allTransactions={filteredJournalData}
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}

          {/* ============ Income Statement Report Tab ============ */}
          {activeTab === 'income' && (
            <div className="reportTabContent">
              <div className="report-info-bar" style={{ justifyContent: 'flex-end' }}>
                <ExportButton
                  data={getExportData()}
                  filename={`income_statement_${new Date().toISOString().split('T')[0]}`}
                  columns={getExportColumns()}
                  title="Income Statement Report"
                />
              </div>
              <IncomeStatementReport 
                data={incomeStatementData}
                paginatedItems={paginatedIncomeData}
                allItems={flattenedIncomeData}
                currentPage={incomeCurrentPage}
                totalPages={incomeTotalPages}
                pageSize={incomePageSize}
                onPageChange={setIncomeCurrentPage}
                onPageSizeChange={(size) => {
                  setIncomePageSize(size);
                  setIncomeCurrentPage(1);
                }}
              />
            </div>
          )}

          {/* ============ Financial Position Report Tab ============ */}
          {activeTab === 'position' && (
            <div className="reportTabContent">
              <div className="report-info-bar" style={{ justifyContent: 'flex-end' }}>
                <ExportButton
                  data={getExportData()}
                  filename={`financial_position_${new Date().toISOString().split('T')[0]}`}
                  columns={getExportColumns()}
                  title="Financial Position Report"
                />
              </div>
              <FinancialPositionReport 
                data={financialPositionData}
                paginatedItems={paginatedPositionData}
                allItems={flattenedPositionData}
                currentPage={positionCurrentPage}
                totalPages={positionTotalPages}
                pageSize={positionPageSize}
                onPageChange={setPositionCurrentPage}
                onPageSizeChange={(size) => {
                  setPositionPageSize(size);
                  setPositionCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportPage;
