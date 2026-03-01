import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, label, id, ...props }, ref) => {
        return (
            <div className="w-full space-y-1">
                {label && (
                    <label htmlFor={id} className="text-sm font-semibold text-slate-700">
                        {label} {props.required && <span className="text-red-500">*</span>}
                    </label>
                )}
                <input
                    ref={ref}
                    id={id}
                    className={cn(
                        "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary transition-all disabled:cursor-not-allowed disabled:opacity-50",
                        error && "border-red-400 focus-visible:ring-red-500",
                        className
                    )}
                    {...props}
                />
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
