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

// Export the interface so it can be imported by other components
export interface RentalRevenueForm {
    revenueCode: string; // auto-generated
    revenueType: 'RENTAL'; // readonly
    entityName: string; // customer text
    total_rental_amount: number; // total rental amount
    downpayment_amount: number;
    balance_amount: number; // auto-calculated
    down_payment_date: string; // date picker
    full_payment_date: string; // date picker
    rental_status: boolean; // checkbox
    cancelled_at: string; // date picker, shows when cancelled
    dateRecorded: string; // date picker
    sourceRefNo: string; // rental contract number
    remarks: string; // textarea
    
    // Relations
    sourceId: number;
    paymentMethodId: number;
    receiptUrl?: string; // document links
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
        revenueCode: initialData?.revenueCode || "", // Will be auto-generated
        revenueType: 'RENTAL',
        entityName: initialData?.entityName || "",
        total_rental_amount: initialData?.total_rental_amount || 0,
        downpayment_amount: initialData?.downpayment_amount || 0,
        balance_amount: initialData?.balance_amount || 0,
        down_payment_date: initialData?.down_payment_date || "",
        full_payment_date: initialData?.full_payment_date || "",
        rental_status: initialData?.rental_status || false,
        cancelled_at: initialData?.cancelled_at || "",
        dateRecorded: initialData?.dateRecorded || new Date().toISOString().split('T')[0],
        sourceRefNo: initialData?.sourceRefNo || "",
        remarks: initialData?.remarks || "",
        sourceId: initialData?.sourceId || 1, // Default to Bus Rental source
        paymentMethodId: initialData?.paymentMethodId || 1,
        receiptUrl: initialData?.receiptUrl || ""
    });

    const [formErrors, setFormErrors] = useState<FormError>({});
    const [isDirty, setIsDirty] = useState(false);

    // Auto-calculate rental balance whenever amount or downpayment changes
    useEffect(() => {
        const balance = rentalRevenueForm.total_rental_amount - rentalRevenueForm.downpayment_amount;
        setRentalRevenueForm((prev) => ({
            ...prev,
            balance_amount: balance > 0 ? balance : 0
        }));
    }, [rentalRevenueForm.total_rental_amount, rentalRevenueForm.downpayment_amount]);

    useEffect(() => {
        setIsDirty(true);
    }, [rentalRevenueForm]);

    // Function to handle changes in the form fields
    const handleChange = (field: string, value: any) => {
        // Special handling for rental_status checkbox
        if (field === "rental_status" && value === true) {
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
        if (!rentalRevenueForm.entityName.trim()) {
            errors.entityName = "Customer name is required";
        }

        if (!rentalRevenueForm.sourceRefNo.trim()) {
            errors.sourceRefNo = "Rental contract number is required";
        }

        if (rentalRevenueForm.total_rental_amount <= 0) {
            errors.total_rental_amount = "Total rental amount must be greater than 0";
        }

        if (!rentalRevenueForm.dateRecorded) {
            errors.dateRecorded = "Date recorded is required";
        }

        // Validate Phase 2 fields (downpayment) - only when recording or submitting downpayment
        if (phase === 'record' || phase === 'downpayment') {
            if (rentalRevenueForm.downpayment_amount <= 0) {
                errors.downpayment_amount = "Downpayment amount must be greater than 0";
            }

            if (rentalRevenueForm.downpayment_amount > rentalRevenueForm.total_rental_amount) {
                errors.downpayment_amount = "Downpayment cannot exceed total rental amount";
            }

            if (!rentalRevenueForm.paymentMethodId) {
                errors.paymentMethodId = "Payment method is required";
            }

            if (!rentalRevenueForm.down_payment_date) {
                errors.down_payment_date = "Downpayment date is required";
            }
        }

        // Validate Phase 3 fields (balance payment)
        if (phase === 'balance') {
            const expectedBalance = rentalRevenueForm.balance_amount;
            const enteredBalance = rentalRevenueForm.total_rental_amount - rentalRevenueForm.downpayment_amount;
            
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
                        <p><strong>Customer:</strong> ${rentalRevenueForm.entityName}</p>
                        <p><strong>Contract:</strong> ${rentalRevenueForm.sourceRefNo}</p>
                        <p><strong>Total Amount:</strong> ${formatMoney(rentalRevenueForm.total_rental_amount)}</p>
                        <p><strong>Downpayment:</strong> ${formatMoney(rentalRevenueForm.downpayment_amount)}</p>
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
                                    value={rentalRevenueForm.revenueType}
                                    disabled
                                    style={{ backgroundColor: '#f5f5f5' }}
                                />
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Phase 1 & 2: Customer & Rental Information (only shown when recording) */}
            {phase === 'record' && (
                <>
                    {/* Phase 1: Customer & Rental Information */}
                    <p className="details-title">I. Customer & Rental Information</p>
                    <div className="modal-content add">
                        <form className="add-form">
                            <div className="form-row">
                                {/* Customer Name */}
                                <div className="form-group">
                                    <label>Customer Name</label>
                                    <input
                                        className={formErrors?.entityName ? "invalid-input" : ""}
                                        type="text"
                                        value={rentalRevenueForm.entityName}
                                        onChange={(e) => handleChange("entityName", e.target.value)}
                                        placeholder="Enter customer name"
                                    />
                                    <p className="add-error-message">{formErrors?.entityName}</p>
                                </div>

                                {/* Contract Number */}
                                <div className="form-group">
                                    <label>Rental Contract Number</label>
                                    <input
                                        className={formErrors?.sourceRefNo ? "invalid-input" : ""}
                                        type="text"
                                        value={rentalRevenueForm.sourceRefNo}
                                        onChange={(e) => handleChange("sourceRefNo", e.target.value)}
                                        placeholder="Enter contract number"
                                    />
                                    <p className="add-error-message">{formErrors?.sourceRefNo}</p>
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
                                        className={formErrors?.dateRecorded ? "invalid-input" : ""}
                                        type="date"
                                        value={rentalRevenueForm.dateRecorded}
                                        onChange={(e) => handleChange("dateRecorded", e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                    <p className="add-error-message">{formErrors?.dateRecorded}</p>
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
                                        className={formErrors?.downpayment_amount ? "invalid-input" : ""}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        max={rentalRevenueForm.total_rental_amount}
                                        value={rentalRevenueForm.downpayment_amount || ""}
                                        onChange={(e) => handleChange("downpayment_amount", parseFloat(e.target.value) || 0)}
                                        placeholder="Enter downpayment amount"
                                    />
                                    <p className="add-error-message">{formErrors?.downpayment_amount}</p>
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
                                        className={formErrors?.paymentMethodId ? "invalid-input" : ""}
                                        value={rentalRevenueForm.paymentMethodId}
                                        onChange={(e) => handleChange("paymentMethodId", parseInt(e.target.value))}
                                    >
                                        <option value="">Select Payment Method</option>
                                        <option value="1">Cash</option>
                                        <option value="2">Check</option>
                                        <option value="3">Bank Transfer</option>
                                        <option value="4">Online Payment</option>
                                    </select>
                                    <p className="add-error-message">{formErrors?.paymentMethodId}</p>
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

                    {/* Remarks */}
                    <p className="details-title">III. Additional Information (Optional)</p>
                    <div className="modal-content add">
                        <form className="add-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Remarks</label>
                                    <textarea
                                        rows={4}
                                        value={rentalRevenueForm.remarks}
                                        onChange={(e) => handleChange("remarks", e.target.value)}
                                        placeholder="Enter any additional notes or remarks"
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
                                    <label>Customer Name</label>
                                    <input
                                        type="text"
                                        value={rentalRevenueForm.entityName}
                                        disabled
                                        style={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Contract Number</label>
                                    <input
                                        type="text"
                                        value={rentalRevenueForm.sourceRefNo}
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
                                        value={formatMoney(rentalRevenueForm.downpayment_amount)}
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
