import { AccountType, NormalBalance, ChartOfAccount } from '@/app/types/jev';


/**
 * Derives normal balance from account type
 * Assets & Expenses = DEBIT
 * Liabilities, Equity & Revenue = CREDIT
 */
export function getNormalBalance(accountType: AccountType): NormalBalance {
  switch (accountType) {
    case AccountType.ASSET:
    case AccountType.EXPENSE:
      return NormalBalance.DEBIT;
    
    case AccountType.LIABILITY:
    case AccountType.EQUITY:
    case AccountType.REVENUE:
      return NormalBalance.CREDIT;
  }
}

/**
 * Gets CSS class for account type chip
 */
export function getAccountTypeClass(accountType: AccountType): string {
  switch (accountType) {
    case AccountType.ASSET:
      return 'active'; // Blue chip
    case AccountType.LIABILITY:
      return 'Rejected'; // Red chip
    case AccountType.EQUITY:
      return 'Draft'; // Gray chip
    case AccountType.REVENUE:
      return 'approved'; // Green chip
    case AccountType.EXPENSE:
      return 'Rejected'; // Red chip
    default:
      return '';
  }
}

/**
 * Checks if account can be archived
 */
export function canArchiveAccount(account: ChartOfAccount): boolean {
  // System accounts cannot be archived
  if (account.is_system_account) {
    return false;
  }
  
  // Already archived
  if (!account.is_active) {
    return false;
  }
  
  return true;
}

/**
 * Gets account status info for display
 */
export function getAccountStatusInfo(account: ChartOfAccount): {
  label: string;
  chipClass: string;
} {
  if (!account.is_active) {
    return { label: 'Archived', chipClass: 'closed' };
  }
  
  return { label: 'Active', chipClass: 'active' };
}

/**
 * Checks if account fields can be edited
 */
export function canEditAccount(account: ChartOfAccount): boolean {
  // System accounts cannot be edited
  if (account.is_system_account) {
    return false;
  }
  
  // Archived accounts cannot be edited
  if (!account.is_active) {
    return false;
  }
  
  return true;
}

/**
 * Formats account balance for display
 */
export function formatAccountBalance(balance: number | undefined): string {
  if (balance === undefined || balance === null) {
    return '₱0.00';
  }
  
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(balance);
}