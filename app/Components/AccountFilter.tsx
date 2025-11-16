/**
 * Account Filter Component - Wrapper
 * 
 * This is a lightweight wrapper around the base FilterDropdown component.
 * It provides Chart of Accounts-specific fields and configuration.
 * 
 * The base component (filter.tsx) handles all UI, styling, and interactions.
 */

import React from "react";
import FilterDropdown, { FilterSection, FilterOption } from "./filter";
import { AccountType } from "@/app/types/jev";

// Account-specific filter structure
interface AccountFilterValues {
    accountTypes: string[];
    status: string;
}

interface AccountFilterProps {
    onApply: (filterValues: AccountFilterValues) => void;
    initialValues?: Partial<AccountFilterValues>;
}

export default function AccountFilter({
    onApply,
    initialValues = {}
}: AccountFilterProps) {
    
    // Define Account-specific filter sections
    const filterSections: FilterSection[] = [
        // Account Type filter
        {
            id: 'accountTypes',
            title: 'Account Type',
            type: 'checkbox',
            options: [
                { id: AccountType.ASSET, label: 'Assets' },
                { id: AccountType.LIABILITY, label: 'Liabilities' },
                { id: AccountType.EQUITY, label: 'Equity' },
                { id: AccountType.REVENUE, label: 'Revenue' },
                { id: AccountType.EXPENSE, label: 'Expenses' },
            ],
            defaultValue: []
        },
        // Status filter
        {
            id: 'status',
            title: 'Status',
            type: 'radio',
            options: [
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'archived', label: 'Archived' },
            ],
            defaultValue: 'active'
        }
    ];

    // Convert initial values to the format expected by base component
    const convertedInitialValues = {
        accountTypes: initialValues.accountTypes || [],
        status: initialValues.status || 'active'
    };

    // Handle apply from base component
    const handleApply = (filterValues: Record<string, string | string[] | { from: string; to: string }>) => {
        // Convert back to Account-specific format and call the parent handler
        onApply({
            accountTypes: (filterValues.accountTypes as string[]) || [],
            status: (filterValues.status as string) || 'active'
        });
    };

    // Use the base FilterDropdown component with Account-specific configuration
    return (
        <FilterDropdown
            sections={filterSections}
            onApply={handleApply}
            initialValues={convertedInitialValues}
        />
    );
}
