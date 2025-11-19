'use client';

import React, { useState, useRef, useEffect } from 'react';
import '../styles/components/searchableDropdown.css';

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showDescription?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  onBlur,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  showDescription = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get selected option label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        if (onBlur) onBlur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onBlur]);

  // Handle option selection
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    if (onBlur) onBlur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`searchable-dropdown ${className} ${disabled ? 'disabled' : ''}`}
      onKeyDown={handleKeyDown}
    >
      {/* Dropdown Trigger */}
      <div
        className={`dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? 'selected' : 'placeholder'}>
          {displayValue || placeholder}
        </span>
        <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line dropdown-icon`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="dropdown-menu">
          {/* Search Input */}
          <div className="dropdown-search">
            <i className="ri-search-line search-icon" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="search-input"
            />
            {searchTerm && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
                type="button"
              >
                <i className="ri-close-line" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="dropdown-options">
            {filteredOptions.length === 0 ? (
              <div className="no-options">No options found</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`dropdown-option ${value === option.value ? 'selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  <div className="option-content">
                    <span className="option-label">{option.label}</span>
                    {showDescription && option.description && (
                      <span className="option-description">{option.description}</span>
                    )}
                  </div>
                  {value === option.value && (
                    <i className="ri-check-line check-icon" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
