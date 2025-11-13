'use client';

import { useState, useEffect, useRef } from 'react';

interface Option {
  id: number;
  name: string;
  path?: string;
}

interface MercariSearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  type: 'category' | 'brand';
  label: string;
  placeholder?: string;
  required?: boolean;
}

export default function MercariSearchableSelect({
  value,
  onChange,
  type,
  label,
  placeholder,
  required = false,
}: MercariSearchableSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search API when search term changes
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const endpoint = type === 'category'
          ? '/api/mercari/categories'
          : '/api/mercari/brands';
        const response = await fetch(
          `${endpoint}?search=${encodeURIComponent(searchTerm)}&limit=50`
        );
        const data = await response.json();

        if (data.success) {
          setOptions(type === 'category' ? data.categories : data.brands);
        }
      } catch (error) {
        console.error(`Failed to search ${type}:`, error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, type]);

  // Load selected item name when value changes
  useEffect(() => {
    if (value && !selectedName) {
      // Find the selected item from current options
      const selected = options.find(opt => opt.id.toString() === value);
      if (selected) {
        setSelectedName(selected.name);
      }
    }
  }, [value, options, selectedName]);

  const handleSelect = (option: Option) => {
    onChange(option.id.toString());
    setSelectedName(option.name);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    if (value) {
      // Clear selection if user starts typing
      onChange('');
      setSelectedName('');
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-foreground mb-2">
        {label}
        {required && ' *'}
      </label>

      <div className="relative">
        <input
          type="text"
          value={selectedName || searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || `Search ${type}...`}
          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
        />

        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full"></div>
          </div>
        )}

        {value && selectedName && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setSelectedName('');
              setSearchTerm('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      {/* Hidden input for the actual ID value */}
      <input type="hidden" value={value} />

      {/* Dropdown results */}
      {isOpen && options.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              className="w-full px-4 py-2 text-left hover:bg-accent/10 focus:bg-accent/10 focus:outline-none"
            >
              <div className="font-medium text-foreground">{option.name}</div>
              {option.path && (
                <div className="text-xs text-muted-foreground mt-0.5">{option.path}</div>
              )}
              <div className="text-xs text-muted-foreground mt-0.5">ID: {option.id}</div>
            </button>
          ))}
        </div>
      )}

      {isOpen && searchTerm.length >= 2 && options.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg px-4 py-3 text-sm text-muted-foreground">
          No results found for "{searchTerm}"
        </div>
      )}

      {isOpen && searchTerm.length < 2 && searchTerm.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg px-4 py-3 text-sm text-muted-foreground">
          Type at least 2 characters to search
        </div>
      )}
    </div>
  );
}
