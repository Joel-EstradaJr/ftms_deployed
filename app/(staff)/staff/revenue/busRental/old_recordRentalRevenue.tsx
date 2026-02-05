"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import Swal from "sweetalert2";

interface Bus {
    bus_id: string;
    bus_number: string;
    plate_number: string;
}

interface Organization {
    organization_id: string;
    organization_name: string;
}

interface Passenger {
    passenger_id: string;
    first_name: string;
    last_name: string;
}

interface RevenueType {
    id: string;
    name: string;
}

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

interface RentalRevenue {
    rental_id: string;
    rental_date: string | Date;
    price: number;
    payment_amount: number;
    remaining_balance: number;
    payment_status: string;
    payer_type: string;
    revenueTypeId: string;
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
    bus_id?: string;
    organization_id?: string;
    passenger_id?: string;
    scheduled_revenue?: {
        start_date: string;
        end_date: string;
        frequency: string;
        occurrences: number;
        schedules?: PaymentSchedule[];
    };
}

interface Props {
    onClose: () => void;
    onSuccess: () => void;
    rental?: RentalRevenue | null;
}

const RecordRentalRevenue: React.FC<Props> = ({ onClose, onSuccess, rental }) => {
    const isEditMode = !!rental;

    // Form states
    const [payerType, setPayerType] = useState<'ORGANIZATION' | 'INDIVIDUAL'>('ORGANIZATION');
    const [selectedBus, setSelectedBus] = useState('');
    const [selectedOrganization, setSelectedOrganization] = useState('');
    const [selectedPassenger, setSelectedPassenger] = useState('');
    const [rentalDate, setRentalDate] = useState(new Date().toISOString().split('T')[0]);
    const [price, setPrice] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [revenueTypeId, setRevenueTypeId] = useState('');

    // Scheduled payment states
    const [enableScheduledPayments, setEnableScheduledPayments] = useState(false);
    const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
    const [occurrences, setOccurrences] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Data states
    const [buses, setBuses] = useState<Bus[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [revenueTypes, setRevenueTypes] = useState<RevenueType[]>([]);

    // UI states
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch reference data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [busesRes, orgsRes, passengersRes, typesRes] = await Promise.all([
                    fetch('/api/admin/buses'),
                    fetch('/api/admin/organizations'),
                    fetch('/api/admin/passengers'),
                    fetch('/api/admin/revenue-types')
                ]);

                if (busesRes.ok) {
                    const data = await busesRes.json();
                    setBuses(Array.isArray(data) ? data : data.buses || []);
                }
                if (orgsRes.ok) {
                    const data = await orgsRes.json();
                    setOrganizations(Array.isArray(data) ? data : data.organizations || []);
                }
                if (passengersRes.ok) {
                    const data = await passengersRes.json();
                    setPassengers(Array.isArray(data) ? data : data.passengers || []);
                }
                if (typesRes.ok) {
                    const data = await typesRes.json();
                    setRevenueTypes(Array.isArray(data) ? data : data.types || []);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Populate form in edit mode
    useEffect(() => {
        if (rental) {
            setPayerType(rental.payer_type as 'ORGANIZATION' | 'INDIVIDUAL');
            setSelectedBus(rental.bus_id || '');
            setSelectedOrganization(rental.organization_id || '');
            setSelectedPassenger(rental.passenger_id || '');
            setRentalDate(new Date(rental.rental_date).toISOString().split('T')[0]);
            setPrice(rental.price.toString());
            setPaymentAmount(rental.payment_amount.toString());
            setRevenueTypeId(rental.revenueTypeId);

            if (rental.scheduled_revenue) {
                setEnableScheduledPayments(true);
                setFrequency(rental.scheduled_revenue.frequency as 'DAILY' | 'WEEKLY' | 'MONTHLY');
                setOccurrences(rental.scheduled_revenue.occurrences.toString());
                setStartDate(rental.scheduled_revenue.start_date.split('T')[0]);
                setEndDate(rental.scheduled_revenue.end_date.split('T')[0]);
            }
        }
    }, [rental]);

    // Validate form
    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!selectedBus) newErrors.bus = 'Please select a bus';
        if (!rentalDate) newErrors.date = 'Rental date is required';
        if (!price || parseFloat(price) <= 0) newErrors.price = 'Valid price is required';
        if (!revenueTypeId) newErrors.revenueType = 'Revenue type is required';

        if (payerType === 'ORGANIZATION' && !selectedOrganization) {
            newErrors.organization = 'Please select an organization';
        }
        if (payerType === 'INDIVIDUAL' && !selectedPassenger) {
            newErrors.passenger = 'Please select a passenger';
        }

        if (enableScheduledPayments) {
            if (!occurrences || parseInt(occurrences) <= 0) {
                newErrors.occurrences = 'Valid number of occurrences required';
            }
            if (!startDate) newErrors.startDate = 'Start date is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setSubmitting(true);

        try {
            const payload = {
                bus_id: selectedBus,
                payer_type: payerType,
                organization_id: payerType === 'ORGANIZATION' ? selectedOrganization : undefined,
                passenger_id: payerType === 'INDIVIDUAL' ? selectedPassenger : undefined,
                rental_date: rentalDate,
                price: parseFloat(price),
                payment_amount: parseFloat(paymentAmount) || 0,
                revenueTypeId,
                scheduled_payment: enableScheduledPayments ? {
                    frequency,
                    occurrences: parseInt(occurrences),
                    start_date: startDate,
                    end_date: endDate || undefined
                } : undefined
            };

            const url = isEditMode
                ? `/api/staff/rental-revenue/${rental.rental_id}`
                : '/api/staff/rental-revenue';

            const response = await fetch(url, {
                method: isEditMode ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save rental');
            }

            await Swal.fire({
                icon: 'success',
                title: isEditMode ? 'Rental Updated' : 'Rental Recorded',
                text: `The rental has been ${isEditMode ? 'updated' : 'recorded'} successfully.`,
                timer: 2000,
                showConfirmButton: false
            });

            onSuccess();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to save rental'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const remainingBalance = (parseFloat(price) || 0) - (parseFloat(paymentAmount) || 0);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content rental-form" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEditMode ? 'Edit Rental Revenue' : 'Record Rental Revenue'}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <i className="ri-close-line"></i>
                    </button>
                </div>

                {loading ? (
                    <div className="loading-state">Loading...</div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-section">
                            <h3>Basic Information</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Revenue Type *</label>
                                    <select
                                        value={revenueTypeId}
                                        onChange={(e) => setRevenueTypeId(e.target.value)}
                                        className={errors.revenueType ? 'error' : ''}
                                    >
                                        <option value="">Select Revenue Type</option>
                                        {revenueTypes.map(type => (
                                            <option key={type.id} value={type.id}>{type.name}</option>
                                        ))}
                                    </select>
                                    {errors.revenueType && <span className="error-text">{errors.revenueType}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Bus *</label>
                                    <select
                                        value={selectedBus}
                                        onChange={(e) => setSelectedBus(e.target.value)}
                                        className={errors.bus ? 'error' : ''}
                                    >
                                        <option value="">Select Bus</option>
                                        {buses.map(bus => (
                                            <option key={bus.bus_id} value={bus.bus_id}>
                                                {bus.bus_number} - {bus.plate_number}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.bus && <span className="error-text">{errors.bus}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Rental Date *</label>
                                    <input
                                        type="date"
                                        value={rentalDate}
                                        onChange={(e) => setRentalDate(e.target.value)}
                                        className={errors.date ? 'error' : ''}
                                    />
                                    {errors.date && <span className="error-text">{errors.date}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Payer Information</h3>
                            <div className="payer-type-selector">
                                <label className={payerType === 'ORGANIZATION' ? 'active' : ''}>
                                    <input
                                        type="radio"
                                        name="payerType"
                                        checked={payerType === 'ORGANIZATION'}
                                        onChange={() => setPayerType('ORGANIZATION')}
                                    />
                                    Organization
                                </label>
                                <label className={payerType === 'INDIVIDUAL' ? 'active' : ''}>
                                    <input
                                        type="radio"
                                        name="payerType"
                                        checked={payerType === 'INDIVIDUAL'}
                                        onChange={() => setPayerType('INDIVIDUAL')}
                                    />
                                    Individual
                                </label>
                            </div>

                            {payerType === 'ORGANIZATION' ? (
                                <div className="form-group">
                                    <label>Organization *</label>
                                    <select
                                        value={selectedOrganization}
                                        onChange={(e) => setSelectedOrganization(e.target.value)}
                                        className={errors.organization ? 'error' : ''}
                                    >
                                        <option value="">Select Organization</option>
                                        {organizations.map(org => (
                                            <option key={org.organization_id} value={org.organization_id}>
                                                {org.organization_name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.organization && <span className="error-text">{errors.organization}</span>}
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Passenger *</label>
                                    <select
                                        value={selectedPassenger}
                                        onChange={(e) => setSelectedPassenger(e.target.value)}
                                        className={errors.passenger ? 'error' : ''}
                                    >
                                        <option value="">Select Passenger</option>
                                        {passengers.map(p => (
                                            <option key={p.passenger_id} value={p.passenger_id}>
                                                {p.first_name} {p.last_name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.passenger && <span className="error-text">{errors.passenger}</span>}
                                </div>
                            )}
                        </div>

                        <div className="form-section">
                            <h3>Payment Details</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Total Price (₱) *</label>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        className={errors.price ? 'error' : ''}
                                    />
                                    {errors.price && <span className="error-text">{errors.price}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Initial Payment (₱)</label>
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        max={price}
                                    />
                                </div>
                            </div>
                            <div className="balance-display">
                                <span>Remaining Balance:</span>
                                <span className={remainingBalance > 0 ? 'pending' : 'paid'}>
                                    ₱{remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <div className="form-section">
                            <div className="section-header-with-toggle">
                                <h3>Scheduled Payments</h3>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={enableScheduledPayments}
                                        onChange={(e) => setEnableScheduledPayments(e.target.checked)}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            {enableScheduledPayments && (
                                <div className="scheduled-payment-fields">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Frequency</label>
                                            <select value={frequency} onChange={(e) => setFrequency(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')}>
                                                <option value="DAILY">Daily</option>
                                                <option value="WEEKLY">Weekly</option>
                                                <option value="MONTHLY">Monthly</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Number of Payments *</label>
                                            <input
                                                type="number"
                                                value={occurrences}
                                                onChange={(e) => setOccurrences(e.target.value)}
                                                min="1"
                                                className={errors.occurrences ? 'error' : ''}
                                            />
                                            {errors.occurrences && <span className="error-text">{errors.occurrences}</span>}
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Start Date *</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className={errors.startDate ? 'error' : ''}
                                            />
                                            {errors.startDate && <span className="error-text">{errors.startDate}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label>End Date</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                min={startDate}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="cancel-btn" onClick={onClose} disabled={submitting}>
                                Cancel
                            </button>
                            <button type="submit" className="submit-btn" disabled={submitting}>
                                {submitting ? 'Saving...' : isEditMode ? 'Update Rental' : 'Record Rental'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default RecordRentalRevenue;
