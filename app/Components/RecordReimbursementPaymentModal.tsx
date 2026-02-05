/**
 * Record Reimbursement Payment Modal
 * 
 * Modal component for recording reimbursement payments for operational expenses.
 * Similar to TripReceivablePaymentModal but for payables (outgoing payments).
 * 
 * Features:
 * - Employee selector tabs (Driver | Conductor) with 50:50 split
 * - Summary card showing total reimbursement amount and status
 * - Passes selected employee's schedule to generic RecordPaymentModal
 * - Edit functionality for pending installments
 */

"use client";

import React, { useState, useMemo, useEffect } from "react";
import RecordPaymentModal from "@/Components/RecordPaymentModal";
import { formatMoney, formatDate } from "@/utils/formatting";
import { PaymentRecordData } from "@/app/types/payments";
import { ScheduleItem, PaymentStatus } from "@/app/types/schedule";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/components/chips.css";

// Reimbursement details from API
interface ReimbursementDetails {
    expense_id: number;
    expense_code: string;
    total_amount: number;
    payment_status: string;
    date_recorded: string;
    body_number?: string;
    expense_type_name?: string;

    // Driver reimbursement details
    driver?: {
        employee_number: string;
        employee_name: string;
        share_amount: number;
        paid_amount: number;
        balance: number;
        status: string;
        installments: ScheduleItem[];
    };

    // Conductor reimbursement details
    conductor?: {
        employee_number: string;
        employee_name: string;
        share_amount: number;
        paid_amount: number;
        balance: number;
        status: string;
        installments: ScheduleItem[];
    };
}

interface RecordReimbursementPaymentModalProps {
    expenseId: number;
    paymentMethods: Array<{ id: number; methodName: string; methodCode: string }>;
    currentUser: string;
    onPaymentRecorded: () => Promise<void>;
    onClose: () => void;
}

type EmployeeTab = 'driver' | 'conductor';

export default function RecordReimbursementPaymentModal({
    expenseId,
    paymentMethods,
    currentUser,
    onPaymentRecorded,
    onClose
}: RecordReimbursementPaymentModalProps) {
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeTab>('driver');
    const [selectedInstallment, setSelectedInstallment] = useState<ScheduleItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Reimbursement details from API
    const [reimbursementData, setReimbursementData] = useState<ReimbursementDetails | null>(null);

    // Fetch reimbursement details from API
    useEffect(() => {
        const fetchReimbursementDetails = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/admin/operational-expenses/${expenseId}/reimbursement`);
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to fetch reimbursement details');
                }

                setReimbursementData(result.data);
            } catch (err) {
                console.error('Error fetching reimbursement details:', err);
                setError(err instanceof Error ? err.message : 'Failed to load reimbursement details');
            } finally {
                setLoading(false);
            }
        };

        if (expenseId) {
            fetchReimbursementDetails();
        }
    }, [expenseId, refreshKey]);

    // Check if conductor exists
    const hasConductor = (): boolean => {
        return !!(reimbursementData?.conductor && reimbursementData.conductor.employee_name);
    };

    // Get schedule items for selected employee
    const getScheduleItems = (): ScheduleItem[] => {
        if (!reimbursementData) return [];

        const employee = selectedEmployee === 'driver'
            ? reimbursementData.driver
            : reimbursementData.conductor;

        return employee?.installments || [];
    };

    const scheduleItems = getScheduleItems();

    // Get employee details
    const getEmployeeDetails = () => {
        if (!reimbursementData) return null;
        return selectedEmployee === 'driver'
            ? reimbursementData.driver
            : reimbursementData.conductor;
    };

    const employeeDetails = getEmployeeDetails();

    // Check if all payments are complete
    const isFullyPaid = useMemo(() => {
        if (!reimbursementData) return false;

        const driverPaid = !reimbursementData.driver || reimbursementData.driver.balance <= 0;
        const conductorPaid = !hasConductor() || (reimbursementData.conductor?.balance ?? 0) <= 0;

        return driverPaid && conductorPaid;
    }, [reimbursementData]);

    // Get status chip class
    const getStatusClass = (status: string): string => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED':
            case 'PAID':
                return 'paid';
            case 'PARTIALLY_PAID':
            case 'PARTIALLY_REIMBURSED':
            case 'PARTIAL':
                return 'partially-paid';
            case 'OVERDUE':
                return 'overdue';
            case 'PENDING_REIMBURSEMENT':
            case 'PENDING':
            default:
                return 'pending';
        }
    };

    // Format status for display
    const formatStatus = (status: string): string => {
        return (status || 'PENDING').replace(/_/g, ' ');
    };

    // Handle payment recorded
    const handlePaymentRecorded = async (paymentData: PaymentRecordData): Promise<void> => {
        try {
            const response = await fetch(`/api/admin/operational-expenses/${expenseId}/reimbursement/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_type: selectedEmployee,
                    installment_id: paymentData.scheduleItemId,
                    amount_paid: paymentData.amountToPay,
                    payment_date: paymentData.paymentDate,
                    payment_method: paymentData.paymentMethodCode,
                    payment_reference: paymentData.referenceNumber,
                    employee_role: selectedEmployee?.toUpperCase()
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to record payment');
            }

            await onPaymentRecorded();

            // Refresh data to show updated balances
            setRefreshKey(prev => prev + 1);

            // Reset selected installment (returns to installment list view)
            setSelectedInstallment(null);
        } catch (err) {
            console.error('Error recording reimbursement payment:', err);
            throw err;
        }
    };

    // Get first unpaid installment for the selected employee
    const getFirstUnpaidInstallment = (): ScheduleItem | null => {
        const unpaid = scheduleItems.find(item => {
            const balance = item.balance ?? (item.amount_due - (item.amount_paid || 0));
            return balance > 0 &&
                item.status !== PaymentStatus.COMPLETED &&
                item.status !== PaymentStatus.CANCELLED &&
                item.status !== PaymentStatus.WRITTEN_OFF;
        });
        return unpaid || null;
    };

    // If an installment is selected, show RecordPaymentModal
    if (selectedInstallment && employeeDetails) {
        const recordRef = `${reimbursementData?.expense_code} - ${selectedEmployee === 'driver' ? 'Driver' : 'Conductor'}: ${employeeDetails.employee_name}`;

        return (
            <RecordPaymentModal
                entityType="payable"
                recordId={String(expenseId)}
                recordRef={recordRef}
                scheduleItems={scheduleItems}
                selectedInstallment={selectedInstallment}
                paymentMethods={paymentMethods}
                currentUser={currentUser}
                onPaymentRecorded={handlePaymentRecorded}
                onClose={() => setSelectedInstallment(null)}
                processCascadePayment={(amount, items, startIndex) => {
                    // Simple cascade: apply to current installment only for reimbursements
                    const currentItem = items[startIndex];
                    const applied = Math.min(amount, currentItem.balance || 0);
                    return {
                        affectedInstallments: [{
                            scheduleItemId: String(currentItem.id),
                            installmentNumber: currentItem.installment_number,
                            amountApplied: applied,
                            previousBalance: currentItem.balance || 0,
                            newBalance: (currentItem.balance || 0) - applied,
                            newStatus: applied >= (currentItem.balance || 0) ? PaymentStatus.COMPLETED : PaymentStatus.PARTIALLY_PAID,
                        }],
                        remainingAmount: amount - applied,
                        totalProcessed: applied,
                    };
                }}
                employeeNumber={employeeDetails.employee_number}
                employeeName={employeeDetails.employee_name}
            />
        );
    }

    // Loading state
    if (loading) {
        return (
            <>
                <div className="modal-heading">
                    <h1 className="modal-title">Record Reimbursement</h1>
                    <button className="close-modal-btn" onClick={onClose}>
                        <i className="ri-close-line"></i>
                    </button>
                </div>
                <div className="modal-content view" style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Loading reimbursement details...</p>
                </div>
            </>
        );
    }

    // Error state
    if (error || !reimbursementData) {
        return (
            <>
                <div className="modal-heading">
                    <h1 className="modal-title">Record Reimbursement</h1>
                    <button className="close-modal-btn" onClick={onClose}>
                        <i className="ri-close-line"></i>
                    </button>
                </div>
                <div className="modal-content view" style={{ textAlign: 'center', padding: '40px', color: '#dc3545' }}>
                    <p>{error || 'Failed to load reimbursement details'}</p>
                </div>
            </>
        );
    }

    // Main view - Employee selection
    return (
        <>
            <div className="modal-heading">
                <h1 className="modal-title">Record Reimbursement</h1>
                <div className="modal-date-time">
                    <p>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <p>{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                </div>
                <button className="close-modal-btn" onClick={onClose}>
                    <i className="ri-close-line"></i>
                </button>
            </div>

            {/* Expense Information Summary */}
            <p className="details-title">Expense Information</p>
            <div className="modal-content view">
                <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <strong>Expense Code:</strong> {reimbursementData.expense_code}
                    </div>
                    <div>
                        <strong>Body Number:</strong> {reimbursementData.body_number || 'N/A'}
                    </div>
                    <div>
                        <strong>Date Recorded:</strong> {formatDate(reimbursementData.date_recorded)}
                    </div>
                    <div>
                        <strong>Total Amount:</strong> {formatMoney(reimbursementData.total_amount)}
                    </div>
                    <div>
                        <strong>Status:</strong>{' '}
                        <span className={`chip ${getStatusClass(reimbursementData.payment_status)}`}>
                            {formatStatus(reimbursementData.payment_status)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Employee Selection Tabs */}
            <p className="details-title">Select Employee to Reimburse</p>
            <div className="modal-content add">
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    {/* Driver Tab */}
                    {reimbursementData.driver && (
                        <div
                            onClick={() => setSelectedEmployee('driver')}
                            style={{
                                flex: 1,
                                padding: '16px',
                                border: selectedEmployee === 'driver' ? '2px solid var(--primary-color)' : '1px solid #ddd',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                backgroundColor: selectedEmployee === 'driver' ? '#f0f7ff' : '#fff',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <strong style={{ fontSize: '16px' }}>
                                    <i className="ri-steering-2-line" style={{ marginRight: '8px' }}></i>
                                    Driver
                                </strong>
                                <span className={`chip ${getStatusClass(reimbursementData.driver.status)}`}>
                                    {formatStatus(reimbursementData.driver.status)}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                                ID: {reimbursementData.driver.employee_number}
                            </div>
                            <div style={{ color: '#666', marginBottom: '8px' }}>{reimbursementData.driver.employee_name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Share: {formatMoney(reimbursementData.driver.share_amount)}</span>
                                <span style={{ color: reimbursementData.driver.balance > 0 ? '#FF4949' : '#4CAF50', fontWeight: '600' }}>
                                    Balance: {formatMoney(reimbursementData.driver.balance)}
                                </span>
                            </div>
                            {reimbursementData.driver.installments.length > 0 && (
                                <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                                    {reimbursementData.driver.installments.length} installment(s)
                                </div>
                            )}
                        </div>
                    )}

                    {/* Conductor Tab - Only show if conductor exists */}
                    {hasConductor() && reimbursementData.conductor && (
                        <div
                            onClick={() => setSelectedEmployee('conductor')}
                            style={{
                                flex: 1,
                                padding: '16px',
                                border: selectedEmployee === 'conductor' ? '2px solid var(--primary-color)' : '1px solid #ddd',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                backgroundColor: selectedEmployee === 'conductor' ? '#f0f7ff' : '#fff',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <strong style={{ fontSize: '16px' }}>
                                    <i className="ri-user-line" style={{ marginRight: '8px' }}></i>
                                    Conductor
                                </strong>
                                <span className={`chip ${getStatusClass(reimbursementData.conductor.status)}`}>
                                    {formatStatus(reimbursementData.conductor.status)}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                                ID: {reimbursementData.conductor.employee_number}
                            </div>
                            <div style={{ color: '#666', marginBottom: '8px' }}>{reimbursementData.conductor.employee_name}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Share: {formatMoney(reimbursementData.conductor.share_amount)}</span>
                                <span style={{ color: reimbursementData.conductor.balance > 0 ? '#FF4949' : '#4CAF50', fontWeight: '600' }}>
                                    Balance: {formatMoney(reimbursementData.conductor.balance)}
                                </span>
                            </div>
                            {reimbursementData.conductor.installments.length > 0 && (
                                <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                                    {reimbursementData.conductor.installments.length} installment(s)
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={onClose}>
                    Close
                </button>

                {isFullyPaid && (
                    <button
                        type="button"
                        className="submit-btn"
                        style={{ backgroundColor: '#4CAF50' }}
                        disabled
                    >
                        <i className="ri-check-double-line" style={{ marginRight: '8px' }}></i>
                        Fully Reimbursed
                    </button>
                )}

                {!isFullyPaid && employeeDetails && (
                    <button
                        type="button"
                        className="submit-btn"
                        onClick={() => {
                            // If there are schedule items, select the first unpaid one
                            if (scheduleItems.length > 0) {
                                const firstUnpaid = getFirstUnpaidInstallment();
                                if (firstUnpaid) setSelectedInstallment(firstUnpaid);
                            } else {
                                // No installments yet - create a synthetic schedule item
                                const currentBalance = employeeDetails.balance;

                                if (currentBalance > 0) {
                                    const syntheticInstallment: ScheduleItem = {
                                        id: `synthetic-${expenseId}-${selectedEmployee}`,
                                        installment_number: 1,
                                        due_date: new Date().toISOString(),
                                        amount_due: currentBalance,
                                        amount_paid: 0,
                                        balance: currentBalance,
                                        status: PaymentStatus.PENDING
                                    };
                                    setSelectedInstallment(syntheticInstallment);
                                }
                            }
                        }}
                        disabled={!employeeDetails || employeeDetails.balance <= 0}
                    >
                        <i className="ri-hand-coin-line" style={{ marginRight: '8px' }}></i>
                        Record Payment
                    </button>
                )}
            </div>
        </>
    );
}
