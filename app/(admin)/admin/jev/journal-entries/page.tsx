'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { JournalEntry, JournalEntryFormData, ChartOfAccount, EntryType, JournalStatus } from '@/app/types/jev';
import { fetchJournalEntries, fetchJournalEntryById, createAutoJournalEntry, updateJournalEntry, deleteJournalEntry, postJournalEntry, createReversalEntry, transformUpdatePayload } from '@/app/services/journalEntryService';
import { fetchChartOfAccounts } from '@/app/services/chartOfAccountsService';

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

  // Fetch data
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      // Fetch journal entries from backend API
      const { entries: fetchedEntries, pagination } = await fetchJournalEntries({
        page: currentPage,
        limit: pageSize,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: statusFilter || undefined,
        entry_type: entryTypeFilter || undefined,
        code: searchQuery || undefined,
      });

      setEntries(fetchedEntries);
      setTotalPages(pagination.totalPages);

      // Fetch chart of accounts from backend API
      try {
        const { data: accountsData } = await fetchChartOfAccounts({ limit: 1000 });
        setAccounts(accountsData);
      } catch (accountsErr: any) {
        console.warn('Failed to load chart of accounts:', accountsErr.message);
        // Continue with empty accounts - journal lines may still display using embedded account data
      }
    } catch (err: any) {
      console.error('Error fetching entries:', err);
      setError(err.message || 'Failed to load journal entries');
      setErrorCode(err.status || 500);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, dateFrom, dateTo, statusFilter, entryTypeFilter, searchQuery]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Trigger fetch when filters change
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Debounce search query - reset page when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Apply client-side filters if needed (for immediate UI feedback)
  useEffect(() => {
    // Since we're using server-side filtering, just use the entries as-is
    setFilteredEntries(entries);
  }, [entries]);

  // Paginate data - Backend handles pagination, so we use entries directly
  const paginatedEntries = entries;

  // Handle save new entry - routes through /auto endpoint with module: MANUAL
  const handleSaveNewEntry = async (formData: JournalEntryFormData) => {
    try {
      // Transform form data to API payload format
      const apiPayload = {
        module: 'MANUAL',
        reference_id: formData.reference || `MANUAL-${Date.now()}`,
        description: formData.description,
        date: formData.date,
        entries: formData.journal_lines.map(line => {
          const account = accounts.find(a => a.account_id === line.account_id);
          return {
            account_code: account?.account_code || line.account_id,
            debit: line.debit ?? line.debit_amount ?? 0,
            credit: line.credit ?? line.credit_amount ?? 0,
            description: line.description,
          };
        }),
      };

      await createAutoJournalEntry(apiPayload);
      await showSuccess('Journal entry created successfully', 'Success');
      setIsModalOpen(false);
      fetchEntries(); // Refresh the list
    } catch (error: any) {
      console.error('Error saving entry:', error);
      showError(error.message || 'Failed to create journal entry', 'Error');
    }
  };

  // Handle update entry
  const handleUpdateEntry = async (entryId: string, formData: JournalEntryFormData) => {
    try {
      // Transform form data to API payload format
      const apiPayload = transformUpdatePayload(formData, accounts);

      await updateJournalEntry(entryId, apiPayload);
      await showSuccess('Journal entry updated successfully', 'Success');
      setIsModalOpen(false);
      fetchEntries(); // Refresh the list
    } catch (error: any) {
      console.error('Error updating entry:', error);
      showError(error.message || 'Failed to update journal entry', 'Error');
    }
  };

  // Handle view entry
  const handleViewEntry = async (entry: JournalEntry) => {
    try {
      // Fetch full details from backend
      const fullEntry = await fetchJournalEntryById(entry.journal_entry_id);
      setSelectedEntry(fullEntry);
      setModalContent(
        <ViewJournalEntryModal
          entry={fullEntry}
          onClose={() => setIsModalOpen(false)}
        />
      );
      setIsModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching entry details:', error);
      showError(error.message || 'Failed to load entry details', 'Error');
    }
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
  const handleEditEntry = async (entry: JournalEntry) => {
    if (entry.status !== JournalStatus.DRAFT) {
      showError('Only draft entries can be edited', 'Cannot Edit');
      return;
    }

    try {
      // Fetch full details (with journal lines) from backend
      const fullEntry = await fetchJournalEntryById(entry.journal_entry_id);
      setSelectedEntry(fullEntry);
      setModalContent(
        <EditJournalEntryModal
          entry={fullEntry}
          accounts={accounts}
          onSubmit={handleUpdateEntry}
          onClose={() => setIsModalOpen(false)}
        />
      );
      setIsModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching entry details for edit:', error);
      showError(error.message || 'Failed to load entry details', 'Error');
    }
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
        await deleteJournalEntry(entry.journal_entry_id, 'User requested deletion');
        await showSuccess('Journal entry deleted successfully', 'Deleted');
        fetchEntries();
      } catch (error: any) {
        showError(error.message || 'Failed to delete journal entry', 'Error');
      }
    }
  };

  // Handle post entry
  const handlePostEntry = async (entry: JournalEntry) => {
    if (entry.status !== JournalStatus.DRAFT) {
      showError('Entry is already posted', 'Cannot Post');
      return;
    }

    try {
      // Fetch full details (with journal lines) from backend
      const fullEntry = await fetchJournalEntryById(entry.journal_entry_id);
      setSelectedEntry(fullEntry);
      setModalContent(
        <PostEntryModal
          entry={fullEntry}
          onPost={handleConfirmPost}
          onClose={() => setIsModalOpen(false)}
        />
      );
      setIsModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching entry details for post:', error);
      showError(error.message || 'Failed to load entry details', 'Error');
    }
  };

  // Handle confirm post
  const handleConfirmPost = async (postingDate: string) => {
    try {
      if (!selectedEntry) {
        throw new Error('No entry selected for posting');
      }

      await postJournalEntry(selectedEntry.journal_entry_id);
      await showSuccess('Journal entry posted successfully', 'Success');
      setIsModalOpen(false);
      fetchEntries(); // Refresh the list
    } catch (error: any) {
      console.error('Error posting entry:', error);
      showError(error.message || 'Failed to post journal entry', 'Error');
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
        await createReversalEntry(
          entry.journal_entry_id,
          'User requested reversal',
          new Date().toISOString().split('T')[0]
        );
        await showSuccess('Journal entry reversed successfully', 'Success');
        fetchEntries(); // Refresh the list
      } catch (error: any) {
        console.error('Error reversing entry:', error);
        showError(error.message || 'Failed to reverse journal entry', 'Error');
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
    setCurrentPage(1); // Reset to first page when filters are cleared
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
    setCurrentPage(1); // Reset to first page when filters change
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
                paginatedEntries.map((entry, index) => (
                  <tr key={entry.journal_entry_id || entry.code || `entry-${index}`}>
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

