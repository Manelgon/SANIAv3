import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, User, FileText, Loader2, AlertCircle } from 'lucide-react';
import { ConsultationDetailModal } from './ConsultationDetailModal';

interface ConsultationHistoryProps {
    patientId: string;
}

export function ConsultationHistory({ patientId }: ConsultationHistoryProps) {
    const [consultations, setConsultations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchConsultations = async () => {
            setIsLoading(true);
            try {
                const { data, error: fetchError } = await supabase
                    .from('consultations')
                    .select(`
                        id,
                        scheduled_at,
                        status,
                        created_at,
                        practitioner:practitioners(
                            first_name,
                            last_name_1
                        ),
                        diagnoses:consultation_diagnoses(
                            diagnosis_code,
                            motivo
                        )
                    `)
                    .eq('patient_id', patientId)
                    .order('created_at', { ascending: false });

                if (fetchError) throw fetchError;
                setConsultations(data || []);
            } catch (err: any) {
                console.error('Error fetching consultation history:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (patientId) {
            fetchConsultations();
        }
    }, [patientId]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-500" />
                <p className="text-sm font-medium">Cargando historial...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-red-400 bg-red-50 rounded-xl border border-red-100 p-6">
                <AlertCircle className="h-8 w-8 mb-4" />
                <p className="text-sm font-bold text-red-800">Error al cargar el historial</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
        );
    }

    if (consultations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Sin consultas registradas</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-xs">
                    Este paciente aún no tiene historial médico registrado en la plataforma.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full animate-in fade-in duration-500">
            <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha y Hora</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Facultativo</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Diagnóstico Principal</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                        {consultations.map((consultation) => {
                            const practitioner = consultation.practitioner;

                            return (
                                <tr
                                    key={consultation.id}
                                    className="hover:bg-gray-50/30 transition-colors group cursor-pointer"
                                    onClick={() => {
                                        setSelectedId(consultation.id);
                                        setIsModalOpen(true);
                                    }}
                                >
                                    <td className="px-4 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100 shadow-sm">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 leading-tight">
                                                    {format(new Date(consultation.created_at), 'dd MMM yyyy', { locale: es })}
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-400 tabular-nums uppercase">
                                                    {format(new Date(consultation.created_at), 'HH:mm')}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center overflow-hidden">
                                                <User className="h-3 w-3" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">
                                                {practitioner?.first_name} {practitioner?.last_name_1}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5">
                                        {consultation.diagnoses && consultation.diagnoses.length > 0 ? (
                                            <div className="flex items-center gap-3 max-w-xs">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-1 bg-brand-50 text-brand-700 text-[10px] font-black rounded border border-brand-100 h-fit uppercase">
                                                            {consultation.diagnoses[0].diagnosis_code}
                                                        </span>
                                                        {consultation.diagnoses.length > 1 && (
                                                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black rounded border border-gray-200">
                                                                +{consultation.diagnoses.length - 1}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 line-clamp-2 leading-snug">
                                                    {consultation.diagnoses[0].motivo || 'Sin descripción'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs italic text-gray-400">Sin diagnóstico</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-5 text-right">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${consultation.status === 'closed'
                                            ? 'bg-green-50 text-green-600 border border-green-100'
                                            : 'bg-orange-50 text-orange-600 border border-orange-100'
                                            }`}>
                                            {consultation.status === 'closed' ? 'Cerrada' : 'Borrador'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400 px-2 font-medium">
                <FileText className="h-3 w-3" />
                <span>Haga clic en una fila para ver el detalle completo de la consulta.</span>
            </div>

            <ConsultationDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                consultationId={selectedId}
            />
        </div>
    );
}
