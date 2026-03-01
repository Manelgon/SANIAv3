import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Stethoscope, Calendar, User, AlertCircle, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ConsultationDetailModal } from './ConsultationDetailModal';

interface DiagnosesTabProps {
    patientId: string;
}

interface DiagnosisGroup {
    code: string;
    description: string;
    count: number;
    lastDate: string;
    consultations: any[];
    status: 'pending' | 'confirmed' | 'unconfirmed';
}

const STATUS_CONFIG = {
    confirmed:   { label: 'Confirmada',    color: 'text-emerald-600', border: 'border-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
    pending:     { label: 'Pendiente',     color: 'text-amber-600',   border: 'border-amber-500',   badge: 'bg-amber-100 text-amber-700'   },
    unconfirmed: { label: 'No confirmada', color: 'text-red-500',     border: 'border-red-400',     badge: 'bg-red-100 text-red-700'       },
};

function buildGroups(data: any[]): DiagnosisGroup[] {
    const map = new Map<string, DiagnosisGroup>();
    (data || []).forEach((item: any) => {
        const code = item.diagnosis_code;
        if (!map.has(code)) {
            map.set(code, {
                code,
                description: item.diagnosis_data?.descripcion || item.motivo || 'Consulta General',
                count: 0,
                lastDate: item.created_at,
                consultations: [],
                status: item.status || 'confirmed',
            });
        }
        const g = map.get(code)!;
        g.count += 1;
        g.consultations.push(item);
        if (new Date(item.created_at) > new Date(g.lastDate)) g.lastDate = item.created_at;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

const fetchDiagnosesFn = async (patientId: string) => {
    const { data, error } = await supabase
        .from('consultation_diagnoses')
        .select(`
            id, diagnosis_code, motivo, status, created_at,
            consultation:consultations(id, status, practitioner:practitioners(first_name, last_name_1)),
            diagnosis_data:diagnoses(descripcion)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return buildGroups(data || []);
};

export function DiagnosesTab({ patientId }: DiagnosesTabProps) {
    const queryClient = useQueryClient();
    const [selectedGroup, setSelectedGroup] = useState<DiagnosisGroup | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [updatingCode, setUpdatingCode] = useState<string | null>(null);

    const { data: groups = [], isLoading, error } = useQuery({
        queryKey: ['patient-diagnoses', patientId],
        queryFn: () => fetchDiagnosesFn(patientId),
        staleTime: 2 * 60 * 1000,
        enabled: !!patientId,
    });

    const handleStatusChange = async (diagnosisCode: string, newStatus: 'pending' | 'confirmed' | 'unconfirmed') => {
        setUpdatingCode(diagnosisCode);
        try {
            const { error } = await supabase.rpc('update_diagnosis_status_by_code', {
                p_patient_id: patientId,
                p_diagnosis_code: diagnosisCode,
                p_new_status: newStatus,
            } as any);
            if (error) throw error;
            await queryClient.invalidateQueries({ queryKey: ['patient-diagnoses', patientId] });
            // Update selectedGroup if it's the one being changed
            setSelectedGroup(prev => prev?.code === diagnosisCode ? { ...prev, status: newStatus } : prev);
        } catch (err) {
            console.error('Error updating diagnosis status:', err);
        } finally {
            setUpdatingCode(null);
        }
    };

    const filteredGroups = groups.filter(g =>
        g.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="h-full flex">
                {/* Left skeleton */}
                <div className="w-[28%] border-r border-primary/10 p-4 space-y-3">
                    <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
                    {[1,2,3].map(i => (
                        <div key={i} className="h-24 bg-slate-50 rounded-xl animate-pulse border border-slate-100" />
                    ))}
                </div>
                {/* Right skeleton */}
                <div className="flex-1 p-8 space-y-4">
                    <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                    <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-xl border border-red-100 p-6">
                    <AlertCircle className="h-8 w-8 text-red-400 mb-4" />
                    <p className="text-sm font-bold text-red-800">Error al cargar diagnósticos</p>
                    <p className="text-xs text-red-600 mt-1">{(error as any)?.message}</p>
                </div>
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="size-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <Stethoscope className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Sin diagnósticos registrados</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-xs">
                    Los diagnósticos aparecerán aquí una vez que se completen consultas para este paciente.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="h-full flex min-h-0 overflow-hidden">

                {/* ── LEFT PANEL ─────────────────────────────────────────── */}
                <aside className="w-[28%] border-r border-primary/10 flex flex-col bg-white overflow-hidden">

                    {/* Header + search */}
                    <div className="p-4 border-b border-primary/10 space-y-3 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500">Diagnósticos</h3>
                                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {filteredGroups.length}
                                </span>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar código o diagnóstico..."
                                className="w-full pl-9 pr-4 h-9 rounded-lg border border-primary/10 bg-slate-50 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 [scrollbar-width:thin] [scrollbar-color:rgba(15,77,63,0.15)_transparent]">
                        {filteredGroups.map((group) => {
                            const isSelected = selectedGroup?.code === group.code;
                            const cfg = STATUS_CONFIG[group.status] ?? STATUS_CONFIG.confirmed;
                            return (
                                <button
                                    key={group.code}
                                    onClick={() => setSelectedGroup(group)}
                                    className={`w-full text-left rounded-xl border-l-4 p-4 shadow-sm transition-all ${isSelected
                                        ? `${cfg.border} bg-primary/5 ring-1 ring-primary/20`
                                        : `${cfg.border} bg-white ring-1 ring-slate-200 hover:ring-primary/30`
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-1.5">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                                            {group.code}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 leading-snug mb-2 line-clamp-2">
                                        {group.description}
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-2.5">
                                        <Calendar className="h-3 w-3" />
                                        <span>Última: {format(new Date(group.lastDate), 'dd MMM yyyy', { locale: es })}</span>
                                        <span className="mx-1 text-slate-300">·</span>
                                        <span>{group.count} {group.count === 1 ? 'consulta' : 'consultas'}</span>
                                    </div>
                                    {/* Status selector */}
                                    <div onClick={e => e.stopPropagation()}>
                                        <select
                                            value={group.status}
                                            disabled={updatingCode === group.code}
                                            onChange={e => handleStatusChange(group.code, e.target.value as any)}
                                            className="w-full text-[10px] font-semibold px-2 py-1 border border-slate-200 rounded-lg bg-white hover:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer disabled:opacity-60"
                                        >
                                            <option value="confirmed">✓ Confirmada</option>
                                            <option value="pending">⏳ Pendiente</option>
                                            <option value="unconfirmed">✕ No Confirmada</option>
                                        </select>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* ── RIGHT PANEL ─────────────────────────────────────────── */}
                <section className="flex-1 flex flex-col overflow-y-auto bg-slate-50/30 [scrollbar-width:thin] [scrollbar-color:rgba(15,77,63,0.1)_transparent]">
                    {selectedGroup ? (
                        <>
                            {/* Detail header */}
                            <div className="px-8 py-6 border-b border-primary/10 bg-white shrink-0">
                                <div className="flex items-start gap-5">
                                    <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                                        <Stethoscope className="h-8 w-8" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 mb-1.5">
                                            <span className="text-primary font-black text-sm">CIE-10: {selectedGroup.code}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_CONFIG[selectedGroup.status]?.badge}`}>
                                                {STATUS_CONFIG[selectedGroup.status]?.label}
                                            </span>
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                                            {selectedGroup.description}
                                        </h2>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Última visita: {format(new Date(selectedGroup.lastDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                                            </span>
                                            <span className="text-xs text-slate-400">·</span>
                                            <span className="text-xs text-slate-500">
                                                {selectedGroup.count} {selectedGroup.count === 1 ? 'consulta registrada' : 'consultas registradas'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Consultations table */}
                            <div className="p-6">
                                <div className="bg-white rounded-xl ring-1 ring-primary/10 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 bg-slate-50 border-b border-primary/5 flex items-center gap-2">
                                        <Stethoscope className="h-3.5 w-3.5 text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Consultas Relacionadas</span>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Fecha</th>
                                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Facultativo</th>
                                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Nota de Evolución</th>
                                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Estado</th>
                                                <th className="px-6 py-3" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {selectedGroup.consultations.map((item: any) => (
                                                <tr
                                                    key={item.id}
                                                    onClick={() => {
                                                        setSelectedConsultationId(item.consultation?.id);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                                                            <span className="text-sm font-semibold text-slate-700">
                                                                {format(new Date(item.created_at), 'dd MMM, yyyy', { locale: es })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                                <User className="h-3 w-3 text-primary" />
                                                            </div>
                                                            <span className="text-sm text-slate-700">
                                                                {item.consultation?.practitioner?.first_name} {item.consultation?.practitioner?.last_name_1}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 max-w-xs">
                                                        <p className="text-sm text-slate-500 italic line-clamp-1">
                                                            {item.motivo || 'Sin descripción adicional'}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                                            item.consultation?.status === 'closed'
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {item.consultation?.status === 'closed' ? 'Finalizada' : 'Borrador'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button className="p-1.5 rounded-lg text-slate-300 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/30">
                                        <p className="text-xs text-slate-400 italic">
                                            {selectedGroup.count} {selectedGroup.count === 1 ? 'consulta registrada' : 'consultas registradas'} con este diagnóstico
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="size-20 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center mb-5 text-slate-200">
                                <Stethoscope className="h-10 w-10" />
                            </div>
                            <h3 className="text-base font-bold text-slate-400">Seleccione un diagnóstico</h3>
                            <p className="text-sm text-slate-400 mt-1.5 max-w-[260px] leading-relaxed">
                                Seleccione una patología de la lista para ver el historial detallado de consultas.
                            </p>
                        </div>
                    )}
                </section>
            </div>

            <ConsultationDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                consultationId={selectedConsultationId}
            />
        </>
    );
}
