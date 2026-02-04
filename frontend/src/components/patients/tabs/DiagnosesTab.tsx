import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Stethoscope,
    ChevronRight,
    Calendar,
    User,
    Loader2,
    AlertCircle,
    ClipboardList,
    Search
} from 'lucide-react';
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

export function DiagnosesTab({ patientId }: DiagnosesTabProps) {
    const [groups, setGroups] = useState<DiagnosisGroup[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<DiagnosisGroup | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchDiagnoses = async () => {
            setIsLoading(true);
            try {
                // Fetch all consultations with their diagnoses for this patient
                const { data, error: fetchError } = await supabase
                    .from('consultation_diagnoses')
                    .select(`
                        id,
                        diagnosis_code,
                        motivo,
                        status,
                        created_at,
                        consultation:consultations(
                            id,
                            status,
                            practitioner:practitioners(first_name, last_name_1)
                        ),
                        diagnosis_data:diagnoses(descripcion)
                    `)
                    .eq('patient_id', patientId)
                    .order('created_at', { ascending: false });

                if (fetchError) throw fetchError;

                // Group by diagnosis_code
                const groupMap = new Map<string, DiagnosisGroup>();

                (data || []).forEach((item: any) => {
                    const code = item.diagnosis_code;
                    if (!groupMap.has(code)) {
                        groupMap.set(code, {
                            code,
                            description: item.diagnosis_data?.descripcion || item.motivo || 'Consulta General',
                            count: 0,
                            lastDate: item.created_at,
                            consultations: [],
                            status: item.status || 'confirmed'
                        });
                    }

                    const group = groupMap.get(code)!;
                    group.count += 1;
                    group.consultations.push(item);
                    if (new Date(item.created_at) > new Date(group.lastDate)) {
                        group.lastDate = item.created_at;
                    }
                });

                setGroups(Array.from(groupMap.values()).sort((a, b) => b.count - a.count));
            } catch (err: any) {
                console.error('Error fetching diagnoses history:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (patientId) {
            fetchDiagnoses();
            setSelectedGroup(null);
        }
    }, [patientId]);

    const handleStatusChange = async (diagnosisCode: string, newStatus: 'pending' | 'confirmed' | 'unconfirmed', e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the group

        try {
            const { data, error: updateError } = await supabase.rpc('update_diagnosis_status_by_code', {
                p_patient_id: patientId,
                p_diagnosis_code: diagnosisCode,
                p_new_status: newStatus
            } as any);

            if (updateError) throw updateError;

            console.log(`Updated ${data} consultation(s) to status: ${newStatus}`);

            // Refetch diagnoses to reflect changes
            const fetchDiagnoses = async () => {
                try {
                    const { data, error: fetchError } = await supabase
                        .from('consultation_diagnoses')
                        .select(`
                            id,
                            diagnosis_code,
                            motivo,
                            status,
                            created_at,
                            consultation:consultations(
                                id,
                                status,
                                practitioner:practitioners(first_name, last_name_1)
                            ),
                            diagnosis_data:diagnoses(descripcion)
                        `)
                        .eq('patient_id', patientId)
                        .order('created_at', { ascending: false });

                    if (fetchError) throw fetchError;

                    const groupMap = new Map<string, DiagnosisGroup>();
                    (data || []).forEach((item: any) => {
                        const code = item.diagnosis_code;
                        if (!groupMap.has(code)) {
                            groupMap.set(code, {
                                code,
                                description: item.diagnosis_data?.descripcion || item.motivo || 'Consulta General',
                                count: 0,
                                lastDate: item.created_at,
                                consultations: [],
                                status: item.status || 'confirmed'
                            });
                        }

                        const group = groupMap.get(code)!;
                        group.count += 1;
                        group.consultations.push(item);
                        if (new Date(item.created_at) > new Date(group.lastDate)) {
                            group.lastDate = item.created_at;
                        }
                    });

                    setGroups(Array.from(groupMap.values()).sort((a, b) => b.count - a.count));
                } catch (err: any) {
                    console.error('Error refetching diagnoses:', err);
                }
            };

            await fetchDiagnoses();
        } catch (err: any) {
            console.error('Error updating diagnosis status:', err);
            setError(err.message);
        }
    };

    const getStatusBadge = (status: 'pending' | 'confirmed' | 'unconfirmed') => {
        const styles = {
            confirmed: 'bg-green-50 text-green-700 border-green-200',
            unconfirmed: 'bg-red-50 text-red-700 border-red-200',
            pending: 'bg-yellow-50 text-yellow-700 border-yellow-200'
        };
        const labels = {
            confirmed: 'Confirmada',
            unconfirmed: 'No Confirmada',
            pending: 'Pendiente'
        };
        return (
            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    const filteredGroups = groups.filter(g =>
        g.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 h-full">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-500" />
                <p className="text-sm font-medium">Procesando historial clínico...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="flex flex-col items-center justify-center py-12 text-red-400 bg-red-50 rounded-xl border border-red-100 p-6">
                    <AlertCircle className="h-8 w-8 mb-4" />
                    <p className="text-sm font-bold text-red-800">Error al cargar diagnósticos</p>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-4">
                    <Stethoscope className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Sin diagnósticos activos</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                    No se han registrado diagnósticos codificados para este paciente todavía. Los diagnósticos aparecerán aquí una vez que se completen las consultas.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col min-h-0 bg-white">
            <div className="grid grid-cols-12 h-full divide-x divide-gray-100 min-h-0">
                {/* LEFT COLUMN: Groups List */}
                <div className="col-span-3 flex flex-col min-h-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/30">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar diagnóstico o código..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-brand-500 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="divide-y divide-gray-50">
                            {filteredGroups.map((group) => (
                                <button
                                    key={group.code}
                                    onClick={() => setSelectedGroup(group)}
                                    className={`w-full text-left p-5 transition-all group flex items-start gap-4 ${selectedGroup?.code === group.code
                                        ? 'bg-brand-50/50 border-r-2 border-brand-500'
                                        : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`mt-1 h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border transition-colors ${selectedGroup?.code === group.code
                                        ? 'bg-white border-brand-200 text-brand-600 shadow-sm'
                                        : 'bg-gray-50 border-gray-100 text-gray-400 group-hover:bg-white group-hover:border-gray-200'
                                        }`}>
                                        <Stethoscope className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest px-2 py-0.5 bg-brand-50 rounded">
                                                {group.code}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 lowercase">
                                                {group.count} {group.count === 1 ? 'consulta' : 'consultas'}
                                            </span>
                                        </div>
                                        <h4 className={`text-sm font-bold truncate ${selectedGroup?.code === group.code ? 'text-gray-900' : 'text-gray-700'
                                            }`}>
                                            {group.description}
                                        </h4>
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                                <Calendar className="h-3 w-3" />
                                                Última: {format(new Date(group.lastDate), 'dd MMM yyyy', { locale: es })}
                                            </div>
                                            {getStatusBadge(group.status)}
                                        </div>
                                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={group.status}
                                                onChange={(e) => handleStatusChange(group.code, e.target.value as any, e as any)}
                                                className="w-full text-[10px] font-bold px-2 py-1 border border-gray-200 rounded bg-white hover:border-brand-300 focus:ring-1 focus:ring-brand-500 outline-none cursor-pointer"
                                            >
                                                <option value="confirmed">✓ Confirmada</option>
                                                <option value="pending">⏳ Pendiente</option>
                                                <option value="unconfirmed">✕ No Confirmada</option>
                                            </select>
                                        </div>
                                    </div>
                                    <ChevronRight className={`h-4 w-4 mt-1 transition-transform ${selectedGroup?.code === group.code ? 'translate-x-1 text-brand-500' : 'text-gray-300'
                                        }`} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Consultation Detail */}
                <div className="col-span-9 flex flex-col min-h-0 bg-gray-50/30">
                    {selectedGroup ? (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-6">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-14 w-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center text-brand-600">
                                    <ClipboardList className="h-8 w-8" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-brand-50 text-brand-600 text-[10px] font-black rounded border border-brand-100 uppercase">
                                            {selectedGroup.code}
                                        </span>
                                        <h2 className="text-xl font-bold text-gray-900 truncate">
                                            {selectedGroup.description}
                                        </h2>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 font-medium">
                                        Historial de consultas relacionadas con este diagnóstico
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden border border-gray-100 rounded-xl bg-white shadow-sm">
                                <div className="h-full overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Facultativo</th>
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Motivo/Nota</th>
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {selectedGroup.consultations.map((item: any) => (
                                                <tr
                                                    key={item.id}
                                                    onClick={() => {
                                                        setSelectedConsultationId(item.consultation?.id);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="hover:bg-brand-50/30 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-3.5 w-3.5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                                                            <span className="text-sm font-bold text-gray-900 capitalize">
                                                                {format(new Date(item.created_at), "dd MMM, yyyy", { locale: es })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-6 w-6 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden">
                                                                <User className="h-3 w-3 text-gray-400" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700">
                                                                {item.consultation?.practitioner?.first_name} {item.consultation?.practitioner?.last_name_1}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm text-gray-600 italic line-clamp-1 max-w-[250px]">
                                                            {item.motivo || 'Sin descripción adicional'}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.consultation?.status === 'closed'
                                                            ? 'bg-green-50 text-green-700'
                                                            : 'bg-orange-50 text-orange-700'
                                                            }`}>
                                                            {item.consultation?.status === 'closed' ? 'Finalizada' : 'Borrador'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <div className="h-20 w-20 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center justify-center mb-6 text-gray-200">
                                <Stethoscope className="h-10 w-10" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-400">Seleccione un diagnóstico</h3>
                            <p className="text-sm text-gray-400 mt-2 max-w-[280px]">
                                Seleccione una patología de la lista izquierda para ver el historial detallado de consultas.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ConsultationDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                consultationId={selectedConsultationId}
            />
        </div>
    );
}
