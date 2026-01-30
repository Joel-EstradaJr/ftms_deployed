'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  minMenuWidth?: number;
  maxMenuWidth?: number;
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
  minMenuWidth = 280,
  maxMenuWidth = 520,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get selected option label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  // Calculate menu position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const constrainedWidth = Math.min(
      Math.max(rect.width, minMenuWidth),
      Math.max(minMenuWidth, maxMenuWidth)
    );
    
    setMenuPosition({
      top: rect.bottom + scrollY + 2,
      left: rect.left + scrollX,
      width: constrainedWidth
    });
  }, [minMenuWidth, maxMenuWidth]);

  // Update position when opening and on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();
    
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the dropdown trigger and the portal menu
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
        if (onBlur) onBlur();
      }
    };

    // Use a slight delay to prevent immediate closing on open
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onBlur]);

  // Handle option selection
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    // Delay onBlur to allow React state update from onChange to complete first
    // This ensures validation runs with the updated value, not the stale value
    if (onBlur) {
      setTimeout(() => onBlur(), 0);
    }
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
        ref={triggerRef}
        className={`dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? 'selected' : 'placeholder'}>
          {displayValue || placeholder}
        </span>
        <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line dropdown-icon`} />
      </div>

      {/* Dropdown Menu - Rendered via Portal */}
      {isOpen && menuPosition && typeof window !== 'undefined' && createPortal(
        <div 
          ref={menuRef}
          className="dropdown-menu" 
          style={{
            position: 'absolute',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchableDropdown;
