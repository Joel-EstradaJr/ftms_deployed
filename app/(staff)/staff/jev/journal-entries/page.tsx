'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { JournalEntry, JournalEntryFormData, ChartOfAccount, EntryType, JournalStatus } from '../../../../types/jev';
import { fetchJournalEntries, fetchJournalEntryById } from '../../../../services/journalEntryService';
import { fetchChartOfAccounts } from '../../../../services/chartOfAccountsService';

import { getEntryTypeClass, getStatusClass } from '../../../../lib/jev/journalHelpers';

import PaginationComponent from '../../../../Components/pagination';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import ModalManager from '../../../../Components/modalManager';
import ExportButton from '../../../../Components/ExportButton';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';

import ViewJournalEntryModal from '../../../../(admin)/admin/jev/journal-entries/ViewJournalEntryModal';

import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';
import { formatDate, formatMoney, formatDisplayText } from '../../../../utils/formatting';

import '../../../../styles/components/table.css';
import '../../../../styles/components/modal2.css';
import '../../../../styles/JEV/journal-entries.css';
import '../../../../styles/components/chips.css';

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
  }, [currentPage, pageSize, dateFrom, dateTo, statusFilter, entryTypeFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Apply client-side search filtering across all required columns
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEntries(entries);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = entries.filter((entry) => {
      // Search across all required fields: JE Code, Date, Reference, Description, Total Debit, Total Credit, Status
      const code = (entry.code || entry.journal_number || '').toLowerCase();
      const date = (entry.date || entry.transaction_date || '').toLowerCase();
      const reference = (entry.reference || '').toLowerCase();
      const description = (entry.description || '').toLowerCase();
      const totalDebit = String(entry.total_debit || 0);
      const totalCredit = String(entry.total_credit || 0);
      const status = (entry.status || '').toLowerCase();

      return (
        code.includes(query) ||
        date.includes(query) ||
        reference.includes(query) ||
        description.includes(query) ||
        totalDebit.includes(query) ||
        totalCredit.includes(query) ||
        status.includes(query)
      );
    });

    setFilteredEntries(filtered);
  }, [entries, searchQuery]);

  // Paginate data - use filteredEntries for display (after client-side search)
  const paginatedEntries = filteredEntries;

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
        <h1 className="title">Journal Entries (View Only)</h1>
        <Loading />
      </div>
    );
  }
  if (error) return <ErrorDisplay errorCode={errorCode} onRetry={fetchEntries} />;

  return (
    <div className="card">
      <div className="card-header">
        <div className="top-header">
          <h1 className="title">Journal Entries (View Only)</h1>
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
              columns={[
                { header: 'JE Code', key: 'code' },
                { header: 'Date', key: 'date' },
                { header: 'Reference', key: 'reference' },
                { header: 'Description', key: 'description' },
                { header: 'Total Debit', key: 'total_debit' },
                { header: 'Total Credit', key: 'total_credit' },
                { header: 'Status', key: 'status' }
              ]}
            />
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
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
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
