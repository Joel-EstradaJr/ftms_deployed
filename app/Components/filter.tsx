import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "../styles/components/filter.css";

// Generic filter option type
export interface FilterOption {
    id: string;
    label: string;
}

// Types of filter fields we support
export type FilterFieldType = 'dateRange' | 'numberRange' | 'checkbox' | 'radio' | 'date';

// Definition for a single filter section
export interface FilterSection {
    id: string;
    title: string;
    type: FilterFieldType;
    options?: FilterOption[];
    defaultValue?: any;
    placeholder?: string;
}

// Props for the FilterDropdown component
export interface FilterDropdownProps {
    sections: FilterSection[];
    onApply: (filterValues: Record<string, any>) => void;
    initialValues?: Record<string, any>;
    className?: string;
}

export default function FilterDropdown({
    sections,
    onApply,
    initialValues,
    className = ""
}: FilterDropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Memoize section IDs to detect actual changes
    const sectionIds = useMemo(() => sections.map(s => s.id).join(','), [sections]);

    // Memoize initialValues to prevent unnecessary re-renders
    const stableInitialValues = useMemo(() => initialValues || {}, [
        // Only update when the actual content changes, not the reference
        initialValues ? JSON.stringify(initialValues) : '{}'
    ]);

    // Initialize filter values with default values from sections and any provided initialValues
    const getInitialFilterValues = useCallback(() => {
        const defaults: Record<string, any> = {};

        sections.forEach(section => {
            if (stableInitialValues[section.id] !== undefined) {
                defaults[section.id] = stableInitialValues[section.id];
            } else if (section.defaultValue !== undefined) {
                defaults[section.id] = section.defaultValue;
            } else {
                // Set appropriate default based on filter type
                switch (section.type) {
                    case 'dateRange':
                        defaults[section.id] = { from: '', to: '' };
                        break;
                    case 'numberRange':
                        defaults[section.id] = { min: '', max: '' };
                        break;
                    case 'checkbox':
                        defaults[section.id] = [];
                        break;
                    case 'date':
                        defaults[section.id] = '';
                        break;
                    case 'radio':
                }
            }
        });

        return defaults;
    }, [sections, stableInitialValues]);

    const [filterValues, setFilterValues] = useState<Record<string, any>>(() => getInitialFilterValues());

    // Sync filterValues when initialValues prop changes (with stable reference)
    useEffect(() => {
        setFilterValues(getInitialFilterValues());
    }, [sectionIds, stableInitialValues, getInitialFilterValues]);

    // Handle clicks outside the dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.filter-btn')) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    // Toggle dropdown visibility
    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    // Handle date range changes
    const handleDateRangeChange = (sectionId: string, field: "from" | "to", value: string) => {
        setFilterValues({
            ...filterValues,
            [sectionId]: {
                ...filterValues[sectionId],
                [field]: value
            }
        });
    };

    // Handle checkbox selection (multiple selection)
    const handleCheckboxChange = (sectionId: string, optionId: string) => {
        const currentValues = filterValues[sectionId] || [];
        const newValues = currentValues.includes(optionId)
            ? currentValues.filter((item: string) => item !== optionId)
            : [...currentValues, optionId];

        setFilterValues({
            ...filterValues,
            [sectionId]: newValues
        });
    };

    // Handle radio selection (single selection)
    const handleRadioChange = (sectionId: string, value: string) => {
        setFilterValues({
            ...filterValues,
            [sectionId]: value
        });
    };

    // Apply filters
    const handleApply = () => {
        onApply(filterValues);
        setIsOpen(false);
    };

    // Clear all filters - reset to section defaults, NOT initialValues
    const handleClearAll = () => {
        const clearedValues: Record<string, any> = {};
        
        sections.forEach(section => {
            if (section.defaultValue !== undefined) {
                clearedValues[section.id] = section.defaultValue;
            } else {
                // Set appropriate default based on filter type
                switch (section.type) {
                    case 'dateRange':
                        clearedValues[section.id] = { from: '', to: '' };
                        break;
                    case 'numberRange':
                        clearedValues[section.id] = { min: '', max: '' };
                        break;
                    case 'checkbox':
                        clearedValues[section.id] = [];
                        break;
                    case 'date':
                        clearedValues[section.id] = '';
                        break;
                    case 'radio':
                        clearedValues[section.id] = '';
                        break;
                }
            }
        });
        
        setFilterValues(clearedValues);
        onApply(clearedValues);
    };

    // Check if a checkbox option is selected
    const isCheckboxSelected = (sectionId: string, optionId: string) => {
        const values = filterValues[sectionId] || [];
        return values.includes(optionId);
    };

    // Render field based on type
    const renderFilterField = (section: FilterSection) => {
        switch (section.type) {
            case 'date':
                return (
                    <div className="date-range-inputs">
                        <div className="date-field">
                            <input
                                type="date"
                                value={filterValues[section.id] || ''}
                                onChange={(e) => setFilterValues({
                                    ...filterValues,
                                    [section.id]: e.target.value
                                })}
                                placeholder={section.placeholder || "mm/dd/yyyy"}
                            />
                        </div>
                    </div>
                );

            case 'dateRange':
                return (
                    <div className="date-range-inputs">
                        <div className="date-field">
                            <label>From:</label>
                            <input
                                type="date"
                                value={filterValues[section.id]?.from || ''}
                                onChange={(e) => handleDateRangeChange(section.id, "from", e.target.value)}
                                placeholder={section.placeholder || "mm/dd/yyyy"}
                            />
                        </div>
                        <div className="date-field">
                            <label>To:</label>
                            <input
                                type="date"
                                value={filterValues[section.id]?.to || ''}
                                onChange={(e) => handleDateRangeChange(section.id, "to", e.target.value)}
                                placeholder={section.placeholder || "mm/dd/yyyy"}
                            />
                        </div>
                    </div>
                );

            case 'numberRange':
                return (
                    <div className="date-range-inputs">
                        <div className="date-field">
                            <label>Min:</label>
                            <input
                                type="number"
                                value={filterValues[section.id]?.min || ''}
                                onChange={(e) => setFilterValues({
                                    ...filterValues,
                                    [section.id]: {
                                        ...filterValues[section.id],
                                        min: e.target.value
                                    }
                                })}
                                placeholder={section.placeholder || "Minimum"}
                                step="0.01"
                                min="0"
                            />
                        </div>
                        <div className="date-field">
                            <label>Max:</label>
                            <input
                                type="number"
                                value={filterValues[section.id]?.max || ''}
                                onChange={(e) => setFilterValues({
                                    ...filterValues,
                                    [section.id]: {
                                        ...filterValues[section.id],
                                        max: e.target.value
                                    }
                                })}
                                placeholder={section.placeholder || "Maximum"}
                                step="0.01"
                                min="0"
                            />
                        </div>
                    </div>
                );

            case 'checkbox':
                return (
                    <div className="filter-options">
                        {section.options?.map((option) => (
                            <div
                                key={option.id}
                                className={`filter-option ${isCheckboxSelected(section.id, option.id) ? "selected" : ""}`}
                                onClick={() => handleCheckboxChange(section.id, option.id)}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                );

            case 'radio':
                return (
                    <div className="filter-options">
                        {section.options?.map((option) => (
                            <div
                                key={option.id}
                                className={`filter-option ${filterValues[section.id] === option.id ? "selected" : ""}`}
                                onClick={() => handleRadioChange(section.id, option.id)}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`filter ${className}`}>
            <button className="filter-btn" onClick={toggleDropdown}>
                <i className="ri-equalizer-line" /> Filters
            </button>

            {isOpen && (
                <div className="filter-dropdown" ref={dropdownRef}>
                    {sections.map((section) => (
                        <div className="filter-section" key={section.id}>
                            <h3>{section.title}</h3>
                            {renderFilterField(section)}
                        </div>
                    ))}

                    {/* Action Buttons */}
                    <div className="filter-actions">
                        <button className="clear-btn" onClick={handleClearAll}>
                            Clear All
                        </button>
                        <button className="apply-btn" onClick={handleApply}>
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}