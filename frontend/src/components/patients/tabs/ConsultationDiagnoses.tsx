import { Stethoscope, ClipboardList, FileText } from 'lucide-react';
import type { ConsultationDiagnosis } from './types';

interface ConsultationDiagnosesProps {
    diagnoses: ConsultationDiagnosis[];
    isEditMode?: boolean;
    onUpdate?: (diagnoses: ConsultationDiagnosis[]) => void;
}

export function ConsultationDiagnoses({ diagnoses, isEditMode = false, onUpdate }: ConsultationDiagnosesProps) {
    // If we have multiple diagnoses, we should probably show notes for each.
    // However, keeping consistent with the original UI, but iterating if there are multiple.
    // Ideally, the UI should separate "Administrative Diagnoses List" and "Clinical Notes Detail".
    // For this refactor, I will loop through diagnoses to show their notes, but separated to avoid clutter if multiple.

    return (
        <div className="w-full space-y-6">
            {/* Diagnoses List */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Stethoscope className="h-3.5 w-3.5 text-primary" />
                        <h5 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Diagnósticos CIE-10</h5>
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    {diagnoses.length > 0 ? diagnoses.map((diag, idx) => (
                        <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="shrink-0 px-2 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded font-mono">
                                    {diag.diagnosis_code || 'S/N'}
                                </span>
                                <span className="text-sm font-medium text-slate-700 leading-tight truncate">
                                    {diag.diagnosis?.descripcion || diag.motivo || 'Consulta General'}
                                </span>
                            </div>
                            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${
                                diag.status === 'confirmed'
                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                    : diag.status === 'pending'
                                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        : 'bg-red-50 text-red-600 border-red-100'
                            }`}>
                                {diag.status === 'confirmed' ? 'Confirmado' : diag.status === 'pending' ? 'Pendiente' : 'Inactivo'}
                            </span>
                        </div>
                    )) : (
                        <div className="p-4 text-center text-sm text-slate-400 italic">No hay diagnósticos registrados.</div>
                    )}
                </div>
            </div>

            {/* Clinical notes — shared for the whole consultation, taken from primary diagnosis */}
            {diagnoses.length > 0 ? (() => {
                const primary = diagnoses[0];
                const updatePrimary = (field: string, value: string) => {
                    const updated = diagnoses.map((d, i) =>
                        i === 0 ? { ...d, [field]: value } : d
                    );
                    onUpdate?.(updated);
                };

                return (
                    <div className="flex flex-col gap-5">
                        {/* Motivo de consulta */}
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <ClipboardList className="h-4 w-4 text-primary" />
                                <h3 className="text-slate-900 font-bold text-sm uppercase tracking-wide">Motivo de Consulta</h3>
                            </div>
                            <div className="p-4 bg-white border border-slate-200 rounded-lg">
                                {isEditMode ? (
                                    <textarea
                                        value={primary.motivo || ''}
                                        onChange={(e) => updatePrimary('motivo', e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm min-h-[60px] bg-white"
                                        placeholder="Motivo de la consulta..."
                                    />
                                ) : (
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                        {primary.motivo || <span className="italic text-slate-400">No registrado.</span>}
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Exploration */}
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <Stethoscope className="h-4 w-4 text-primary" />
                                <h3 className="text-slate-900 font-bold text-sm uppercase tracking-wide">Exploración / Hallazgos</h3>
                            </div>
                            <div className="p-4 bg-white border border-slate-200 rounded-lg">
                                {isEditMode ? (
                                    <textarea
                                        value={primary.exploracion || ''}
                                        onChange={(e) => updatePrimary('exploracion', e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[72px] bg-white"
                                        placeholder="Describa los hallazgos de la exploración física..."
                                    />
                                ) : (
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                        {primary.exploracion || <span className="italic text-slate-400">No se registraron notas de exploración.</span>}
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Approximation */}
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <ClipboardList className="h-4 w-4 text-primary" />
                                <h3 className="text-slate-900 font-bold text-sm uppercase tracking-wide">Aproximación Diagnóstica</h3>
                            </div>
                            <div className="p-4 bg-white border border-slate-200 rounded-lg">
                                {isEditMode ? (
                                    <textarea
                                        value={primary.aproximacion || ''}
                                        onChange={(e) => updatePrimary('aproximacion', e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm min-h-[60px] bg-white"
                                        placeholder="Describa la aproximación diagnóstica..."
                                    />
                                ) : (
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                        {primary.aproximacion || <span className="italic text-slate-400">No se registraron notas de aproximación.</span>}
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Plan / Treatment */}
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <h3 className="text-slate-900 font-bold text-sm uppercase tracking-wide">Plan de Tratamiento</h3>
                            </div>
                            <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
                                {isEditMode ? (
                                    <textarea
                                        value={primary.tratamiento || ''}
                                        onChange={(e) => updatePrimary('tratamiento', e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm min-h-[72px] bg-white"
                                        placeholder="Describa el plan de tratamiento..."
                                    />
                                ) : (
                                    <p className="text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                                        {primary.tratamiento || <span className="italic text-slate-400 font-normal">No se registraron recomendaciones de tratamiento.</span>}
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>
                );
            })() : (
                <div className="text-center py-10 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-sm">No hay notas clínicas disponibles para esta consulta.</p>
                </div>
            )}
        </div>
    );
}
