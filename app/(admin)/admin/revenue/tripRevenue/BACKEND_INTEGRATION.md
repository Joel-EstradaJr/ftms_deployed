# Backend Integration Guide - Trip Revenue Management

This document provides comprehensive guidance for integrating the Trip Revenue frontend with the backend API.

---

## Table of Contents
1. [Overview](#overview)
2. [Required API Endpoints](#required-api-endpoints)
3. [Database Tables](#database-tables)
4. [Data Flow](#data-flow)
5. [Important Business Logic](#important-business-logic)
6. [Loan Payment System](#loan-payment-system)
7. [Implementation Examples](#implementation-examples)

---

## Overview

The Trip Revenue Management system handles:
- Recording bus trip revenue remittances
- Automatic loan creation for shortfalls or missed deadlines
- Individual loan payment tracking for driver and conductor
- Loan payment with payment method and timestamp recording
- Administrative loan closure (write-off capability)
- Support for driver-only or driver+conductor scenarios
- Configurable rules for minimum wage, deadlines, and loan distribution
- Partial payment status tracking

---

## Required API Endpoints

### 1. GET /api/admin/revenue/bus-trips
**Purpose:** Fetch paginated list of bus trip records with remittance status

**Query Parameters:**
- `page` (number): Current page number
- `pageSize` (number): Records per page
- `search` (string): Search by body_number, route, or assignment_id
- `sortBy` (string): Field to sort by (body_number | date_assigned | trip_revenue)
- `sortOrder` (string): Sort direction (asc | desc)
- `paymentMethods[]` (array): Filter by payment methods
- `dateFrom` (string): Filter by date range start (YYYY-MM-DD)
- `dateTo` (string): Filter by date range end (YYYY-MM-DD)
- `amountFrom` (number): Filter by amount range start
- `amountTo` (number): Filter by amount range end

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "assignment_id": "ASSIGN-001",
      "bus_trip_id": "TRIP-001",
      "bus_route": "S. Palay to Sta. Cruz",
      "date_assigned": "2024-11-10",
      "trip_fuel_expense": 2500.00,
      "trip_revenue": 15000.00,
      "assignment_type": "Boundary",
      "assignment_value": 8000.00,
      "payment_method": "Company Cash",
      
      "employee_id": "EMP-001",
      "employee_firstName": "Juan",
      "employee_middleName": "Santos",
      "employee_lastName": "Dela Cruz",
      "employee_suffix": "",
      "position_id": "POS-001",
      "position_name": "Driver",
      
      "bus_plate_number": "ABC 1234",
      "bus_type": "Airconditioned",
      "body_number": "001",
      "bus_brand": "Hilltop",
      
      "dateRecorded": "2024-11-11",
      "amount": 15000.00,
      "status": "remitted",
      "remarks": "On-time remittance",
      
      "driverName": "Juan Santos Dela Cruz",
      "conductorName": "Pedro Reyes Santos",
      
      "driverId": "EMP-001",
      "driverFirstName": "Juan",
      "driverMiddleName": "Santos",
      "driverLastName": "Dela Cruz",
      "driverSuffix": "",
      
      "conductorId": "EMP-002",
      "conductorFirstName": "Pedro",
      "conductorMiddleName": "Reyes",
      "conductorLastName": "Santos",
      "conductorSuffix": ""
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalPages": 5,
    "totalCount": 50
  }
}
```

**CRITICAL:** Must include conductor and driver detail fields (IDs and name components) for proper loan distribution logic.

---

### 2. GET /api/admin/revenue/filter-options
**Purpose:** Get revenue sources and payment methods for filtering

**Response Format:**
```json
{
  "success": true,
  "revenueSources": [
    {
      "id": 1,
      "name": "Trip Revenue",
      "sourceCode": "TRIP_REV"
    }
  ],
  "paymentMethods": [
    {
      "id": 1,
      "methodName": "Company Cash",
      "methodCode": "CASH"
    }
  ]
}
```

---

### 3. POST /api/admin/revenue/remittance
**Purpose:** Record new trip revenue remittance

**Request Body:**
```json
{
  "assignment_id": "ASSIGN-001",
  "dateRecorded": "2024-11-11",
  "amount": 10000.00,
  "remarks": "Partial remittance",
  "remittanceDueDate": "2024-11-13",
  "durationToLate": 72,
  "durationToLoan": 168,
  "remittanceStatus": "ON_TIME",
  "status": "loaned",
  "loan": {
    "principalAmount": 1500.00,
    "interestRate": 0,
    "interestRateType": "percentage",
    "totalLoanAmount": 1500.00,
    "conductorId": "EMP-002",
    "conductorShare": 750.00,
    "driverId": "EMP-001",
    "driverShare": 750.00,
    "loanType": "Trip Deficit",
    "dueDate": "2024-11-30"
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Trip revenue recorded successfully",
  "data": {
    "remittance": { /* updated remittance record */ },
    "loan": { /* created loan record if applicable */ }
  }
}
```

**Backend Processing:**
1. Insert/update record in Model Revenue table
2. If `loan` object exists, create loan records in Loan Management table
3. Create separate loan entries for conductor (if exists) and driver
4. Use atomic transaction (all succeed or all fail)

---

### 4. PUT /api/admin/revenue/remittance/:assignment_id
**Purpose:** Update existing remittance record

**Request Body:** Same as POST /api/admin/revenue/remittance

**Response Format:** Same as POST /api/admin/revenue/remittance

---

### 5. POST /api/admin/revenue/config (Optional)
**Purpose:** Save trip revenue configuration settings

**Request Body:**
```json
{
  "minimumWage": 600,
  "durationToLate": 72,
  "durationToLoan": 168,
  "defaultConductorShare": 50,
  "defaultDriverShare": 50
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Configuration saved successfully",
  "data": { /* saved configuration */ }
}
```

---

### 6. POST /api/admin/revenue/loan-payment
**Purpose:** Record individual loan payment or close loan

**Request Body (Payment):**
```json
{
  "assignment_id": "ASSIGN-001",
  "employeeType": "driver",
  "employeeId": "EMP-001",
  "payment": {
    "date": "2024-11-20",
    "time": "02:30:45 PM",
    "amount": 750.00,
    "method": "Cash",
    "recordedBy": "Admin"
  }
}
```

**Request Body (Close Loan):**
```json
{
  "assignment_id": "ASSIGN-001",
  "action": "closeLoan",
  "closedBy": "Admin",
  "closedDate": "2024-11-20T14:30:45.000Z"
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "loanDetails": {
      "totalAmount": 1500.00,
      "dueDate": "2024-11-30",
      "driverPaid": 750.00,
      "driverStatus": "Paid",
      "driverPayments": [
        {
          "date": "2024-11-20",
          "time": "02:30:45 PM",
          "amount": 750.00,
          "method": "Cash",
          "recordedBy": "Admin"
        }
      ],
      "conductorPaid": 0,
      "conductorStatus": "Pending",
      "overallStatus": "Partial"
    }
  }
}
```

**Backend Processing:**
1. For payments:
   - Update the specific employee's payment array in loan details
   - Update employee's paid amount and status
   - Calculate overall status (Pending → Partial → Paid)
   - Return updated loanDetails
2. For closure:
   - Set overallStatus to 'Closed'
   - Record closure details (who, when)
   - Allow closure even with unpaid balance (administrative write-off)

---

## Database Tables

### Tables Involved:
1. **Operations** - Bus trip assignments
2. **Human Resource** - Employee (driver/conductor) details
3. **Bus** - Bus information
4. **Model Revenue** - Remittance records
5. **Loan Management** - Trip deficit loans
6. **Configuration** (optional) - System settings

### Key Relationships:
- Operations → Human Resource (employee_id)
- Operations → Bus (bus_id)
- Model Revenue → Operations (assignment_id)
- Loan Management → Human Resource (employee_id for conductor/driver)
- Loan Management → Model Revenue (remittance_id)

---

## Data Flow

### Recording a Remittance:

1. **Frontend Calculates:**
   - Expected remittance based on assignment type (Boundary/Percentage)
   - Minimum wage requirement (1 or 2 employees)
   - Whether a loan is needed (shortfall or deadline exceeded)
   - Loan distribution (50/50 or 100% driver if no conductor)

2. **Frontend Submits:**
   - Remittance details (date, amount, remarks, status)
   - Loan details (if applicable) with employee IDs and shares

3. **Backend Processes:**
   - Validates data
   - Updates Model Revenue table
   - Creates loan records if needed
   - Returns success/error response

4. **Frontend Updates:**
   - Refreshes data table
   - Shows success message
   - Closes modal

---

## Important Business Logic

### 1. Assignment Types

**Boundary (Quota System):**
- Driver/conductor must collect a fixed quota amount
- Expected remittance = Quota + Fuel Expense
- Example: Quota ₱8,000 + Fuel ₱2,500 = ₱10,500 expected

**Percentage (Revenue Share):**
- Company takes a percentage of trip revenue
- Expected remittance = (Revenue × Company%) + Fuel Expense
- Example: ₱15,000 × 70% + ₱2,500 = ₱13,000 expected

### 2. Minimum Wage Check

The system ensures driver and conductor receive minimum wage:
- **Driver Only:** 1 × ₱600 = ₱600 minimum
- **Driver + Conductor:** 2 × ₱600 = ₱1,200 minimum

If trip revenue doesn't cover (expected remittance + minimum wage), the system:
- Allows partial remittance (maximum = revenue - minimum wage)
- Shows warning that revenue is insufficient
- User can decide how much to remit

### 3. Loan Creation Triggers

A loan is automatically created when:

**Scenario 1: Shortfall**
- Remitted amount > 0 but < expected remittance
- Loan amount = Expected - Remitted
- Status = 'loaned'

**Scenario 2: Deadline Exceeded**
- No remittance within durationToLoan hours
- Amount automatically set to 0
- Loan amount = Full expected remittance
- Status = 'loaned'

### 4. Loan Distribution

**With Conductor:**
- Default 50/50 split between conductor and driver
- Can be customized in configuration

**Driver Only:**
- 100% to driver
- Conductor fields omitted from submission

### 5. Status Progression

**Remittance Status:**
```
PENDING → ON_TIME → LATE → CONVERTED_TO_LOAN
```

**Main Status:**
```
PENDING → REMITTED (full payment, no loan)
       ↓
       LOANED (shortfall or deadline exceeded)
```

**Loan Payment Status (overallStatus):**
```
PENDING → PARTIAL (one employee paid in two-employee scenario)
       ↓
       PAID (all employees paid in full)
       ↓
       CLOSED (administrative closure/write-off)
```

**Note:** Status calculation now uses `remittanceDueDate` field instead of just hours from `date_assigned`. If current date > remittanceDueDate, status becomes CONVERTED_TO_LOAN.

---

## Loan Payment System

### Overview
When a trip deficit loan is created (due to shortfall or deadline exceeded), the system tracks individual payments from driver and conductor separately.

### Loan Details Structure
```json
{
  "loanDetails": {
    "totalAmount": 1500.00,
    "dueDate": "2024-11-30",
    "createdDate": "2024-11-20",
    "driverShare": 750.00,
    "driverPaid": 375.00,
    "driverStatus": "Pending",
    "driverPayments": [
      {
        "date": "2024-11-20",
        "time": "02:30:45 PM",
        "amount": 375.00,
        "method": "Cash",
        "recordedBy": "Admin"
      }
    ],
    "conductorShare": 750.00,
    "conductorPaid": 750.00,
    "conductorStatus": "Paid",
    "conductorPayments": [
      {
        "date": "2024-11-20",
        "time": "03:15:30 PM",
        "amount": 750.00,
        "method": "Payroll Deduction",
        "recordedBy": "Admin"
      }
    ],
    "overallStatus": "Partial"
  }
}
```

### Payment Methods
- **Cash** - Direct cash payment
- **Payroll Deduction** - Deducted from employee salary
- **Bank Transfer** - Electronic payment

### Individual Employee Status
- **Pending** - No payment or partial payment made
- **Paid** - Full share amount paid
- **Overdue** - Due date passed without full payment

### Overall Loan Status
- **Pending** - No payments made or both employees unpaid
- **Partial** - One employee paid in full (two-employee scenario)
- **Paid** - All employees paid in full
- **Overdue** - Due date passed without full payment
- **Closed** - Administratively closed (can have unpaid balance)

### Payment Validation
- **Exact Amount Matching** - User must enter exact remaining balance (tolerance: ±0.01)
- **Typed Confirmation** - User must type "PAY" to confirm payment
- **Payment Method Required** - Must select from available methods

### Close Loan Functionality
- **Available Anytime** - Admin can close loan at any time
- **Unpaid Balance Warning** - Shows warning if balance remains
- **Write-Off Capability** - Closing with unpaid balance writes off the debt
- **Typed Confirmation** - User must type "CLOSE" to confirm

### Driver-Only Scenario
- **100% to Driver** - Full loan amount assigned to driver
- **No Conductor Fields** - Conductor share/payments omitted
- **Direct Status Transition** - Pending → Paid (no Partial status)

### Frontend Display
- **Status Chips:**
  - Partially Paid: Yellow background (#fef3c7)
  - Paid: Green success colors
  - Closed: Gray neutral colors
  - Overdue: Red with pulse animation
- **Pay Loan Button:** Disabled when status is Paid or Closed
- **Audit Trail:** All payments recorded with timestamp and recorded by

---

## Implementation Examples

### Example 1: Full Remittance (No Loan)

**Trip Details:**
- Assignment Type: Boundary
- Quota: ₱8,000
- Fuel: ₱2,500
- Revenue: ₱15,000
- Expected Remittance: ₱10,500

**User Records:**
- Amount: ₱10,500
- No loan created
- Status: 'remitted'

### Example 2: Shortfall (Loan Created)

**Trip Details:**
- Assignment Type: Percentage (70%)
- Company Share: ₱10,500
- Fuel: ₱2,500
- Revenue: ₱15,000
- Expected Remittance: ₱13,000

**User Records:**
- Amount: ₱11,000
- Shortfall: ₱2,000
- Loan created for ₱2,000
- Status: 'loaned'

### Example 3: Driver Only (No Conductor)

**Trip Details:**
- Assignment Type: Boundary
- Quota: ₱5,000
- Fuel: ₱1,500
- Revenue: ₱8,000
- Expected Remittance: ₱6,500
- **Only driver assigned** (no conductor)

**User Records:**
- Amount: ₱5,000
- Shortfall: ₱1,500
- Loan created for ₱1,500
- **100% to driver** (no conductor)
- Status: 'loaned'

### Example 4: Deadline Exceeded

**Trip Details:**
- Date Assigned: 2024-11-01
- Remittance Due Date: 2024-11-08
- Current Date: 2024-11-10
- Expected Remittance: ₱10,000

**System Behavior:**
- Amount automatically set to ₱0
- Full ₱10,000 converted to loan
- Status: 'loaned'
- Remarks: "Automatically converted to loan"
- loanDetails initialized with driverShare and conductorShare

### Example 5: Loan Payment (Partial)

**Loan Details:**
- Total Amount: ₱2,000
- Driver Share: ₱1,000 (remaining: ₱1,000)
- Conductor Share: ₱1,000 (remaining: ₱1,000)
- Overall Status: Pending

**Driver Makes Payment:**
- Amount: ₱1,000
- Method: Cash
- Result:
  - driverPaid: ₱1,000
  - driverStatus: Paid
  - overallStatus: Partial (conductor still owes ₱1,000)

**Conductor Makes Payment:**
- Amount: ₱1,000
- Method: Payroll Deduction
- Result:
  - conductorPaid: ₱1,000
  - conductorStatus: Paid
  - overallStatus: Paid (all paid in full)

### Example 6: Administrative Loan Closure

**Loan Details:**
- Total Amount: ₱2,000
- Driver Paid: ₱500
- Conductor Paid: ₱0
- Unpaid Balance: ₱1,500
- Overall Status: Overdue

**Admin Closes Loan:**
- Action: closeLoan
- Warning shown: "Unpaid balance: ₱1,500"
- User types "CLOSE" to confirm
- Result:
  - overallStatus: Closed
  - Unpaid balance written off
  - No further payments required

---

## Testing Checklist

### Backend Endpoints:
- [ ] GET /api/admin/revenue/bus-trips returns correct data structure
- [ ] GET /api/admin/revenue/bus-trips pagination works correctly
- [ ] GET /api/admin/revenue/bus-trips filtering/sorting works
- [ ] GET /api/admin/revenue/filter-options returns options
- [ ] POST /api/admin/revenue/remittance creates records
- [ ] POST /api/admin/revenue/remittance creates loans when needed
- [ ] PUT /api/admin/revenue/remittance updates records
- [ ] POST /api/admin/revenue/loan-payment records driver payment
- [ ] POST /api/admin/revenue/loan-payment records conductor payment
- [ ] POST /api/admin/revenue/loan-payment closes loan
- [ ] POST /api/admin/revenue/loan-payment calculates overallStatus correctly

### Data Integrity:
- [ ] Conductor/driver IDs and name fields are included
- [ ] Driver-only scenarios work (no conductor fields)
- [ ] Atomic transactions work (remittance + loan together)
- [ ] Status updates correctly based on time

### Business Logic:
- [ ] Boundary calculation is correct
- [ ] Percentage calculation is correct
- [ ] Minimum wage validation works
- [ ] Loan creation triggers correctly (shortfall or CONVERTED_TO_LOAN status)
- [ ] LATE status does NOT create loan (only warning)
- [ ] Loan distribution is accurate (50/50 or 100% driver)
- [ ] Payment tracking works for individual employees
- [ ] Overall status updates correctly (Pending → Partial → Paid)
- [ ] Partial status shows when one employee paid (two-employee scenario)
- [ ] Driver-only loans work (100% to driver, no Partial status)
- [ ] Administrative loan closure works with unpaid balance
- [ ] Status calculation uses remittanceDueDate correctly

---

## Contact

For questions or issues with backend integration, please refer to:
- Frontend code: `/app/(admin)/admin/revenue/tripRevenue/`
- Backend team lead: [Contact Info]
- Documentation: This file

---

**Last Updated:** November 20, 2025  
**Version:** 2.0 - Added loan payment system, payment tracking, and administrative closure
