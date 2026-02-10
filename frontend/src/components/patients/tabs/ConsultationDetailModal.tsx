import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { Loader2, FileText, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useConsultationEditValidation } from '@/hooks/useConsultationEditValidation';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { ConsultationTimer } from '../ConsultationTimer';
import { ConsultationHeader } from './ConsultationHeader';
import { ConsultationVitals } from './ConsultationVitals';
import { ConsultationDiagnoses } from './ConsultationDiagnoses';
import type { ConsultationDetail, ConsultationConstant } from './types';
import { toast } from 'sonner';

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
                    practitioner:practitioners(id, first_name, last_name_1, fid),
                    patient:patients(id, first_name, last_name_1, last_name_2, cip),
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

        if (!data?.diagnoses?.[0]) {
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

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditReason('');
        fetchConsultationDetails(); // Reload original data
    };

    if (!isOpen) return null;

    const practitionerName = data?.practitioner
        ? `${data.practitioner.first_name} ${data.practitioner.last_name_1}`
        : 'Consultando...';

    const canEdit = validation?.can_edit && !isEditMode;
    const showEditButton = data?.status === 'draft' && currentPractitionerId && !validationLoading;





    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center justify-between w-full">
                    <span>{`Detalle de Consulta - Facultativo: ${practitionerName}`}</span>
                    <div className="flex items-center gap-2">
                        {showEditButton && firstDiagnosisId && (
                            <>
                                {!isEditMode && canEdit && (
                                    <>
                                        <ConsultationTimer
                                            consultationDiagnosisId={firstDiagnosisId}
                                            practitionerId={currentPractitionerId}
                                        />
                                        <Button
                                            onClick={() => setIsEditMode(true)}
                                            className="bg-brand-600 hover:bg-brand-700 text-white text-sm"
                                            size="sm"
                                        >
                                            <Edit2 className="h-4 w-4 mr-1.5" />
                                            Editar
                                        </Button>
                                    </>
                                )}
                                {isEditMode && (
                                    <>
                                        <Button
                                            onClick={handleCancelEdit}
                                            variant="ghost"
                                            size="sm"
                                            disabled={isSaving}
                                        >
                                            <X className="h-4 w-4 mr-1.5" />
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={handleSaveEdit}
                                            className="bg-green-600 hover:bg-green-700 text-white text-sm"
                                            size="sm"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                                            Guardar
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            }
            className="max-w-5xl w-full md:w-full h-[100dvh] md:h-auto p-4 md:p-6 rounded-none md:rounded-lg relative overflow-hidden"
        >
            <LoadingOverlay isLoading={isSaving} message="Guardando cambios..." />
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-brand-500 mb-4" />
                    <p className="text-gray-500 font-medium">Cargando detalles...</p>
                </div>
            ) : data ? (
                <div className="space-y-6">
                    {/* EDIT REASON FIELD (only in edit mode) */}
                    {isEditMode && (
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                            <label className="block text-sm font-bold text-amber-900 mb-2">
                                Motivo de la Edición *
                            </label>
                            <textarea
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                                placeholder="Explique brevemente por qué está editando esta consulta..."
                                rows={2}
                                required
                            />
                        </div>
                    )}

                    {/* TOP HEADER */}
                    <ConsultationHeader data={data} />

                    {/* MAIN GRID */}
                    <div className="grid grid-cols-12 gap-8">
                        {/* LEFT: Clinical Constants (Vitals) */}
                        <ConsultationVitals
                            constants={data.constants}
                            isEditMode={isEditMode}
                            onUpdate={(updatedConstants: ConsultationConstant[]) => {
                                setData(prev => prev ? { ...prev, constants: updatedConstants } : null);
                            }}
                        />

                        {/* RIGHT: Medical Notes */}
                        <ConsultationDiagnoses
                            diagnoses={data.diagnoses}
                            isEditMode={isEditMode}
                            onUpdate={(updatedDiagnoses) => {
                                setData(prev => prev ? { ...prev, diagnoses: updatedDiagnoses } : null);
                            }}
                        />
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
