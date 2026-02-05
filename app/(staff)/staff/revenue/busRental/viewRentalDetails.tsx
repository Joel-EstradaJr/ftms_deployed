/**
 * View Rental Details Modal Component
 * 
 * Read-only modal for displaying rental revenue details
 * 
 * Fields (matching database schema):
 * - code: string (revenue code)
 * - revenue_type_id: number (FK to revenue_type table)
 * - total_rental_amount: number (from rental_local)
 * - down_payment_amount: number (from rental_local)
 * - balance_amount: number (calculated)
 * - down_payment_date: string (from rental_local)
 * - full_payment_date: string (from rental_local)
 * - rental_status: string | null (from rental_local: 'approved', 'completed', 'cancelled')
 * - cancelled_at: string (from rental_local)
 * - date_recorded: string (from revenue)
 * - assignment_id: string (from rental_local)
 * - description: string (from revenue)
 * - payment_method: PaymentMethodEnum (from revenue)
 * - installment_payments: array (balance payments via receivable system)
 */
import React from "react";
import { formatMoney, formatDate } from "@/utils/formatting";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/components/chips.css";

// Payment method enum values matching database schema
// Note: REIMBURSEMENT is excluded from revenue payment methods.
// Reimbursement is only applicable to expense records, not revenue records.
type PaymentMethodEnum = 'CASH' | 'BANK_TRANSFER' | 'E_WALLET';

const PAYMENT_METHOD_LABELS: Record<PaymentMethodEnum, string> = {
    'CASH': 'Cash',
    'BANK_TRANSFER': 'Bank Transfer',
    'E_WALLET': 'E-Wallet'
};

// Installment payment interface (balance payments)
interface InstallmentPayment {
    id: number;
    amount_paid: number;
    payment_date: string | null;
    payment_method: PaymentMethodEnum | null;
    payment_reference: string | null;
    journal_entry: {
        id: number;
        code: string;
        status: string;
    } | null;
}

// Schema-aligned interface for bus rental records
interface BusRentalRecord {
    id: number;
    code: string; // revenue code
    revenue_type_id: number; // FK to revenue_type
    total_rental_amount: number; // rental_local.total_rental_amount
    down_payment_amount: number; // rental_local.down_payment_amount
    balance_amount: number; // calculated
    down_payment_date: string | null; // rental_local.down_payment_date
    full_payment_date: string | null; // rental_local.full_payment_date
    rental_status: string | null; // rental_local.rental_status ('approved', 'completed', 'cancelled')
    cancelled_at?: string | null; // rental_local.cancelled_at
    date_recorded: string; // revenue.date_recorded
    assignment_id: string; // rental_local.assignment_id
    description?: string; // revenue.description
    payment_method: PaymentMethodEnum; // revenue.payment_method enum
    rental_package: string | null; // rental_local.rental_package (destination/package info)
    busPlateNumber?: string;
    bodyNumber?: string;
    rental_start_date?: string;
    rental_end_date?: string;
    // Balance payments via receivable/installment system
    installment_payments?: InstallmentPayment[];
}

interface ViewRentalDetailsModalProps {
    record: BusRentalRecord;
    onClose: () => void;
    status: {
        label: string;
        className: string;
        icon: string;
    };
}

export default function ViewRentalDetailsModal({ record, onClose, status }: ViewRentalDetailsModalProps) {
    return (
        <>
            <div className="modal-heading">
                <h1 className="modal-title">View Rental Details</h1>
                <div className="modal-date-time">
                    <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                    <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
                </div>

                <button className="close-modal-btn" onClick={onClose}>
                    <i className="ri-close-line"></i>
                </button>
            </div>

            {/* Revenue Type & Status - Read Only */}
            <div className="modal-content add">
                <form className="add-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Revenue Type</label>
                            <input
                                type="text"
                                value="RENTAL"
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <div style={{ display: 'flex', alignItems: 'center', height: '42px' }}>
                                <span className={`chip ${status.className}`}>
                                    <i className={status.icon} style={{ marginRight: '6px' }}></i>
                                    {status.label}
                                </span>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Phase 1: Rental Information */}
            <p className="details-title">I. Rental Information</p>
            <div className="modal-content add">
                <form className="add-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Assignment ID</label>
                            <input
                                type="text"
                                value={record.assignment_id}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Revenue Code</label>
                            <input
                                type="text"
                                value={record.code}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Rental Package</label>
                            <input
                                type="text"
                                value={record.rental_package || 'N/A'}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Date Recorded</label>
                            <input
                                type="text"
                                value={formatDate(record.date_recorded)}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Total Rental Amount</label>
                            <input
                                type="text"
                                value={formatMoney(record.total_rental_amount)}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>
                    </div>
                </form>
            </div>

            {/* Phase 2: Downpayment Information */}
            <p className="details-title">II. Downpayment Information</p>
            <div className="modal-content add">
                <form className="add-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Downpayment Amount</label>
                            <input
                                type="text"
                                value={formatMoney(record.down_payment_amount)}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Downpayment Received Date</label>
                            <input
                                type="text"
                                value={record.down_payment_date ? formatDate(record.down_payment_date) : 'Not yet received'}
                                disabled
                                style={{ 
                                    backgroundColor: record.down_payment_date ? '#e8f5e9' : '#f5f5f5',
                                    color: record.down_payment_date ? '#2e7d32' : '#999',
                                    fontWeight: record.down_payment_date ? 'bold' : 'normal'
                                }}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Payment Method</label>
                            <input
                                type="text"
                                value={PAYMENT_METHOD_LABELS[record.payment_method] || record.payment_method}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>
                    </div>

                    {/* Rental Balance Display */}
                    <div className="form-row">
                        <div className="form-group">
                            <label>Remaining Balance</label>
                            <input
                                type="text"
                                value={formatMoney(record.balance_amount)}
                                disabled
                                style={{ 
                                    backgroundColor: record.balance_amount > 0 ? '#fff3cd' : '#e8f5e9', 
                                    fontWeight: 'bold', 
                                    fontSize: '1.1em', 
                                    color: record.balance_amount > 0 ? '#856404' : '#2e7d32'
                                }}
                            />
                        </div>
                    </div>
                </form>
            </div>

            {/* Phase 3: Balance Payment (if paid - from installment_payments) */}
            {(record.installment_payments && record.installment_payments.length > 0) || record.full_payment_date ? (
                <>
                    <p className="details-title">III. Balance Payment</p>
                    <div className="modal-content add">
                        <form className="add-form">
                            {record.installment_payments && record.installment_payments.length > 0 ? (
                                // Show installment payment details
                                record.installment_payments.map((payment, index) => (
                                    <React.Fragment key={payment.id}>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Balance Amount Paid</label>
                                                <input
                                                    type="text"
                                                    value={formatMoney(payment.amount_paid)}
                                                    disabled
                                                    style={{ 
                                                        backgroundColor: '#e8f5e9', 
                                                        fontWeight: 'bold', 
                                                        fontSize: '1.1em', 
                                                        color: '#2e7d32'
                                                    }}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Balance Received Date</label>
                                                <input
                                                    type="text"
                                                    value={payment.payment_date ? formatDate(payment.payment_date) : 'N/A'}
                                                    disabled
                                                    style={{ 
                                                        backgroundColor: '#e8f5e9', 
                                                        color: '#2e7d32',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Payment Method</label>
                                                <input
                                                    type="text"
                                                    value={payment.payment_method ? PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method : 'N/A'}
                                                    disabled
                                                    style={{ backgroundColor: '#f5f5f5' }}
                                                />
                                            </div>

                                            {payment.journal_entry && (
                                                <div className="form-group">
                                                    <label>Journal Entry</label>
                                                    <input
                                                        type="text"
                                                        value={payment.journal_entry.code}
                                                        disabled
                                                        style={{ backgroundColor: '#f5f5f5' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </React.Fragment>
                                ))
                            ) : (
                                // Fallback to calculated values if no installment payments
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Balance Amount Paid</label>
                                        <input
                                            type="text"
                                            value={formatMoney(record.total_rental_amount - record.down_payment_amount)}
                                            disabled
                                            style={{ 
                                                backgroundColor: '#e8f5e9', 
                                                fontWeight: 'bold', 
                                                fontSize: '1.1em', 
                                                color: '#2e7d32'
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Balance Received Date</label>
                                        <input
                                            type="text"
                                            value={formatDate(record.full_payment_date)}
                                            disabled
                                            style={{ 
                                                backgroundColor: '#e8f5e9', 
                                                color: '#2e7d32',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </>
            ) : null}

            {/* Cancellation Information (if applicable) */}
            {record.rental_status === 'cancelled' && (
                <>
                    <p className="details-title">{record.full_payment_date ? 'IV' : 'III'}. Cancellation Information</p>
                    <div className="modal-content add">
                        <form className="add-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>
                                        <i className="ri-close-circle-line" style={{ marginRight: '5px', color: '#dc3545' }}></i>
                                        Cancellation Date
                                    </label>
                                    <input
                                        type="text"
                                        value={record.cancelled_at ? formatDate(record.cancelled_at) : 'N/A'}
                                        disabled
                                        style={{ backgroundColor: '#ffe5e5', color: '#dc3545', fontWeight: 'bold' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Cancellation Status</label>
                                    <input
                                        type="text"
                                        value="Rental Cancelled"
                                        disabled
                                        style={{ backgroundColor: '#ffe5e5', color: '#dc3545', fontWeight: 'bold' }}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* Additional Information */}
            {record.description && (
                <>
                    <p className="details-title">
                        {record.full_payment_date && record.rental_status === 'cancelled' ? 'V' : 
                         record.full_payment_date || record.rental_status === 'cancelled' ? 'IV' : 'III'}. Additional Information (Optional)
                    </p>
                    <div className="modal-content add">
                        <form className="add-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={record.description}
                                        disabled
                                        rows={4}
                                        style={{ backgroundColor: '#f5f5f5', resize: 'vertical', minHeight: '80px' }}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>
                </>
            )}

            <div className="modal-actions">
                <button type="button" className="submit-btn" onClick={onClose} style={{ backgroundColor: '#6c757d' }}>
                    <i className="ri-close-line" /> Close
                </button>
            </div>
        </>
    );
}
