/**
 * Mock Analytics Data - Matches Backend Schema
 * 
 * This file generates realistic mock data that strictly follows
 * the backend Prisma models for revenue and expense.
 */

// ============================================================================
// TYPE DEFINITIONS (Match Backend Enums)
// ============================================================================

export type RevenueStatus = 'PENDING' | 'RECORDED' | 'OVERDUE' | 'CANCELLED';
export type ExpenseStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ============================================================================
// INTERFACES (Match Backend Prisma Models)
// ============================================================================

export interface RevenueType {
    id: number;
    code: string;
    name: string;
    description?: string;
}

export interface ExpenseType {
    id: number;
    code: string;
    name: string;
    description?: string;
}

export interface Revenue {
    id: number;
    code: string;
    revenue_type_id: number;
    amount: number;
    date_recorded: Date;
    date_expected?: Date;
    description?: string;
    status: RevenueStatus;
    approval_status: ApprovalStatus;
    payment_method?: string;
    payment_reference?: string;
}

export interface Expense {
    id: number;
    code: string;
    expense_type_id: number;
    amount: number;
    date_recorded: Date;
    date_expected?: Date;
    description?: string;
    status: ExpenseStatus;
    approval_status: ApprovalStatus;
    payment_method?: string;
    payment_reference?: string;
}

// Aggregated data for predictions
export interface MonthlyAggregate {
    month: string; // YYYY-MM format
    year: number;
    monthNum: number;
    totalAmount: number;
    count: number;
    avgAmount: number;
    byCategory?: Record<number, { name: string; amount: number; count: number }>;
}

// ============================================================================
// MOCK DATA - CATEGORIES (Match Backend Seed Data)
// ============================================================================

export const MOCK_REVENUE_TYPES: RevenueType[] = [
    { id: 1, code: 'RT001', name: 'Operational Trip Revenue', description: 'Revenue from bus trips' },
    { id: 2, code: 'RT002', name: 'Rental Trip Revenue', description: 'Revenue from bus rentals' },
    { id: 3, code: 'RT003', name: 'Asset Disposal Revenue', description: 'Revenue from selling assets' },
    { id: 4, code: 'RT004', name: 'Other Revenue', description: 'Miscellaneous revenue' },
];

export const MOCK_EXPENSE_TYPES: ExpenseType[] = [
    { id: 1, code: 'ET001', name: 'Fuel Expense', description: 'Fuel costs for buses' },
    { id: 2, code: 'ET002', name: 'Salaries', description: 'Employee payroll expenses' },
    { id: 3, code: 'ET003', name: 'Utilities', description: 'Electricity, water, internet' },
    { id: 4, code: 'ET004', name: 'Marketing', description: 'Advertising and promotions' },
    { id: 5, code: 'ET005', name: 'Supplies', description: 'Office and maintenance supplies' },
    { id: 6, code: 'ET006', name: 'Maintenance', description: 'Vehicle and equipment repairs' },
];

// ============================================================================
// SEASONAL PATTERNS AND BASE VALUES
// ============================================================================

// Revenue base amounts per category (monthly)
const REVENUE_BASE_AMOUNTS: Record<number, number> = {
    1: 180000,  // Operational trips - main revenue
    2: 45000,   // Rental trips
    3: 10000,   // Asset disposal - occasional
    4: 5000,    // Other
};

// Expense base amounts per category (monthly)
const EXPENSE_BASE_AMOUNTS: Record<number, number> = {
    1: 55000,   // Fuel
    2: 85000,   // Salaries
    3: 12000,   // Utilities
    4: 8000,    // Marketing
    5: 5000,    // Supplies
    6: 15000,   // Maintenance
};

// Seasonal multipliers by month (1-12)
const SEASONAL_MULTIPLIERS: Record<number, number> = {
    1: 0.85,   // January - post-holiday dip
    2: 0.90,   // February
    3: 1.00,   // March
    4: 1.05,   // April - summer travel
    5: 1.15,   // May - peak summer
    6: 1.10,   // June
    7: 1.05,   // July
    8: 0.95,   // August
    9: 0.90,   // September - school season
    10: 1.00,  // October
    11: 1.10,  // November - holiday prep
    12: 1.20,  // December - holidays
};

// Annual growth rate (for realistic trend)
const ANNUAL_GROWTH_RATE = 0.05; // 5% per year

// ============================================================================
// DATA GENERATION FUNCTIONS
// ============================================================================

function seededRandom(seed: number): () => number {
    return () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };
}

function generateTransactionCode(prefix: string, year: number, index: number): string {
    return `${prefix}-${year}-${String(index).padStart(4, '0')}`;
}

function getRandomStatus<T extends string>(statuses: T[], weights: number[], random: () => number): T {
    const r = random();
    let cumulative = 0;
    for (let i = 0; i < statuses.length; i++) {
        cumulative += weights[i];
        if (r < cumulative) return statuses[i];
    }
    return statuses[statuses.length - 1];
}

/**
 * Generate mock revenue records for a given date range
 */
export function generateMockRevenues(startDate: Date, endDate: Date, seed: number = 42): Revenue[] {
    const random = seededRandom(seed);
    const revenues: Revenue[] = [];
    let id = 1;

    const current = new Date(startDate);
    while (current <= endDate) {
        const year = current.getFullYear();
        const month = current.getMonth() + 1;
        const seasonalMultiplier = SEASONAL_MULTIPLIERS[month] || 1;
        const growthMultiplier = 1 + (year - 2025) * ANNUAL_GROWTH_RATE;

        // Generate revenues for each type
        for (const revenueType of MOCK_REVENUE_TYPES) {
            const baseAmount = REVENUE_BASE_AMOUNTS[revenueType.id] || 10000;
            const numTransactions = revenueType.id === 1 ? Math.floor(15 + random() * 10) :
                revenueType.id === 2 ? Math.floor(3 + random() * 5) :
                    Math.floor(1 + random() * 2);

            for (let i = 0; i < numTransactions; i++) {
                const day = Math.floor(1 + random() * 28);
                const dateRecorded = new Date(year, month - 1, day);

                const variability = 0.7 + random() * 0.6; // 70% to 130%
                const amount = Math.round(
                    (baseAmount / numTransactions) * seasonalMultiplier * growthMultiplier * variability
                );

                revenues.push({
                    id: id++,
                    code: generateTransactionCode('REV', year, id),
                    revenue_type_id: revenueType.id,
                    amount,
                    date_recorded: dateRecorded,
                    status: getRandomStatus(['RECORDED', 'PENDING'], [0.9, 0.1], random),
                    approval_status: getRandomStatus(['APPROVED', 'PENDING'], [0.95, 0.05], random),
                    payment_method: random() > 0.3 ? 'Cash' : 'Bank Transfer',
                    description: `${revenueType.name} - ${dateRecorded.toLocaleDateString()}`,
                });
            }
        }

        // Move to next month
        current.setMonth(current.getMonth() + 1);
    }

    return revenues.sort((a, b) => a.date_recorded.getTime() - b.date_recorded.getTime());
}

/**
 * Generate mock expense records for a given date range
 */
export function generateMockExpenses(startDate: Date, endDate: Date, seed: number = 42): Expense[] {
    const random = seededRandom(seed + 1000);
    const expenses: Expense[] = [];
    let id = 1;

    const current = new Date(startDate);
    while (current <= endDate) {
        const year = current.getFullYear();
        const month = current.getMonth() + 1;
        const seasonalMultiplier = SEASONAL_MULTIPLIERS[month] || 1;
        const growthMultiplier = 1 + (year - 2025) * (ANNUAL_GROWTH_RATE * 0.8); // Expenses grow slower

        // Generate expenses for each type
        for (const expenseType of MOCK_EXPENSE_TYPES) {
            const baseAmount = EXPENSE_BASE_AMOUNTS[expenseType.id] || 5000;
            const numTransactions = expenseType.id === 1 ? Math.floor(20 + random() * 10) : // Fuel - many
                expenseType.id === 2 ? 2 : // Salaries - bi-monthly
                    Math.floor(2 + random() * 4);

            for (let i = 0; i < numTransactions; i++) {
                const day = expenseType.id === 2 ? (i === 0 ? 15 : 30) : Math.floor(1 + random() * 28);
                const dateRecorded = new Date(year, month - 1, Math.min(day, 28));

                const variability = 0.8 + random() * 0.4; // 80% to 120%
                const amount = Math.round(
                    (baseAmount / numTransactions) * seasonalMultiplier * growthMultiplier * variability
                );

                expenses.push({
                    id: id++,
                    code: generateTransactionCode('EXP', year, id),
                    expense_type_id: expenseType.id,
                    amount,
                    date_recorded: dateRecorded,
                    status: getRandomStatus(['PAID', 'PENDING'], [0.85, 0.15], random),
                    approval_status: getRandomStatus(['APPROVED', 'PENDING'], [0.92, 0.08], random),
                    payment_method: random() > 0.5 ? 'Bank Transfer' : 'Cash',
                    description: `${expenseType.name} - ${dateRecorded.toLocaleDateString()}`,
                });
            }
        }

        current.setMonth(current.getMonth() + 1);
    }

    return expenses.sort((a, b) => a.date_recorded.getTime() - b.date_recorded.getTime());
}

/**
 * Aggregate transactions by month
 */
export function aggregateByMonth<T extends { date_recorded: Date; amount: number }>(
    transactions: T[],
    typeIdKey: keyof T,
    types: { id: number; name: string }[]
): MonthlyAggregate[] {
    const aggregates: Map<string, MonthlyAggregate> = new Map();

    for (const tx of transactions) {
        const date = new Date(tx.date_recorded);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!aggregates.has(monthKey)) {
            aggregates.set(monthKey, {
                month: monthKey,
                year: date.getFullYear(),
                monthNum: date.getMonth() + 1,
                totalAmount: 0,
                count: 0,
                avgAmount: 0,
                byCategory: {},
            });
        }

        const agg = aggregates.get(monthKey)!;
        agg.totalAmount += tx.amount;
        agg.count += 1;
        agg.avgAmount = agg.totalAmount / agg.count;

        const typeId = tx[typeIdKey] as number;

        // Initialize byCategory if it doesn't exist
        if (!agg.byCategory) {
            agg.byCategory = {};
        }

        if (!agg.byCategory[typeId]) {
            const typeName = types.find(t => t.id === typeId)?.name || 'Unknown';
            agg.byCategory[typeId] = { name: typeName, amount: 0, count: 0 };
        }
        agg.byCategory[typeId].amount += tx.amount;
        agg.byCategory[typeId].count += 1;
    }

    return Array.from(aggregates.values()).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Get default historical data (last 12 months)
 */
export function getDefaultHistoricalData(): {
    revenueAggregates: MonthlyAggregate[];
    expenseAggregates: MonthlyAggregate[];
} {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const revenues = generateMockRevenues(startDate, endDate);
    const expenses = generateMockExpenses(startDate, endDate);

    return {
        revenueAggregates: aggregateByMonth(revenues, 'revenue_type_id', MOCK_REVENUE_TYPES),
        expenseAggregates: aggregateByMonth(expenses, 'expense_type_id', MOCK_EXPENSE_TYPES),
    };
}
