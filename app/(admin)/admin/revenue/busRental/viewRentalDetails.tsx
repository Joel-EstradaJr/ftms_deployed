import React from "react";
import { formatMoney, formatDate } from "@/utils/formatting";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/components/chips.css";

interface BusRentalRecord {
    id: number;
    revenueCode: string;
    revenueType: 'RENTAL';
    entityName: string;
    total_rental_amount: number;
    downpayment_amount: number;
    balance_amount: number;
    down_payment_date: string | null;
    full_payment_date: string | null;
    rental_status: boolean;
    cancelled_at?: string | null;
    dateRecorded: string;
    sourceRefNo: string;
    remarks?: string;
    sourceId: number;
    paymentMethodId: number;
    receiptUrl?: string;
    busPlateNumber?: string;
    bodyNumber?: string;
    rental_start_date?: string;
    rental_end_date?: string;
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
                                value={record.revenueType}
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

            {/* Phase 1: Customer & Rental Information */}
            <p className="details-title">I. Customer & Rental Information</p>
            <div className="modal-content add">
                <form className="add-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Customer Name</label>
                            <input
                                type="text"
                                value={record.entityName}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Rental Contract Number</label>
                            <input
                                type="text"
                                value={record.sourceRefNo}
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

                        <div className="form-group">
                            <label>Date Recorded</label>
                            <input
                                type="text"
                                value={formatDate(record.dateRecorded)}
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
                                value={formatMoney(record.downpayment_amount)}
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
                                value="Cash" // You may want to get this from record.paymentMethod?.methodName
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

            {/* Phase 3: Balance Payment (if paid) */}
            {record.full_payment_date && (
                <>
                    <p className="details-title">III. Balance Payment</p>
                    <div className="modal-content add">
                        <form className="add-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Balance Amount Paid</label>
                                    <input
                                        type="text"
                                        value={formatMoney(record.total_rental_amount - record.downpayment_amount)}
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
                        </form>
                    </div>
                </>
            )}

            {/* Cancellation Information (if applicable) */}
            {record.rental_status && (
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
            {record.remarks && (
                <>
                    <p className="details-title">
                        {record.full_payment_date && record.rental_status ? 'V' : 
                         record.full_payment_date || record.rental_status ? 'IV' : 'III'}. Additional Information (Optional)
                    </p>
                    <div className="modal-content add">
                        <form className="add-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Remarks</label>
                                    <textarea
                                        value={record.remarks}
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
