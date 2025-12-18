'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '../../../../utils/formatting';;
import { showSuccess, showError, showConfirmation } from '@/app/utils/Alerts';

import PaginationComponent from '@/app/Components/pagination';
import Loading from '@/app/Components/loading';
import ErrorDisplay from '@/app/Components/errordisplay';
import ModalManager from '@/app/Components/modalManager';
import FilterDropdown, { FilterSection } from '@/app/Components/filter';

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
        isParentAccount,
        getNormalBalance} from '@/app/lib/jev/accountHelpers';

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

  // Define filter sections for FilterDropdown
  const filterSections: FilterSection[] = [
    {
      id: 'accountTypes',
      title: 'Account Type',
      type: 'checkbox',
      options: [
        { id: AccountType.ASSET, label: 'Assets' },
        { id: AccountType.LIABILITY, label: 'Liabilities' },
        { id: AccountType.EQUITY, label: 'Equity' },
        { id: AccountType.REVENUE, label: 'Revenue' },
        { id: AccountType.EXPENSE, label: 'Expenses' },
      ],
      defaultValue: []
    },
    {
      id: 'status',
      title: 'Status',
      type: 'radio',
      options: [
        { id: 'all', label: 'All' },
        { id: 'active', label: 'Active' },
        { id: 'archived', label: 'Archived' },
      ],
      defaultValue: 'active'
    }
  ];

  // Sample dummy data for Chart of Accounts
  const dummyAccounts: ChartOfAccount[] = [
    // ASSETS
    {
      account_id: '1',
      account_code: '1000',
      account_name: 'Cash',
      account_type: AccountType.ASSET,
      description: 'Cash on hand and in bank accounts',
      is_active: true,
      is_system_account: true
    },
    {
      account_id: '2',
      account_code: '1010',
      account_name: 'Petty Cash',
      account_type: AccountType.ASSET,
      description: 'Small cash fund for minor expenses',
      is_active: true,
      is_system_account: false,
      parent_account_id: '1',
      parent_account_code: '1000',
      parent_account_name: 'Cash'
    },
    {
      account_id: '3',
      account_code: '1100',
      account_name: 'Accounts Receivable',
      account_type: AccountType.ASSET,
      description: 'Amounts owed by customers for services rendered',
      is_active: true,
      is_system_account: true
    },
    {
      account_id: '4',
      account_code: '1500',
      account_name: 'Buses and Fleet Vehicles',
      account_type: AccountType.ASSET,
      description: 'Transportation fleet assets - buses and service vehicles',
      is_active: true,
      is_system_account: false
    },
    {
      account_id: '5',
      account_code: '1510',
      account_name: 'Accumulated Depreciation - Vehicles',
      account_type: AccountType.ASSET,
      description: 'Contra asset account for vehicle depreciation',
      is_active: true,
      is_system_account: false,
      parent_account_id: '4',
      parent_account_code: '1500',
      parent_account_name: 'Buses and Fleet Vehicles'
    },
    // LIABILITIES
    {
      account_id: '6',
      account_code: '2000',
      account_name: 'Accounts Payable',
      account_type: AccountType.LIABILITY,
      description: 'Amounts owed to suppliers and vendors',
      is_active: true,
      is_system_account: true
    },
    {
      account_id: '7',
      account_code: '2100',
      account_name: 'Salaries Payable',
      account_type: AccountType.LIABILITY,
      description: 'Accrued salaries and wages owed to employees',
      is_active: true,
      is_system_account: false
    },
    {
      account_id: '8',
      account_code: '2500',
      account_name: 'Long-term Loans',
      account_type: AccountType.LIABILITY,
      description: 'Bank loans and long-term financing obligations',
      is_active: true,
      is_system_account: false
    },
    // EQUITY
    {
      account_id: '9',
      account_code: '3000',
      account_name: 'Capital',
      account_type: AccountType.EQUITY,
      description: 'Initial capital investment and owner contributions',
      is_active: true,
      is_system_account: true
    },
    {
      account_id: '10',
      account_code: '3100',
      account_name: 'Retained Earnings',
      account_type: AccountType.EQUITY,
      description: 'Accumulated profits retained in the business',
      is_active: true,
      is_system_account: true
    },
    // REVENUE
    {
      account_id: '11',
      account_code: '4000',
      account_name: 'Fare Revenue',
      account_type: AccountType.REVENUE,
      description: 'Income from passenger fares and ticket sales',
      is_active: true,
      is_system_account: true
    },
    {
      account_id: '12',
      account_code: '4010',
      account_name: 'Regular Route Fares',
      account_type: AccountType.REVENUE,
      description: 'Revenue from standard scheduled bus routes',
      is_active: true,
      is_system_account: false,
      parent_account_id: '11',
      parent_account_code: '4000',
      parent_account_name: 'Fare Revenue'
    },
    {
      account_id: '13',
      account_code: '4020',
      account_name: 'Charter Service Revenue',
      account_type: AccountType.REVENUE,
      description: 'Income from private charter bookings',
      is_active: true,
      is_system_account: false,
      parent_account_id: '11',
      parent_account_code: '4000',
      parent_account_name: 'Fare Revenue'
    },
    {
      account_id: '14',
      account_code: '4100',
      account_name: 'Other Operating Revenue',
      account_type: AccountType.REVENUE,
      description: 'Miscellaneous operating income',
      is_active: true,
      is_system_account: false
    },
    // EXPENSES
    {
      account_id: '15',
      account_code: '5000',
      account_name: 'Fuel and Oil Expenses',
      account_type: AccountType.EXPENSE,
      description: 'Diesel fuel and lubricants for fleet operations',
      is_active: true,
      is_system_account: false
    },
    {
      account_id: '16',
      account_code: '5100',
      account_name: 'Salaries and Wages',
      account_type: AccountType.EXPENSE,
      description: 'Employee compensation including drivers and staff',
      is_active: true,
      is_system_account: false
    },
    {
      account_id: '17',
      account_code: '5200',
      account_name: 'Maintenance and Repairs',
      account_type: AccountType.EXPENSE,
      description: 'Vehicle maintenance, repairs, and spare parts',
      is_active: true,
      is_system_account: false
    },
    {
      account_id: '18',
      account_code: '5300',
      account_name: 'Office Supplies',
      account_type: AccountType.EXPENSE,
      description: 'Administrative supplies and office materials',
      is_active: true,
      is_system_account: false
    },
    {
      account_id: '19',
      account_code: '5400',
      account_name: 'Depreciation Expense',
      account_type: AccountType.EXPENSE,
      description: 'Periodic depreciation of fixed assets',
      is_active: true,
      is_system_account: false
    },
    {
      account_id: '20',
      account_code: '5500',
      account_name: 'Utilities Expense',
      account_type: AccountType.EXPENSE,
      description: 'Electricity, water, and utility costs - archived account',
      is_active: false,
      is_system_account: false
    }
  ];

  // Fetch accounts from API (currently using dummy data)
  const loadAccountsFromApi = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use dummy data instead of API call
      setAllAccounts(dummyAccounts);
      setLoading(false);

      // Real API call (commented out)
      // const data = await fetchChartOfAccounts();
      // setAllAccounts(data);
      // setLoading(false);
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

  // Handle filter changes from FilterDropdown component
  const handleFilterApply = (filterValues: Record<string, any>) => {
    setAccountTypeFilters((filterValues.accountTypes as string[]) || []);
    setStatusFilter((filterValues.status as 'active' | 'archived' | 'all') || 'active');
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
          <div className='search-filter-container'>
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
            <br/>
            {/* Filter Component */}
            <FilterDropdown
              sections={filterSections}
              onApply={handleFilterApply}
              initialValues={{
                accountTypes: accountTypeFilters,
                status: statusFilter,
              }}
            />
          </div>
          

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
                  <th>Account Code</th>
                  <th className="account-name">Account Name</th>
                  <th>Account Type</th>
                  <th>Normal Balance</th>
                  <th>Description</th>
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
                      </td>

                      {/* Account Type */}
                      <td>
                        <span className={`chip ${getAccountTypeClass(account.account_type)}`}>
                          {account.account_type}
                        </span>
                      </td>

                      {/* Normal Balance */}
                      <td>{getNormalBalance(account.account_type)}</td>

                      {/* Description */}
                      <td>
                        {account.description ? (
                          <span title={account.description}>
                            {account.description.length > 50 
                              ? `${account.description.substring(0, 50)}...` 
                              : account.description}
                          </span>
                        ) : '-'}
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
