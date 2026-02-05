"use client";

import React, { useState } from "react";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/components/chips.css";
import Swal from "sweetalert2";

interface PaymentSchedule {
    id: string;
    scheduleId: string;
    dueDate: string;
    amount: number;
    status: "PENDING" | "PAID" | "OVERDUE";
    paidDate?: string;
    paymentAmount?: number;
    receiptId?: string;
}

interface Payment {
    payment_id: string;
    payment_amount: number;
    payment_date: string;
    payment_reference?: string;
    createdAt: string;
    is_installment: boolean;
}

interface RentalRevenue {
    rental_id: string;
    rental_date: string | Date;
    price: number;
    payment_amount: number;
    remaining_balance: number;
    payment_status: string;
    payer_type: string;
    revenueTypeId: string;
    revenueType?: {
        id: string;
        name: string;
    };
    bus?: {
        bus_number: string;
        plate_number: string;
    };
    organization?: {
        organization_name: string;
    };
    passenger?: {
        first_name: string;
        last_name: string;
    };
    scheduled_revenue?: {
        start_date: string;
        end_date: string;
        frequency: string;
        occurrences: number;
        schedules?: PaymentSchedule[];
    };
    payments?: Payment[];
    createdAt: string;
    updatedAt: string;
}

interface Props {
    rental: RentalRevenue;
    onClose: () => void;
    onEdit: () => void;
    onRefresh: () => void;
}

const ViewRentalDetails: React.FC<Props> = ({ rental, onClose, onEdit, onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'payments' | 'schedule'>('details');
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const formatDate = (dateString: string | Date) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatCurrency = (amount: number) => {
        return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'PAID': return 'status-paid';
            case 'PARTIALLY_PAID': return 'status-partial';
            case 'PENDING': return 'status-pending';
            case 'OVERDUE': return 'status-overdue';
            default: return '';
        }
    };

    const getPayerName = () => {
        if (rental.payer_type === 'ORGANIZATION') {
            return rental.organization?.organization_name || 'Unknown Organization';
        }
        return rental.passenger ? `${rental.passenger.first_name} ${rental.passenger.last_name}` : 'Unknown Individual';
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            Swal.fire({ icon: 'error', title: 'Invalid Amount', text: 'Please enter a valid payment amount.' });
            return;
        }
        if (amount > rental.remaining_balance) {
            Swal.fire({ icon: 'error', title: 'Amount Too High', text: 'Payment cannot exceed remaining balance.' });
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`/api/staff/rental-revenue/${rental.rental_id}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment_amount: amount,
                    payment_reference: paymentReference || undefined
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to record payment');
            }

            await Swal.fire({
                icon: 'success',
                title: 'Payment Recorded',
                text: 'The payment has been recorded successfully.',
                timer: 2000,
                showConfirmButton: false
            });

            setShowPaymentForm(false);
            setPaymentAmount('');
            setPaymentReference('');
            onRefresh();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to record payment'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content view-rental-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-info">
                        <h2>Rental Details</h2>
                        <span className="rental-id">{rental.rental_id}</span>
                    </div>
                    <div className="header-actions">
                        <button className="edit-btn" onClick={onEdit}>
                            <i className="ri-edit-line"></i> Edit
                        </button>
                        <button className="close-btn" onClick={onClose}>
                            <i className="ri-close-line"></i>
                        </button>
                    </div>
                </div>

                <div className="status-banner">
                    <span className={`status-badge large ${getStatusBadgeClass(rental.payment_status)}`}>
                        {rental.payment_status.replace('_', ' ')}
                    </span>
                    <div className="balance-info">
                        <span className="label">Balance</span>
                        <span className="value">{formatCurrency(rental.remaining_balance)}</span>
                    </div>
                </div>

                <div className="tabs">
                    <button
                        className={activeTab === 'details' ? 'active' : ''}
                        onClick={() => setActiveTab('details')}
                    >
                        Details
                    </button>
                    <button
                        className={activeTab === 'payments' ? 'active' : ''}
                        onClick={() => setActiveTab('payments')}
                    >
                        Payments ({rental.payments?.length || 0})
                    </button>
                    {rental.scheduled_revenue && (
                        <button
                            className={activeTab === 'schedule' ? 'active' : ''}
                            onClick={() => setActiveTab('schedule')}
                        >
                            Schedule
                        </button>
                    )}
                </div>

                <div className="tab-content">
                    {activeTab === 'details' && (
                        <div className="details-content">
                            <div className="info-section">
                                <h3>Rental Information</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="label">Rental Date</span>
                                        <span className="value">{formatDate(rental.rental_date)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Revenue Type</span>
                                        <span className="value">{rental.revenueType?.name || 'N/A'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Bus</span>
                                        <span className="value">
                                            {rental.bus ? `${rental.bus.bus_number} (${rental.bus.plate_number})` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section">
                                <h3>Payer Information</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="label">Payer Type</span>
                                        <span className="value">{rental.payer_type}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Payer Name</span>
                                        <span className="value">{getPayerName()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section">
                                <h3>Payment Summary</h3>
                                <div className="payment-summary">
                                    <div className="summary-row">
                                        <span>Total Price</span>
                                        <span>{formatCurrency(rental.price)}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span>Amount Paid</span>
                                        <span className="paid">{formatCurrency(rental.payment_amount)}</span>
                                    </div>
                                    <div className="summary-row total">
                                        <span>Remaining Balance</span>
                                        <span className={rental.remaining_balance > 0 ? 'pending' : 'paid'}>
                                            {formatCurrency(rental.remaining_balance)}
                                        </span>
                                    </div>
                                </div>

                                {rental.remaining_balance > 0 && !showPaymentForm && (
                                    <button
                                        className="record-payment-btn"
                                        onClick={() => setShowPaymentForm(true)}
                                    >
                                        <i className="ri-money-dollar-circle-line"></i> Record Payment
                                    </button>
                                )}

                                {showPaymentForm && (
                                    <form className="payment-form" onSubmit={handlePayment}>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Payment Amount (₱)</label>
                                                <input
                                                    type="number"
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    min="0.01"
                                                    max={rental.remaining_balance}
                                                    step="0.01"
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Reference (Optional)</label>
                                                <input
                                                    type="text"
                                                    value={paymentReference}
                                                    onChange={(e) => setPaymentReference(e.target.value)}
                                                    placeholder="Receipt #, Check #, etc."
                                                />
                                            </div>
                                        </div>
                                        <div className="form-actions">
                                            <button type="button" onClick={() => setShowPaymentForm(false)} disabled={submitting}>
                                                Cancel
                                            </button>
                                            <button type="submit" className="submit" disabled={submitting}>
                                                {submitting ? 'Processing...' : 'Submit Payment'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="payments-content">
                            {rental.payments && rental.payments.length > 0 ? (
                                <table className="payments-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Reference</th>
                                            <th>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rental.payments.map(payment => (
                                            <tr key={payment.payment_id}>
                                                <td>{formatDate(payment.payment_date)}</td>
                                                <td>{formatCurrency(payment.payment_amount)}</td>
                                                <td>{payment.payment_reference || '-'}</td>
                                                <td>
                                                    <span className={`payment-type ${payment.is_installment ? 'installment' : 'direct'}`}>
                                                        {payment.is_installment ? 'Installment' : 'Direct'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="empty-state">
                                    <i className="ri-wallet-3-line"></i>
                                    <p>No payments recorded yet</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'schedule' && rental.scheduled_revenue && (
                        <div className="schedule-content">
                            <div className="schedule-info">
                                <div className="info-row">
                                    <span>Frequency</span>
                                    <span>{rental.scheduled_revenue.frequency}</span>
                                </div>
                                <div className="info-row">
                                    <span>Total Occurrences</span>
                                    <span>{rental.scheduled_revenue.occurrences}</span>
                                </div>
                                <div className="info-row">
                                    <span>Period</span>
                                    <span>
                                        {formatDate(rental.scheduled_revenue.start_date)} - {formatDate(rental.scheduled_revenue.end_date)}
                                    </span>
                                </div>
                            </div>

                            {rental.scheduled_revenue.schedules && rental.scheduled_revenue.schedules.length > 0 && (
                                <table className="schedule-table">
                                    <thead>
                                        <tr>
                                            <th>Due Date</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Paid Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rental.scheduled_revenue.schedules.map(schedule => (
                                            <tr key={schedule.id}>
                                                <td>{formatDate(schedule.dueDate)}</td>
                                                <td>{formatCurrency(schedule.amount)}</td>
                                                <td>
                                                    <span className={`status-badge ${getStatusBadgeClass(schedule.status)}`}>
                                                        {schedule.status}
                                                    </span>
                                                </td>
                                                <td>{schedule.paidDate ? formatDate(schedule.paidDate) : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <div className="timestamps">
                        <span>Created: {formatDate(rental.createdAt)}</span>
                        <span>Updated: {formatDate(rental.updatedAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewRentalDetails;
