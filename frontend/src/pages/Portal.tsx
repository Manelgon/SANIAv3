import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import {
    LogOut,
    FileText,
    Download,
    CalendarDays,
    User,
    Stethoscope,
    CheckCircle2,
    Clock,
    ChevronRight,
    Bell,
} from 'lucide-react';

interface PatientProfile {
    id: string;
    first_name: string;
    last_name_1: string;
    last_name_2: string | null;
    birth_date: string | null;
    dni: string | null;
    cip: string | null;
}

interface Consultation {
    id: string;
    scheduled_at: string;
    status: 'draft' | 'signed' | 'closed';
    practitioner_id: string;
}

interface PatientDocument {
    id: string;
    name: string;
    url: string;
    type: string;
    created_at: string;
}

function maskDni(dni: string | null) {
    if (!dni) return '—';
    return `${dni.slice(0, 2)}***${dni.slice(-2)}`;
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function calculateAge(birthDate: string | null) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function statusBadge(status: string) {
    if (status === 'closed' || status === 'signed') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
                <CheckCircle2 className="h-2.5 w-2.5" /> Completada
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
            <Clock className="h-2.5 w-2.5" /> En revisión
        </span>
    );
}

export default function PortalPage() {
    const { user, signOut } = useAuthStore();
    const [patient, setPatient] = useState<PatientProfile | null>(null);
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [documents, setDocuments] = useState<PatientDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) fetchPatientData();
    }, [user?.id]);

    const fetchPatientData = async () => {
        if (!user?.id) return;
        try {
            const [patientsRes, consultsRes, docsRes] = await Promise.all([
                supabase.from('patients').select('*').eq('user_id', user.id).single(),
                supabase.from('consultations').select('*').eq('patient_id', user.id).order('scheduled_at', { ascending: false }).limit(5),
                supabase.from('patient_documents').select('*').eq('patient_id', user.id).order('created_at', { ascending: false }),
            ]);
            const patientData = patientsRes.data as any;
            const consultData = consultsRes.data as any;
            const docsData = docsRes.data as any;

            if (patientData) setPatient(patientData as PatientProfile);
            if (consultData) {
                // If consultations use patient_id from patients table, retry with patient UUID
                if (consultData.length === 0 && patientData) {
                    const { data: c2 } = await supabase
                        .from('consultations')
                        .select('*')
                        .eq('patient_id', patientData.id)
                        .order('scheduled_at', { ascending: false })
                        .limit(5);
                    setConsultations((c2 as Consultation[]) || []);
                } else {
                    setConsultations(consultData as Consultation[]);
                }
            }
            if (docsData) {
                // If docs use patient.id
                if (docsData.length === 0 && patientData) {
                    const { data: d2 } = await supabase
                        .from('patient_documents')
                        .select('*')
                        .eq('patient_id', patientData.id)
                        .order('created_at', { ascending: false });
                    setDocuments((d2 as PatientDocument[]) || []);
                } else {
                    setDocuments(docsData as PatientDocument[]);
                }
            }
        } catch (err) {
            console.error('Error fetching patient data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fullName = patient
        ? `${patient.first_name} ${patient.last_name_1}${patient.last_name_2 ? ' ' + patient.last_name_2 : ''}`
        : user?.email || 'Paciente';

    const initials = patient
        ? `${patient.first_name[0]}${patient.last_name_1[0]}`
        : (user?.email?.slice(0, 2).toUpperCase() ?? 'P');

    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="min-h-screen bg-bg-base flex flex-col">
            {/* HEADER */}
            <header className="bg-white border-b border-primary/10 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="size-9 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
                            <svg fill="none" viewBox="0 0 48 48" className="size-5">
                                <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
                            </svg>
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-bold text-primary leading-tight">SanIA</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60 leading-tight">Mi Portal de Salud</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 text-slate-400 hover:text-primary rounded-lg hover:bg-primary-accent/20 transition-colors">
                            <Bell className="h-4.5 w-4.5" />
                        </button>
                        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                            <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">{initials}</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-700 hidden md:block max-w-32 truncate">{fullName}</span>
                        </div>
                        <button
                            onClick={signOut}
                            title="Cerrar sesión"
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 rounded-lg transition-colors"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Salir</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
                {/* WELCOME BANNER */}
                <div className="rounded-xl bg-linear-to-r from-primary-accent to-primary-light p-6 flex items-center justify-between">
                    <div>
                        <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-1">Bienvenido/a de nuevo</p>
                        <h1 className="text-primary text-2xl font-black tracking-tight">{fullName}</h1>
                        <p className="text-primary/70 text-sm mt-1 capitalize">{today}</p>
                    </div>
                    <div className="hidden sm:flex size-16 rounded-full bg-primary/10 border-2 border-primary/20 items-center justify-center shrink-0">
                        <span className="text-2xl font-black text-primary">{initials}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
                                <div className="space-y-3">
                                    <div className="h-3 bg-slate-100 rounded w-full" />
                                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT: 2/3 */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Consultations */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                    <h2 className="text-base font-bold text-primary flex items-center gap-2">
                                        <Stethoscope className="h-4 w-4" />
                                        Mis Consultas Recientes
                                    </h2>
                                    <button className="text-xs text-primary font-semibold hover:underline">Ver todas</button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {consultations.length === 0 ? (
                                        <div className="px-6 py-10 text-center">
                                            <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                            <p className="text-sm text-slate-400 font-medium">No hay consultas registradas</p>
                                        </div>
                                    ) : (
                                        consultations.map((c) => (
                                            <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group">
                                                <div className="size-9 rounded-full bg-primary-accent/30 text-primary flex items-center justify-center shrink-0">
                                                    <CalendarDays className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800">
                                                        Consulta médica
                                                    </p>
                                                    <p className="text-xs text-slate-400">{formatDate(c.scheduled_at)}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {statusBadge(c.status)}
                                                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Personal Info */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <h2 className="text-base font-bold text-primary flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Mi Información Personal
                                    </h2>
                                </div>
                                <div className="px-6 py-5 grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Nombre completo', value: fullName },
                                        { label: 'DNI / NIF', value: maskDni(patient?.dni ?? null) },
                                        { label: 'Fecha de nacimiento', value: formatDate(patient?.birth_date ?? null) },
                                        { label: 'Edad', value: patient?.birth_date ? `${calculateAge(patient.birth_date)} años` : '—' },
                                        { label: 'CIP / NUSS', value: patient?.cip || '—' },
                                        { label: 'Correo electrónico', value: user?.email || '—' },
                                    ].map((field) => (
                                        <div key={field.label}>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{field.label}</p>
                                            <p className="text-sm font-semibold text-slate-800 mt-0.5">{field.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: 1/3 */}
                        <div className="space-y-6">
                            {/* Documents */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                                    <h2 className="text-base font-bold text-primary flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Mis Documentos
                                    </h2>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {documents.length === 0 ? (
                                        <div className="px-5 py-8 text-center">
                                            <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                            <p className="text-xs text-slate-400 font-medium">Sin documentos disponibles</p>
                                        </div>
                                    ) : (
                                        documents.map((doc) => (
                                            <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                                <div className="size-8 bg-primary/5 rounded-lg flex items-center justify-center shrink-0">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-slate-700 truncate">{doc.name}</p>
                                                    <p className="text-[10px] text-slate-400">{formatDate(doc.created_at)}</p>
                                                </div>
                                                <a
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-primary hover:bg-primary-accent/20 rounded-lg transition-colors shrink-0"
                                                    title="Descargar"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </a>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Quick help card */}
                            <div className="bg-linear-to-br from-primary/5 to-primary-accent/20 rounded-xl border border-primary/10 p-5">
                                <div className="size-9 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                                    <Stethoscope className="h-4 w-4 text-primary" />
                                </div>
                                <h3 className="text-sm font-bold text-primary mb-1">¿Necesitas ayuda?</h3>
                                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                                    Si tienes alguna duda sobre tus consultas o documentos, contacta con tu médico.
                                </p>
                                <button className="w-full py-2 text-xs font-bold text-primary bg-white border border-primary/20 rounded-lg hover:bg-primary-accent/20 transition-colors">
                                    Contactar con mi médico
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="max-w-6xl mx-auto w-full px-6 py-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">© {new Date().getFullYear()} SanIA Healthcare Systems · Datos protegidos según RGPD</p>
            </footer>
        </div>
    );
}
