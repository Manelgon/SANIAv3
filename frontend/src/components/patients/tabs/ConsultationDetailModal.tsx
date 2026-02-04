import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Activity,
    Thermometer,
    Scale,
    Ruler,
    Heart,
    Droplet,
    Calendar,
    User,
    Stethoscope,
    ClipboardList,
    FileText,
    Loader2
} from 'lucide-react';

interface ConsultationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    consultationId: string | null;
}

export function ConsultationDetailModal({ isOpen, onClose, consultationId }: ConsultationDetailModalProps) {
    const [data, setData] = useState<any>(null);
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
            setData(consultation);
        } catch (error) {
            console.error('Error fetching consultation details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const diagnosis = data?.diagnoses?.[0];
    const constants = data?.constants || [];

    const getConstantIcon = (code: string) => {
        switch (code) {
            case 'WEIGHT': return <Scale className="h-4 w-4" />;
            case 'HEIGHT': return <Ruler className="h-4 w-4" />;
            case 'BP_SYS':
            case 'BP_DIA': return <Activity className="h-4 w-4" />;
            case 'HEART_RATE': return <Heart className="h-4 w-4" />;
            case 'TEMP': return <Thermometer className="h-4 w-4" />;
            case 'SATO2': return <Droplet className="h-4 w-4" />;
            default: return <Activity className="h-4 w-4" />;
        }
    };

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
                    {/* TOP HEADER: Patient Identification & Date */}
                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 bg-brand-50 rounded-2xl flex items-center justify-center border border-brand-100 shadow-sm">
                                <User className="h-8 w-8 text-brand-600" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-gray-900 leading-tight">
                                    {data.patient?.last_name_1} {data.patient?.last_name_2 ? `${data.patient.last_name_2}, ` : ', '}{data.patient?.first_name}
                                </h4>
                                <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                    <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-600">
                                        CIP: {data.patient?.cip || 'N/A'}
                                    </span>
                                    <span>Ficha Clínica del Paciente</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2 text-sm font-black text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <Calendar className="h-4 w-4 text-brand-500" />
                                {format(new Date(data.created_at), "dd 'de' MMMM, yyyy", { locale: es })}
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${data.status === 'closed'
                                ? 'bg-green-50 text-green-700 border-green-100'
                                : 'bg-orange-50 text-orange-700 border-orange-100'
                                }`}>
                                {data.status === 'closed' ? 'Consulta Finalizada' : 'Borrador de Consulta'}
                            </span>
                        </div>
                    </div>

                    {/* MAIN GRID: Vitals | Content */}
                    <div className="grid grid-cols-12 gap-8">
                        {/* LEFT: Clinical Constants (Vitals) */}
                        <div className="col-span-3 space-y-6">
                            <div className="flex items-center gap-2 px-1 border-b border-gray-100 pb-2">
                                <Activity className="h-4 w-4 text-brand-500" />
                                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Biometría y Constantes</h5>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5">
                                {constants.length > 0 ? constants.map((c: any, idx: number) => (
                                    <div key={idx} className="bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-2.5 flex items-center justify-between transition-colors hover:bg-white hover:border-brand-100 shadow-sm">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-7 w-7 bg-white rounded-md flex items-center justify-center text-gray-400 border border-gray-100">
                                                {getConstantIcon(c.constant?.code)}
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                                {c.constant?.code?.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <div className="text-right flex items-baseline gap-1">
                                            <span className="text-sm font-black text-gray-900">{c.value}</span>
                                            <span className="text-[9px] text-gray-400 font-bold uppercase">{c.constant?.unit}</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center py-10 bg-gray-50/30 rounded-xl border border-dashed border-gray-200">
                                        <Activity className="h-6 w-6 text-gray-200 mb-2" />
                                        <p className="text-[9px] text-gray-400 font-black uppercase">Sin registros</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Medical Notes */}
                        <div className="col-span-9 space-y-8">
                            {/* Diagnoses Section */}
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Stethoscope className="h-4 w-4 text-brand-600" />
                                        <h5 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Diagnóstico Clínico Codificado (CIE-10)</h5>
                                    </div>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Detalle Administrativo</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {data.diagnoses?.map((diag: any, idx: number) => (
                                        <div key={idx} className="flex items-center p-4 gap-6 hover:bg-gray-50/30 transition-colors">
                                            <div className="shrink-0 w-24">
                                                <span className={`inline-flex items-center justify-center w-full py-1 rounded text-[9px] font-black uppercase tracking-widest border shadow-sm ${diag.status === 'confirmed'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : diag.status === 'pending'
                                                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                    }`}>
                                                    {diag.status === 'confirmed' ? 'Confirmado' : diag.status === 'pending' ? 'Pendiente' : 'Inactivo'}
                                                </span>
                                            </div>
                                            <div className="shrink-0">
                                                <span className="px-2.5 py-1 bg-white border border-brand-100 text-brand-700 text-xs font-mono font-black rounded shadow-sm">
                                                    {diag.diagnosis_code || 'S/N'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h6 className="text-sm font-bold text-gray-900 leading-tight">
                                                    {diag.diagnosis?.descripcion || diag.motivo || 'Consulta General'}
                                                </h6>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Clinical Content Sections - Single Column Layout */}
                            <div className="flex flex-col gap-6">
                                {/* Exploration */}
                                <div className="bg-white border-l-4 border-l-blue-500 border border-gray-200 rounded-r-xl shadow-sm">
                                    <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                                        <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exploración / Hallazgos</span>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium whitespace-pre-wrap min-h-[80px]">
                                            {diagnosis?.exploracion || 'No se registraron notas de exploración.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Approximation */}
                                <div className="bg-white border-l-4 border-l-brand-400 border border-gray-200 rounded-r-xl shadow-sm">
                                    <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                                        <Stethoscope className="h-3.5 w-3.5 text-brand-500" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aproximación Diagnóstica</span>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium whitespace-pre-wrap min-h-[60px]">
                                            {diagnosis?.aproximacion || 'No se registraron notas de aproximación.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Plan / Treatment */}
                                <div className="bg-white border-l-4 border-l-green-500 border border-gray-200 rounded-r-xl shadow-sm">
                                    <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                                        <FileText className="h-3.5 w-3.5 text-green-500" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan de Tratamiento</span>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium whitespace-pre-wrap min-h-[80px]">
                                            {diagnosis?.tratamiento || 'No se registraron recomendaciones de tratamiento.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
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
