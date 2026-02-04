import { Stethoscope, ClipboardList, FileText } from 'lucide-react';
import type { ConsultationDiagnosis } from './types';

interface ConsultationDiagnosesProps {
    diagnoses: ConsultationDiagnosis[];
}

export function ConsultationDiagnoses({ diagnoses }: ConsultationDiagnosesProps) {
    // If we have multiple diagnoses, we should probably show notes for each.
    // However, keeping consistent with the original UI, but iterating if there are multiple.
    // Ideally, the UI should separate "Administrative Diagnoses List" and "Clinical Notes Detail".
    // For this refactor, I will loop through diagnoses to show their notes, but separated to avoid clutter if multiple.

    return (
        <div className="col-span-12 md:col-span-9 space-y-8">
            {/* Diagnoses List Header */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-brand-600" />
                        <h5 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Diagnóstico Clínico Codificado (CIE-10)</h5>
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Detalle Administrativo</span>
                </div>
                <div className="divide-y divide-gray-100">
                    {diagnoses.length > 0 ? diagnoses.map((diag, idx) => (
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
                    )) : (
                        <div className="p-4 text-center text-sm text-gray-500">No hay diagnósticos registrados.</div>
                    )}
                </div>
            </div>

            {/* Clinical Content Sections - Iterating to show notes for all diagnoses or at least the Primary one */}
            {diagnoses.map((diagnosis, idx) => (
                <div key={idx} className="flex flex-col gap-6">
                    {diagnoses.length > 1 && (
                        <div className="pb-2 border-b border-gray-100">
                            <h6 className="text-xs font-bold text-gray-500 uppercase">
                                Notas para: {diagnosis.diagnosis?.descripcion || diagnosis.diagnosis_code || `Diagnóstico ${idx + 1}`}
                            </h6>
                        </div>
                    )}

                    {/* Exploration */}
                    <div className="bg-white border-l-4 border-l-blue-500 border border-gray-200 rounded-r-xl shadow-sm">
                        <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                            <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exploración / Hallazgos</span>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-700 leading-relaxed font-medium whitespace-pre-wrap min-h-[80px]">
                                {diagnosis.exploracion || 'No se registraron notas de exploración.'}
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
                                {diagnosis.aproximacion || 'No se registraron notas de aproximación.'}
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
                                {diagnosis.tratamiento || 'No se registraron recomendaciones de tratamiento.'}
                            </p>
                        </div>
                    </div>
                </div>
            ))}

            {diagnoses.length === 0 && (
                <div className="text-center py-10 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-sm">No hay notas clínicas disponibles para esta consulta.</p>
                </div>
            )}
        </div>
    );
}
