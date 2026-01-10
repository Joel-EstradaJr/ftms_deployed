# Payroll System Restructure - Testing Checklist

## Pre-Testing Setup

### Backend
- [ ] Backend server running on correct port
- [ ] Database connection established
- [ ] Prisma schema up to date
- [ ] Seed data loaded with varied attendance

### Frontend
- [ ] Frontend server running
- [ ] API endpoints accessible
- [ ] User authenticated and has permissions

---

## Test Suite 1: Period Selection & Date Calculation

### Test 1.1: Period 1 (1st-15th)
- [ ] Select Year: 2024
- [ ] Select Month: January
- [ ] Select Period: Period 1 (1st-15th)
- [ ] **Expected**: Start Date = Jan 1, 2024
- [ ] **Expected**: End Date = Jan 15, 2024
- [ ] **Expected**: Batch Code = PAY-202401-P1
- [ ] **Expected**: Working Days = 15

### Test 1.2: Period 2 (16th-End)
- [ ] Select Year: 2024
- [ ] Select Month: January
- [ ] Select Period: Period 2 (16th-End)
- [ ] **Expected**: Start Date = Jan 16, 2024
- [ ] **Expected**: End Date = Jan 31, 2024
- [ ] **Expected**: Batch Code = PAY-202401-P2
- [ ] **Expected**: Working Days = 16

### Test 1.3: February Period 2 (Leap Year)
- [ ] Select Year: 2024 (leap year)
- [ ] Select Month: February
- [ ] Select Period: Period 2
- [ ] **Expected**: End Date = Feb 29, 2024
- [ ] **Expected**: Working Days = 14

### Test 1.4: February Period 2 (Non-Leap Year)
- [ ] Select Year: 2025 (non-leap)
- [ ] Select Month: February
- [ ] Select Period: Period 2
- [ ] **Expected**: End Date = Feb 28, 2025
- [ ] **Expected**: Working Days = 13

---

## Test Suite 2: Payroll Calculations

### Test 2.1: Full Attendance - Period 1
**Setup:**
- Employee: EMP-001
- Basic Rate: ₱600/day
- Monthly Benefits: ₱1,000
- Monthly Deductions: ₱1,500
- Attendance: 15 days (full)
- Period: Period 1

**Expected Calculations:**
- [ ] Base Salary = ₱600 × 15 = ₱9,000
- [ ] Allowances = ₱1,000 ÷ 2 = ₱500
- [ ] Deductions = ₱1,500 ÷ 2 = ₱750
- [ ] Net Pay = ₱9,000 + ₱500 - ₱750 = ₱8,750

### Test 2.2: Full Attendance - Period 2
**Setup:**
- Employee: EMP-001
- Basic Rate: ₱600/day
- Monthly Benefits: ₱1,000
- Monthly Deductions: ₱1,500
- Attendance: 16 days (full for Jan Period 2)
- Period: Period 2

**Expected Calculations:**
- [ ] Base Salary = ₱600 × 16 = ₱9,600
- [ ] Allowances = ₱1,000 ÷ 2 = ₱500
- [ ] Deductions = ₱1,500 ÷ 2 = ₱750
- [ ] Net Pay = ₱9,600 + ₱500 - ₱750 = ₱9,350

### Test 2.3: Partial Attendance
**Setup:**
- Employee: EMP-002
- Basic Rate: ₱700/day
- Monthly Benefits: ₱1,200
- Monthly Deductions: ₱1,800
- Attendance: 10 days (partial)
- Period: Period 1 (15 working days)

**Expected Calculations:**
- [ ] Base Salary = ₱700 × 10 = ₱7,000
- [ ] Allowances = ₱1,200 ÷ 2 = ₱600
- [ ] Deductions = ₱1,800 ÷ 2 = ₱900
- [ ] Net Pay = ₱7,000 + ₱600 - ₱900 = ₱6,700

### Test 2.4: Zero Attendance
**Setup:**
- Employee: EMP-003
- Basic Rate: ₱800/day
- Monthly Benefits: ₱1,500
- Monthly Deductions: ₱2,000
- Attendance: 0 days
- Period: Period 1

**Expected Calculations:**
- [ ] Base Salary = ₱800 × 0 = ₱0
- [ ] Allowances = ₱0 (zero attendance)
- [ ] Deductions = ₱0 (zero attendance)
- [ ] Net Pay = ₱0

**Expected UI:**
- [ ] Row has yellow background
- [ ] "NO ATTENDANCE" badge visible
- [ ] Checkbox disabled
- [ ] Employee still appears in batch

---

## Test Suite 3: Batch Creation

### Test 3.1: Create Period 1 Batch
- [ ] Click "Record New Batch"
- [ ] Select: Year 2024, Month January, Period 1
- [ ] Verify all active employees listed
- [ ] Verify "Select All" checkbox works
- [ ] Verify individual calculations correct
- [ ] Verify batch summary totals correct
- [ ] Click "Save Batch"
- [ ] **Expected**: Success message
- [ ] **Expected**: Batch appears in main table

### Test 3.2: Create Period 2 Batch
- [ ] Click "Record New Batch"
- [ ] Select: Year 2024, Month January, Period 2
- [ ] Verify working days = 16 (for January)
- [ ] Verify calculations use 16 days
- [ ] Save batch successfully

### Test 3.3: Prevent Duplicate Batches
- [ ] Try to create PAY-202401-P1 again
- [ ] **Expected**: Error or warning about duplicate
- [ ] **Expected**: Batch not created

### Test 3.4: Edit Mode Restrictions
- [ ] Open existing batch in edit mode
- [ ] **Expected**: Year/Month/Period dropdowns disabled
- [ ] **Expected**: Dates cannot be changed
- [ ] **Expected**: Can only modify selections/amounts

---

## Test Suite 4: Batch Display

### Test 4.1: Main Payroll Page
- [ ] Navigate to Payroll page
- [ ] **Expected**: Batches grouped by period (not by employee)
- [ ] **Expected**: Each row shows:
  - Period Code (PAY-202401-P1)
  - Period dates (Jan 1-15)
  - Working days (15)
  - Employee count (e.g., "3 employees")
  - Total Gross
  - Total Deductions
  - Total Net

### Test 4.2: View Batch - All Employees
- [ ] Click "View" on any batch
- [ ] **Expected**: Modal opens
- [ ] **Expected**: Table shows ALL employees in batch
- [ ] **Expected**: Columns: Select, Employee, Present Days, Gross, Deductions, Net
- [ ] **Expected**: Summary shows aggregated totals

### Test 4.3: View Batch - Zero Attendance Visual
- [ ] View batch with zero-attendance employee
- [ ] **Expected**: Yellow highlighted row
- [ ] **Expected**: "NO ATTENDANCE" badge visible
- [ ] **Expected**: Checkbox disabled
- [ ] **Expected**: All amounts = ₱0

### Test 4.4: Batch Summary Calculations
**Setup:** Batch with 3 employees:
- EMP-001: Net = ₱8,750
- EMP-002: Net = ₱6,700
- EMP-003: Net = ₱0 (zero attendance)

**Expected Summary:**
- [ ] Total Gross = Sum of all gross amounts
- [ ] Total Deductions = Sum of all deductions
- [ ] Total Net = ₱8,750 + ₱6,700 + ₱0 = ₱15,450
- [ ] Employee Count = 3

---

## Test Suite 5: API Endpoints

### Test 5.1: GET /api/integration/hr_payroll?grouped=true&year=2024&month=01
**Expected Response:**
```json
[
  {
    "period_code": "PAY-202401-P1",
    "period": 1,
    "period_start": "2024-01-01",
    "period_end": "2024-01-15",
    "working_days": 15,
    "employees": [
      // Array of all employees with their data
    ]
  },
  {
    "period_code": "PAY-202401-P2",
    // Period 2 data
  }
]
```

- [ ] Returns 2 batches (P1 and P2)
- [ ] Each batch has all employees
- [ ] Calculations are correct
- [ ] Zero-attendance employees included

### Test 5.2: GET /api/integration/hr_payroll/periods?year=2024&month=01
**Expected Response:**
```json
[
  {
    "period": 1,
    "label": "Period 1 (1st-15th)",
    "startDate": "2024-01-01",
    "endDate": "2024-01-15",
    "workingDays": 15
  },
  {
    "period": 2,
    "label": "Period 2 (16th-31st)",
    "startDate": "2024-01-16",
    "endDate": "2024-01-31",
    "workingDays": 16
  }
]
```

- [ ] Returns 2 periods
- [ ] Dates correct for January
- [ ] Working days calculated correctly

### Test 5.3: Backward Compatibility
- [ ] Call old endpoint: GET /api/integration/hr_payroll (without grouped param)
- [ ] **Expected**: Returns flat array of employees (old format)
- [ ] **Expected**: No errors

---

## Test Suite 6: Edge Cases

### Test 6.1: February Leap Year
- [ ] Create batch for Feb 2024 Period 2
- [ ] **Expected**: End date = Feb 29, 2024
- [ ] **Expected**: Working days = 29 - 15 = 14

### Test 6.2: February Non-Leap Year
- [ ] Create batch for Feb 2025 Period 2
- [ ] **Expected**: End date = Feb 28, 2025
- [ ] **Expected**: Working days = 28 - 15 = 13

### Test 6.3: 31-Day Month
- [ ] Create batch for Jan/Mar/May Period 2
- [ ] **Expected**: Working days = 31 - 15 = 16

### Test 6.4: 30-Day Month
- [ ] Create batch for Apr/Jun/Sep Period 2
- [ ] **Expected**: Working days = 30 - 15 = 15

### Test 6.5: No Employees
- [ ] Scenario: No active employees in system
- [ ] **Expected**: Graceful handling
- [ ] **Expected**: Message: "No employees available"

### Test 6.6: All Employees Zero Attendance
- [ ] Scenario: All employees have 0 present days
- [ ] **Expected**: Batch created
- [ ] **Expected**: All rows yellow
- [ ] **Expected**: All amounts = ₱0
- [ ] **Expected**: Total Net = ₱0

### Test 6.7: Large Employee Count
- [ ] Scenario: 100+ employees
- [ ] **Expected**: Batch loads without performance issues
- [ ] **Expected**: Calculations complete in <3 seconds
- [ ] **Expected**: UI remains responsive

---

## Test Suite 7: User Workflows

### Test 7.1: Complete Payroll Cycle (Period 1)
1. [ ] Create Period 1 batch (Jan 1-15)
2. [ ] View batch to review all employees
3. [ ] Identify zero-attendance employees
4. [ ] Select employees for disbursement (exclude zero-attendance)
5. [ ] Disburse selected employees
6. [ ] Verify disbursement recorded
7. [ ] Export batch report

### Test 7.2: Complete Payroll Cycle (Period 2)
1. [ ] Create Period 2 batch (Jan 16-31)
2. [ ] View batch to review
3. [ ] Compare totals with Period 1
4. [ ] Disburse all eligible employees
5. [ ] Verify monthly totals = P1 + P2

### Test 7.3: Edit Existing Batch
1. [ ] Open batch in edit mode
2. [ ] Verify period fields disabled
3. [ ] Modify employee selections
4. [ ] Recalculate totals
5. [ ] Save changes
6. [ ] Verify updates applied

### Test 7.4: Delete Batch
1. [ ] Select batch to delete
2. [ ] Confirm deletion
3. [ ] **Expected**: Batch removed
4. [ ] **Expected**: No orphaned records

---

## Test Suite 8: Validation & Error Handling

### Test 8.1: Required Fields
- [ ] Try to save batch without selecting period
- [ ] **Expected**: Error: "Period is required"

### Test 8.2: No Employees Selected
- [ ] Uncheck all employees
- [ ] Try to save
- [ ] **Expected**: Error: "At least one employee must be selected"

### Test 8.3: Invalid Date Range
- [ ] Manually set start date > end date (if possible)
- [ ] **Expected**: Validation error

### Test 8.4: API Error Handling
- [ ] Simulate backend error (disconnect server)
- [ ] Try to load batches
- [ ] **Expected**: User-friendly error message
- [ ] **Expected**: Fallback to cached data if available

### Test 8.5: Network Timeout
- [ ] Simulate slow network
- [ ] **Expected**: Loading indicator
- [ ] **Expected**: Timeout handling after 30s

---

## Test Suite 9: Performance

### Test 9.1: Load Time
- [ ] Measure time to load payroll page
- [ ] **Target**: <2 seconds

### Test 9.2: Batch Creation Time
- [ ] Measure time to create batch with 50 employees
- [ ] **Target**: <3 seconds

### Test 9.3: Calculation Speed
- [ ] Measure time to calculate all payrolls
- [ ] **Target**: <1 second for 100 employees

### Test 9.4: Memory Usage
- [ ] Monitor memory during batch creation
- [ ] **Target**: No memory leaks

---

## Test Suite 10: Browser Compatibility

### Test 10.1: Chrome
- [ ] All features work in Chrome
- [ ] UI displays correctly

### Test 10.2: Firefox
- [ ] All features work in Firefox
- [ ] UI displays correctly

### Test 10.3: Edge
- [ ] All features work in Edge
- [ ] UI displays correctly

### Test 10.4: Safari (if applicable)
- [ ] All features work in Safari
- [ ] UI displays correctly

---

## Regression Tests

### Test R.1: Existing Batches (Old Format)
- [ ] View old batches (created before restructure)
- [ ] **Expected**: Display correctly
- [ ] **Expected**: No errors

### Test R.2: Other Payroll Features
- [ ] Payroll reports still work
- [ ] Disbursement history accessible
- [ ] Employee payroll history unchanged

### Test R.3: Audit Logs
- [ ] Batch creation logged
- [ ] Batch edits logged
- [ ] Disbursements logged

---

## Sign-Off Checklist

### Functionality
- [ ] All test suites passed
- [ ] Zero critical bugs
- [ ] Performance targets met

### Documentation
- [ ] PAYROLL_RESTRUCTURE_SUMMARY.md reviewed
- [ ] PAYROLL_BEFORE_AFTER.md reviewed
- [ ] API documentation updated

### Code Quality
- [ ] No compilation errors
- [ ] No console errors in browser
- [ ] Code follows project standards

### User Acceptance
- [ ] User trained on new UI
- [ ] User manual updated
- [ ] FAQs prepared

---

## Bug Tracking Template

When you find issues, document them like this:

```
Bug ID: BUG-001
Severity: High | Medium | Low
Test: [Test Suite & Number]
Description: [What went wrong]
Steps to Reproduce:
  1. ...
  2. ...
Expected: [What should happen]
Actual: [What actually happened]
Screenshot: [If applicable]
Status: Open | In Progress | Fixed | Closed
```

---

## Testing Notes

### Environment
- Backend Version: _______
- Frontend Version: _______
- Database: PostgreSQL _______
- Test Date: _______
- Tester: _______

### Overall Results
- Total Tests: _______
- Passed: _______
- Failed: _______
- Skipped: _______
- Pass Rate: _______%

---

*Testing checklist for payroll system restructure*
*Last Updated: 2024-12-19*
