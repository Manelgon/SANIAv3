import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    History,
    ClipboardList,
    FileText,
    Activity,
    Loader2,
    AlertTriangle,
    Download,
    User,
    Phone,
    CalendarDays,
    Droplet,
    Ruler,
    MessageSquarePlus,
    ChevronRight,
} from 'lucide-react';

interface GeneralOverviewTabProps {
    patient: any;
    onSwitchTab: (tab: string) => void;
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
    1: { label: 'Sospecha', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    2: { label: 'Confirmado', color: 'bg-brand-50 text-brand-700 border-brand-200' },
    3: { label: 'Resuelto', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export function GeneralOverviewTab({ patient, onSwitchTab }: GeneralOverviewTabProps) {
    const [notes, setNotes] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['patient-overview', patient.id],
        queryFn: async () => {
            const [consultsRes, diagRes, docsRes] = await Promise.all([
                supabase
                    .from('consultations')
                    .select(`id, created_at, status, practitioner_id, consultation_diagnoses(motivo, exploracion, tratamiento)`)
                    .eq('patient_id', patient.id)
                    .order('created_at', { ascending: false })
                    .limit(3),
                supabase
                    .from('patient_diagnoses')
                    .select(`id, diagnosis_code, status, created_at, diagnosis:diagnoses(descripcion)`)
                    .eq('patient_id', patient.id)
                    .neq('status', 3)
                    .order('created_at', { ascending: false })
                    .limit(8),
                supabase
                    .from('patient_documents')
                    .select('id, name, url, type, created_at')
                    .eq('patient_id', patient.id)
                    .order('created_at', { ascending: false })
                    .limit(4),
            ]);
            return {
                consultations: consultsRes.data || [],
                diagnoses: diagRes.data || [],
                documents: docsRes.data || [],
            };
        },
        staleTime: 2 * 60 * 1000,
    });

    const consultations = data?.consultations ?? [];
    const diagnoses = data?.diagnoses ?? [];
    const documents = data?.documents ?? [];

    const calculateAge = (birthDate: string) => {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const calculateIMC = (weight: number | null, height: number | null) => {
        if (!weight || !height) return null;
        const h = height / 100;
        return (weight / (h * h)).toFixed(1);
    };


    const imc = calculateIMC(patient.weight, patient.height);
    const imcCategory = imc
        ? parseFloat(imc) < 18.5 ? 'Bajo peso'
        : parseFloat(imc) < 25 ? 'Normal'
        : parseFloat(imc) < 30 ? 'Sobrepeso' : 'Obesidad'
        : null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-300">
            {/* Top Info Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                        <CalendarDays className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Nacimiento</p>
                        <p className="text-sm font-bold text-slate-800">
                            {format(new Date(patient.birth_date), 'dd MMM yyyy', { locale: es })}
                        </p>
                        <p className="text-[10px] text-slate-500">{calculateAge(patient.birth_date)} años</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg shrink-0">
                        <Droplet className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Grupo Sanguíneo</p>
                        <p className="text-xl font-black text-red-600">{patient.blood_group || '---'}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-brand-50 rounded-lg shrink-0">
                        <Ruler className="h-4 w-4 text-brand-600" />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Talla / Peso</p>
                        <p className="text-sm font-bold text-slate-800">
                            {patient.height ? `${patient.height} cm` : '---'}
                            {patient.weight ? ` / ${patient.weight} kg` : ''}
                        </p>
                        {imc && (
                            <p className="text-[10px] text-brand-600 font-semibold">IMC {imc} · {imcCategory}</p>
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                        <Phone className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Contacto</p>
                        <p className="text-sm font-bold text-slate-800">{patient.phone || 'N/D'}</p>
                        {patient.emergency_phone && (
                            <p className="text-[10px] text-red-500 font-semibold">Urg: {patient.emergency_phone}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Main 2-col layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT (2/3): Consultations + Diagnoses */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Recent Consultations */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <History className="h-4 w-4 text-brand-500" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Historial de Consultas</h3>
                            </div>
                            <button
                                onClick={() => onSwitchTab('historial')}
                                className="text-[10px] font-bold text-brand-600 hover:text-brand-700 uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                                VER TODO <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {consultations.length === 0 ? (
                                <p className="p-6 text-sm text-slate-400 text-center italic">Sin consultas registradas.</p>
                            ) : consultations.map((c, i) => (
                                <div key={c.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                                    <div className={`mt-0.5 size-8 rounded-lg flex items-center justify-center shrink-0 ${i === 0 ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <Activity className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <p className="text-xs font-bold text-slate-700 truncate">
                                                {c.consultation_diagnoses?.[0]?.motivo || 'Sin motivo registrado'}
                                            </p>
                                            {i === 0 && (
                                                <span className="shrink-0 text-[9px] font-bold uppercase bg-brand-50 text-brand-600 border border-brand-200 rounded-full px-2 py-0.5">
                                                    Última
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            {format(new Date(c.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                                        </p>
                                        {c.consultation_diagnoses?.[0]?.exploracion && (
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                                                {c.consultation_diagnoses[0].exploracion}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {consultations.length > 0 && (
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30">
                                <button
                                    onClick={() => onSwitchTab('consulta')}
                                    className="flex items-center gap-2 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors"
                                >
                                    <MessageSquarePlus className="h-3.5 w-3.5" />
                                    Nueva Consulta
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Active Diagnoses */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-brand-500" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Diagnósticos Activos</h3>
                            </div>
                            <button
                                onClick={() => onSwitchTab('diagnosticos')}
                                className="text-[10px] font-bold text-brand-600 hover:text-brand-700 uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                                VER TODO <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                        <div className="p-4">
                            {diagnoses.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center italic py-4">Sin diagnósticos activos.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {diagnoses.map((d) => {
                                        const st = STATUS_MAP[d.status] ?? STATUS_MAP[2];
                                        return (
                                            <div key={d.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${st.color}`}>
                                                <span className="font-black">{d.diagnosis_code}</span>
                                                <span className="hidden sm:inline text-xs font-medium opacity-80 max-w-[180px] truncate">
                                                    {(d.diagnosis as any)?.descripcion ?? ''}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase opacity-60">{st.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT (1/3): Documents + Notes */}
                <div className="space-y-6">

                    {/* Documents */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-brand-500" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Documentos</h3>
                            </div>
                            <button
                                onClick={() => onSwitchTab('documentos')}
                                className="text-[10px] font-bold text-brand-600 hover:text-brand-700 uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                                VER TODO <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {documents.length === 0 ? (
                                <p className="p-4 text-sm text-slate-400 text-center italic">Sin documentos adjuntos.</p>
                            ) : documents.map((doc) => (
                                <div key={doc.id} className="flex items-center gap-3 p-3 hover:bg-slate-50/50 transition-colors group">
                                    <div className="p-1.5 bg-red-50 rounded-md shrink-0">
                                        <FileText className="h-3.5 w-3.5 text-red-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-700 truncate">{doc.name}</p>
                                        <p className="text-[9px] text-slate-400">
                                            {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}
                                        </p>
                                    </div>
                                    {doc.url && (
                                        <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-md text-slate-300 hover:text-brand-600 hover:bg-brand-50 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Clinical notes */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <User className="h-4 w-4 text-brand-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Notas Clínicas Internas</h3>
                        </div>
                        <div className="p-4">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Escribe una nota clínica privada sobre este paciente..."
                                rows={5}
                                className="w-full text-xs text-slate-700 placeholder:text-slate-300 bg-slate-50 border border-slate-100 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Background & Habits */}
                    {(patient.background || patient.habits) && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Antecedentes y Hábitos</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {patient.background && (
                                    <div>
                                        <p className="text-[9px] font-bold uppercase text-blue-500 tracking-widest mb-1">Antecedentes</p>
                                        <p className="text-xs text-blue-900 leading-relaxed bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 italic">
                                            {patient.background}
                                        </p>
                                    </div>
                                )}
                                {patient.habits && (
                                    <div>
                                        <p className="text-[9px] font-bold uppercase text-green-500 tracking-widest mb-1">Hábitos</p>
                                        <p className="text-xs text-green-900 leading-relaxed bg-green-50/60 p-2.5 rounded-lg border border-green-100 italic">
                                            {patient.habits}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
