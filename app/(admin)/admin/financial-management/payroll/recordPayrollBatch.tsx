'use client';

import React, { useState, useEffect } from 'react';
import { PayrollBatchFormData, PayrollFormData, PayrollBatchFormErrors, EmployeeWithPayroll, PayrollBatch } from './types';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { showWarning, showConfirmation, showSuccess, showError } from '../../../../utils/Alerts';
import { validateField } from '../../../../utils/validation';
import payrollService from '../../../../services/payrollService';
import '@/styles/components/modal2.css';
import '@/styles/components/forms.css';
import '@/styles/components/chips.css';

interface RecordPayrollBatchProps {
  mode: 'add' | 'edit';
  existingData?: PayrollBatch | null;
  onSave: (formData: PayrollBatchFormData, mode: 'add' | 'edit') => Promise<void>;
  onClose: () => void;
  currentUser: string;
}

export default function RecordPayrollBatch({
  mode,
  existingData,
  onSave,
  onClose,
  currentUser
}: RecordPayrollBatchProps) {
  
  // Generate batch code for new records
  const generateBatchCode = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PAY-${year}${month}-${random}`;
  };

  const [formData, setFormData] = useState<PayrollBatchFormData>({
    batchCode: existingData?.payroll_period_code || generateBatchCode(),
    periodStart: existingData?.period_start || new Date().toISOString().split('T')[0],
    periodEnd: existingData?.period_end || new Date().toISOString().split('T')[0],
    selectedEmployees: existingData?.payrolls?.map(p => p.employeeId) || [],
    payrolls: existingData?.payrolls?.map(p => ({
      employeeId: p.employeeId,
      employeeName: '', // Will be populated from employee data
      baseSalary: p.baseSalary,
      allowances: p.allowances,
      deductions: p.deductions,
      netPay: p.netPay,
      isDisbursed: p.isDisbursed,
      disbursementDate: p.disbursementDate
    })) || []
  });

  const [formErrors, setFormErrors] = useState<PayrollBatchFormErrors>({
    batchCode: '',
    periodStart: '',
    periodEnd: '',
    selectedEmployees: '',
    payrolls: ''
  });

  const [employees, setEmployees] = useState<EmployeeWithPayroll[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch employees from HR system
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        // Fetch HR payroll data from integration endpoint
        const hrPayrollData = await payrollService.fetchHrPayroll();
        
        // Transform HR payroll data to EmployeeWithPayroll format
        const transformedEmployees: EmployeeWithPayroll[] = hrPayrollData.map((data) => {
          const basicRate = parseFloat(data.basic_rate);
          const totalBenefits = data.benefits
            .filter(b => b.is_active)
            .reduce((sum, b) => sum + parseFloat(b.value), 0);
          const totalDeductions = data.deductions
            .filter(d => d.is_active)
            .reduce((sum, d) => sum + parseFloat(d.value), 0);

          // Map rate type from backend format
          const rateTypeMap: Record<string, 'MONTHLY' | 'SEMI_MONTHLY' | 'WEEKLY'> = {
            'Monthly': 'MONTHLY',
            'Semi-Monthly': 'SEMI_MONTHLY',
            'Weekly': 'WEEKLY',
            'Daily': 'MONTHLY' // Default daily to monthly for this context
          };

          return {
            employeeNumber: data.employee_number,
            firstName: data.employee_number, // Using employee number as placeholder
            middleName: '',
            lastName: '',
            suffix: '',
            department: 'N/A',
            position: data.rate_type,
            status: 'active',
            fullName: `Employee ${data.employee_number}`,
            payrollData: {
              employeeNumber: data.employee_number,
              basicRate: basicRate,
              totalMonthlyBenefits: totalBenefits,
              totalMonthlyDeductions: totalDeductions,
              payrollPeriod: rateTypeMap[data.rate_type] || 'MONTHLY'
            }
          };
        });
        
        setEmployees(transformedEmployees);
        console.log('✅ Loaded HR payroll data for', transformedEmployees.length, 'employees');
      } catch (error) {
        console.error('Failed to load HR payroll data:', error);
        showError('Failed to load employee payroll data. Using fallback data.', 'Warning');
        
        // Fallback to mock data
        const mockEmployees: EmployeeWithPayroll[] = [
          {
            employeeNumber: 'EMP-001',
            firstName: 'Juan',
            middleName: 'Cruz',
            lastName: 'Dela Cruz',
            suffix: '',
            department: 'Operations',
            position: 'Driver',
            status: 'active',
            fullName: 'Juan Cruz Dela Cruz',
            payrollData: {
              employeeNumber: 'EMP-001',
              basicRate: 600,
              totalMonthlyBenefits: 2000,
              totalMonthlyDeductions: 1500,
              payrollPeriod: 'MONTHLY'
            }
          },
          {
            employeeNumber: 'EMP-002',
            firstName: 'Maria',
            middleName: 'Santos',
            lastName: 'Garcia',
            suffix: '',
            department: 'Finance',
            position: 'Accountant',
            status: 'active',
            fullName: 'Maria Santos Garcia',
            payrollData: {
              employeeNumber: 'EMP-002',
              basicRate: 800,
              totalMonthlyBenefits: 3000,
              totalMonthlyDeductions: 2000,
              payrollPeriod: 'MONTHLY'
            }
          }
        ];
        
        setEmployees(mockEmployees);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);

  // Track form changes
  useEffect(() => {
    setIsDirty(true);
  }, [formData]);

  // Validate individual field
  const validateFormField = (fieldName: keyof PayrollBatchFormErrors, value: any): string => {
    switch (fieldName) {
      case 'batchCode':
        if (!value || value.trim() === '') return 'Batch code is required';
        if (!/^PAY-\d{6}-\d{3}$/.test(value)) return 'Invalid batch code format';
        return '';

      case 'periodStart':
        if (!value) return 'Start date is required';
        if (new Date(value) > new Date(formData.periodEnd)) return 'Start date must be before end date';
        return '';

      case 'periodEnd':
        if (!value) return 'End date is required';
        if (new Date(value) < new Date(formData.periodStart)) return 'End date must be after start date';
        return '';

      case 'selectedEmployees':
        if (!formData.selectedEmployees || formData.selectedEmployees.length === 0) {
          return 'At least one employee must be selected';
        }
        return '';

      default:
        return '';
    }
  };

  // Validate entire form
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const newFormErrors: PayrollBatchFormErrors = {
      batchCode: '',
      periodStart: '',
      periodEnd: '',
      selectedEmployees: '',
      payrolls: ''
    };

    // Validate each field
    Object.keys(newFormErrors).forEach((key) => {
      const fieldName = key as keyof PayrollBatchFormErrors;
      const error = validateFormField(fieldName, formData[fieldName]);
      newFormErrors[fieldName] = error;
      if (error) errors.push(error);
    });

    setFormErrors(newFormErrors);
    return { isValid: errors.length === 0, errors };
  };

  // Check form validity
  useEffect(() => {
    const { isValid } = validateForm();
    setIsFormValid(isValid && formData.selectedEmployees.length > 0);
  }, [formData]);

  // Calculate payroll for selected employees
  const calculatePayroll = (employeeId: string): PayrollFormData | null => {
    const employee = employees.find(e => e.employeeNumber === employeeId);
    if (!employee) return null;

    const baseSalary = employee.payrollData.basicRate * 26; // Assuming ~26 working days per month
    const allowances = employee.payrollData.totalMonthlyBenefits;
    const deductions = employee.payrollData.totalMonthlyDeductions;
    const netPay = baseSalary + allowances - deductions;

    return {
      employeeId,
      employeeName: employee.fullName,
      baseSalary,
      allowances,
      deductions,
      netPay,
      isDisbursed: false,
      disbursementDate: undefined
    };
  };

  // Handle employee selection
  const handleEmployeeToggle = (employeeId: string) => {
    const isSelected = formData.selectedEmployees.includes(employeeId);
    
    if (isSelected) {
      // Remove employee
      setFormData(prev => ({
        ...prev,
        selectedEmployees: prev.selectedEmployees.filter(id => id !== employeeId),
        payrolls: prev.payrolls.filter(p => p.employeeId !== employeeId)
      }));
    } else {
      // Add employee and calculate payroll
      const payroll = calculatePayroll(employeeId);
      if (payroll) {
        setFormData(prev => ({
          ...prev,
          selectedEmployees: [...prev.selectedEmployees, employeeId],
          payrolls: [...prev.payrolls, payroll]
        }));
      }
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allEmployeeIds = employees.map(e => e.employeeNumber);
      const allPayrolls = employees.map(e => calculatePayroll(e.employeeNumber)).filter(p => p !== null) as PayrollFormData[];
      setFormData(prev => ({
        ...prev,
        selectedEmployees: allEmployeeIds,
        payrolls: allPayrolls
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedEmployees: [],
        payrolls: []
      }));
    }
  };

  // Handle input change
  const handleInputChange = (field: keyof PayrollBatchFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle input blur (validation)
  const handleInputBlur = (field: keyof PayrollBatchFormErrors) => {
    const error = validateFormField(field, formData[field]);
    setFormErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, errors } = validateForm();

    if (!isValid) {
      showWarning('Please fix the errors before submitting', 'Validation Error');
      return;
    }

    const confirmed = await showConfirmation(
      mode === 'add' 
        ? `Generate payroll batch for ${formData.selectedEmployees.length} employee(s)?`
        : `Update payroll batch ${formData.batchCode}?`,
      'Confirm Action'
    );

    if (confirmed.isConfirmed) {
      setIsSaving(true);
      try {
        await onSave(formData, mode);
        showSuccess(
          mode === 'add' ? 'Payroll batch created successfully' : 'Payroll batch updated successfully',
          'Success'
        );
        onClose();
      } catch (error) {
        showError(
          error instanceof Error ? error.message : 'Failed to save payroll batch',
          'Error'
        );
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Calculate totals
  const totalGross = formData.payrolls.reduce((sum, p) => sum + p.baseSalary + p.allowances, 0);
  const totalDeductions = formData.payrolls.reduce((sum, p) => sum + p.deductions, 0);
  const totalNet = formData.payrolls.reduce((sum, p) => sum + p.netPay, 0);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-content-wrapper">
          {/* Modal Header */}
          <div className="modal-heading">
            <div className="modal-title-section">
              <h2 className="modal-title">
                {mode === 'add' ? 'Generate Payroll Batch' : 'Edit Payroll Batch'}
              </h2>
            </div>
            <button className="close-modal-btn" onClick={onClose}>
              <i className="ri-close-line"></i>
            </button>
          </div>

          {/* Modal Content */}
          <form onSubmit={handleSubmit} className="add-form">
            <div className="modal-content add">
              
              {/* Batch Information */}
              <div className="form-group">
                <label htmlFor="batchCode">
                  Batch Code <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  id="batchCode"
                  value={formData.batchCode}
                  onChange={(e) => handleInputChange('batchCode', e.target.value)}
                  onBlur={() => handleInputBlur('batchCode')}
                  className={formErrors.batchCode ? 'invalid-input' : ''}
                  disabled={mode === 'edit'}
                />
                {formErrors.batchCode && (
                  <div className="error-message">{formErrors.batchCode}</div>
                )}
              </div>

              {/* Period Dates */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="periodStart">
                    Period Start <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="date"
                    id="periodStart"
                    value={formData.periodStart}
                    onChange={(e) => handleInputChange('periodStart', e.target.value)}
                    onBlur={() => handleInputBlur('periodStart')}
                    className={formErrors.periodStart ? 'invalid-input' : ''}
                  />
                  {formErrors.periodStart && (
                    <div className="error-message">{formErrors.periodStart}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="periodEnd">
                    Period End <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="date"
                    id="periodEnd"
                    value={formData.periodEnd}
                    onChange={(e) => handleInputChange('periodEnd', e.target.value)}
                    onBlur={() => handleInputBlur('periodEnd')}
                    className={formErrors.periodEnd ? 'invalid-input' : ''}
                  />
                  {formErrors.periodEnd && (
                    <div className="error-message">{formErrors.periodEnd}</div>
                  )}
                </div>
              </div>

              {/* Employee Selection */}
              <div className="form-group">
                <label>
                  Select Employees <span style={{ color: 'red' }}>*</span>
                </label>
                {loadingEmployees ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--secondary-text-color)' }}>
                    Loading employees...
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.selectedEmployees.length === employees.length && employees.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                        <span>Select All ({employees.length} employees)</span>
                      </label>
                    </div>
                    
                    <div style={{ 
                      maxHeight: '200px', 
                      overflowY: 'auto', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '4px',
                      padding: '10px'
                    }}>
                      {employees.map(employee => (
                        <label 
                          key={employee.employeeNumber}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--table-row-hover-color)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedEmployees.includes(employee.employeeNumber)}
                            onChange={() => handleEmployeeToggle(employee.employeeNumber)}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{employee.fullName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--secondary-text-color)' }}>
                              {employee.employeeNumber} • {employee.position} • {employee.department}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--secondary-text-color)', textAlign: 'right' }}>
                            Rate: {formatMoney(employee.payrollData.basicRate)}/day
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}
                {formErrors.selectedEmployees && (
                  <div className="error-message">{formErrors.selectedEmployees}</div>
                )}
              </div>

              {/* Payroll Preview Table */}
              {formData.payrolls.length > 0 && (
                <div className="form-group">
                  <label>Payroll Preview ({formData.payrolls.length} employees)</label>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="modal-table" style={{ width: '100%', fontSize: '13px' }}>
                      <thead className="modal-table-heading">
                        <tr>
                          <th>Employee</th>
                          <th>Base Salary</th>
                          <th>Allowances</th>
                          <th>Deductions</th>
                          <th>Net Pay</th>
                        </tr>
                      </thead>
                      <tbody className="modal-table-body">
                        {formData.payrolls.map(payroll => (
                          <tr key={payroll.employeeId}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{payroll.employeeName}</div>
                              <div style={{ fontSize: '11px', color: 'var(--secondary-text-color)' }}>
                                {payroll.employeeId}
                              </div>
                            </td>
                            <td>{formatMoney(payroll.baseSalary)}</td>
                            <td>{formatMoney(payroll.allowances)}</td>
                            <td>{formatMoney(payroll.deductions)}</td>
                            <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                              {formatMoney(payroll.netPay)}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ fontWeight: 'bold', backgroundColor: 'var(--table-row-hover-color)' }}>
                          <td>TOTAL</td>
                          <td>{formatMoney(totalGross - totalDeductions)}</td>
                          <td>{formatMoney(formData.payrolls.reduce((sum, p) => sum + p.allowances, 0))}</td>
                          <td>{formatMoney(totalDeductions)}</td>
                          <td style={{ color: 'var(--primary-color)' }}>{formatMoney(totalNet)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Action Buttons */}
            <div className="modal-actions">
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={onClose}
                disabled={isSaving}
              >
                <i className="ri-close-line" /> Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={!isFormValid || isSaving}
              >
                {isSaving ? (
                  <><i className="ri-loader-4-line" /> Saving...</>
                ) : (
                  <><i className="ri-save-line" /> {mode === 'add' ? 'Generate Batch' : 'Update Batch'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
