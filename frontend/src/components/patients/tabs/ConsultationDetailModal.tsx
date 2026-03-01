import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Loader2, FileText, Edit2, Save, X, Printer, ClipboardList } from 'lucide-react';
import { useConsultationEditValidation } from '@/hooks/useConsultationEditValidation';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { ConsultationTimer } from '../ConsultationTimer';
import { ConsultationVitals } from './ConsultationVitals';
import { ConsultationDiagnoses } from './ConsultationDiagnoses';
import type { ConsultationDetail, ConsultationConstant } from './types';
import { toast } from 'sonner';
import { generateConsultationPDF } from '@/lib/pdfGenerator';
import pdfHeaderImg from '@/assets/pdf-header.png';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConsultationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    consultationId: string | null;
}

export function ConsultationDetailModal({ isOpen, onClose, consultationId }: ConsultationDetailModalProps) {
    const [data, setData] = useState<ConsultationDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentPractitionerId, setCurrentPractitionerId] = useState<string | null>(null);
    const [editReason, setEditReason] = useState('');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Get first diagnosis ID for validation
    const firstDiagnosisId = data?.diagnoses?.[0]?.id || null;

    // Check if consultation can be edited
    const { validation, loading: validationLoading } = useConsultationEditValidation(
        firstDiagnosisId,
        currentPractitionerId
    );

    useEffect(() => {
        if (isOpen && consultationId) {
            fetchConsultationDetails();
            fetchCurrentPractitioner();
        } else {
            // Reset edit mode when modal closes
            setIsEditMode(false);
            setEditReason('');
        }
    }, [isOpen, consultationId]);

    const fetchCurrentPractitioner = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: practitioner } = await supabase
                    .from('practitioners')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();
                if (practitioner) {
                    setCurrentPractitionerId((practitioner as { id: string }).id);
                }
            }
        } catch (error) {
            console.error('Error fetching practitioner:', error);
        }
    };

    const fetchConsultationDetails = async () => {
        setIsLoading(true);
        try {
            const { data: consultation, error: consError } = await supabase
                .from('consultations')
                .select(`
                    id,
                    status,
                    created_at,
                    scheduled_at,
                    practitioner:practitioners(id, first_name, last_name_1, fid, license_number),
                    patient:patients(id, first_name, last_name_1, last_name_2, cip, dni, birth_date),
                    diagnoses:consultation_diagnoses(
                        id,
                        motivo,
                        exploracion,
                        tratamiento,
                        aproximacion,
                        diagnosis_code,
                        status,
                        diagnosis:diagnoses(descripcion)
                    ),
                    constants:consultation_constants(
                        id,
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

    const handleSaveEdit = async () => {
        if (!editReason.trim()) {
            toast.error('Debe especificar el motivo de la edición');
            return;
        }

        if (!data || !data.diagnoses?.[0]) {
            toast.error('No se encontraron datos de diagnóstico');
            return;
        }

        setIsSaving(true);
        try {
            // Update consultation_diagnoses with edit reason in notes field temporarily
            // The trigger will handle versioning automatically
            const { error } = await (supabase as any)
                .from('consultation_diagnoses')
                .update({
                    motivo: data.diagnoses[0].motivo,
                    exploracion: data.diagnoses[0].exploracion,
                    aproximacion: data.diagnoses[0].aproximacion,
                    tratamiento: data.diagnoses[0].tratamiento,
                    notes: editReason // Edit reason passed to trigger
                } as any) // Type assertion needed for dynamic update
                .eq('id', data.diagnoses[0].id);

            if (error) throw error;

            // Update constants if any
            if (data.constants && data.constants.length > 0) {
                const constantUpdates = data.constants.map(c =>
                    (supabase as any)
                        .from('consultation_constants')
                        .update({ value: c.value })
                        .eq('id', c.id)
                );
                await Promise.all(constantUpdates);
            }

            toast.success('Consulta actualizada correctamente');
            setIsEditMode(false);
            setEditReason('');
            await fetchConsultationDetails(); // Refresh data
        } catch (error: any) {
            console.error('Error saving consultation:', error);
            toast.error(error.message || 'Error al guardar los cambios');
        } finally {
            setIsSaving(false);
        }
    };

    const handleGeneratePDF = async () => {
        if (!data || !data.practitioner || !data.patient || !data.diagnoses?.[0]) {
            toast.error('Faltan datos requeridos para generar el PDF');
            return;
        }

        setIsGeneratingPDF(true);
        try {
            // 1. Fetch Signature
            const { data: signatureDoc } = await (supabase
                .from('practitioner_documents') as any)
                .select('url')
                .eq('practitioner_id', data.practitioner.id)
                .eq('category', 'signature_stamp')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // 2. Prepare Data
            const vitalsObj: any = {};
            const constantMap: Record<string, string> = {
                'WEIGHT': 'weight', 'HEIGHT': 'height', 'BP_SYS': 'systolic',
                'BP_DIA': 'diastolic', 'HEART_RATE': 'heartRate', 'TEMP': 'temp', 'SATO2': 'satO2'
            };

            if (data.constants) {
                data.constants.forEach(c => {
                    if (c.constant?.code && constantMap[c.constant.code]) {
                        vitalsObj[constantMap[c.constant.code]] = c.value;
                    }
                });
            }

            const pdfPayload = {
                patient: {
                    first_name: data.patient.first_name,
                    last_name_1: data.patient.last_name_1,
                    last_name_2: data.patient.last_name_2 || '',
                    cip: data.patient.cip,
                    dni: data.patient.dni || '',
                    birth_date: data.patient.birth_date || ''
                },
                practitioner: {
                    first_name: data.practitioner.first_name,
                    last_name_1: data.practitioner.last_name_1,
                    license_number: data.practitioner.license_number || ''
                },
                consultation: {
                    motivo: data.diagnoses[0].motivo,
                    exploracion: data.diagnoses[0].exploracion,
                    tratamiento: data.diagnoses[0].tratamiento,
                    aproximacion: data.diagnoses[0].aproximacion,
                    diagnoses: data.diagnoses.map(d => ({
                        code: d.diagnosis_code,
                        description: d.diagnosis?.descripcion || 'Sin descripción'
                    })),
                    date: data.scheduled_at || data.created_at
                },
                vitals: vitalsObj,
                headerImageUrl: pdfHeaderImg,
                signatureUrl: signatureDoc?.url
            };

            const { blob, filename } = await generateConsultationPDF(pdfPayload);

            // 3. Upload to Storage
            const filePath = `${data.patient.id}/${Date.now()}_${filename}`;
            const { error: uploadError } = await supabase.storage
                .from('patient-documents')
                .upload(filePath, blob);

            if (uploadError) throw uploadError;

            // 4. Save Record in DB
            const { error: insertError } = await (supabase.from('patient_documents') as any)
                .insert({
                    patient_id: data.patient.id,
                    name: filename,
                    title: 'Informe de Consulta' + ((data.diagnoses[0] as any).version_number && (data.diagnoses[0] as any).version_number > 1 ? ' (Editado)' : ''),
                    document_type: 'consultation_report',
                    storage_bucket: 'patient-documents',
                    storage_path: filePath,
                    url: null,
                    type: 'pdf',
                    category: 'consultation_report',
                    practitioner_id: data.practitioner.id
                });

            if (insertError) throw insertError;

            toast.success('Documento PDF generado y guardado correctamente');
        } catch (error: any) {
            console.error('Error generating PDF:', error);
            toast.error(error.message || 'Error al generar el PDF');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditReason('');
        fetchConsultationDetails(); // Reload original data
    };

    if (!isOpen) return null;

    const practitionerName = data?.practitioner
        ? `${data.practitioner.first_name} ${data.practitioner.last_name_1}`
        : '—';

    const patientName = data?.patient
        ? `${data.patient.first_name} ${data.patient.last_name_1}${data.patient.last_name_2 ? ' ' + data.patient.last_name_2 : ''}`
        : '—';

    const patientInitials = data?.patient
        ? `${data.patient.first_name?.[0] ?? ''}${data.patient.last_name_1?.[0] ?? ''}`
        : '?';

    const canEdit = validation?.can_edit && !isEditMode;
    const showEditButton = data?.status === 'draft' && currentPractitionerId && !validationLoading;

    const statusLabel = data?.status === 'closed' ? 'Cerrada' : data?.status === 'draft' ? 'Borrador' : data?.status ?? '';
    const statusClass = data?.status === 'closed'
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : 'bg-orange-100 text-orange-700 border-orange-200';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            hideHeader
            className="max-w-[860px] w-full p-0 rounded-xl relative"
            contentClassName="overflow-hidden flex flex-col"
        >
            <LoadingOverlay isLoading={isSaving} message="Guardando cambios..." />

            {/* ── HEADER ─────────────────────────────────────────────── */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-slate-900 text-base font-bold leading-tight">Detalle de Consulta</h2>
                        {data && (
                            <p className="text-slate-500 text-xs font-medium">
                                {format(new Date(data.created_at), "dd 'de' MMMM yyyy · HH:mm", { locale: es })}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {data && (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${statusClass}`}>
                            {statusLabel}
                        </span>
                    )}
                    {showEditButton && firstDiagnosisId && !isEditMode && canEdit && (
                        <>
                            <ConsultationTimer consultationDiagnosisId={firstDiagnosisId} practitionerId={currentPractitionerId} />
                            <button
                                onClick={() => setIsEditMode(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 rounded-lg border border-slate-200 transition-colors"
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                                Editar
                            </button>
                        </>
                    )}
                    {isEditMode && (
                        <>
                            <button onClick={handleCancelEdit} disabled={isSaving} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 transition-colors">
                                <X className="h-3.5 w-3.5" /> Cancelar
                            </button>
                            <button onClick={handleSaveEdit} disabled={isSaving} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors">
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Guardar
                            </button>
                        </>
                    )}
                    <button onClick={onClose} className="ml-1 size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* ── BODY ───────────────────────────────────────────────── */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 flex-1">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-500 mb-3" />
                    <p className="text-slate-500 text-sm font-medium">Cargando detalles...</p>
                </div>
            ) : data ? (
                <>
                    {/* Patient banner */}
                    <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="size-11 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {patientInitials}
                            </div>
                            <div>
                                <p className="text-slate-900 font-bold text-sm leading-tight">{patientName}</p>
                                <p className="text-slate-500 text-xs mt-0.5">
                                    CIP: <span className="font-semibold text-primary">{data.patient?.cip ?? 'N/A'}</span>
                                </p>
                            </div>
                        </div>
                        {data.practitioner && (
                            <div className="flex items-center gap-2.5 border-l border-slate-200 pl-5">
                                <div className="text-right">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Médico</p>
                                    <p className="text-slate-700 text-xs font-semibold">{practitionerName}</p>
                                </div>
                                <div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                    {data.practitioner.first_name?.[0]}{data.practitioner.last_name_1?.[0]}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Edit reason */}
                    {isEditMode && (
                        <div className="px-6 pt-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <label className="block text-xs font-bold text-amber-900 mb-2 uppercase tracking-wide">Motivo de la Edición *</label>
                                <textarea
                                    value={editReason}
                                    onChange={(e) => setEditReason(e.target.value)}
                                    className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm bg-white"
                                    placeholder="Explique brevemente por qué está editando esta consulta..."
                                    rows={2}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Two-column content — flex-1 so it takes remaining height and scrolls only when needed */}
                    <div className="p-6 grid grid-cols-3 gap-5 overflow-y-auto flex-1 min-h-0">
                        {/* Left 2/3: diagnoses + clinical notes */}
                        <div className="col-span-2">
                            <ConsultationDiagnoses
                                diagnoses={data.diagnoses}
                                isEditMode={isEditMode}
                                onUpdate={(updatedDiagnoses) => {
                                    setData(prev => prev ? { ...prev, diagnoses: updatedDiagnoses } : null);
                                }}
                            />
                        </div>
                        {/* Right 1/3: vitals */}
                        <div className="col-span-1">
                            <ConsultationVitals
                                constants={data.constants}
                                isEditMode={isEditMode}
                                onUpdate={(updatedConstants: ConsultationConstant[]) => {
                                    setData(prev => prev ? { ...prev, constants: updatedConstants } : null);
                                }}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                                <Printer className="h-3.5 w-3.5" /> Imprimir
                            </button>
                            <button
                                onClick={handleGeneratePDF}
                                disabled={isGeneratingPDF || isEditMode}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
                            >
                                {isGeneratingPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                                {isGeneratingPDF ? 'Generando...' : 'Generar PDF'}
                            </button>
                            <span className="text-xs text-slate-400 ml-2">
                                v{(data.diagnoses?.[0] as any)?.version_number ?? 1} · {format(new Date(data.created_at), 'dd MMM yyyy', { locale: es })}
                            </span>
                        </div>
                        <button onClick={onClose} className="px-6 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-sm hover:bg-primary/90 transition-colors">
                            Cerrar
                        </button>
                    </div>
                </>
            ) : (
                <div className="py-24 text-center px-6">
                    <div className="h-16 w-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Consulta no encontrada</h3>
                    <p className="text-sm text-slate-500 mt-1">No se han podido cargar los detalles de esta consulta.</p>
                </div>
            )}
        </Modal>
    );
}
