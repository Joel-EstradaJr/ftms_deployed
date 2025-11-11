# Backend Integration Guide - Trip Revenue Management

This document provides comprehensive guidance for integrating the Trip Revenue frontend with the backend API.

---

## Table of Contents
1. [Overview](#overview)
2. [Required API Endpoints](#required-api-endpoints)
3. [Database Tables](#database-tables)
4. [Data Flow](#data-flow)
5. [Important Business Logic](#important-business-logic)
6. [Implementation Examples](#implementation-examples)

---

## Overview

The Trip Revenue Management system handles:
- Recording bus trip revenue remittances
- Automatic loan creation for shortfalls or missed deadlines
- Support for driver-only or driver+conductor scenarios
- Configurable rules for minimum wage, deadlines, and loan distribution

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

```
PENDING → ON_TIME → LATE → CONVERTED_TO_LOAN
         ↓
      REMITTED (if full amount paid)
         ↓
      LOANED (if shortfall or deadline exceeded)
```

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
- Current Date: 2024-11-10 (9 days = 216 hours)
- Duration to Loan: 168 hours (7 days)
- Expected Remittance: ₱10,000

**System Behavior:**
- Amount automatically set to ₱0
- Full ₱10,000 converted to loan
- Status: 'loaned'
- Remarks: "Automatically converted to loan"

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

### Data Integrity:
- [ ] Conductor/driver IDs and name fields are included
- [ ] Driver-only scenarios work (no conductor fields)
- [ ] Atomic transactions work (remittance + loan together)
- [ ] Status updates correctly based on time

### Business Logic:
- [ ] Boundary calculation is correct
- [ ] Percentage calculation is correct
- [ ] Minimum wage validation works
- [ ] Loan creation triggers correctly
- [ ] Loan distribution is accurate (50/50 or 100% driver)

---

## Contact

For questions or issues with backend integration, please refer to:
- Frontend code: `/app/(admin)/admin/revenue/tripRevenue/`
- Backend team lead: [Contact Info]
- Documentation: This file

---

**Last Updated:** November 11, 2025
