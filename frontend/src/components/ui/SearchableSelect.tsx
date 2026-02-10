import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, ChevronDown } from 'lucide-react';

export interface Option {
    id: string;
    label: string;
    value?: any; // To hold the full object if needed
    group?: string; // For grouping
}

interface SearchableSelectProps {
    options: Option[];
    value?: string | string[]; // Single ID or array of IDs
    onChange: (value: string | string[]) => void;
    placeholder?: string;
    multiple?: boolean;
    className?: string;
    disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    multiple = false,
    className = '',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(''); // Reset search on close
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter options
    const filteredOptions = useMemo(() => {
        if (!options || !Array.isArray(options)) return [];
        if (!searchTerm) return options;
        const lowerSearch = searchTerm.toLowerCase();
        return options.filter(opt =>
            (opt.label?.toLowerCase() || '').includes(lowerSearch) ||
            (opt.group && opt.group.toLowerCase().includes(lowerSearch))
        );
    }, [options, searchTerm]);

    // Group options if needed
    const groupedOptions = useMemo(() => {
        const groups: { [key: string]: Option[] } = {};
        const ungrouped: Option[] = [];

        filteredOptions.forEach(opt => {
            if (opt.group) {
                if (!groups[opt.group]) groups[opt.group] = [];
                groups[opt.group].push(opt);
            } else {
                ungrouped.push(opt);
            }
        });

        return { groups, ungrouped };
    }, [filteredOptions]);

    const handleSelect = (optionId: string) => {
        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            const newValue = currentValues.includes(optionId)
                ? currentValues.filter(v => v !== optionId)
                : [...currentValues, optionId];
            onChange(newValue);
            // Keep open for multi-select convenience
            inputRef.current?.focus();
        } else {
            onChange(optionId);
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(multiple ? [] : '');
    };

    // Helper to get label for current value (single mode)
    const getDisplayValue = () => {
        if (multiple) {
            const count = Array.isArray(value) ? value.length : 0;
            return count > 0 ? `${count} seleccionado${count > 1 ? 's' : ''}` : placeholder;
        }
        const selectedObj = options.find(o => o.id === value);
        return selectedObj ? selectedObj.label : placeholder;
    };

    const isSelected = (id: string) => {
        if (multiple) {
            return Array.isArray(value) && value.includes(id);
        }
        return value === id;
    };

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            <div
                className={`
          flex items-center justify-between w-full p-2 bg-white border rounded-md shadow-sm cursor-pointer
          ${disabled ? 'bg-gray-100 cursor-not-allowed hidden-input' : 'hover:border-brand-400 focus-within:ring-1 focus-within:ring-brand-500 focus-within:border-brand-500'}
          ${isOpen ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-300'}
        `}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex-1 truncate text-sm text-gray-700 select-none">
                    {getDisplayValue()}
                </div>

                <div className="flex items-center gap-1 text-gray-400">
                    {(Array.isArray(value) ? value.length > 0 : value) && !disabled && (
                        <div
                            onClick={clearSelection}
                            className="p-0.5 hover:bg-gray-100 rounded-full cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <X size={14} />
                        </div>
                    )}
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 flex flex-col">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto flex-1 py-1">
                        {/* Groups */}
                        {Object.entries(groupedOptions.groups).map(([groupName, groupOptions]) => (
                            <div key={groupName}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50/50 uppercase tracking-wider sticky top-0">
                                    {groupName}
                                </div>
                                {groupOptions.map(option => (
                                    <div
                                        key={option.id}
                                        onClick={() => handleSelect(option.id)}
                                        className={`
                                relative flex items-center px-3 py-2 text-sm cursor-pointer select-none
                                ${isSelected(option.id) ? 'bg-brand-100 text-brand-900 border-l-4 border-brand-500' : 'text-gray-700 hover:bg-brand hover:text-black'}
                            `}
                                    >
                                        <span className={`block truncate flex-1 ${isSelected(option.id) ? 'font-medium' : 'font-normal'}`}>
                                            {option.label}
                                        </span>
                                        {isSelected(option.id) && (
                                            <Check size={14} className="text-blue-600 ml-2" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* Ungrouped */}
                        {groupedOptions.ungrouped.map(option => (
                            <div
                                key={option.id}
                                onClick={() => handleSelect(option.id)}
                                className={`
                        relative flex items-center px-3 py-2 text-sm cursor-pointer select-none
                        ${isSelected(option.id) ? 'bg-brand-100 text-brand-900 border-l-4 border-brand-500' : 'text-gray-700 hover:bg-brand hover:text-black'}
                    `}
                            >
                                <span className={`block truncate flex-1 ${isSelected(option.id) ? 'font-medium' : 'font-normal'}`}>
                                    {option.label}
                                </span>
                                {isSelected(option.id) && (
                                    <Check size={14} className="text-blue-600 ml-2" />
                                )}
                            </div>
                        ))}

                        {filteredOptions.length === 0 && (
                            <div className="px-3 py-4 text-sm text-center text-gray-500">
                                No se encontraron resultados
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
