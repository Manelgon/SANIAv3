import { useState, useRef, useEffect } from 'react';
import { Settings2, Check } from 'lucide-react';
import { Button } from './Button';

export interface ColumnDefinition {
    id: string;
    label: string;
    alwaysVisible?: boolean;
}

interface TableColumnSelectorProps {
    columns: ColumnDefinition[];
    visibleColumns: string[];
    onToggleColumn: (columnId: string) => void;
}

export function TableColumnSelector({ columns, visibleColumns, onToggleColumn }: TableColumnSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 h-9"
            >
                <Settings2 className="h-4 w-4" />
                Columnas
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 py-1">
                    <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        Mostrar/Ocultar
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {columns.map((column) => (
                            <button
                                key={column.id}
                                disabled={column.alwaysVisible}
                                onClick={() => onToggleColumn(column.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${column.alwaysVisible
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-gray-50'
                                    }`}
                            >
                                <span className={visibleColumns.includes(column.id) ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                                    {column.label}
                                </span>
                                {visibleColumns.includes(column.id) && (
                                    <Check className="h-4 w-4 text-brand-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
