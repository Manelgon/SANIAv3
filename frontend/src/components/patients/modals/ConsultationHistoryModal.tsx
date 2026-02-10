import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { History, Clock, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConsultationHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    consultationDiagnosisId: string;
}

interface VersionHistory {
    version_number: number;
    diagnosis_code: string;
    motivo: string;
    exploracion: string;
    aproximacion: string;
    tratamiento: string;
    edit_reason: string | null;
    edited_by_name: string;
    edited_at: string;
    is_current: boolean;
}

export function ConsultationHistoryModal({
    isOpen,
    onClose,
    consultationDiagnosisId
}: ConsultationHistoryModalProps) {
    const [versions, setVersions] = useState<VersionHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && consultationDiagnosisId) {
            loadHistory();
        }
    }, [isOpen, consultationDiagnosisId]);

    const loadHistory = async () => {
        setLoading(true);
        setError('');

        try {
            const { data, error: rpcError } = await (supabase.rpc as any)('get_consultation_history', {
                p_consultation_diagnosis_id: consultationDiagnosisId
            });

            if (rpcError) throw rpcError;
            setVersions(data || []);
        } catch (err: any) {
            console.error('Error loading consultation history:', err);
            setError('Error al cargar el historial');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-brand-600" />
                        Historial de Versiones
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-red-800">Error</p>
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        </div>
                    )}

                    {!loading && !error && versions.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No hay historial disponible</p>
                        </div>
                    )}

                    {!loading && !error && versions.length > 0 && (
                        <div className="space-y-4">
                            {versions.map((version, index) => (
                                <div
                                    key={`${version.version_number}-${index}`}
                                    className={`border rounded-lg p-4 ${version.is_current
                                        ? 'bg-green-50 border-green-300'
                                        : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    {/* Version Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${version.is_current
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-600 text-white'
                                                }`}>
                                                Versión {version.version_number}
                                            </div>
                                            {version.is_current && (
                                                <span className="text-xs font-semibold text-green-700">
                                                    (Actual)
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right text-xs text-gray-600">
                                            <div className="flex items-center gap-1 justify-end">
                                                <Clock className="h-3 w-3" />
                                                {format(new Date(version.edited_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                            </div>
                                            <div className="flex items-center gap-1 justify-end mt-1">
                                                <User className="h-3 w-3" />
                                                {version.edited_by_name}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Edit Reason (only for non-current versions) */}
                                    {!version.is_current && version.edit_reason && (
                                        <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3">
                                            <p className="text-xs font-semibold text-amber-800 mb-1">
                                                Motivo de la edición:
                                            </p>
                                            <p className="text-sm text-amber-900">{version.edit_reason}</p>
                                        </div>
                                    )}

                                    {/* Clinical Content */}
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="font-semibold text-gray-700">Diagnóstico:</span>
                                            <p className="text-gray-900 mt-1">
                                                [{version.diagnosis_code}]
                                            </p>
                                        </div>

                                        <div>
                                            <span className="font-semibold text-gray-700">Motivo:</span>
                                            <p className="text-gray-900 mt-1">{version.motivo}</p>
                                        </div>

                                        <div>
                                            <span className="font-semibold text-gray-700">Exploración:</span>
                                            <p className="text-gray-900 mt-1">{version.exploracion}</p>
                                        </div>

                                        {version.aproximacion && (
                                            <div>
                                                <span className="font-semibold text-gray-700">Aproximación:</span>
                                                <p className="text-gray-900 mt-1">{version.aproximacion}</p>
                                            </div>
                                        )}

                                        {version.tratamiento && (
                                            <div>
                                                <span className="font-semibold text-gray-700">Tratamiento:</span>
                                                <p className="text-gray-900 mt-1">{version.tratamiento}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t pt-4 flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
