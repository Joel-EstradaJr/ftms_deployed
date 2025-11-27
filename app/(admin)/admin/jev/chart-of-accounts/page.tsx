'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '../../../../utils/formatting';;
import { showSuccess, showError, showConfirmation } from '@/app/utils/Alerts';
import PaginationComponent from '@/app/Components/pagination';
import Loading from '@/app/Components/loading';
import ErrorDisplay from '@/app/Components/errordisplay';
import ModalManager from '@/app/Components/modalManager';
import AccountFilter from '@/app/Components/AccountFilter';
import RecordChartOfAccount from './recordChartOfAccount';
import AddAccountModal from './AddAccountModal';
import AddChildAccountModal from './AddChildAccountModal';
import ValidateBalanceModal from './ValidateBalanceModal';
import AuditTrailModal from './AuditTrailModal';
import { ChartOfAccount, AccountType, AccountFormData} from '@/app/types/jev';
import { fetchChartOfAccounts, createChartOfAccount } from '@/app/services/chartOfAccountsService';
import { ApiError } from '@/app/lib/api';
import {getAccountTypeClass, 
        getAccountStatusInfo, 
        canArchiveAccount,
        getChildCount,
        canHaveChildren,
        isParentAccount} from '@/app/lib/jev/accountHelpers';
import '@/app/styles/JEV/chart-of-accounts.css';
import '@/app/styles/components/table.css'; 
import '@/app/styles/components/chips.css';
import '@/app/styles/JEV/JEV_table.css'; 

const ChartOfAccountsPage = () => {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [allAccounts, setAllAccounts] = useState<ChartOfAccount[]>([]); // Store all accounts for filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);
  const [search, setSearch] = useState('');
  const [accountTypeFilters, setAccountTypeFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states - Unified approach like tripRevenue
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);

  // Fetch accounts from API
  const loadAccountsFromApi = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      const data = await fetchChartOfAccounts();
      setAllAccounts(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorCode(err.status);
      } else {
        setError('An unexpected error occurred while fetching accounts');
        setErrorCode(500);
      }
      console.error('Error fetching chart of accounts:', err);
    }
  }, []);

  // Apply filters and pagination to the loaded accounts
  const applyFiltersAndPagination = useCallback(() => {
    let filtered = [...allAccounts];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(acc => 
        acc.account_code.toLowerCase().includes(searchLower) ||
        acc.account_name.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter (multiple types)
    if (accountTypeFilters && accountTypeFilters.length > 0) {
      filtered = filtered.filter(acc => accountTypeFilters.includes(acc.account_type));
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(acc => 
        statusFilter === 'active' ? acc.is_active : !acc.is_active
      );
    }

    // Sort by account code
    filtered.sort((a, b) => a.account_code.localeCompare(b.account_code));

    // Calculate total pages
    const totalItems = filtered.length;
    const calculatedTotalPages = Math.ceil(totalItems / pageSize);
    setTotalPages(calculatedTotalPages);

    // Pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedAccounts = filtered.slice(startIndex, endIndex);

    setAccounts(paginatedAccounts);
  }, [allAccounts, search, accountTypeFilters, statusFilter, currentPage, pageSize]);

  // Initial load from API
  useEffect(() => {
    loadAccountsFromApi();
  }, [loadAccountsFromApi]);

  // Apply filters whenever they change
  useEffect(() => {
    if (allAccounts.length > 0) {
      applyFiltersAndPagination();
    }
  }, [applyFiltersAndPagination, allAccounts]);

  // Handle filter changes from AccountFilter component
  const handleFilterApply = (filterValues: { accountTypes: string[]; status: string }) => {
    setAccountTypeFilters(filterValues.accountTypes);
    setStatusFilter(filterValues.status as 'active' | 'archived' | 'all');
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Modal management functions - following tripRevenue pattern
  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setSelectedAccount(null);
  };

  const openAddModal = () => {
    setModalContent(
      <AddAccountModal
        onClose={closeModal}
        onSubmit={handleAddAccount}
      />
    );
    setIsModalOpen(true);
  };

  const openEditModal = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setModalContent(
      <RecordChartOfAccount
        account={account}
        mode="edit"
        accounts={allAccounts}
        onClose={closeModal}
        onSave={async (data) => {
          await showSuccess('Account updated successfully', 'Success');
          closeModal();
          loadAccountsFromApi();
        }}
      />
    );
    setIsModalOpen(true);
  };

  const openViewModal = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setModalContent(
      <RecordChartOfAccount
        account={account}
        mode="view"
        accounts={allAccounts}
        onClose={closeModal}
        onSave={async () => {}} // No-op for view mode
      />
    );
    setIsModalOpen(true);
  };

  const openAddChildModal = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setModalContent(
      <AddChildAccountModal
        parentAccount={account}
        onClose={closeModal}
        onSubmit={async (data) => {
          await showSuccess('Child account created successfully', 'Success');
          closeModal();
          loadAccountsFromApi();
        }}
      />
    );
    setIsModalOpen(true);
  };

  const openValidateModal = () => {
    setModalContent(
      <ValidateBalanceModal
        onClose={closeModal}
        onValidate={loadAccountsFromApi}
      />
    );
    setIsModalOpen(true);
  };

  const openAuditTrailModal = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setModalContent(
      <AuditTrailModal
        recordId={account.account_id}
        recordType="ChartOfAccount"
        recordName={`${account.account_code} - ${account.account_name}`}
        onClose={closeModal}
      />
    );
    setIsModalOpen(true);
  };

  const handleAddAccount = async (formData: any) => {
    try {
      // Call API to create account with backend format
      await createChartOfAccount(formData);
      
      await showSuccess('Account created successfully!', 'Success');
      closeModal();
      loadAccountsFromApi(); // Refresh the table
    } catch (error) {
      console.error('Error adding account:', error);
      if (error instanceof ApiError) {
        await showError(error.message, 'Error');
      } else {
        await showError('Failed to create account', 'Error');
      }
    }
  };

  const handleExport = async () => {
    await showSuccess('Chart of Accounts exported successfully', 'Success');
  };

  const handleArchive = async (account: ChartOfAccount) => {
    if (!canArchiveAccount(account)) {
      await showError('Cannot archive system accounts', 'Error');
      return;
    }
    
    const childCount = getChildCount(account.account_id, allAccounts);
    if (childCount > 0) {
      await showError('Cannot archive account with child accounts', 'Error');
      return;
    }

    const result = await showConfirmation(
      `Are you sure you want to archive "${account.account_name}"?<br/>
      <span style="color: #666; font-size: 0.9em;">This account will no longer appear in active listings.</span>`,
      'Archive Account'
    );

    if (result.isConfirmed) {
      await showSuccess('Account archived successfully', 'Success');
      loadAccountsFromApi();
    }
  };

  const handleRestore = async (account: ChartOfAccount) => {
    const result = await showConfirmation(
      `Restore account "${account.account_name}"?`,
      'Restore Account'
    );

    if (result.isConfirmed) {
      await showSuccess('Account restored successfully', 'Success');
      loadAccountsFromApi();
    }
  };

  const renderActionButtons = (account: ChartOfAccount) => {
    // Determine deleted state: prefer `is_deleted` if available, fallback to inverse of `is_active`
    const isDeleted = (account as any).is_deleted ?? !account.is_active;
    const childCount = getChildCount(account.account_id, allAccounts);

    if (isDeleted) {
      // Archived: show only View + Unarchive
      return (
        <div className="actionButtonsContainer">
          <button
            className="viewBtn"
            onClick={() => openViewModal(account)}
            title="View Details"
          >
            <i className="ri-eye-line" />
          </button>
          <button
            className="successBtn"
            onClick={() => handleRestore(account)}
            title="Unarchive Account"
          >
            <i className="ri-refresh-line" />
          </button>
        </div>
      );
    }

    // Active: show only View, Edit, Archive (keep archive disabled when not allowed)
    return (
      <div className="actionButtonsContainer">
        <button
          className="viewBtn"
          onClick={() => openViewModal(account)}
          title="View Details"
        >
          <i className="ri-eye-line" />
        </button>
        <button
          className="editBtn"
          onClick={() => openEditModal(account)}
          title="Edit Account"
        >
          <i className="ri-edit-2-line" />
        </button>
        <button
          className="deleteBtn"
          onClick={() => handleArchive(account)}
          title="Archive Account"
          disabled={!canArchiveAccount(account) || childCount > 0}
        >
          <i className="ri-archive-line" />
        </button>
      </div>
    );
  };

   if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Chart of Accounts</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={() => {
            setError(null);
            setErrorCode(null);
            loadAccountsFromApi();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Chart of Accounts</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <h1 className="title">Chart of Accounts</h1>

        <div className="settings">
          {/* Search Bar */}
          <div className="searchBar">
            <i className="ri-search-line" />
            <input
              type="text"
              className="searchInput"
              placeholder="Search account code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* Account Filter Component */}
          <AccountFilter
            onApply={handleFilterApply}
            initialValues={{
              accountTypes: accountTypeFilters,
              status: statusFilter,
            }}
          />

          {/* Filters and Actions */}
          <div className="filters">
            <button onClick={handleExport} id="export">
              <i className="ri-file-download-line" /> Generate CSV
            </button>

            <button 
              onClick={openValidateModal} 
              className="validateBtn"
              title="Validate account balances"
            >
              <i className="ri-checkbox-circle-line" /> Validate
            </button>

            <button onClick={openAddModal} id="addAccount">
              <i className="ri-add-line" /> Add Account
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th className="account-name">Account Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const childCount = getChildCount(account.account_id, allAccounts);
                  const isParent = childCount > 0;
                  
                  return (
                    <tr key={account.account_id}>
                      {/* Account Code */}
                      <td>{account.account_code}</td>

                      {/* Account Name with hierarchy indicator */}
                      <td className="account-name">
                        {account.parent_account_id && (
                          <span className="child-indicator">└─ </span>
                        )}
                        {account.account_name}
                        {account.parent_account_name && (
                          <div className="parent-account">
                            Parent: {account.parent_account_code} - {account.parent_account_name}
                          </div>
                        )}
                        {account.description && (
                          <div className="parent-account">{account.description}</div>
                        )}
                      </td>

                      {/* Type */}
                      <td>
                        <span className={`chip ${getAccountTypeClass(account.account_type)}`}>
                          {account.account_type}
                        </span>
                      </td>

                      {/* Status with child count */}
                      <td className="table-status">
                        <div className="status-chips">
                          <span className={`chip ${account.is_active ? 'active' : 'closed'}`}>
                            {account.is_active ? 'Active' : 'Archived'}
                          </span>
                          {account.is_system_account && (
                            <span className="chip Draft" style={{ fontSize: '11px' }}>
                              System
                            </span>
                          )}
                          {isParent && (
                            <span className="chip pending" style={{ fontSize: '11px' }}>
                              +{childCount} {childCount === 1 ? 'child' : 'children'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="actionButtons">
                        {renderActionButtons(account)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {accounts.length === 0 && (
              <p className="noRecords">No accounts found matching your criteria.</p>
            )}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Dynamic Modal Manager - following tripRevenue pattern */}
      <ModalManager
        isOpen={isModalOpen}
        onClose={closeModal}
        modalContent={modalContent}
      />
    </div>
  );
};

export default ChartOfAccountsPage;
