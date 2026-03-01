import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, User, FileText, Loader2, AlertCircle, History, Clock, Search, X } from 'lucide-react';
import { ConsultationDetailModal } from './ConsultationDetailModal';
import { ConsultationHistoryModal } from '../modals/ConsultationHistoryModal';
import { ConsultationTimer } from '../ConsultationTimer';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';

const PAGE_SIZE_KEY = 'consultation_history_page_size';

interface ConsultationHistoryProps {
    patientId: string;
}

export function ConsultationHistory({ patientId }: ConsultationHistoryProps) {
    const [consultations, setConsultations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<string | null>(null);
    const [currentPractitionerId, setCurrentPractitionerId] = useState<string | null>(null);

    // Search & pagination
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(() => {
        const saved = localStorage.getItem(PAGE_SIZE_KEY);
        return saved ? Number(saved) : 10;
    });

    useEffect(() => {
        const fetchConsultations = async () => {
            setIsLoading(true);
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
                            id,
                            diagnosis_code,
                            motivo,
                            is_edited,
                            version_number,
                            last_edited_at
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

    // Filter by search
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return consultations;
        return consultations.filter(c => {
            const practName = `${c.practitioner?.first_name ?? ''} ${c.practitioner?.last_name_1 ?? ''}`.toLowerCase();
            const diag = c.diagnoses?.[0];
            const code = (diag?.diagnosis_code ?? '').toLowerCase();
            const motivo = (diag?.motivo ?? '').toLowerCase();
            const date = format(new Date(c.created_at), 'dd MMM yyyy', { locale: es }).toLowerCase();
            return practName.includes(q) || code.includes(q) || motivo.includes(q) || date.includes(q);
        });
    }, [consultations, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    // Reset to page 1 on search change
    useEffect(() => { setCurrentPage(1); }, [search]);

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
        <div className="w-full animate-in fade-in duration-500 space-y-3">
            {/* Search bar — mismo estilo que Mis Pacientes */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por fecha, facultativo o diagnóstico..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-900 placeholder:text-slate-400 transition-all"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                {filtered.length > 0 && (
                    <span className="text-xs text-slate-400 font-medium whitespace-nowrap shrink-0">
                        {filtered.length} consulta{filtered.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Table + Pagination unified in one card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto min-w-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 bg-slate-50/60">
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha y Hora</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Facultativo</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Diagnóstico Principal</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Versión</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                                        No se encontraron consultas para "{search}"
                                    </td>
                                </tr>
                            ) : paginated.map((consultation) => {
                                const practitioner = consultation.practitioner;
                                return (
                                    <tr
                                        key={consultation.id}
                                        className="hover:bg-gray-50/40 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setSelectedId(consultation.id);
                                            setIsModalOpen(true);
                                        }}
                                    >
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
                                                    <Calendar className="h-4 w-4" />
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
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                                                    <User className="h-3 w-3" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">
                                                    {practitioner?.first_name} {practitioner?.last_name_1}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {consultation.diagnoses && consultation.diagnoses.length > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-black rounded border border-brand-100 shrink-0 uppercase">
                                                        {consultation.diagnoses[0].diagnosis_code}
                                                    </span>
                                                    {consultation.diagnoses.length > 1 && (
                                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-black rounded border border-gray-200 shrink-0">
                                                            +{consultation.diagnoses.length - 1}
                                                        </span>
                                                    )}
                                                    <span className="text-sm font-medium text-gray-700 line-clamp-1 leading-snug">
                                                        {consultation.diagnoses[0].motivo || 'Sin descripción'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs italic text-gray-400">Sin diagnóstico</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            {consultation.diagnoses && consultation.diagnoses.length > 0 && consultation.diagnoses[0].is_edited ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-200">
                                                        <Clock className="h-3 w-3" />
                                                        v{consultation.diagnoses[0].version_number}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                                                        onClick={() => {
                                                            setSelectedDiagnosisId(consultation.diagnoses[0].id);
                                                            setHistoryModalOpen(true);
                                                        }}
                                                        title="Ver historial de versiones"
                                                    >
                                                        <History className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {consultation.status === 'draft' && consultation.diagnoses && consultation.diagnoses.length > 0 && currentPractitionerId && (
                                                    <ConsultationTimer
                                                        consultationDiagnosisId={consultation.diagnoses[0].id}
                                                        practitionerId={currentPractitionerId}
                                                        onExpired={() => {
                                                            setConsultations(prev =>
                                                                prev.map(c =>
                                                                    c.id === consultation.id ? { ...c, status: 'closed' } : c
                                                                )
                                                            );
                                                        }}
                                                    />
                                                )}
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${consultation.status === 'closed'
                                                    ? 'bg-green-50 text-green-600 border border-green-100'
                                                    : 'bg-orange-50 text-orange-600 border border-orange-100'
                                                    }`}>
                                                    {consultation.status === 'closed' ? 'Cerrada' : 'Borrador'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination inside the card */}
                <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    totalCount={filtered.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                        localStorage.setItem(PAGE_SIZE_KEY, String(size));
                    }}
                    pageSizeOptions={[5, 10, 20, 50]}
                />
            </div>

            <ConsultationDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                consultationId={selectedId}
            />

            <ConsultationHistoryModal
                isOpen={historyModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                consultationDiagnosisId={selectedDiagnosisId || ''}
            />
        </div>
    );
}
