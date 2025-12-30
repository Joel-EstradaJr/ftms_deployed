'use client';

import React, { useState, useEffect } from 'react';
import '../../../../styles/components/modal.css';
import '../../../../styles/components/table.css';
import ModalHeader from '../../../../Components/ModalHeader';
import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';

// Types
interface DepartmentBudget {
  department_id: string;
  department_name: string;
  allocated_budget: number;
  used_budget: number;
  remaining_budget: number;
  budget_requests_count: number;
  last_allocation_date: string;
  budget_period: string;
  status: 'Active' | 'Inactive' | 'Exceeded';
}

interface DeductBudgetAllocationProps {
  department: DepartmentBudget;
  budgetPeriod: string;
  onClose: () => void;
  onSubmit: (data: BudgetDeductionData) => void;
  showHeader?: boolean;
}

interface BudgetDeductionData {
  deduction_id: string;
  department_id: string;
  department_name: string;
  amount: number;
  deducted_date: string;
  deducted_by: string;
  period: string;
  notes: string;
}

const DeductBudgetAllocation: React.FC<DeductBudgetAllocationProps> = ({
  department,
  budgetPeriod,
  onClose,
  onSubmit,
  showHeader = true
}) => {
  const [deductionAmount, setDeductionAmount] = useState('');
  const [deductionNotes, setDeductionNotes] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format budget period for display
  const formatBudgetPeriod = () => {
    if (!budgetPeriod) return 'Current Period';
    const [year, month] = budgetPeriod.split('-').map(Number);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  // Calculate budget utilization percentage
  const getBudgetUtilization = () => {
    if (department.allocated_budget === 0) return 0;
    return Math.round((department.used_budget / department.allocated_budget) * 100);
  };

  // Get utilization status
  const getUtilizationStatus = () => {
    const utilization = getBudgetUtilization();
    if (utilization >= 100) return { text: 'Exceeded', class: 'status-exceeded' };
    if (utilization >= 80) return { text: 'High Usage', class: 'status-warning' };
    if (utilization >= 60) return { text: 'Moderate Usage', class: 'status-active' };
    return { text: 'Low Usage', class: 'status-good' };
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    // Validate deduction amount
    if (!deductionAmount || deductionAmount.trim() === '') {
      newErrors.deductionAmount = 'Deduction amount is required';
    } else {
      const amount = parseFloat(deductionAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.deductionAmount = 'Please enter a valid amount greater than 0';
      } else if (amount > department.allocated_budget) {
        newErrors.deductionAmount = 'Deduction amount cannot exceed current allocated budget';
      } else if (amount > 10000000) { // 10M limit
        newErrors.deductionAmount = 'Deduction amount cannot exceed ₱10,000,000';
      }
    }

    // Notes validation (optional but limited length)
    if (deductionNotes && deductionNotes.length > 500) {
      newErrors.deductionNotes = 'Notes cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Show confirmation dialog first
    const confirmResult = await showConfirmation(
      `<p>Are you sure you want to <b>DEDUCT</b> ₱${parseFloat(deductionAmount).toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })} from <b>${department.department_name}</b>?</p>
      <p><small>This action will reduce the department's budget allocation for ${formatBudgetPeriod()}.</small></p>`,
      'Confirm Budget Deduction'
    );

    if (!confirmResult.isConfirmed) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const deductionData: BudgetDeductionData = {
        deduction_id: `deduct_${Date.now()}_${department.department_id}`, // Generate unique ID
        department_id: department.department_id,
        department_name: department.department_name,
        amount: parseFloat(deductionAmount),
        deducted_date: new Date().toISOString(),
        deducted_by: 'Current User', // Replace with actual user context
        period: budgetPeriod, // Changed from budget_period to period
        notes: deductionNotes.trim(),
      };

      await onSubmit(deductionData);
      
      // Show success message
      showSuccess(
        `Successfully deducted ₱${parseFloat(deductionAmount).toLocaleString(undefined, { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })} from ${department.department_name} for ${formatBudgetPeriod()}.`,
        'Budget Deducted!'
      );
      
      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 2100); // Slightly longer than the success timer
      
    } catch (error) {
      console.error('Error submitting deduction:', error);
      showError(
        'Failed to deduct budget. Please check your connection and try again.',
        'Deduction Failed'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate preview values
  const getPreviewValues = () => {
    const amount = parseFloat(deductionAmount) || 0;
    return {
      newAllocated: department.allocated_budget - amount,
      newRemaining: department.remaining_budget - amount,
      newUtilization: department.allocated_budget - amount === 0 ? 0 : 
        Math.round((department.used_budget / (department.allocated_budget - amount)) * 100)
    };
  };

  const preview = getPreviewValues();
  const utilizationStatus = getUtilizationStatus();

  return (
    <div className="modalOverlay">
      <div className="modalStandard">
        {showHeader && (
          <ModalHeader
            title={`Deduct Budget - ${department.department_name}`}
            onClose={onClose}
            showDateTime={true}
          />
        )}

        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Department Information Section */}
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--primary-text-color)', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '2px solid var(--border-color)', position: 'relative' }}>
              Department Information
              <div style={{ position: 'absolute', bottom: '-2px', left: '0', width: '60px', height: '2px', background: 'var(--primary-color)' }}></div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--primary-text-color)' }}>Department Name</label>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--primary-color)', padding: '0.75rem', backgroundColor: 'var(--table-row-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>{department.department_name}</div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--primary-text-color)' }}>Department Status</label>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--table-row-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '20px', 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    backgroundColor: department.status === 'Active' ? 'var(--success-color)' : department.status === 'Inactive' ? 'var(--warning-color)' : 'var(--error-color)',
                    color: 'white'
                  }}>
                    {department.status}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--primary-text-color)' }}>Budget Utilization</label>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--table-row-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '20px', 
                    fontSize: '0.875rem', 
                    fontWeight: '600',
                    backgroundColor: utilizationStatus.class === 'success' ? 'var(--success-color)' : utilizationStatus.class === 'warning' ? 'var(--warning-color)' : 'var(--error-color)',
                    color: 'white'
                  }}>
                    {getBudgetUtilization()}% - {utilizationStatus.text}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--primary-text-color)' }}>Budget Requests</label>
                <div style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--secondary-text-color)', padding: '0.75rem', backgroundColor: 'var(--table-row-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>{department.budget_requests_count} pending requests</div>
              </div>
            </div>

            {/* Current Budget Status Section */}
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--primary-text-color)', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '2px solid var(--border-color)', position: 'relative' }}>
              Current Budget Status
              <div style={{ position: 'absolute', bottom: '-2px', left: '0', width: '60px', height: '2px', background: 'var(--primary-color)' }}></div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', backgroundColor: 'var(--table-row-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '2rem', color: 'var(--primary-color)' }}>
                  <i className="ri-money-dollar-circle-line" />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--secondary-text-color)', display: 'block', marginBottom: '0.25rem' }}>Current Allocated</label>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-text-color)' }}>
                    ₱{department.allocated_budget.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', backgroundColor: 'var(--table-row-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '2rem', color: 'var(--warning-color)' }}>
                  <i className="ri-shopping-cart-line" />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--secondary-text-color)', display: 'block', marginBottom: '0.25rem' }}>Current Used</label>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-text-color)' }}>
                    ₱{department.used_budget.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', backgroundColor: 'var(--table-row-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '2rem', color: department.remaining_budget < 0 ? 'var(--error-color)' : 'var(--success-color)' }}>
                  <i className="ri-wallet-line" />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--secondary-text-color)', display: 'block', marginBottom: '0.25rem' }}>Current Remaining</label>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: department.remaining_budget < 0 ? 'var(--error-color)' : 'var(--primary-text-color)' }}>
                    ₱{department.remaining_budget.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Deduction Details Section */}
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--primary-text-color)', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '2px solid var(--border-color)', position: 'relative' }}>
              Deduction Details
              <div style={{ position: 'absolute', bottom: '-2px', left: '0', width: '60px', height: '2px', background: 'var(--primary-color)' }}></div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--primary-text-color)' }}>Budget Period <span style={{ color: 'var(--error-color)', fontWeight: 'bold' }}>*</span></label>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--primary-color)', padding: '0.75rem', backgroundColor: 'var(--table-row-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>{formatBudgetPeriod()}</div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--primary-text-color)' }}>Deduction Amount <span style={{ color: 'var(--error-color)', fontWeight: 'bold' }}>*</span></label>
                <input
                  type="number"
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(e.target.value)}
                  placeholder="Enter deduction amount"
                  min="0"
                  max={department.allocated_budget}
                  step="0.01"
                  style={{
                    padding: '0.75rem',
                    border: errors.deductionAmount ? '2px solid var(--error-color)' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: 'var(--foreground-color)',
                    color: 'var(--primary-text-color)',
                    outline: 'none'
                  }}
                />
                {errors.deductionAmount && (
                  <div style={{ color: 'var(--error-color)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.deductionAmount}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                <label style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--primary-text-color)' }}>Deduction Notes</label>
                <textarea
                    value={deductionNotes}
                    onChange={(e) => setDeductionNotes(e.target.value)}
                    placeholder="Enter deduction notes or justification (optional)"
                    rows={4}
                    maxLength={500}
                    style={{
                      padding: '0.75rem',
                      border: errors.deductionNotes ? '2px solid var(--error-color)' : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      backgroundColor: 'var(--foreground-color)',
                      color: 'var(--primary-text-color)',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                />
                <div style={{ fontSize: '0.875rem', color: 'var(--secondary-text-color)', textAlign: 'right' }}>
                    {deductionNotes.length}/500 characters
                </div>
                {errors.deductionNotes && (
                    <div style={{ color: 'var(--error-color)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{errors.deductionNotes}</div>
                )}
            </div>

            {/* Deduction Preview Section */}
            {deductionAmount && !errors.deductionAmount && (
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--primary-text-color)', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '2px solid var(--border-color)', position: 'relative' }}>
                  After Deduction Preview
                  <div style={{ position: 'absolute', bottom: '-2px', left: '0', width: '60px', height: '2px', background: 'var(--primary-color)' }}></div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', backgroundColor: 'var(--table-row-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '2rem', color: 'var(--error-color)' }}>
                      <i className="ri-arrow-down-circle-line" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--secondary-text-color)', display: 'block', marginBottom: '0.25rem' }}>New Allocated Budget</label>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--error-color)' }}>
                        ₱{preview.newAllocated.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--error-color)', fontWeight: '500' }}>
                        -₱{parseFloat(deductionAmount).toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', backgroundColor: 'var(--table-row-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '2rem', color: preview.newRemaining < 0 ? 'var(--error-color)' : 'var(--success-color)' }}>
                      <i className="ri-wallet-3-line" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--secondary-text-color)', display: 'block', marginBottom: '0.25rem' }}>New Remaining Budget</label>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: preview.newRemaining < 0 ? 'var(--error-color)' : 'var(--success-color)' }}>
                        ₱{preview.newRemaining.toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: preview.newRemaining < 0 ? 'var(--error-color)' : 'var(--success-color)', fontWeight: '500' }}>
                        -₱{parseFloat(deductionAmount).toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', backgroundColor: 'var(--table-row-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '2rem', color: 'var(--primary-color)' }}>
                      <i className="ri-pie-chart-line" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--secondary-text-color)', display: 'block', marginBottom: '0.25rem' }}>New Utilization Rate</label>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-text-color)' }}>
                        {preview.newUtilization}%
                      </div>
                      <div style={{ fontSize: '0.875rem', color: preview.newUtilization > getBudgetUtilization() ? 'var(--error-color)' : 'var(--success-color)', fontWeight: '500' }}>
                        {preview.newUtilization > getBudgetUtilization() ? 'Increased' : 'Decreased'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--error-background)', border: '1px solid var(--error-color)', borderRadius: '8px', color: 'var(--error-color)' }}>
                <i className="ri-error-warning-line" />
                {errors.submit}
              </div>
            )}
          </div>
        </div>

        {/* Modal Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--table-row-color)' }}>
          <button 
            type="button"
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--foreground-color)',
              color: 'var(--secondary-text-color)',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
            onClick={onClose}
            disabled={isSubmitting}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--table-row-hover-color)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--foreground-color)'}
          >
            <i className="ri-close-line" /> Cancel
          </button>
          
          <button 
            type="button"
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: 'var(--error-color)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              opacity: (!deductionAmount || parseFloat(deductionAmount) <= 0 || isSubmitting) ? 0.6 : 1
            }}
            onClick={handleSubmit}
            disabled={!deductionAmount || parseFloat(deductionAmount) <= 0 || isSubmitting}
            onMouseOver={(e) => {
              if (!(!deductionAmount || parseFloat(deductionAmount) <= 0 || isSubmitting)) {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }
            }}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--error-color)'}
          >
            {isSubmitting ? (
              <>
                <i className="ri-loader-4-line spin" /> Deducting...
              </>
            ) : (
              <>
                <i className="ri-subtract-line" /> Deduct Budget
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeductBudgetAllocation;
