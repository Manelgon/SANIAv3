import { useEffect } from 'react';
import { useConsultationEditValidation } from '@/hooks/useConsultationEditValidation';
import { Clock } from 'lucide-react';

interface ConsultationTimerProps {
    consultationDiagnosisId: string;
    practitionerId: string;
    onExpired?: () => void;
}

export function ConsultationTimer({
    consultationDiagnosisId,
    practitionerId,
    onExpired
}: ConsultationTimerProps) {
    const { validation, loading } = useConsultationEditValidation(
        consultationDiagnosisId,
        practitionerId
    );

    useEffect(() => {
        // Call onExpired callback when timer reaches 0
        if (validation && !validation.can_edit && validation.hours_remaining <= 0 && onExpired) {
            onExpired();
        }
    }, [validation, onExpired]);

    // Don't show anything if loading or no validation data
    if (loading || !validation) {
        return null;
    }

    // Don't show timer if consultation is not editable or time has expired
    if (!validation.can_edit || validation.hours_remaining <= 0) {
        return null;
    }

    // Format time remaining
    const hours = Math.floor(validation.hours_remaining);
    const minutes = Math.round((validation.hours_remaining - hours) * 60);

    // Determine urgency color
    const isUrgent = validation.hours_remaining < 2;
    const colorClass = isUrgent
        ? 'text-red-600 bg-red-50 border-red-200'
        : 'text-orange-600 bg-orange-50 border-orange-200';

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border ${colorClass}`}>
            <Clock className="h-3 w-3" />
            <span className="tabular-nums">
                {hours}h {minutes}m
            </span>
        </div>
    );
}
