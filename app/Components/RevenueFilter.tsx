/**
 * Revenue Filter Component - Wrapper
 * 
 * This is a lightweight wrapper around the base FilterDropdown component.
 * It provides Revenue-specific fields and configuration.
 * 
 * The base component (filter.tsx) handles all UI, styling, and interactions.
 */

import React from "react";
import FilterDropdown, { FilterSection, FilterOption } from "./filter";

// Revenue-specific filter structure
interface RevenueFilterValues {
    types: string[];
    statuses: string[];
    dateAssignedRange: { from: string; to: string };
    dueDateRange: { from: string; to: string };
    tripRevenueRange: { from: string; to: string };
}

interface RevenueFilterProps {
    types: FilterOption[];
    statuses: FilterOption[];
    onApply: (filterValues: RevenueFilterValues) => void;
    initialValues?: Partial<RevenueFilterValues>;
}

export default function RevenueFilter({
    types,
    statuses,
    onApply,
    initialValues = {}
}: RevenueFilterProps) {
    
    // Define Revenue-specific filter sections
    const filterSections: FilterSection[] = [
        // Assignment Type filter
        {
            id: 'types',
            title: 'Assignment Type',
            type: 'checkbox',
            icon: 'ri-file-list-3-line',
            options: types,
            defaultValue: []
        },
        // Status filter
        {
            id: 'statuses',
            title: 'Status',
            type: 'checkbox',
            icon: 'ri-checkbox-circle-line',
            options: statuses,
            defaultValue: []
        },
        // Date Assigned Range filter
        {
            id: 'dateAssignedRange',
            title: 'Date Assigned',
            type: 'dateRange',
            icon: 'ri-calendar-line',
            defaultValue: { from: '', to: '' }
        },
        // Due Date Range filter
        {
            id: 'dueDateRange',
            title: 'Due Date',
            type: 'dateRange',
            icon: 'ri-calendar-check-line',
            defaultValue: { from: '', to: '' }
        },
        // Trip Revenue Range filter
        {
            id: 'tripRevenueRange',
            title: 'Trip Revenue',
            type: 'numberRange',
            icon: 'ri-price-tag-3-line',
            defaultValue: { from: '', to: '' },
            numberConfig: {
                min: 0,
                step: 0.01,
                prefix: '₱'
            }
        }
    ];

    // Convert initial values to the format expected by base component
    const convertedInitialValues = {
        types: initialValues.types || [],
        statuses: initialValues.statuses || [],
        dateAssignedRange: initialValues.dateAssignedRange || { from: '', to: '' },
        dueDateRange: initialValues.dueDateRange || { from: '', to: '' },
        tripRevenueRange: initialValues.tripRevenueRange || { from: '', to: '' }
    };

    // Handle apply from base component
    const handleApply = (filterValues: Record<string, string | string[] | { from: string; to: string }>) => {
        // Convert back to Revenue-specific format and call the parent handler
        onApply({
            types: (filterValues.types as string[]) || [],
            statuses: (filterValues.statuses as string[]) || [],
            dateAssignedRange: (filterValues.dateAssignedRange as { from: string; to: string }) || { from: '', to: '' },
            dueDateRange: (filterValues.dueDateRange as { from: string; to: string }) || { from: '', to: '' },
            tripRevenueRange: (filterValues.tripRevenueRange as { from: string; to: string }) || { from: '', to: '' }
        });
    };

    // Use the base FilterDropdown component with Revenue-specific configuration
    return (
        <FilterDropdown
            sections={filterSections}
            onApply={handleApply}
            initialValues={convertedInitialValues}
            title="Filter Trip Revenue"
            showBadge={true}
        />
    );
}
