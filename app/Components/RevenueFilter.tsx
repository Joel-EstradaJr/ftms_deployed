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

// Revenue-specific filter structure for trip revenue
interface TripRevenueFilterValues {
    types: string[];
    statuses: string[];
    dateAssignedRange: { from: string; to: string };
    dueDateRange: { from: string; to: string };
    tripRevenueRange: { from: string; to: string };
}

// Revenue-specific filter structure for bus rental and other revenue
interface GeneralRevenueFilterValues {
    sources: string[];
    paymentMethods: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
}

// Extended revenue filter for other revenue (includes payment statuses)
interface ExtendedRevenueFilterValues {
    sources: string[];
    paymentMethods: string[];
    paymentStatuses: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
}

// Props for trip revenue filter
interface TripRevenueFilterProps {
    types: FilterOption[];
    statuses: FilterOption[];
    sources?: never;
    paymentMethods?: never;
    paymentStatuses?: never;
    onApply: (filterValues: TripRevenueFilterValues) => void;
    initialValues?: Partial<TripRevenueFilterValues>;
}

// Props for general revenue filter (bus rental)
interface GeneralRevenueFilterProps {
    types?: never;
    statuses?: never;
    sources: FilterOption[];
    paymentMethods: FilterOption[];
    paymentStatuses?: never;
    onApply: (filterValues: GeneralRevenueFilterValues) => void;
    initialValues?: Partial<GeneralRevenueFilterValues>;
}

// Props for extended revenue filter (other revenue with payment statuses)
interface ExtendedRevenueFilterProps {
    types?: never;
    statuses?: never;
    sources: FilterOption[];
    paymentMethods: FilterOption[];
    paymentStatuses: FilterOption[];
    onApply: (filterValues: ExtendedRevenueFilterValues) => void;
    initialValues?: Partial<ExtendedRevenueFilterValues>;
}

type RevenueFilterProps = TripRevenueFilterProps | GeneralRevenueFilterProps | ExtendedRevenueFilterProps;

export default function RevenueFilter(props: RevenueFilterProps) {
    const {
        types,
        statuses,
        sources,
        paymentMethods,
        paymentStatuses,
        onApply,
        initialValues = {}
    } = props;
    
    // Determine which type of filter we're using based on provided props
    const isTripRevenueFilter = types !== undefined || statuses !== undefined;
    const isExtendedRevenueFilter = paymentStatuses !== undefined && paymentStatuses.length > 0;
    const isGeneralRevenueFilter = !isTripRevenueFilter && !isExtendedRevenueFilter && (sources !== undefined || paymentMethods !== undefined);
    
    // Define Revenue-specific filter sections
    const filterSections: FilterSection[] = [];
    
    if (isTripRevenueFilter) {
        // Trip Revenue Filter sections
        if (types && types.length > 0) {
            filterSections.push({
                id: 'types',
                title: 'Assignment Type',
                type: 'checkbox',
                options: types,
                defaultValue: []
            });
        }
        
        if (statuses && statuses.length > 0) {
            filterSections.push({
                id: 'statuses',
                title: 'Status',
                type: 'checkbox',
                options: statuses,
                defaultValue: []
            });
        }
        
        filterSections.push(
            {
                id: 'dateAssignedRange',
                title: 'Date Assigned',
                type: 'dateRange',
                defaultValue: { from: '', to: '' }
            },
            {
                id: 'dueDateRange',
                title: 'Date Recorded',
                type: 'dateRange',
                defaultValue: { from: '', to: '' }
            },
            {
                id: 'tripRevenueRange',
                title: 'Trip Revenue',
                type: 'numberRange',
                defaultValue: { from: '', to: '' }
            }
        );
    } else if (isExtendedRevenueFilter || isGeneralRevenueFilter) {
        // General Revenue Filter sections (Bus Rental, Other Revenue, etc.)
        if (sources && sources.length > 0) {
            filterSections.push({
                id: 'sources',
                title: 'Revenue Source',
                type: 'checkbox',
                options: sources,
                defaultValue: []
            });
        }
        
        if (paymentMethods && paymentMethods.length > 0) {
            filterSections.push({
                id: 'paymentMethods',
                title: 'Payment Method',
                type: 'checkbox',
                options: paymentMethods,
                defaultValue: []
            });
        }
        
        // Add payment statuses for extended revenue filter
        if (isExtendedRevenueFilter && paymentStatuses && paymentStatuses.length > 0) {
            filterSections.push({
                id: 'paymentStatuses',
                title: 'Payment Status',
                type: 'checkbox',
                options: paymentStatuses,
                defaultValue: []
            });
        }
        
        filterSections.push(
            {
                id: 'dateRange',
                title: 'Date Recorded',
                type: 'dateRange',
                defaultValue: { from: '', to: '' }
            },
            {
                id: 'amountRange',
                title: 'Amount',
                type: 'numberRange',
                defaultValue: { from: '', to: '' }
            }
        );
    }

    // Convert initial values to the format expected by base component
    const convertedInitialValues = isTripRevenueFilter ? {
        types: (initialValues as Partial<TripRevenueFilterValues>).types || [],
        statuses: (initialValues as Partial<TripRevenueFilterValues>).statuses || [],
        dateAssignedRange: (initialValues as Partial<TripRevenueFilterValues>).dateAssignedRange || { from: '', to: '' },
        dueDateRange: (initialValues as Partial<TripRevenueFilterValues>).dueDateRange || { from: '', to: '' },
        tripRevenueRange: (initialValues as Partial<TripRevenueFilterValues>).tripRevenueRange || { from: '', to: '' }
    } : isExtendedRevenueFilter ? {
        sources: (initialValues as Partial<ExtendedRevenueFilterValues>).sources || [],
        paymentMethods: (initialValues as Partial<ExtendedRevenueFilterValues>).paymentMethods || [],
        paymentStatuses: (initialValues as Partial<ExtendedRevenueFilterValues>).paymentStatuses || [],
        dateRange: (initialValues as Partial<ExtendedRevenueFilterValues>).dateRange || { from: '', to: '' },
        amountRange: (initialValues as Partial<ExtendedRevenueFilterValues>).amountRange || { from: '', to: '' }
    } : {
        sources: (initialValues as Partial<GeneralRevenueFilterValues>).sources || [],
        paymentMethods: (initialValues as Partial<GeneralRevenueFilterValues>).paymentMethods || [],
        dateRange: (initialValues as Partial<GeneralRevenueFilterValues>).dateRange || { from: '', to: '' },
        amountRange: (initialValues as Partial<GeneralRevenueFilterValues>).amountRange || { from: '', to: '' }
    };

    // Handle apply from base component
    const handleApply = (filterValues: Record<string, string | string[] | { from: string; to: string }>) => {
        if (isTripRevenueFilter) {
            // Convert back to Trip Revenue-specific format and call the parent handler
            (onApply as (filterValues: TripRevenueFilterValues) => void)({
                types: (filterValues.types as string[]) || [],
                statuses: (filterValues.statuses as string[]) || [],
                dateAssignedRange: (filterValues.dateAssignedRange as { from: string; to: string }) || { from: '', to: '' },
                dueDateRange: (filterValues.dueDateRange as { from: string; to: string }) || { from: '', to: '' },
                tripRevenueRange: (filterValues.tripRevenueRange as { from: string; to: string }) || { from: '', to: '' }
            });
        } else if (isExtendedRevenueFilter) {
            // Convert back to Extended Revenue-specific format and call the parent handler
            (onApply as (filterValues: ExtendedRevenueFilterValues) => void)({
                sources: (filterValues.sources as string[]) || [],
                paymentMethods: (filterValues.paymentMethods as string[]) || [],
                paymentStatuses: (filterValues.paymentStatuses as string[]) || [],
                dateRange: (filterValues.dateRange as { from: string; to: string }) || { from: '', to: '' },
                amountRange: (filterValues.amountRange as { from: string; to: string }) || { from: '', to: '' }
            });
        } else {
            // Convert back to General Revenue-specific format and call the parent handler
            (onApply as (filterValues: GeneralRevenueFilterValues) => void)({
                sources: (filterValues.sources as string[]) || [],
                paymentMethods: (filterValues.paymentMethods as string[]) || [],
                dateRange: (filterValues.dateRange as { from: string; to: string }) || { from: '', to: '' },
                amountRange: (filterValues.amountRange as { from: string; to: string }) || { from: '', to: '' }
            });
        }
    };

    // Determine the title based on the filter type
    const title = isTripRevenueFilter ? "Filter Trip Revenue" : "Filter Revenue";

    // Use the base FilterDropdown component with Revenue-specific configuration
    return (
        <FilterDropdown
            sections={filterSections}
            onApply={handleApply}
            initialValues={convertedInitialValues}
        />
    );
}
