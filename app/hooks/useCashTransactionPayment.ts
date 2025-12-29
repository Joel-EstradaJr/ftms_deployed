import { useState, useCallback } from 'react';
import { PaymentInfo, PaymentStatus } from '../types/expenses';

/**
 * Custom hook for fetching payment information from CashTransaction module
 * and managing payment-related operations for purchase expenses
 */
export const useCashTransactionPayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

  /**
   * Fetch payment status and history for a specific purchase expense
   * @param expenseId - The ID of the purchase expense
   * @returns PaymentInfo object with status, amounts, and history
   */
  const fetchPaymentStatus = useCallback(async (expenseId: string): Promise<PaymentInfo | null> => {
    setLoading(true);
    setError(null);

    try {
      // MOCK DATA: UI-only mode - no API calls
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Return mock payment info
      const mockPaymentInfo: PaymentInfo = {
        total_paid: 0,
        balance: 0,
        payment_status: PaymentStatus.PENDING,
        due_date: undefined,
        payment_history: []
      };

      setPaymentInfo(mockPaymentInfo);
      return mockPaymentInfo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching payment status:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Open the Cash Transaction modal for recording a payment
   * This is a placeholder that should trigger the modal in the parent component
   * @param expenseId - The ID of the purchase expense to record payment for
   * @param expenseAmount - The total expense amount
   */
  const openPaymentModal = useCallback((expenseId: string, expenseAmount: number) => {
    // TODO: Implement modal trigger logic
    // This should dispatch an event or callback to open the Cash Transaction modal
    console.log(`Opening payment modal for expense ${expenseId} with amount ${expenseAmount}`);
    
    // Example: You might want to use a callback passed from parent component
    // or dispatch a custom event that the parent listens to
    const event = new CustomEvent('openCashTransactionModal', {
      detail: {
        expenseId,
        expenseType: 'PURCHASE',
        amount: expenseAmount
      }
    });
    window.dispatchEvent(event);
  }, []);

  /**
   * Refresh payment information after a payment is recorded
   * @param expenseId - The ID of the purchase expense
   */
  const refreshPaymentInfo = useCallback(async (expenseId: string) => {
    await fetchPaymentStatus(expenseId);
  }, [fetchPaymentStatus]);

  /**
   * Clear the current payment information and error state
   */
  const clearPaymentInfo = useCallback(() => {
    setPaymentInfo(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    paymentInfo,
    fetchPaymentStatus,
    openPaymentModal,
    refreshPaymentInfo,
    clearPaymentInfo
  };
};

export default useCashTransactionPayment;
