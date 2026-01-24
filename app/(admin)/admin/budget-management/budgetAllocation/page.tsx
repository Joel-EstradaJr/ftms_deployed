'use client';

import React, { useState, useEffect, useCallback } from 'react';
import "@/styles/budget-management/budgetAllocation.css";
import "@/styles/components/table.css";
import MonthYearPicker from '@/Components/MonthYearPicker';
import ErrorDisplay from '@/Components/errordisplay';
import Loading from '@/Components/loading';
import { formatDate } from '@/utils/formatting';
import AllocateBudgetAllocation from './allocateBudgetAllocation';
import DeductBudgetAllocation from './deductBudgetAllocation';
import DepartmentDetailsModal from './departmentDetailsModal';
import {
  fetchDepartmentBudgets,
  allocateBudget,
  deductBudget,
  DepartmentBudget,
  BudgetAllocationData,
  BudgetDeductionData,
} from '@/app/services/budgetAllocationService';


// Note: Types are now imported from budgetAllocationService

const BudgetAllocationPage: React.FC = () => {
  // State management
  const [departmentBudgets, setDepartmentBudgets] = useState<DepartmentBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showDepartmentDetailsModal, setShowDepartmentDetailsModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentBudget | null>(null);
  const [allocationAmount, setAllocationAmount] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to generate monthly options
  const generateMonthlyOptions = () => {
    const options = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Generate options for current year and next year
    for (let year = currentYear; year <= currentYear + 1; year++) {
      const startMonth = year === currentYear ? 0 : 0;
      const endMonth = year === currentYear + 1 ? 11 : 11;

      for (let month = startMonth; month <= endMonth; month++) {
        const monthValue = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthName = new Date(year, month, 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });

        options.push({
          value: monthValue,
          label: monthName,
          isPast: year < currentYear || (year === currentYear && month < currentMonth)
        });
      }
    }

    return options;
  };

  // Check if current selected period is in the past
  const isPastPeriod = (period: string) => {
    const [year, month] = period.split('-').map(Number);
    const currentDate = new Date();
    const selectedDate = new Date(year, month - 1, 1);
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    return selectedDate < currentMonth;
  };

  // Calculate totals
  const totalAllocated = departmentBudgets.reduce((sum, dept) => sum + dept.allocated_budget, 0);
  const totalUsed = departmentBudgets.reduce((sum, dept) => sum + dept.used_budget, 0);
  const totalRemaining = departmentBudgets.reduce((sum, dept) => sum + dept.remaining_budget, 0);

  // Fetch department budgets from API
  const loadDepartmentBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);
      const data = await fetchDepartmentBudgets(budgetPeriod);
      setDepartmentBudgets(data);
    } catch (err: any) {
      console.error('Error fetching department budgets:', err);
      setError(err.message || 'Failed to load department budgets');
      setErrorCode(err.status || 500);
    } finally {
      setLoading(false);
    }
  }, [budgetPeriod]);

  useEffect(() => {
    loadDepartmentBudgets();
  }, [loadDepartmentBudgets]);

  // Filter departments based on search
  const filteredDepartments = departmentBudgets.filter(dept =>
    dept.department_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate budget utilization percentage
  const getBudgetUtilization = (used: number, allocated: number) => {
    if (allocated === 0) return 0;
    return Math.round((used / allocated) * 100);
  };

  // Get utilization color class
  const getUtilizationClass = (percentage: number) => {
    if (percentage >= 100) return 'utilization-exceeded';
    if (percentage >= 80) return 'utilization-high';
    if (percentage >= 60) return 'utilization-medium';
    return 'utilization-low';
  };

  // Get department status class
  const getDepartmentStatusClass = (status: string) => {
    switch (status) {
      case 'Active': return 'status-active';
      case 'Exceeded': return 'status-exceeded';

      default: return 'status-active';
    }
  };

  // Handle allocate budget
  const handleAllocateBudget = (department: DepartmentBudget) => {
    if (isPastPeriod(budgetPeriod)) {
      alert('Cannot allocate budget for past periods');
      return;
    }
    setSelectedDepartment(department);
    setAllocationAmount('');
    setAllocationNotes('');
    setShowAllocationModal(true);
  };

  // Handle deduct budget
  const handleDeductBudget = (department: DepartmentBudget) => {
    if (isPastPeriod(budgetPeriod)) {
      alert('Cannot deduct budget for past periods');
      return;
    }
    if (department.allocated_budget <= 0) {
      alert('Cannot deduct from a department with no allocated budget');
      return;
    }
    setSelectedDepartment(department);
    setShowDeductionModal(true);
  };

  // Handle allocation submission
  const handleSubmitAllocation = async (allocationData: BudgetAllocationData) => {
    try {
      // Call backend API to allocate budget
      await allocateBudget(allocationData);

      // Refresh data from backend
      await loadDepartmentBudgets();

      setShowAllocationModal(false);
      setSelectedDepartment(null);
    } catch (error) {
      console.error('Error allocating budget:', error);
      throw error; // Re-throw to let the modal handle it
    }
  };

  // Handle deduction submission
  const handleSubmitDeduction = async (deductionData: BudgetDeductionData) => {
    try {
      // Call backend API to deduct budget
      await deductBudget(deductionData);

      // Refresh data from backend
      await loadDepartmentBudgets();

      setShowDeductionModal(false);
      setSelectedDepartment(null);
    } catch (error) {
      console.error('Error deducting budget:', error);
      throw error; // Re-throw to let the modal handle it
    }
  };
  // Handle view department details
  const handleViewDetails = (department: DepartmentBudget) => {
    setSelectedDepartment(department);
    setShowDepartmentDetailsModal(true);
  };


  const monthlyOptions = generateMonthlyOptions();
  const isCurrentPeriodPast = isPastPeriod(budgetPeriod);

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Budget Allocation</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setErrorCode(null);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className='card'>
        <h1 className="title">Budget Allocation</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className='card'>
      <div className='elements'>
        <div className='scrollable-content'>
          {/* Page Header */}
          <div className="pageHeader">
            <div className="headerLeft">
              <div className="title">
                <h1>Budget Allocation Management</h1>
                <p>Monitor and allocate monthly budgets across departments</p>
              </div>
            </div>
          </div>

          {/* Past Period Warning */}
          {isCurrentPeriodPast && (
            <div className="pastPeriodWarning">
              <i className="ri-information-line" />
              <span>You are viewing a past period. Budget allocation is not available for completed months.</span>
            </div>
          )}

          {/* Budget Summary Section */}
          <div className="budgetSummarySection">
            <div className="summaryCard">
              <div className="iconTitle">
                <div className="summaryIcon">
                  <i className="ri-money-dollar-circle-line" />
                </div>
                <h3>Total Allocated</h3>
              </div>
              
              <div className="summaryContent">
                <p className="summaryAmount">₱{totalAllocated.toLocaleString()}</p>
              </div>
            </div>

            <div className="summaryCard">
              <div className="iconTitle">
                <div className="summaryIcon">
                  <i className="ri-shopping-cart-line" />
                </div>
                <h3>Total Used</h3>
              </div>
              
              <div className="summaryContent">
                <p className="summaryAmount used">₱{totalUsed.toLocaleString()}</p>
              </div>
            </div>

            <div className="summaryCard">
              <div className="iconTitle">
                <div className="summaryIcon">
                  <i className="ri-wallet-line" />
                </div> 
                <h3>Total Remaining</h3>
              </div>
              
              <div className="summaryContent">
                <p className={`summaryAmount ${totalRemaining < 0 ? 'negative' : 'positive'}`}>
                  ₱{totalRemaining.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="summaryCard">
              <div className="iconTitle">
                <div className="summaryIcon">
                  <i className="ri-building-line" />
                </div>
                <h3>Departments</h3>
              </div>
              
              <div className="summaryContent">
                <p className="summaryAmount">{departmentBudgets.length}</p>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="controlsSection">
            <div className="searchSection">
              <div className="searchBox">
                <i className="ri-search-line" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="searchInput"
                />
              </div>
            </div>

            <div className="filtersSection">
              <div className="budgetPeriodSelector">
                <label>Budget Period:</label>
                <MonthYearPicker
                  value={budgetPeriod}
                  onChange={setBudgetPeriod}
                  placeholder="Select budget period"
                  className="period-picker"
                />
              </div>
            </div>
          </div>

          {/* Department Budget Section */}
          <div className="departmentBudgetSection">
            <div className="sectionHeader">
              <h3>Department Budget Overview</h3>
              <div className="resultsCount">
                Showing {filteredDepartments.length} of {departmentBudgets.length} departments
              </div>
            </div>

            <div className="departmentGrid">
              {filteredDepartments.map(department => {
                const utilization = getBudgetUtilization(department.used_budget, department.allocated_budget);

                return (
                  <div key={department.department_id} className="departmentCard">
                    <div className="departmentHeader">
                      <div className="departmentInfo">
                        <h4>{department.department_name}</h4>
                        <span className={`departmentStatus ${getDepartmentStatusClass(department.status)}`}>
                          {department.status}
                        </span>
                      </div>
                      <div className="departmentActions">
                        <button
                          className="viewBtn"
                          onClick={() => handleViewDetails(department)}
                          title="View Details"
                        >
                          <i className="ri-eye-line" />
                        </button>
                        {/* Only show allocate and deduct buttons if period is current or future */}
                        {!isCurrentPeriodPast && (
                          <>
                            <button
                              className="allocateBtn"
                              onClick={() => handleAllocateBudget(department)}
                              title="Allocate Budget"
                            >
                              <i className="ri-add-circle-line" />
                            </button>
                            <button
                              className="deductBtn"
                              onClick={() => handleDeductBudget(department)}
                              title="Deduct Budget"
                              disabled={department.allocated_budget <= 0}
                            >
                              <i className="ri-subtract-line" />
                            </button>
                          </>
                        )}
                        {/* Show disabled buttons for past periods */}
                        {isCurrentPeriodPast && (
                          <>
                            <button
                              className="allocateBtn disabled"
                              disabled
                              title="Cannot allocate budget for past periods"
                            >
                              <i className="ri-forbid-line" />
                            </button>
                            <button
                              className="deductBtn disabled"
                              disabled
                              title="Cannot deduct budget for past periods"
                            >
                              <i className="ri-forbid-line" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="budgetMetrics">
                      <div className="metric">
                        <label>Allocated Budget</label>
                        <span className="metricValue">₱{department.allocated_budget.toLocaleString()}</span>
                      </div>

                      <div className="metric">
                        <label>Used Budget</label>
                        <span className="metricValue used">₱{department.used_budget.toLocaleString()}</span>
                      </div>

                      <div className="metric">
                        <label>Remaining Budget</label>
                        <span className={`metricValue ${department.remaining_budget < 0 ? 'negative' : 'positive'}`}>
                          ₱{department.remaining_budget.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="utilizationSection">
                      <div className="utilizationHeader">
                        <label>Budget Utilization</label>
                        <span className={`utilizationPercentage ${getUtilizationClass(utilization)}`}>
                          {utilization}%
                        </span>
                      </div>
                      <div className="utilizationBar">
                        <div
                          className={`utilizationFill ${getUtilizationClass(utilization)}`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="departmentFooter">
                      <div className="footerMetric">
                        <i className="ri-calendar-line" />
                        <span>Last: {formatDate(department.last_update_date)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredDepartments.length === 0 && (
              <div className="noResults">
                <i className="ri-search-line" />
                <h3>No departments found</h3>
                <p>Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Budget Allocation Modal */}
      {showAllocationModal && selectedDepartment && (
        <AllocateBudgetAllocation
          department={selectedDepartment}
          budgetPeriod={budgetPeriod}
          onClose={() => setShowAllocationModal(false)}
          onSubmit={handleSubmitAllocation}
          showHeader={true}
        />
      )}

      {/* Budget Deduction Modal */}
      {showDeductionModal && selectedDepartment && (
        <DeductBudgetAllocation
          department={selectedDepartment}
          budgetPeriod={budgetPeriod}
          onClose={() => setShowDeductionModal(false)}
          onSubmit={handleSubmitDeduction}
          showHeader={true}
        />
      )}

      {/* Department Details Modal */}
      {showDepartmentDetailsModal && selectedDepartment && (
        <DepartmentDetailsModal
          department={selectedDepartment}
          isOpen={showDepartmentDetailsModal}
          onClose={() => {
            setShowDepartmentDetailsModal(false);
            setSelectedDepartment(null);
          }}
        />
      )}
    </div>
  );
};

export default BudgetAllocationPage;