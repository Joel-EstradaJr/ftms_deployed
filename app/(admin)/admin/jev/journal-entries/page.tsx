'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { JournalEntry, JournalEntryFormData, ChartOfAccount, EntryType, JournalStatus } from '@/app/types/jev';
import { formatDate, formatMoney, formatDisplayText } from '@/app/utils/formatting';
import { getEntryTypeClass, getStatusClass } from '@/app/lib/jev/journalHelpers';
import PaginationComponent from '@/app/Components/pagination';
import Loading from '@/app/Components/loading';
import ErrorDisplay from '@/app/Components/errordisplay';
import ModalManager from '@/app/Components/modalManager';
import ExportButton from '@/app/Components/ExportButton';
import AddJournalEntryModal from './AddJournalEntryModal';
import EditJournalEntryModal from './EditJournalEntryModal';
import ViewJournalEntryModal from './ViewJournalEntryModal';
import PostEntryModal from './PostEntryModal';
import { showSuccess, showError, showConfirmation } from '@/app/utils/Alerts';
import '@/app/styles/components/table.css';
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

  // Mock data - TODO: Replace with API call
  const mockEntries: JournalEntry[] = [
    {
      journal_entry_id: '1',
      journal_number: 'JE-2024-11-0001',
      transaction_date: '2024-11-15',
      posting_date: '2024-11-15',
      reference_number: 'REV-001',
      description: 'Revenue collection from Bus 101',
      entry_type: EntryType.AUTO_REVENUE,
      source_module: 'Revenue',
      source_id: 'REV-001',
      status: JournalStatus.POSTED,
      total_debit: 50000.00,
      total_credit: 50000.00,
      is_balanced: true,
      created_at: '2024-11-15T08:30:00',
      created_by: 'System',
      posted_at: '2024-11-15T08:30:00',
      posted_by: 'System',
      updated_at: '2024-11-15T08:30:00',
      journal_lines: []
    },
    {
      journal_entry_id: '2',
      journal_number: 'JE-2024-11-0002',
      transaction_date: '2024-11-14',
      description: 'Manual adjustment for fuel expense',
      entry_type: EntryType.MANUAL,
      status: JournalStatus.DRAFT,
      total_debit: 15000.00,
      total_credit: 15000.00,
      is_balanced: true,
      created_at: '2024-11-14T14:20:00',
      created_by: 'Admin User',
      updated_at: '2024-11-14T14:20:00',
      journal_lines: []
    },
    {
      journal_entry_id: '3',
      journal_number: 'JE-2024-11-0003',
      transaction_date: '2024-11-13',
      posting_date: '2024-11-13',
      reference_number: 'PAY-100',
      description: 'Payroll disbursement for October 2024',
      entry_type: EntryType.AUTO_PAYROLL,
      source_module: 'Payroll',
      source_id: 'PAY-100',
      status: JournalStatus.POSTED,
      total_debit: 120000.00,
      total_credit: 120000.00,
      is_balanced: true,
      created_at: '2024-11-13T10:00:00',
      created_by: 'System',
      posted_at: '2024-11-13T10:00:00',
      posted_by: 'System',
      updated_at: '2024-11-13T10:00:00',
      journal_lines: []
    },
    {
      journal_entry_id: '4',
      journal_number: 'JE-2024-11-0004',
      transaction_date: '2024-11-12',
      posting_date: '2024-11-12',
      reference_number: 'EXP-250',
      description: 'Fuel and maintenance expense',
      entry_type: EntryType.AUTO_EXPENSE,
      source_module: 'Expense',
      source_id: 'EXP-250',
      status: JournalStatus.POSTED,
      total_debit: 32000.00,
      total_credit: 32000.00,
      is_balanced: true,
      created_at: '2024-11-12T11:15:00',
      created_by: 'System',
      posted_at: '2024-11-12T11:15:00',
      posted_by: 'System',
      updated_at: '2024-11-12T11:15:00',
      journal_lines: []
    },
    {
      journal_entry_id: '5',
      journal_number: 'JE-2024-11-0005',
      transaction_date: '2024-11-10',
      description: 'Year-end closing adjustment',
      entry_type: EntryType.CLOSING,
      status: JournalStatus.DRAFT,
      total_debit: 250000.00,
      total_credit: 250000.00,
      is_balanced: true,
      created_at: '2024-11-10T16:45:00',
      created_by: 'Finance Manager',
      updated_at: '2024-11-10T16:45:00',
      journal_lines: []
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
        entry.journal_number.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.reference_number?.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(entry => entry.transaction_date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(entry => entry.transaction_date <= dateTo);
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

  // Handle view entry
  const handleViewEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    // TODO: Import and use ViewJournalEntryModal
    setModalContent(<div>View Modal - Coming Soon</div>);
    setShowViewModal(true);
  };

  // Handle add entry
  const handleAddEntry = () => {
    // TODO: Import and use AddJournalEntryModal
    setModalContent(<div>Add Modal - Coming Soon</div>);
    setShowAddModal(true);
  };

  // Handle edit entry
  const handleEditEntry = (entry: JournalEntry) => {
    if (entry.status !== JournalStatus.DRAFT) {
      showError('Only draft entries can be edited', 'Cannot Edit');
      return;
    }
    setSelectedEntry(entry);
    // TODO: Import and use EditJournalEntryModal
    setModalContent(<div>Edit Modal - Coming Soon</div>);
    setShowEditModal(true);
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
    // TODO: Import and use PostEntryModal
    setModalContent(<div>Post Modal - Coming Soon</div>);
    setShowPostModal(true);
  };

  // Handle reverse entry
  const handleReverseEntry = async (entry: JournalEntry) => {
    if (entry.status !== JournalStatus.POSTED) {
      showError('Only posted entries can be reversed', 'Cannot Reverse');
      return;
    }

    setSelectedEntry(entry);
    // TODO: Import and use ReverseEntryModal
    setModalContent(<div>Reverse Modal - Coming Soon</div>);
    setShowReverseModal(true);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setEntryTypeFilter('');
    setStatusFilter('');
  };

  if (loading) return <Loading />;
  if (error) return <ErrorDisplay errorCode={errorCode} onRetry={fetchEntries} />;

  return (
    <div className="card">
      <div className="card-header">
        <div className="top-header">
          <h1 className="page-title">Journal Entry Management</h1>
          <div className="header-actions">
            <ExportButton
              data={filteredEntries}
              filename={`journal-entries-${new Date().toISOString().split('T')[0]}`}
              title="Journal Entries Report"
            />
            <button className="add-btn" onClick={handleAddEntry}>
              <i className="ri-add-line"></i>
              Add Manual Entry
            </button>
          </div>
        </div>

        {/* Settings Bar with Search and Filters */}
        <div className="settings">
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

          <div className="filters">
            {/* Date From */}
            <div className="filter-group">
              <label>From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Date To */}
            <div className="filter-group">
              <label>To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Entry Type Filter */}
            <select
              value={entryTypeFilter}
              onChange={(e) => setEntryTypeFilter(e.target.value as EntryType | '')}
              className="filter-select"
            >
              <option value="">All Entry Types</option>
              <option value={EntryType.MANUAL}>Manual</option>
              <option value={EntryType.AUTO_REVENUE}>Auto - Revenue</option>
              <option value={EntryType.AUTO_EXPENSE}>Auto - Expense</option>
              <option value={EntryType.AUTO_PAYROLL}>Auto - Payroll</option>
              <option value={EntryType.AUTO_LOAN}>Auto - Loan</option>
              <option value={EntryType.AUTO_PURCHASE}>Auto - Purchase</option>
              <option value={EntryType.ADJUSTMENT}>Adjustment</option>
              <option value={EntryType.CLOSING}>Closing</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as JournalStatus | '')}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value={JournalStatus.DRAFT}>Draft</option>
              <option value={JournalStatus.POSTED}>Posted</option>
              <option value={JournalStatus.REVERSED}>Reversed</option>
            </select>

            {/* Clear Filters */}
            {(searchQuery || dateFrom || dateTo || entryTypeFilter || statusFilter) && (
              <button className="clear-filters-btn" onClick={handleClearFilters}>
                <i className="ri-close-line"></i>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Journal Entries Table */}
      <div className="table-wrapper">
        <div className="tableContainer">
          <table>
            <thead>
              <tr>
                <th>Journal Number</th>
                <th>Date</th>
                <th>Description</th>
                <th>Entry Type</th>
                <th>Reference</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry) => (
                  <tr key={entry.journal_entry_id}>
                    <td><strong>{entry.journal_number}</strong></td>
                    <td>{formatDate(entry.transaction_date)}</td>
                    <td>{entry.description}</td>
                    <td>
                      <span className={`chip ${getEntryTypeClass(entry.entry_type)}`}>
                        {formatDisplayText(entry.entry_type)}
                      </span>
                    </td>
                    <td>{entry.reference_number || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(entry.total_debit)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(entry.total_credit)}</td>
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
                              className="deleteBtn"
                              onClick={() => handleDeleteEntry(entry)}
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line"></i>
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
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
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

      {/* Modals */}
      {showViewModal && (
        <ModalManager
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          modalContent={modalContent}
        />
      )}
      {showAddModal && (
        <ModalManager
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          modalContent={modalContent}
        />
      )}
      {showEditModal && (
        <ModalManager
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          modalContent={modalContent}
        />
      )}
      {showPostModal && (
        <ModalManager
          isOpen={showPostModal}
          onClose={() => setShowPostModal(false)}
          modalContent={modalContent}
        />
      )}
      {showReverseModal && (
        <ModalManager
          isOpen={showReverseModal}
          onClose={() => setShowReverseModal(false)}
          modalContent={modalContent}
        />
      )}
    </div>
  );
}

