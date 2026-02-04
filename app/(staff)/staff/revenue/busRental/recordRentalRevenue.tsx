/**
 * Record Rental Revenue Modal Component
 * 
 * Schema-aligned form for recording and managing rental revenue
 * 
 * Fields (matching database schema):
 * - code: string (auto-generated revenue code)
 * - revenue_type_id: number (FK to revenue_type table)
 * - total_rental_amount: number (from rental_local)
 * - down_payment_amount: number (from rental_local)
 * - balance_amount: number (calculated: total - downpayment)
 * - down_payment_date: string (from rental_local)
 * - full_payment_date: string (from rental_local)
 * - rental_status: string | null (from rental_local: 'approved', 'completed', 'cancelled')
 * - cancelled_at: string (from rental_local)
 * - date_recorded: string (from revenue)
 * - assignment_id: string (from rental_local - rental assignment reference)
 * - description: string (from revenue - notes/remarks)
 * - payment_method: PaymentMethodEnum (from revenue: CASH, BANK_TRANSFER, E_WALLET)
 * 
 * Note: REIMBURSEMENT is not used for revenue records (only for expenses).
 * If external data has "Reimbursement", it's mapped to CASH on the backend.
 */
import React, { useState, useEffect } from "react";
import {
    showSuccess,
    showError,
    showConfirmation
} from "@/utils/Alerts";
import Swal from "sweetalert2";
import { formatMoney } from "@/utils/formatting";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";

// Payment method enum values matching database schema
// Note: REIMBURSEMENT is excluded from revenue payment methods.
// Reimbursement is only applicable to expense records, not revenue records.
export type PaymentMethodEnum = 'CASH' | 'BANK_TRANSFER' | 'E_WALLET';

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethodEnum; label: string }[] = [
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'E_WALLET', label: 'E-Wallet' }
];

// Export the interface so it can be imported by other components
// All fields aligned with database schema (revenue + rental_local tables)
export interface RentalRevenueForm {
    code: string; // auto-generated revenue code
    revenue_type_id: number; // FK to revenue_type table
    total_rental_amount: number; // rental_local.total_rental_amount
    down_payment_amount: number; // rental_local.down_payment_amount
    balance_amount: number; // calculated: total - downpayment
    down_payment_date: string; // rental_local.down_payment_date
    full_payment_date: string; // rental_local.full_payment_date
    rental_status: string | null; // rental_local.rental_status ('approved', 'completed', 'cancelled')
    cancelled_at: string; // rental_local.cancelled_at
    date_recorded: string; // revenue.date_recorded
    assignment_id: string; // rental_local.assignment_id (rental assignment reference)
    description: string; // revenue.description (notes/remarks)
    payment_method: PaymentMethodEnum; // revenue.payment_method enum
}

interface FormError {
    [key: string]: string;
}

interface RecordRentalRevenueModalProps {
    onSave: (rentalRevenueForm: RentalRevenueForm) => void;
    onClose: () => void;
    initialData?: Partial<RentalRevenueForm>; // Optional initial data for editing
    isEditMode?: boolean; // Flag to indicate if modal is in edit mode
    phase?: 'record' | 'downpayment' | 'balance'; // Phase of the rental process
}

export default function RecordRentalRevenueModal({ onSave, onClose, initialData, isEditMode = false, phase = 'record' }: RecordRentalRevenueModalProps) {
    const [rentalRevenueForm, setRentalRevenueForm] = useState<RentalRevenueForm>({
        code: initialData?.code || "", // Will be auto-generated
        revenue_type_id: initialData?.revenue_type_id || 1, // Default rental type
        total_rental_amount: initialData?.total_rental_amount || 0,
        down_payment_amount: initialData?.down_payment_amount || 0,
        balance_amount: initialData?.balance_amount || 0,
        down_payment_date: initialData?.down_payment_date || "",
        full_payment_date: initialData?.full_payment_date || "",
        rental_status: initialData?.rental_status || null,
        cancelled_at: initialData?.cancelled_at || "",
        date_recorded: initialData?.date_recorded || new Date().toISOString().split('T')[0],
        assignment_id: initialData?.assignment_id || "",
        description: initialData?.description || "",
        payment_method: initialData?.payment_method || 'CASH'
    });

    const [formErrors, setFormErrors] = useState<FormError>({});
    const [isDirty, setIsDirty] = useState(false);

    // Auto-calculate rental balance whenever amount or downpayment changes
    useEffect(() => {
        const balance = rentalRevenueForm.total_rental_amount - rentalRevenueForm.down_payment_amount;
        setRentalRevenueForm((prev) => ({
            ...prev,
            balance_amount: balance > 0 ? balance : 0
        }));
    }, [rentalRevenueForm.total_rental_amount, rentalRevenueForm.down_payment_amount]);

    useEffect(() => {
        setIsDirty(true);
    }, [rentalRevenueForm]);

    // Function to handle changes in the form fields
    const handleChange = (field: string, value: any) => {
        // Special handling for rental_status
        if (field === "rental_status" && value === 'cancelled') {
            // If marking as cancelled and cancelled_at is empty, set it to today
            setRentalRevenueForm((prev) => ({
                ...prev,
                [field]: value,
                cancelled_at: prev.cancelled_at || new Date().toISOString().split('T')[0]
            }));
        } else {
            setRentalRevenueForm((prev) => ({ ...prev, [field]: value }));
        }

        if (formErrors[field]) {
            const newErrors = { ...formErrors };
            delete newErrors[field];
            setFormErrors(newErrors);
        }
    };

    const validateForm = (): boolean => {
        const errors: FormError = {};

        // Validate Phase 1 fields (always required)
        if (!rentalRevenueForm.assignment_id.trim()) {
            errors.assignment_id = "Assignment ID is required";
        }

        if (rentalRevenueForm.total_rental_amount <= 0) {
            errors.total_rental_amount = "Total rental amount must be greater than 0";
        }

        if (!rentalRevenueForm.date_recorded) {
            errors.date_recorded = "Date recorded is required";
        }

        // Validate Phase 2 fields (downpayment) - only when recording or submitting downpayment
        if (phase === 'record' || phase === 'downpayment') {
            if (rentalRevenueForm.down_payment_amount <= 0) {
                errors.down_payment_amount = "Downpayment amount must be greater than 0";
            }

            if (rentalRevenueForm.down_payment_amount > rentalRevenueForm.total_rental_amount) {
                errors.down_payment_amount = "Downpayment cannot exceed total rental amount";
            }

            if (!rentalRevenueForm.payment_method) {
                errors.payment_method = "Payment method is required";
            }

            if (!rentalRevenueForm.down_payment_date) {
                errors.down_payment_date = "Downpayment date is required";
            }
        }

        // Validate Phase 3 fields (balance payment)
        if (phase === 'balance') {
            const expectedBalance = rentalRevenueForm.balance_amount;
            const enteredBalance = rentalRevenueForm.total_rental_amount - rentalRevenueForm.down_payment_amount;
            
            // Check if balance payment matches expected amount (within 0.01 tolerance)
            if (Math.abs(enteredBalance - expectedBalance) > 0.01) {
                errors.balance_amount = `Balance payment must exactly match ${formatMoney(expectedBalance)}`;
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        let confirmationConfig;
        
        if (phase === 'record') {
            confirmationConfig = {
                title: 'Record Rental with Downpayment?',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p><strong>Assignment ID:</strong> ${rentalRevenueForm.assignment_id}</p>
                        <p><strong>Total Amount:</strong> ${formatMoney(rentalRevenueForm.total_rental_amount)}</p>
                        <p><strong>Downpayment:</strong> ${formatMoney(rentalRevenueForm.down_payment_amount)}</p>
                        <p><strong>Remaining Balance:</strong> ${formatMoney(rentalRevenueForm.balance_amount)}</p>
                    </div>
                `,
                confirmText: 'Yes, record it!',
                successMessage: 'Rental recorded successfully with downpayment. Rental is now active.'
            };
        } else if (phase === 'balance') {
            confirmationConfig = {
                title: 'Pay Balance?',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p><strong>Balance Amount:</strong> ${formatMoney(rentalRevenueForm.balance_amount)}</p>
                        <p style="color: #28a745; font-weight: bold;">This will complete the rental payment.</p>
                    </div>
                `,
                confirmText: 'Yes, pay balance!',
                successMessage: 'Balance paid successfully. Rental is now completed.'
            };
        } else {
            confirmationConfig = {
                title: 'Update Rental?',
                html: 'Are you sure you want to update this rental?',
                confirmText: 'Yes, update it!',
                successMessage: 'Rental updated successfully.'
            };
        }

        const result = await Swal.fire({
            title: confirmationConfig.title,
            html: confirmationConfig.html,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#961C1E',
            cancelButtonColor: '#6c757d',
            confirmButtonText: confirmationConfig.confirmText,
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            // Auto-set full_payment_date to today when paying balance
            if (phase === 'balance') {
                rentalRevenueForm.full_payment_date = new Date().toISOString().split('T')[0];
            }
            
            onSave(rentalRevenueForm);
            await showSuccess(confirmationConfig.successMessage, 'Success');
        }
    };

    const handleClose = async () => {
        if (!isDirty) {
            onClose();
            return;
        }

        const result = await showConfirmation('You have unsaved changes. Are you sure you want to close?', 'Unsaved Changes');

        if (result.isConfirmed) {
            onClose();
        }
    };

    return (
        <>
            <div className="modal-heading">
                <h1 className="modal-title">
                    {phase === 'record' && 'Record New Rental'}
                    {phase === 'balance' && 'Pay Balance'}
                </h1>
                <div className="modal-date-time">
                    <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                    <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
                </div>

                <button className="close-modal-btn" onClick={handleClose}>
                    <i className="ri-close-line"></i>
                </button>
            </div>

            {/* Revenue Type - Read Only */}
            {phase === 'record' && (
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
                        </div>
                    </form>
                </div>
            )}

            {/* Phase 1 & 2: Rental Information (only shown when recording) */}
            {phase === 'record' && (
                <>
                    {/* Phase 1: Rental Information */}
                    <p className="details-title">I. Rental Information</p>
                    <div className="modal-content add">
                        <form className="add-form">
                            <div className="form-row">
                                {/* Assignment ID */}
                                <div className="form-group">
                                    <label>Assignment ID</label>
                                    <input
                                        className={formErrors?.assignment_id ? "invalid-input" : ""}
                                        type="text"
                                        value={rentalRevenueForm.assignment_id}
                                        onChange={(e) => handleChange("assignment_id", e.target.value)}
                                        placeholder="Enter assignment ID"
                                    />
                                    <p className="add-error-message">{formErrors?.assignment_id}</p>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Total Rental Amount</label>
                                    <input
                                        className={formErrors?.total_rental_amount ? "invalid-input" : ""}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={rentalRevenueForm.total_rental_amount || ""}
                                        onChange={(e) => handleChange("total_rental_amount", parseFloat(e.target.value) || 0)}
                                        placeholder="Enter total rental amount"
                                    />
                                    <p className="add-error-message">{formErrors?.total_rental_amount}</p>
                                </div>

                                {/* Date Recorded */}
                                <div className="form-group">
                                    <label>Date Recorded</label>
                                    <input
                                        className={formErrors?.date_recorded ? "invalid-input" : ""}
                                        type="date"
                                        value={rentalRevenueForm.date_recorded}
                                        onChange={(e) => handleChange("date_recorded", e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                    <p className="add-error-message">{formErrors?.date_recorded}</p>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Phase 2: Downpayment Details (shown in same form) */}
                    <p className="details-title">II. Downpayment Information</p>
                    <div className="modal-content add">
                        <form className="add-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Downpayment Amount</label>
                                    <input
                                        className={formErrors?.down_payment_amount ? "invalid-input" : ""}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        max={rentalRevenueForm.total_rental_amount}
                                        value={rentalRevenueForm.down_payment_amount || ""}
                                        onChange={(e) => handleChange("down_payment_amount", parseFloat(e.target.value) || 0)}
                                        placeholder="Enter downpayment amount"
                                    />
                                    <p className="add-error-message">{formErrors?.down_payment_amount}</p>
                                </div>

                                <div className="form-group">
                                    <label>Downpayment Received Date</label>
                                    <input
                                        className={formErrors?.down_payment_date ? "invalid-input" : ""}
                                        type="date"
                                        max={new Date().toISOString().split('T')[0]}
                                        value={rentalRevenueForm.down_payment_date}
                                        onChange={(e) => handleChange("down_payment_date", e.target.value)}
                                    />
                                    <p className="add-error-message">{formErrors?.down_payment_date}</p>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Payment Method</label>
                                    <select
                                        className={formErrors?.payment_method ? "invalid-input" : ""}
                                        value={rentalRevenueForm.payment_method}
                                        onChange={(e) => handleChange("payment_method", e.target.value)}
                                    >
                                        <option value="">Select Payment Method</option>
                                        {PAYMENT_METHOD_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="add-error-message">{formErrors?.payment_method}</p>
                                </div>
                            </div>

                            {/* Rental Balance Display */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Remaining Balance</label>
                                    <input
                                        type="text"
                                        value={formatMoney(rentalRevenueForm.balance_amount)}
                                        disabled
                                        style={{ backgroundColor: '#fff3cd', fontWeight: 'bold', fontSize: '1.1em', color: '#856404' }}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Description */}
                    <p className="details-title">III. Additional Information (Optional)</p>
                    <div className="modal-content add">
                        <form className="add-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        rows={4}
                                        value={rentalRevenueForm.description}
                                        onChange={(e) => handleChange("description", e.target.value)}
                                        placeholder="Enter any additional notes or description"
                                        style={{ resize: 'vertical', minHeight: '80px' }}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* Phase 3: Pay Balance */}
            {phase === 'balance' && (
                <>
                    {/* Rental Summary - Read Only */}
                    <p className="details-title">Rental Summary</p>
                    <div className="modal-content add">
                        <form className="add-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Assignment ID</label>
                                    <input
                                        type="text"
                                        value={rentalRevenueForm.assignment_id}
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
                                        value={formatMoney(rentalRevenueForm.total_rental_amount)}
                                        disabled
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Downpayment Paid</label>
                                    <input
                                        type="text"
                                        value={formatMoney(rentalRevenueForm.down_payment_amount)}
                                        disabled
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Balance Payment Section */}
                    <p className="details-title">Balance Payment</p>
                    <div className="modal-content add">
                        <form className="add-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label style={{ fontWeight: 'bold', color: '#856404' }}>Expected Balance Amount</label>
                                    <input
                                        type="text"
                                        value={formatMoney(rentalRevenueForm.balance_amount)}
                                        disabled
                                        style={{ 
                                            backgroundColor: '#fff3cd', 
                                            fontWeight: 'bold', 
                                            fontSize: '1.3em', 
                                            color: '#856404',
                                            border: '2px solid #ffc107'
                                        }}
                                    />
                                    <p style={{ fontSize: '0.9em', color: '#856404', marginTop: '5px' }}>
                                        ⚠️ Please confirm this is the exact balance amount before proceeding
                                    </p>
                                </div>
                            </div>
                        </form>
                    </div>
                </>
            )}

            <div className="modal-actions">
                <button type="submit" className="submit-btn" onClick={handleSubmit}>
                    {phase === 'record' && (
                        <>
                            <i className="ri-save-3-line" /> Record Rental
                        </>
                    )}
                    {phase === 'balance' && (
                        <>
                            <i className="ri-check-double-line" /> Pay Balance
                        </>
                    )}
                </button>
            </div>
        </>
    );
}
