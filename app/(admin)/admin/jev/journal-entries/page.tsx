'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { JournalEntry, JournalEntryFormData, ChartOfAccount, EntryType, JournalStatus, AccountType, NormalBalance } from '@/app/types/jev';

import { getEntryTypeClass, getStatusClass } from '@/app/lib/jev/journalHelpers';

import PaginationComponent from '@/app/Components/pagination';
import Loading from '@/app/Components/loading';
import ErrorDisplay from '@/app/Components/errordisplay';
import ModalManager from '@/app/Components/modalManager';
import ExportButton from '@/app/Components/ExportButton';
import FilterDropdown, { FilterSection } from '@/app/Components/filter';

import AddJournalEntryModal from './AddJournalEntryModal';
import EditJournalEntryModal from './EditJournalEntryModal';
import ViewJournalEntryModal from './ViewJournalEntryModal';
import PostEntryModal from './PostEntryModal';


import { showSuccess, showError, showConfirmation } from '@/app/utils/Alerts';
import { formatDate, formatMoney, formatDisplayText } from '@/app/utils/formatting';

import '@/app/styles/components/table.css';
import '@/app/styles/components/modal2.css';
import '@/app/styles/JEV/journal-entries.css';
import '@/app/styles/components/chips.css';

export default function JournalEntriesPage() {
  // State Management
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<EntryType | ''>('');
  const [statusFilter, setStatusFilter] = useState<JournalStatus | ''>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states - Unified approach
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Mock Chart of Accounts
  const mockAccounts: ChartOfAccount[] = [
    // Assets
    { account_id: '1010', account_code: '1010', account_name: 'Cash on Hand', account_type: AccountType.ASSET, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
    { account_id: '1020', account_code: '1020', account_name: 'Cash in Bank - BPI', account_type: AccountType.ASSET, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
    { account_id: '1030', account_code: '1030', account_name: 'Accounts Receivable', account_type: AccountType.ASSET, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
    { account_id: '1040', account_code: '1040', account_name: 'Inventory - Fuel', account_type: AccountType.ASSET, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
    { account_id: '1500', account_code: '1500', account_name: 'Transportation Equipment', account_type: AccountType.ASSET, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
    { account_id: '1510', account_code: '1510', account_name: 'Office Equipment', account_type: AccountType.ASSET, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
    
    // Liabilities
    { account_id: '2010', account_code: '2010', account_name: 'Accounts Payable', account_type: AccountType.LIABILITY, normal_balance: NormalBalance.CREDIT, is_active: true, is_system_account: false },
    { account_id: '2020', account_code: '2020', account_name: 'Loans Payable', account_type: AccountType.LIABILITY, normal_balance: NormalBalance.CREDIT, is_active: true, is_system_account: false },
    { account_id: '2030', account_code: '2030', account_name: 'SSS Payable', account_type: AccountType.LIABILITY, normal_balance: NormalBalance.CREDIT, is_active: true, is_system_account: false },
    { account_id: '2040', account_code: '2040', account_name: 'PhilHealth Payable', account_type: AccountType.LIABILITY, normal_balance: NormalBalance.CREDIT, is_active: true, is_system_account: false },
    
    // Equity
    { account_id: '3010', account_code: '3010', account_name: 'Capital', account_type: AccountType.EQUITY, normal_balance: NormalBalance.CREDIT, is_active: true, is_system_account: false },
    { account_id: '3020', account_code: '3020', account_name: 'Retained Earnings', account_type: AccountType.EQUITY, normal_balance: NormalBalance.CREDIT, is_active: true, is_system_account: false },
    
    // Revenue
    { account_id: '4010', account_code: '4010', account_name: 'Fare Revenue', account_type: AccountType.REVENUE, normal_balance: NormalBalance.CREDIT, is_active: true, is_system_account: false },
    { account_id: '4020', account_code: '4020', account_name: 'Charter Revenue', account_type: AccountType.REVENUE, normal_balance: NormalBalance.CREDIT, is_active: true, is_system_account: false },
    
    // Expenses
    { account_id: '5010', account_code: '5010', account_name: 'Fuel Expense', account_type: AccountType.EXPENSE, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
    { account_id: '5020', account_code: '5020', account_name: 'Maintenance Expense', account_type: AccountType.EXPENSE, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
    { account_id: '5030', account_code: '5030', account_name: 'Salaries Expense', account_type: AccountType.EXPENSE, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
    { account_id: '5040', account_code: '5040', account_name: 'Rent Expense', account_type: AccountType.EXPENSE, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
    { account_id: '5050', account_code: '5050', account_name: 'Utilities Expense', account_type: AccountType.EXPENSE, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
    { account_id: '5060', account_code: '5060', account_name: 'Insurance Expense', account_type: AccountType.EXPENSE, normal_balance: NormalBalance.DEBIT, is_active: true, is_system_account: false },
  ];

  // Mock data - TODO: Replace with API call
  const mockEntries: JournalEntry[] = [
    {
      journal_entry_id: '1',
      code: 'JE-2024-11-0001',
      date: '2024-11-15',
      posting_date: '2024-11-15',
      reference: 'REV-001',
      description: 'Revenue collection from Bus 101',
      entry_type: EntryType.AUTO_REVENUE,
      status: JournalStatus.POSTED,
      total_debit: 50000.00,
      total_credit: 50000.00,
      is_balanced: true,
      journal_lines: [
        {
          line_id: '1-1',
          journal_entry_id: '1',
          account_id: '1020',
          account_code: '1020',
          account_name: 'Cash in Bank - BPI',
          account: mockAccounts.find(a => a.account_id === '1020'),
          line_number: 1,
          description: 'Cash collection from fare revenue',
          debit: 50000.00,
          credit: 0
        },
        {
          line_id: '1-2',
          journal_entry_id: '1',
          account_id: '4010',
          account_code: '4010',
          account_name: 'Fare Revenue',
          account: mockAccounts.find(a => a.account_id === '4010'),
          line_number: 2,
          description: 'Fare revenue - Bus 101',
          debit: 0,
          credit: 50000.00
        }
      ]
    },
    {
      journal_entry_id: '2',
      code: 'JE-2024-11-0002',
      date: '2024-11-14',
      description: 'Manual adjustment for fuel expense',
      entry_type: EntryType.MANUAL,
      status: JournalStatus.DRAFT,
      total_debit: 15000.00,
      total_credit: 15000.00,
      is_balanced: true,
      journal_lines: [
        {
          line_id: '2-1',
          journal_entry_id: '2',
          account_id: '5010',
          account_code: '5010',
          account_name: 'Fuel Expense',
          account: mockAccounts.find(a => a.account_id === '5010'),
          line_number: 1,
          description: 'Fuel expense adjustment',
          debit: 15000.00,
          credit: 0
        },
        {
          line_id: '2-2',
          journal_entry_id: '2',
          account_id: '1020',
          account_code: '1020',
          account_name: 'Cash in Bank - BPI',
          account: mockAccounts.find(a => a.account_id === '1020'),
          line_number: 2,
          description: 'Cash payment',
          debit: 0,
          credit: 15000.00
        }
      ]
    },
    {
      journal_entry_id: '3',
      code: 'JE-2024-11-0003',
      date: '2024-11-13',
      posting_date: '2024-11-13',
      reference: 'PAY-110',
      description: 'Monthly payroll processing',
      entry_type: EntryType.AUTO_PAYROLL,
      status: JournalStatus.POSTED,
      total_debit: 110000.00,
      total_credit: 110000.00,
      is_balanced: true,
      journal_lines: [
        {
          line_id: '3-1',
          journal_entry_id: '3',
          account_id: '5030',
          account: mockAccounts.find(a => a.account_id === '5030'),
          line_number: 1,
          description: 'Salaries and wages',
          debit_amount: 110000.00,
          credit_amount: 0
        },
        {
          line_id: '3-2',
          journal_entry_id: '3',
          account_id: '2030',
          account: mockAccounts.find(a => a.account_id === '2030'),
          line_number: 2,
          description: 'SSS contribution withheld',
          debit_amount: 0,
          credit_amount: 5000.00
        },
        {
          line_id: '3-3',
          journal_entry_id: '3',
          account_id: '2040',
          account: mockAccounts.find(a => a.account_id === '2040'),
          line_number: 3,
          description: 'PhilHealth contribution withheld',
          debit_amount: 0,
          credit_amount: 3000.00
        },
        {
          line_id: '3-4',
          journal_entry_id: '3',
          account_id: '1020',
          account: mockAccounts.find(a => a.account_id === '1020'),
          line_number: 4,
          description: 'Net payroll disbursement',
          debit_amount: 0,
          credit_amount: 102000.00
        }
      ]
    },
    {
      journal_entry_id: '4',
      code: 'JE-2024-11-0004',
      date: '2024-11-12',
      posting_date: '2024-11-12',
      reference: 'EXP-250',
      description: 'Fuel and maintenance expense',
      entry_type: EntryType.AUTO_EXPENSE,
      status: JournalStatus.POSTED,
      total_debit: 32000.00,
      total_credit: 32000.00,
      is_balanced: true,
      journal_lines: [
        {
          line_id: '4-1',
          journal_entry_id: '4',
          account_id: '5010',
          account_code: '5010',
          account_name: 'Fuel Expense',
          account: mockAccounts.find(a => a.account_id === '5010'),
          line_number: 1,
          description: 'Fuel expense',
          debit: 20000.00,
          credit: 0
        },
        {
          line_id: '4-2',
          journal_entry_id: '4',
          account_id: '5020',
          account_code: '5020',
          account_name: 'Maintenance Expense',
          account: mockAccounts.find(a => a.account_id === '5020'),
          line_number: 2,
          description: 'Maintenance and repairs',
          debit: 12000.00,
          credit: 0
        },
        {
          line_id: '4-3',
          journal_entry_id: '4',
          account_id: '2010',
          account_code: '2010',
          account_name: 'Accounts Payable',
          account: mockAccounts.find(a => a.account_id === '2010'),
          line_number: 3,
          description: 'Accounts payable',
          debit: 0,
          credit: 32000.00
        }
      ]
    },
    {
      journal_entry_id: '5',
      code: 'JE-2024-11-0005',
      date: '2024-11-10',
      description: 'Year-end closing adjustment',
      entry_type: EntryType.CLOSING,
      status: JournalStatus.DRAFT,
      total_debit: 250000.00,
      total_credit: 250000.00,
      is_balanced: true,
      journal_lines: [
        {
          line_id: '5-1',
          journal_entry_id: '5',
          account_id: '4010',
          account_code: '4010',
          account_name: 'Fare Revenue',
          account: mockAccounts.find(a => a.account_id === '4010'),
          line_number: 1,
          description: 'Close fare revenue to retained earnings',
          debit: 250000.00,
          credit: 0
        },
        {
          line_id: '5-2',
          journal_entry_id: '5',
          account_id: '3020',
          account_code: '3020',
          account_name: 'Retained Earnings',
          account: mockAccounts.find(a => a.account_id === '3020'),
          line_number: 2,
          description: 'Transfer to retained earnings',
          debit: 0,
          credit: 250000.00
        }
      ]
    }
  ];

  // Fetch data
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call
      // const response = await fetch('/api/jev/journal-entries');
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setEntries(mockEntries);
      setFilteredEntries(mockEntries);
      setAccounts(mockAccounts);
    } catch (err) {
      console.error('Error fetching entries:', err);
      setError('Failed to load journal entries');
      setErrorCode(500);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Apply filters
  useEffect(() => {
    let filtered = [...entries];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.code.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.reference?.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(entry => entry.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(entry => entry.date <= dateTo);
    }

    // Entry type filter
    if (entryTypeFilter) {
      filtered = filtered.filter(entry => entry.entry_type === entryTypeFilter);
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(entry => entry.status === statusFilter);
    }

    setFilteredEntries(filtered);
    setTotalPages(Math.ceil(filtered.length / pageSize));
    setCurrentPage(1);
  }, [entries, searchQuery, dateFrom, dateTo, entryTypeFilter, statusFilter, pageSize]);

  // Paginate data
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handle save new entry
  const handleSaveNewEntry = async (formData: JournalEntryFormData) => {
    try {
      // TODO: Replace with actual API call
      console.log('Saving new entry:', formData);
      await showSuccess('Journal entry created successfully', 'Success');
      setIsModalOpen(false);
      fetchEntries(); // Refresh the list
    } catch (error) {
      console.error('Error saving entry:', error);
      showError('Failed to create journal entry', 'Error');
    }
  };

  // Handle update entry
  const handleUpdateEntry = async (formData: JournalEntryFormData) => {
    try {
      // TODO: Replace with actual API call
      console.log('Updating entry:', formData);
      await showSuccess('Journal entry updated successfully', 'Success');
      setIsModalOpen(false);
      fetchEntries(); // Refresh the list
    } catch (error) {
      console.error('Error updating entry:', error);
      showError('Failed to update journal entry', 'Error');
    }
  };

  // Handle view entry
  const handleViewEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setModalContent(
      <ViewJournalEntryModal
        entry={entry}
        onClose={() => setIsModalOpen(false)}
      />
    );
    setIsModalOpen(true);
  };

  // Handle add entry
  const handleAddEntry = () => {
    setModalContent(
      <AddJournalEntryModal
        accounts={accounts}
        onSubmit={handleSaveNewEntry}
        onClose={() => setIsModalOpen(false)}
      />
    );
    setIsModalOpen(true);
  };

  // Handle edit entry
  const handleEditEntry = (entry: JournalEntry) => {
    if (entry.status !== JournalStatus.DRAFT) {
      showError('Only draft entries can be edited', 'Cannot Edit');
      return;
    }
    setSelectedEntry(entry);
    setModalContent(
      <EditJournalEntryModal
        entry={entry}
        accounts={accounts}
        onSubmit={handleUpdateEntry}
        onClose={() => setIsModalOpen(false)}
      />
    );
    setIsModalOpen(true);
  };

  // Handle delete entry
  const handleDeleteEntry = async (entry: JournalEntry) => {
    if (entry.status !== JournalStatus.DRAFT) {
      showError('Only draft entries can be deleted', 'Cannot Delete');
      return;
    }

    const result = await showConfirmation(
      `Are you sure you want to delete journal entry <strong>${entry.journal_number}</strong>?`,
      'Confirm Delete'
    );

    if (result.isConfirmed) {
      try {
        // TODO: API call to delete
        await showSuccess('Journal entry deleted successfully', 'Deleted');
        fetchEntries();
      } catch (error) {
        showError('Failed to delete journal entry', 'Error');
      }
    }
  };

  // Handle post entry
  const handlePostEntry = async (entry: JournalEntry) => {
    if (entry.status !== JournalStatus.DRAFT) {
      showError('Entry is already posted', 'Cannot Post');
      return;
    }

    setSelectedEntry(entry);
    setModalContent(
      <PostEntryModal
        entry={entry}
        onPost={handleConfirmPost}
        onClose={() => setIsModalOpen(false)}
      />
    );
    setIsModalOpen(true);
  };

  // Handle confirm post
  const handleConfirmPost = async (postingDate: string) => {
    try {
      // TODO: Replace with actual API call
      console.log('Posting entry with date:', postingDate);
      await showSuccess('Journal entry posted successfully', 'Success');
      setIsModalOpen(false);
      fetchEntries(); // Refresh the list
    } catch (error) {
      console.error('Error posting entry:', error);
      showError('Failed to post journal entry', 'Error');
    }
  };

  // Handle reverse entry
  const handleReverseEntry = async (entry: JournalEntry) => {
    if (entry.status !== JournalStatus.POSTED) {
      showError('Only posted entries can be reversed', 'Cannot Reverse');
      return;
    }

    const result = await showConfirmation(
      `Are you sure you want to reverse journal entry <strong>${entry.journal_number}</strong>?<br/>This will create a reversing entry.`,
      'Reverse Entry'
    );

    if (result.isConfirmed) {
      try {
        // TODO: Replace with actual API call
        console.log('Reversing entry:', entry.journal_entry_id);
        await showSuccess('Journal entry reversed successfully', 'Success');
        fetchEntries(); // Refresh the list
      } catch (error) {
        console.error('Error reversing entry:', error);
        showError('Failed to reverse journal entry', 'Error');
      }
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setEntryTypeFilter('');
    setStatusFilter('');
  };

  // Filter sections for FilterDropdown
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Transaction Date Range',
      type: 'dateRange',
      defaultValue: { from: '', to: '' }
    },
    {
      id: 'entry_type',
      title: 'Entry Type',
      type: 'radio',
      options: [
        { id: '', label: 'All Entry Types' },
        { id: EntryType.MANUAL, label: 'Manual' },
        { id: EntryType.AUTO_REVENUE, label: 'Auto - Revenue' },
        { id: EntryType.AUTO_EXPENSE, label: 'Auto - Expense' },
        { id: EntryType.AUTO_PAYROLL, label: 'Auto - Payroll' },
        { id: EntryType.AUTO_LOAN, label: 'Auto - Loan' },
        { id: EntryType.AUTO_PURCHASE, label: 'Auto - Purchase' },
        { id: EntryType.ADJUSTMENT, label: 'Adjustment' },
        { id: EntryType.CLOSING, label: 'Closing' }
      ],
      defaultValue: ''
    },
    {
      id: 'status',
      title: 'Status',
      type: 'radio',
      options: [
        { id: '', label: 'All Status' },
        { id: JournalStatus.DRAFT, label: 'Draft' },
        { id: JournalStatus.POSTED, label: 'Posted' },
        { id: JournalStatus.REVERSED, label: 'Reversed' }
      ],
      defaultValue: ''
    }
  ];

  // Handle filter apply
  const handleFilterApply = (filterValues: any) => {
    setDateFrom(filterValues.dateRange?.from || '');
    setDateTo(filterValues.dateRange?.to || '');
    setEntryTypeFilter(filterValues.entry_type || '');
    setStatusFilter(filterValues.status || '');
  };

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Journal Entry Management</h1>
        <Loading />
      </div>
    );
  }
  if (error) return <ErrorDisplay errorCode={errorCode} onRetry={fetchEntries} />;

  return (
    <div className="card">
      <div className="card-header">
        <div className="top-header">
          <h1 className="title">Journal Entry Management</h1>
        </div>

        {/* Settings Bar with Search and Filters */}
        <div className="settings">
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line"></i>
              <input
                type="text"
                className="searchInput"
                placeholder="Search by journal number, description, or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Dropdown */}
            <FilterDropdown
              sections={filterSections}
              onApply={handleFilterApply}
              initialValues={{
                dateRange: { from: dateFrom, to: dateTo },
                entry_type: entryTypeFilter,
                status: statusFilter
              }}
            />
          </div>

          <div className="filters">
            <ExportButton
              data={filteredEntries}
              filename={`journal-entries-${new Date().toISOString().split('T')[0]}`}
              title="Journal Entries Report"
            />
            <button className="addButton" onClick={handleAddEntry}>
              <i className="ri-add-line"></i> Add Manual Entry
            </button>
          </div>
        </div>
      </div>

      {/* Journal Entries Table */}
      <div className="table-wrapper">
        <div className="tableContainer">
          <table>
            <thead>
              <tr>
                <th>JE Code</th>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th style={{ width: '200px' }}>Total Debit</th>
                <th style={{ width: '200px' }}>Total Credit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry) => (
                  <tr key={entry.journal_entry_id}>
                    <td><strong>{entry.code}</strong></td>
                    <td>{formatDate(entry.date)}</td>
                    <td>{entry.reference || '-'}</td>
                    <td>
                      <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.description}>
                        {entry.description}
                      </div>
                    </td>
                    <td>{formatMoney(entry.total_debit)}</td>
                    <td>{formatMoney(entry.total_credit)}</td>
                    <td>
                      <span className={`chip ${getStatusClass(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="actionButtons">
                      <div className="actionButtonsContainer">
                        <button
                          className="viewBtn"
                          onClick={() => handleViewEntry(entry)}
                          title="View Details"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                        {entry.status === JournalStatus.DRAFT && (
                          <>
                            <button
                              className="editBtn"
                              onClick={() => handleEditEntry(entry)}
                              title="Edit"
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                            <button
                              className="submitBtn"
                              onClick={() => handlePostEntry(entry)}
                              title="Post Entry"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                          </>
                        )}
                        {entry.status === JournalStatus.POSTED && (
                          <button
                            className="refundBtn"
                            onClick={() => handleReverseEntry(entry)}
                            title="Reverse Entry"
                          >
                            <i className="ri-arrow-go-back-line"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <i className="ri-file-list-line" style={{ fontSize: '48px', color: 'var(--secondary-text-color)' }}></i>
                    <p style={{ color: 'var(--secondary-text-color)', marginTop: '10px' }}>
                      No journal entries found
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredEntries.length > 0 && (
        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Unified Modal Manager */}
      <ModalManager
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        modalContent={modalContent}
      />
    </div>
  );
}

