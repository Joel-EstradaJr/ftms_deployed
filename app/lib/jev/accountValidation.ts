// ==================== ACCOUNT VALIDATION FUNCTIONS ====================

import { ValidationResult, AccountType, NormalBalance, ChartOfAccount } from '@/app/types/jev';

/**
 * Validate account code format (4 digits)
 */
export const validateAccountCode = (code: string): ValidationResult => {
  const errors: string[] = [];

  if (!code || code.trim() === '') {
    errors.push('Account code is required');
  } else if (!/^\d{4}$/.test(code)) {
    errors.push('Account code must be exactly 4 digits');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate account code uniqueness (needs API call)
 * TODO: Replace with ftms_backend API call when backend is ready
 */
export const validateAccountCodeUniqueness = async (
  code: string,
  existingId?: string
): Promise<ValidationResult> => {
  const errors: string[] = [];

  try {
    // TEMPORARY: Skipping uniqueness check until ftms_backend API is ready
    // TODO: Implement this endpoint in ftms_backend:
    // GET http://localhost:4000/api/jev/chart-of-accounts/validate-code?code=1234&exclude=uuid
    console.warn('Account code uniqueness validation temporarily disabled - waiting for ftms_backend API');
    
    // TEMPORARY: Commented out until ftms_backend endpoint is created
    // const params = new URLSearchParams({ code });
    // if (existingId) {
    //   params.append('exclude', existingId);
    // }
    // const response = await fetch(`/api/jev/chart-of-accounts/validate-code?${params}`);
    // const data = await response.json();
    // if (!data.available) {
    //   errors.push('Account code already exists');
    // }
  } catch (error) {
    errors.push('Failed to validate account code uniqueness');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate account name
 */
export const validateAccountName = (name: string): ValidationResult => {
  const errors: string[] = [];

  if (!name || name.trim() === '') {
    errors.push('Account name is required');
  } else if (name.trim().length < 3) {
    errors.push('Account name must be at least 3 characters');
  } else if (name.trim().length > 100) {
    errors.push('Account name must not exceed 100 characters');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate account type
 */
export const validateAccountType = (type: string): ValidationResult => {
  const errors: string[] = [];

  const validTypes = Object.values(AccountType);
  if (!type) {
    errors.push('Account type is required');
  } else if (!validTypes.includes(type as AccountType)) {
    errors.push('Invalid account type');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate normal balance based on account type
 */
export const validateNormalBalance = (
  accountType: AccountType,
  normalBalance: NormalBalance
): ValidationResult => {
  const errors: string[] = [];

  const expectedBalance = getExpectedNormalBalance(accountType);
  
  if (normalBalance !== expectedBalance) {
    errors.push(`Warning: ${accountType} accounts typically have ${expectedBalance} normal balance`);
  }

  return { valid: true, errors }; // Warning only, not a blocking error
};

/**
 * Get expected normal balance for account type
 */
export const getExpectedNormalBalance = (accountType: AccountType): NormalBalance => {
  switch (accountType) {
    case AccountType.ASSET:
    case AccountType.EXPENSE:
      return NormalBalance.DEBIT;
    case AccountType.LIABILITY:
    case AccountType.EQUITY:
    case AccountType.REVENUE:
      return NormalBalance.CREDIT;
    default:
      return NormalBalance.DEBIT;
  }
};

/**
 * Validate account can be archived
 */
export const validateAccountArchival = (
  hasTransactions: boolean,
  childCount: number,
  isSystemAccount: boolean
): ValidationResult => {
  const errors: string[] = [];

  if (isSystemAccount) {
    errors.push('System accounts cannot be archived');
  }

  if (childCount > 0) {
    errors.push('Cannot archive account with child accounts. Archive or reassign child accounts first.');
  }

  if (hasTransactions) {
    // This is a warning, not a blocking error
    errors.push('Warning: This account has linked transactions. Archiving will hide it but preserve transaction history.');
  }

  return { valid: isSystemAccount || childCount > 0 ? false : true, errors };
};

/**
 * Validate account can be edited
 */
export const validateAccountEdit = (
  isSystemAccount: boolean,
  hasTransactions: boolean,
  fieldName: string
): ValidationResult => {
  const errors: string[] = [];
  const criticalFields = ['account_code', 'account_type', 'normal_balance'];

  if (isSystemAccount) {
    errors.push('System accounts cannot be modified');
  } else if (hasTransactions && criticalFields.includes(fieldName)) {
    errors.push(`Cannot modify ${fieldName} for accounts with linked transactions`);
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validate complete account form
 */
export const validateAccountForm = async (
  formData: {
    account_code: string;
    account_name: string;
    account_type: AccountType;
  },
  existingId?: string
): Promise<ValidationResult> => {
  const allErrors: string[] = [];

  // Validate account code
  const codeResult = validateAccountCode(formData.account_code);
  allErrors.push(...codeResult.errors);

  // Validate account code uniqueness
  if (codeResult.valid) {
    const uniquenessResult = await validateAccountCodeUniqueness(
      formData.account_code,
      existingId
    );
    allErrors.push(...uniquenessResult.errors);
  }

  // Validate account name
  const nameResult = validateAccountName(formData.account_name);
  allErrors.push(...nameResult.errors);

  // Validate account type
  const typeResult = validateAccountType(formData.account_type);
  allErrors.push(...typeResult.errors);

  return { valid: allErrors.length === 0, errors: allErrors };
};