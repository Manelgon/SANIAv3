import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Loader2, FileText } from 'lucide-react';
import { ConsultationHeader } from './ConsultationHeader';
import { ConsultationVitals } from './ConsultationVitals';
import { ConsultationDiagnoses } from './ConsultationDiagnoses';
import type { ConsultationDetail } from './types';

interface ConsultationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    consultationId: string | null;
}

export function ConsultationDetailModal({ isOpen, onClose, consultationId }: ConsultationDetailModalProps) {
    const [data, setData] = useState<ConsultationDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && consultationId) {
            fetchConsultationDetails();
        }
    }, [isOpen, consultationId]);

    const fetchConsultationDetails = async () => {
        setIsLoading(true);
        try {
            const { data: consultation, error: consError } = await supabase
                .from('consultations')
                .select(`
                    id,
                    status,
                    created_at,
                    practitioner:practitioners(id, first_name, last_name_1, fid),
                    patient:patients(id, first_name, last_name_1, last_name_2, cip),
                    diagnoses:consultation_diagnoses(
                        motivo,
                        exploracion,
                        tratamiento,
                        aproximacion,
                        diagnosis_code,
                        status,
                        diagnosis:diagnoses(descripcion)
                    ),
                    constants:consultation_constants(
                        value,
                        constant:clinical_constants(name, unit, code)
                    )
                `)
                .eq('id', consultationId as string)
                .single();

            if (consError) throw consError;
            // Force casting to our type, assuming the query matches the interface
            setData(consultation as unknown as ConsultationDetail);
        } catch (error) {
            console.error('Error fetching consultation details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const practitionerName = data?.practitioner
        ? `${data.practitioner.first_name} ${data.practitioner.last_name_1}`
        : 'Consultando...';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Detalle de Consulta - Facultativo: ${practitionerName}`}
            className="max-w-5xl"
        >
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-500 mb-4" />
                    <p className="text-gray-500 font-medium">Cargando detalles...</p>
                </div>
            ) : data ? (
                <div className="space-y-6">
                    {/* TOP HEADER */}
                    <ConsultationHeader data={data} />

                    {/* MAIN GRID */}
                    <div className="grid grid-cols-12 gap-8">
                        {/* LEFT: Clinical Constants (Vitals) */}
                        <ConsultationVitals constants={data.constants} />

                        {/* RIGHT: Medical Notes */}
                        <ConsultationDiagnoses diagnoses={data.diagnoses} />
                    </div>
                </div>
            ) : (
                <div className="py-24 text-center">
                    <div className="h-20 w-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-10 w-10" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Consulta no encontrada</h3>
                    <p className="text-sm text-gray-500 mt-1">No se han podido cargar los detalles de esta consulta.</p>
                </div>
            )}
        </Modal>
    );
}
