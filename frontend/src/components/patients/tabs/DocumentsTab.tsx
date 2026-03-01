import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import {
    FileText,
    Upload,
    Plus,
    FileUp,
    Download,
    Eye,
    Trash2,
    Send,
    Search,
    X,
    Calendar,
    CheckSquare,
    Square,
    Minus,
    Sparkles,
    Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GenerateDocumentModal } from '@/components/patients/modals/GenerateDocumentModal';
import { UploadTestModal } from '@/components/patients/modals/UploadTestModal';
import { generateIAAnalysisPDF } from '@/lib/pdfGenerator';
import {
    resolveStorageRef,
    getAutomationUrl,
    downloadDocument,
    viewDocument,
} from '@/lib/storage';
import { toast } from 'sonner';

interface DocumentsTabProps {
    patientId: string;
}

interface Document {
    id: string;
    name: string;
    title?: string;
    document_type?: string;
    url?: string | null;
    storage_bucket?: string | null;
    storage_path?: string | null;
    type: string;
    category: 'administrative_generated' | 'administrative_uploaded' | 'medical_test' | 'consultation_report' | 'patient_provided';
    created_at: string;
    practitioner_id: string;
    practitioner?: { first_name: string; last_name_1: string };
}

// Origen: quién generó/subió el documento (por category)
const ORIGEN_CONFIG: Record<string, { label: string; color: string }> = {
    consultation_report:      { label: 'Sistema',     color: 'bg-slate-100 text-slate-500'   },
    administrative_generated: { label: 'Sistema',     color: 'bg-slate-100 text-slate-500'   },
    patient_provided:         { label: 'Paciente',    color: 'bg-amber-100 text-amber-700'   },
    administrative_uploaded:  { label: 'Facultativo', color: 'bg-indigo-100 text-indigo-700' },
    medical_test:             { label: 'Facultativo', color: 'bg-indigo-100 text-indigo-700' },
};

// Tipo: qué documento es (por document_type específico almacenado en BD)
const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
    // Generados desde el panel admin
    consultation_report:    { label: 'Informe de Consulta',          color: 'bg-purple-100 text-purple-700'  },
    attendance_proof:       { label: 'Justificante de Asistencia',   color: 'bg-blue-50 text-blue-600'       },
    medical_certificate:    { label: 'Certificado Médico',           color: 'bg-cyan-100 text-cyan-700'      },
    rgpd_consent:           { label: 'Consentimiento RGPD',          color: 'bg-blue-100 text-blue-700'      },
    representative_auth:    { label: 'Autorización Representante',   color: 'bg-teal-100 text-teal-700'      },
    consent_revocation:     { label: 'Revocación de Consentimiento', color: 'bg-rose-100 text-rose-700'      },
    // Pruebas / resultados subidos (UploadTestModal)
    analitica:              { label: 'Analítica',                    color: 'bg-rose-100 text-rose-700'      },
    radiografia:            { label: 'Radiografía',                  color: 'bg-sky-100 text-sky-700'        },
    tac:                    { label: 'TAC / Escáner',                color: 'bg-amber-100 text-amber-700'    },
    resonancia:             { label: 'Resonancia Magnética',         color: 'bg-violet-100 text-violet-700'  },
    ecografia:              { label: 'Ecografía',                    color: 'bg-teal-100 text-teal-700'      },
    electrocardiograma:     { label: 'ECG / Holter',                 color: 'bg-red-100 text-red-700'        },
    biopsia:                { label: 'Biopsia / Anatomía P.',        color: 'bg-orange-100 text-orange-700'  },
    espirometria:           { label: 'Espirometría',                 color: 'bg-cyan-100 text-cyan-700'      },
    electroencefalograma:   { label: 'EEG',                         color: 'bg-yellow-100 text-yellow-700'  },
    densitometria:          { label: 'Densitometría',                color: 'bg-stone-100 text-stone-700'    },
    cultivo:                { label: 'Cultivo / Microbiología',      color: 'bg-green-100 text-green-700'    },
    otro:                   { label: 'Otro',                         color: 'bg-slate-100 text-slate-600'    },
    // Análisis IA
    ia_analysis:            { label: 'Análisis IA',                  color: 'bg-violet-100 text-violet-700'  },
    // Genérico
    medical_test:           { label: 'Prueba / Resultado',           color: 'bg-emerald-100 text-emerald-700'},
    administrative:         { label: 'Doc. Administrativo',          color: 'bg-slate-100 text-slate-600'    },
};

export function DocumentsTab({ patientId }: DocumentsTabProps) {
    const { role } = useAuthStore();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isUploadTestOpen, setIsUploadTestOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const { data: documents = [], isLoading } = useQuery<Document[]>({
        queryKey: ['patient-documents', patientId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('patient_documents')
                .select('*, practitioner:practitioners!practitioner_id(first_name, last_name_1)')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
        staleTime: 2 * 60 * 1000,
        enabled: !!patientId,
    });

    const handleDelete = async (docId: string, doc: Document) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) return;
        try {
            const ref = resolveStorageRef(doc);
            if (ref) await supabase.storage.from(ref.bucket).remove([ref.path]);
            const { error } = await supabase.from('patient_documents').delete().eq('id', docId);
            if (error) throw error;
            toast.success('Documento eliminado correctamente');
            queryClient.invalidateQueries({ queryKey: ['patient-documents', patientId] });
        } catch (err: any) {
            toast.error('No se pudo eliminar el documento.');
        }
    };

    // ── Category helpers (must be defined before filtered) ────────
    const getOrigen = (category: string) =>
        ORIGEN_CONFIG[category] ?? { label: 'Sistema', color: 'bg-slate-100 text-slate-500' };

    const getTipo = (doc: Document) => {
        if (doc.document_type && TIPO_CONFIG[doc.document_type]) return TIPO_CONFIG[doc.document_type];
        if (doc.category === 'consultation_report') return TIPO_CONFIG['consultation_report'];
        if (doc.category === 'medical_test') return TIPO_CONFIG['medical_test'];
        if (doc.category === 'administrative_uploaded') return TIPO_CONFIG['administrative'];
        if (doc.category === 'patient_provided') return { label: 'Doc. del Paciente', color: 'bg-amber-50 text-amber-600' };
        return { label: doc.title || 'Documento', color: 'bg-slate-100 text-slate-500' };
    };

    // ── Filtered list (must be defined before selection helpers) ──
    const filtered = useMemo(() => documents.filter(doc => {
        const q = searchTerm.toLowerCase();
        return (
            doc.name.toLowerCase().includes(q) ||
            (doc.title?.toLowerCase().includes(q)) ||
            getOrigen(doc.category).label.toLowerCase().includes(q) ||
            getTipo(doc).label.toLowerCase().includes(q) ||
            (doc.practitioner ? `${doc.practitioner.first_name} ${doc.practitioner.last_name_1}`.toLowerCase().includes(q) : false)
        );
    }), [documents, searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Selection helpers ──────────────────────────────────────────
    const toggleOne = (id: string) => setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const toggleAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(d => d.id)));
        }
    };

    const clearSelection = () => setSelectedIds(new Set());

    const allSelected  = filtered.length > 0 && selectedIds.size === filtered.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < filtered.length;

    // ── Bulk download ───────────────────────────────────────────────
    const handleBulkDownload = async () => {
        const selected = filtered.filter(d => selectedIds.has(d.id));
        for (const doc of selected) {
            await downloadDocument(doc);
            await new Promise(r => setTimeout(r, 300));
        }
        toast.success(`${selected.length} documentos descargados`);
    };

    // ── IA Analysis ────────────────────────────────────────────────
    const handleIAAnalysis = async () => {
        const selected = filtered.filter(d => selectedIds.has(d.id));
        const webhookUrl = import.meta.env.VITE_IA_ANALYSIS_WEBHOOK;
        if (!webhookUrl) { toast.error('Webhook de análisis IA no configurado.'); return; }

        setIsAnalyzing(true);
        const toastId = toast.loading(
            `Enviando ${selected.length} ${selected.length === 1 ? 'documento' : 'documentos'} al análisis IA...`,
            { description: 'El servicio de IA procesará los archivos desde el almacenamiento.' }
        );

        try {
            // 1. Get current practitioner info
            const { data: practData } = await supabase
                .from('practitioners')
                .select('id, first_name, last_name_1, license_number')
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
                .single();

            // 2. Get patient info
            const { data: patientData } = await supabase
                .from('patients')
                .select('first_name, last_name_1, last_name_2, cip')
                .eq('id', patientId)
                .single();

            toast.loading('Generando URLs firmadas...', { id: toastId });

            // 3. Generate 1h signed URLs server-side for each document
            const docsWithSignedUrls = await Promise.all(
                selected.map(async (doc, idx) => {
                    let signed_url: string | null = null;
                    try {
                        // 1h automation URL — server enforces this via purpose:'automation'
                        signed_url = await getAutomationUrl(doc);
                    } catch (e) {
                        console.warn(`Could not sign URL for doc "${doc.name}":`, e);
                    }
                    return {
                        index:         idx,
                        id:            doc.id,
                        title:         doc.title || doc.name,
                        name:          doc.name,
                        signed_url,              // ← 1h signed URL for n8n to fetch the file
                        storage_bucket: doc.storage_bucket ?? 'patient-documents',
                        storage_path:   doc.storage_path ?? null,
                        type:          getTipo(doc).label,
                        origen:        getOrigen(doc.category).label,
                        category:      doc.category,
                        document_type: doc.document_type ?? null,
                        created_at:    doc.created_at,
                        practitioner:  doc.practitioner
                            ? `${doc.practitioner.first_name} ${doc.practitioner.last_name_1}`
                            : null,
                    };
                })
            );

            toast.loading('Enviando al servicio de análisis IA...', { id: toastId });

            // 4. Build JSON payload
            const payload = {
                patient_id:   patientId,
                patient:      patientData,
                practitioner: practData,
                requested_at: new Date().toISOString(),
                total_files:  selected.length,
                documents:    docsWithSignedUrls,
            };

            const res = await fetch(webhookUrl, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            // 4. Parse response from webhook/n8n
            // Use text() first so a non-JSON or empty body doesn't crash the whole flow.
            const rawText = await res.text().catch(() => '');
            let result: any = {};
            if (rawText.trim()) {
                try {
                    result = JSON.parse(rawText);
                } catch {
                    // n8n returned something but it's not JSON — generate PDF with empty analysis
                    console.warn('[IA Analysis] Webhook response is not valid JSON:', rawText.slice(0, 200));
                }
            } else {
                console.warn('[IA Analysis] Webhook returned empty body — generating PDF with empty analysis');
            }

            // 5. Generate PDF with analysis
            const generatedAt = new Date().toISOString();
            const { blob, filename } = await generateIAAnalysisPDF({
                patient: patientData ?? { first_name: 'Paciente', last_name_1: '', cip: '' },
                practitioner: practData ?? { first_name: 'Facultativo', last_name_1: '' },
                analyzedDocuments: selected.map(d => ({
                    title:      d.title || d.name,
                    type:       getTipo(d).label,
                    created_at: d.created_at,
                })),
                analysis:    result,
                generatedAt,
            });

            // 6. Upload PDF to Supabase Storage
            const storagePath = `${patientId}/${filename}`;
            const { error: storageErr } = await supabase.storage
                .from('patient-documents')
                .upload(storagePath, blob, { upsert: true, contentType: 'application/pdf' });
            if (storageErr) throw storageErr;

            // 7. Save document record — bucket/path only (no URL)
            const { error: dbErr } = await (supabase.from('patient_documents') as any).insert({
                patient_id:      patientId,
                name:            filename,
                title:           `Análisis IA · ${selected.length} archivos · ${new Date().toLocaleDateString('es-ES')}`,
                document_type:   'ia_analysis',
                storage_bucket:  'patient-documents',
                storage_path:    storagePath,
                url:             null,
                type:            'pdf',
                category:        'administrative_generated',
                practitioner_id: (practData as any)?.id,
            });
            if (dbErr) throw dbErr;

            toast.dismiss(toastId);
            toast.success('Análisis IA completado', {
                description: `Informe generado con ${selected.length} ${selected.length === 1 ? 'documento analizado' : 'documentos analizados'} y guardado en Documentos.`,
            });
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ['patient-documents', patientId] });

        } catch (err: any) {
            console.error('IA analysis error:', err);
            toast.dismiss(toastId);
            toast.error('Error en el análisis IA', { description: err.message || 'No se pudo completar el análisis.' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ── Bulk delete (super_admin only) ─────────────────────────────
    const handleBulkDelete = async () => {
        const selected = filtered.filter(d => selectedIds.has(d.id));
        if (!confirm(`¿Eliminar ${selected.length} documento(s) seleccionado(s)?`)) return;
        setIsBulkDeleting(true);
        try {
            for (const doc of selected) {
                const ref = resolveStorageRef(doc);
                if (ref) await supabase.storage.from(ref.bucket).remove([ref.path]);
                await supabase.from('patient_documents').delete().eq('id', doc.id);
            }
            toast.success(`${selected.length} documentos eliminados`);
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ['patient-documents', patientId] });
        } catch {
            toast.error('Error al eliminar los documentos seleccionados.');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white gap-0">

            {/* ── ACTION BAR ────────────────────────────────────────────── */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setIsGenerateModalOpen(true)}
                            className="flex items-center gap-2 h-9 px-4 bg-primary text-white text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-sm hover:bg-primary/90 transition-all"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Generar Doc. Administrativo
                        </button>
                        <button
                            onClick={() => setIsUploadTestOpen(true)}
                            className="flex items-center gap-2 h-9 px-4 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-sm hover:bg-emerald-700 transition-all"
                        >
                            <Upload className="h-3.5 w-3.5" />
                            Subir Resultado/Prueba
                        </button>
                        <button
                            onClick={() => toast.info('Funcionalidad en desarrollo')}
                            className="flex items-center gap-2 h-9 px-4 bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-sm hover:bg-indigo-700 transition-all"
                        >
                            <FileUp className="h-3.5 w-3.5" />
                            Subir Doc. Administrativo
                        </button>
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar documentos..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-9 pl-9 pr-8 w-56 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10 shrink-0">
                            <span className="text-primary font-bold text-sm">{filtered.length}</span>
                            <span className="text-slate-500 text-xs font-medium">
                                {filtered.length === 1 ? 'documento' : 'documentos'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── BULK ACTION BAR ───────────────────────────────────────── */}
            {selectedIds.size > 0 && (
                <div className="px-6 py-2.5 bg-primary/5 border-b border-primary/10 flex items-center justify-between shrink-0 animate-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center gap-3">
                        <button onClick={clearSelection} className="p-1 rounded text-primary hover:bg-primary/10 transition-all">
                            <X className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-sm font-bold text-primary">
                            {selectedIds.size} {selectedIds.size === 1 ? 'documento seleccionado' : 'documentos seleccionados'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* IA Analysis — primary action */}
                        <button
                            onClick={handleIAAnalysis}
                            disabled={isAnalyzing}
                            className="flex items-center gap-1.5 h-8 px-4 text-xs font-bold text-white bg-linear-to-r from-violet-600 to-indigo-600 rounded-lg shadow-sm hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analizando...</>
                                : <><Sparkles className="h-3.5 w-3.5" /> Análisis IA</>
                            }
                        </button>

                        <div className="w-px h-5 bg-primary/20" />

                        <button
                            onClick={handleBulkDownload}
                            className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-primary bg-white border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Descargar
                        </button>
                        <button
                            onClick={() => toast.info('Envío múltiple en desarrollo')}
                            className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                        >
                            <Send className="h-3.5 w-3.5" />
                            Enviar
                        </button>
                        {role === 'super_admin' && (
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkDeleting}
                                className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                {isBulkDeleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── TABLE ─────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="space-y-0">
                        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 flex gap-6">
                            {[18, 30, 10, 14, 15, 8].map((w, i) => (
                                <div key={i} className="h-2.5 rounded bg-slate-200 animate-pulse" style={{ width: `${w}%` }} />
                            ))}
                        </div>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="px-6 py-4 border-b border-slate-50 flex items-center gap-4">
                                <div className="h-2 w-28 bg-slate-100 rounded animate-pulse" />
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="size-8 bg-slate-100 rounded animate-pulse shrink-0" />
                                    <div className="h-2 w-48 bg-slate-100 rounded animate-pulse" />
                                </div>
                                <div className="h-5 w-36 bg-slate-100 rounded-full animate-pulse" />
                                <div className="h-2 w-32 bg-slate-100 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length > 0 ? (
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b border-slate-100">
                                {/* Checkbox select-all */}
                                <th className="pl-4 pr-2 py-3 w-10">
                                    <button
                                        onClick={toggleAll}
                                        className="flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                                        title={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                    >
                                        {allSelected
                                            ? <CheckSquare className="h-4 w-4 text-primary" />
                                            : someSelected
                                                ? <Minus className="h-4 w-4 text-primary" />
                                                : <Square className="h-4 w-4" />
                                        }
                                    </button>
                                </th>
                                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Documento</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origen</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Facultativo</th>
                                <th className="text-right px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((doc) => {
                                    const initials = `${doc.practitioner?.first_name?.[0] ?? ''}${doc.practitioner?.last_name_1?.[0] ?? ''}`;
                                    const isSelected = selectedIds.has(doc.id);
                                return (
                                    <tr
                                        key={doc.id}
                                        className={`transition-colors group ${isSelected ? 'bg-primary/5 hover:bg-primary/[0.07]' : 'hover:bg-slate-50/70'}`}
                                    >
                                        {/* Checkbox */}
                                        <td className="pl-4 pr-2 py-4 w-10">
                                            <button
                                                onClick={() => toggleOne(doc.id)}
                                                className="flex items-center justify-center text-slate-300 hover:text-primary transition-colors"
                                            >
                                                {isSelected
                                                    ? <CheckSquare className="h-4 w-4 text-primary" />
                                                    : <Square className="h-4 w-4" />
                                                }
                                            </button>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar className="h-3.5 w-3.5 text-slate-300" />
                                                <span className="text-sm font-medium">
                                                    {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0 border border-red-100">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors truncate max-w-[280px]">
                                                        {doc.title || doc.name}
                                                    </span>
                                                    {doc.title && doc.title !== doc.name && (
                                                        <span className="text-[10px] text-slate-400 font-medium leading-none mt-0.5 truncate max-w-[280px]">
                                                            {doc.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {(() => { const o = getOrigen(doc.category); return (
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${o.color}`}>
                                                    {o.label}
                                                </span>
                                            ); })()}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {(() => { const t = getTipo(doc); return (
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${t.color}`}>
                                                    {t.label}
                                                </span>
                                            ); })()}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                                    {initials || '?'}
                                                </div>
                                                <span className="text-sm text-slate-600">
                                                    {doc.practitioner
                                                        ? `${doc.practitioner.first_name} ${doc.practitioner.last_name_1}`
                                                        : '---'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => viewDocument(doc)}
                                                    title="Ver documento"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => downloadDocument(doc)}
                                                    title="Descargar"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => toast.info('Funcionalidad de envío en desarrollo')}
                                                    title="Enviar documento"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                                                >
                                                    <Send className="h-4 w-4" />
                                                </button>
                                                {role === 'super_admin' && (
                                                    <button
                                                        onClick={() => handleDelete(doc.id, doc)}
                                                        title="Eliminar"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
                        <div className="size-20 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-5">
                            <FileText className="h-10 w-10 text-slate-200" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                            {searchTerm ? 'Sin resultados' : 'Repositorio vacío'}
                        </h3>
                        <p className="text-sm text-slate-400 max-w-sm mt-1.5 leading-relaxed">
                            {searchTerm
                                ? `No se encontraron documentos para "${searchTerm}".`
                                : 'No hay documentos vinculados a este paciente. Usa los botones de arriba para añadir documentación.'}
                        </p>
                    </div>
                )}

                {/* Footer with count */}
                {!isLoading && filtered.length > 0 && (
                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/40">
                        <p className="text-xs text-slate-400 font-medium">
                            Mostrando {filtered.length} de {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
                        </p>
                    </div>
                )}
            </div>

            <GenerateDocumentModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                patientId={patientId}
                onGenerated={() => queryClient.invalidateQueries({ queryKey: ['patient-documents', patientId] })}
            />
            <UploadTestModal
                isOpen={isUploadTestOpen}
                onClose={() => setIsUploadTestOpen(false)}
                patientId={patientId}
                onUploaded={() => queryClient.invalidateQueries({ queryKey: ['patient-documents', patientId] })}
            />
        </div>
    );
}
