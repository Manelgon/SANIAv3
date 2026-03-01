import { X } from 'lucide-react';
import { useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    hideHeader?: boolean;
    contentClassName?: string;
}

export function Modal({ isOpen, onClose, title, children, className, hideHeader = false, contentClassName }: ModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={cn(
                "relative z-50 w-full max-w-lg rounded-lg bg-white p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[100dvh]",
                className
            )}>
                {!hideHeader && (
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>
                )}

                <div className={cn("flex-1 overflow-y-auto min-h-0", contentClassName)}>
                    {children}
                </div>
            </div>
        </div>
    );
}
