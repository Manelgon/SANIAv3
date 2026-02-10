// Hook for managing consultation edit validation
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface EditValidation {
    can_edit: boolean;
    reason: string;
    hours_elapsed: number;
    hours_remaining: number;
}

export function useConsultationEditValidation(consultationDiagnosisId: string | null, practitionerId: string | null) {
    const [validation, setValidation] = useState<EditValidation | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!consultationDiagnosisId || !practitionerId) {
            setValidation(null);
            return;
        }

        checkEditability();

        // Refresh every minute to update remaining time
        const interval = setInterval(checkEditability, 60000);
        return () => clearInterval(interval);
    }, [consultationDiagnosisId, practitionerId]);

    const checkEditability = async () => {
        if (!consultationDiagnosisId || !practitionerId) return;

        setLoading(true);
        try {
            const { data, error } = await (supabase.rpc as any)('can_edit_consultation', {
                p_consultation_diagnosis_id: consultationDiagnosisId,
                p_practitioner_id: practitionerId
            });

            if (error) throw error;
            setValidation(data);
        } catch (err) {
            console.error('Error checking edit validation:', err);
            setValidation(null);
        } finally {
            setLoading(false);
        }
    };

    return { validation, loading, refresh: checkEditability };
}
