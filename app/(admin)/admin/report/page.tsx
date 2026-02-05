"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import "../../../styles/report/report.css";
import "../../../styles/report/financial-reports.css";
import "../../../styles/components/table.css";
import JournalEntryReport from './journalEntry';
import IncomeStatementReport from './incomeStatement';
import FinancialPositionReport from './trialBalance';
import ErrorDisplay from '../../../Components/errordisplay';
import Loading from '../../../Components/loading';
import FilterDropdown, { FilterSection } from '../../../Components/filter';
import ExportButton from '../../../Components/ExportButton';
import { 
  reportService, 
  JournalTransaction, 
  IncomeStatementData, 
  FinancialPositionData,
  defaultIncomeStatementData,
  defaultFinancialPositionData,
} from '../../../services/reportService';

const ReportPage = () => {
  const [activeTab, setActiveTab] = useState<'journal' | 'income' | 'position'>('journal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Data states for each report
  const [journalData, setJournalData] = useState<JournalTransaction[]>([]);
  const [journalTotal, setJournalTotal] = useState(0);
  const [journalSummary, setJournalSummary] = useState({ totalDebit: 0, totalCredit: 0, transactionCount: 0 });
  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementData>(defaultIncomeStatementData);
  const [financialPositionData, setFinancialPositionData] = useState<FinancialPositionData>(defaultFinancialPositionData);

  // Scenario options from backend
  const [scenarioOptions, setScenarioOptions] = useState<string[]>([]);

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

  // Fetch scenario options on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const response = await reportService.getScenarioOptions();
        if (response.success && response.data) {
          setScenarioOptions(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch scenario options:', err);
      }
    };
    fetchScenarios();
  }, []);

  // Fetch Journal Entry data
  const fetchJournalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any = {
        page: currentPage,
        limit: pageSize,
      };

      if (activeFilters.dateRange?.from) {
        filters.dateFrom = activeFilters.dateRange.from;
      }
      if (activeFilters.dateRange?.to) {
        filters.dateTo = activeFilters.dateRange.to;
      }
      if (activeFilters.scenario?.length > 0) {
        filters.scenario = activeFilters.scenario;
      }
      if (activeFilters.accountType?.length > 0) {
        filters.accountType = activeFilters.accountType;
      }
      if (activeFilters.amountRange?.min) {
        filters.amountMin = parseFloat(activeFilters.amountRange.min);
      }
      if (activeFilters.amountRange?.max) {
        filters.amountMax = parseFloat(activeFilters.amountRange.max);
      }

      const response = await reportService.getJournalEntryReport(filters);
      
      if (response.success && response.data) {
        setJournalData(response.data.transactions);
        setJournalTotal(response.data.pagination.total);
        setJournalSummary(response.data.summary);
      }
    } catch (err: any) {
      console.error('Failed to fetch journal data:', err);
      setError(err.message || 'Failed to fetch journal entries');
      setErrorCode(500);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, activeFilters]);

  // Fetch Income Statement data
  const fetchIncomeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateFrom = activeFilters.dateRange?.from;
      const dateTo = activeFilters.dateRange?.to;

      const response = await reportService.getIncomeStatementReport(dateFrom, dateTo);
      
      if (response.success && response.data) {
        setIncomeStatementData(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch income statement:', err);
      setError(err.message || 'Failed to fetch income statement');
      setErrorCode(500);
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  // Fetch Financial Position data
  const fetchPositionData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const asOfDate = activeFilters.dateRange?.to;

      const response = await reportService.getFinancialPositionReport(asOfDate);
      
      if (response.success && response.data) {
        setFinancialPositionData(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch financial position:', err);
      setError(err.message || 'Failed to fetch financial position');
      setErrorCode(500);
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'journal') {
      fetchJournalData();
    } else if (activeTab === 'income') {
      fetchIncomeData();
    } else if (activeTab === 'position') {
      fetchPositionData();
    }
  }, [activeTab, fetchJournalData, fetchIncomeData, fetchPositionData]);

  // Filter sections configuration - use dynamic scenarios from backend
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
      options: scenarioOptions.map(s => ({ id: s, label: s }))
    },
    {
      id: 'accountType',
      title: 'Account Type',
      type: 'checkbox',
      options: [
        { id: 'asset', label: 'Assets' },
        { id: 'liability', label: 'Liabilities' },
        { id: 'revenue', label: 'Revenue' },
        { id: 'expense', label: 'Expenses' },
        { id: 'cash', label: 'Cash Accounts' },
        { id: 'receivable', label: 'Receivables' }
      ]
    },
    {
      id: 'amountRange',
      title: 'Amount Range (₱)',
      type: 'numberRange'
    }
  ], [scenarioOptions]);

  // Calculate total pages for Journal (now using API pagination)
  const totalPages = Math.ceil(journalTotal / pageSize);

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

  // Flatten Financial Position data for pagination - EQUITY REMOVED per requirements
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
    
    // REMOVED: Equity section - no equity logic in frontend per requirements
    // financialPositionData.equity.items.forEach(item => {
    //   items.push({ ...item, section: 'equity' });
    // });
    
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
    setCurrentPage(1);
    setIncomeCurrentPage(1);
    setPositionCurrentPage(1);
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
      journalData.forEach((txn, index) => {
        txn.lines.forEach(line => {
          flatData.push({
            transaction: txn.id,
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

      // Current Liabilities
      data.currentLiabilities.items.forEach(item => {
        flatData.push({
          category: 'Current Liabilities',
          account: item.accountName,
          amount: item.amount,
          total: ''
        });
      });
      flatData.push({ category: 'Current Liabilities', account: 'Total Current Liabilities', amount: '', total: data.currentLiabilities.subtotal });

      // Long-term Liabilities
      data.longTermLiabilities.items.forEach(item => {
        flatData.push({
          category: 'Long-term Liabilities',
          account: item.accountName,
          amount: item.amount,
          total: ''
        });
      });
      flatData.push({ category: 'Long-term Liabilities', account: 'Total Long-term Liabilities', amount: '', total: data.longTermLiabilities.subtotal });

      flatData.push({ category: 'Liabilities', account: 'Total Liabilities', amount: '', total: data.totalLiabilities });

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
            if (activeTab === 'journal') fetchJournalData();
            else if (activeTab === 'income') fetchIncomeData();
            else if (activeTab === 'position') fetchPositionData();
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
                  Showing {journalData.length} of {journalTotal} transactions
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
                transactions={journalData}
                allTransactions={journalData}
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
