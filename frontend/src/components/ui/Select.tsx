import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    error?: string;
    label?: string;
    options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, error, label, id, options, ...props }, ref) => {
        return (
            <div className="w-full space-y-1">
                {label && (
                    <label htmlFor={id} className="text-sm font-medium text-black">
                        {label} {props.required && <span className="text-red-500">*</span>}
                    </label>
                )}
                <select
                    ref={ref}
                    id={id}
                    className={cn(
                        "flex h-10 w-full rounded-md border border-black bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
                        error && "border-red-500 focus-visible:ring-red-500",
                        className
                    )}
                    {...props}
                >
                    <option value="" disabled>Selecciona una opción</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

Select.displayName = 'Select';
