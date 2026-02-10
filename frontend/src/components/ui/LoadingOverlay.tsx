import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
}

export function LoadingOverlay({ isLoading, message = 'Procesando...' }: LoadingOverlayProps) {
    if (!isLoading) return null;

    return (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200 rounded-lg">
            <Loader2 className="h-10 w-10 text-brand-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium text-lg animate-pulse">{message}</p>
        </div>
    );
}
