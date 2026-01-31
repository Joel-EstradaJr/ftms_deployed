// Shared Payment types for both revenue and expense flows

import { PaymentStatus } from './revenue';

export interface PaymentCascadeResult {
  success: boolean;
  totalAmountApplied: number;
  remainingAmount: number;
  affectedInstallments: {
    installmentNumber: number;
    scheduleItemId: string;
    amountApplied: number;
    previousBalance: number;
    newBalance: number;
    newStatus: PaymentStatus;
  }[];
  message?: string;
}

export interface PaymentRecordData {
  // Generic fields for recording a payment on a schedule item
  recordId?: string | number; // expenseId or revenueId
  recordRef?: string; // invoice_number, revenueCode, etc
  scheduleItemId: string;
  scheduleItemIds?: string[];
  installmentNumber: number;
  amountToPay: number;
  paymentDate: string;
  paymentMethodId: number;
  paymentMethodCode?: string; // Prisma enum code (CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT)
  paymentMethod?: string;
  referenceNumber?: string;
  remarks?: string;
  recordedBy: string;
  cascadeBreakdown?: {
    installmentNumber: number;
    scheduleItemId: string;
    amountApplied: number;
  }[];
}

export interface PaymentMethod {
  id: number;
  methodName: string;
  methodCode: string;
}
