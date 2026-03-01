import { Button } from '@/components/ui/Button';
import { ConsultationPanel } from './tabs/ConsultationPanel';
import { ConsultationHistory } from './tabs/ConsultationHistory';
import { DiagnosesTab } from './tabs/DiagnosesTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { ClinicalDataTab } from './tabs/ClinicalDataTab';
import { GeneralOverviewTab } from './tabs/GeneralOverviewTab';
import { EditPatientModal } from './EditPatientModal';
import { ArrowLeft, ClipboardList, Info, Calendar, Activity, AlertTriangle, Zap, Apple, FileText, LayoutDashboard, Phone, Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
import { es } from 'date-fns/locale';

interface PatientDetailViewProps {
    patient: any;
    onBack: () => void;
}

export function PatientDetailView({ patient, onBack }: PatientDetailViewProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'general';
    const [allergies, setAllergies] = useState<any[]>([]);
    const [lastConsultation, setLastConsultation] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [localPatient, setLocalPatient] = useState(patient);

    useEffect(() => {
        const fetchClinicalSummary = async () => {
            if (!patient?.id) return;

            // Fetch Allergies
            const { data: allergiesData } = await supabase
                .from('patient_allergies')
                .select(`
                    id,
                    status,
                    notes,
                    allergy:allergies_list(description)
                `)
                .eq('patient_id', patient.id);
            setAllergies(allergiesData || []);

            // Fetch Last Consultation
            const { data: lastConsult } = await supabase
                .from('consultations')
                .select('created_at')
                .eq('patient_id', patient.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (lastConsult) {
                setLastConsultation((lastConsult as any).created_at);
            }
        };

        fetchClinicalSummary();
    }, [patient.id]);

    // Refresh patient data after edit
    const handlePatientUpdated = async () => {
        setIsEditModalOpen(false);
        const { data } = await supabase
            .from('patients')
            .select(`*, portfolio:portfolios(name)`)
            .eq('id', localPatient.id)
            .maybeSingle();
        if (data) {
            setLocalPatient({ ...data, portfolio_name: (data.portfolio as any)?.name });
        }
        const { data: allergiesData } = await supabase
            .from('patient_allergies')
            .select(`id, status, notes, allergy:allergies_list(description)`)
            .eq('patient_id', localPatient.id);
        setAllergies(allergiesData || []);
    };

    const setActiveTab = (tabId: string) => {
        setSearchParams({ tab: tabId }, { replace: true });
    };

    const tabs = [
        { id: 'general', label: 'Resumen General', icon: LayoutDashboard },
        { id: 'consulta', label: 'Consulta', icon: Activity },
        { id: 'historial', label: 'Historial de Consultas', icon: Calendar },
        { id: 'diagnosticos', label: 'Diagnósticos', icon: ClipboardList },
        { id: 'documentos', label: 'Documentos', icon: FileText },
        { id: 'informacion', label: 'Ficha del Paciente', icon: Info },
    ];

    const calculateAge = (birthDate: string) => {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const calculateIMC = (weight: number | null, height: number | null) => {
        if (!weight || !height) return "-";
        const heightInMeters = height / 100;
        const imc = weight / (heightInMeters * heightInMeters);
        return imc.toFixed(1);
    };

    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    const toggleTooltip = (id: string) => {
        if (activeTooltip === id) {
            setActiveTooltip(null);
        } else {
            setActiveTooltip(id);
        }
    };

    return (
        <>
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Patient Profile Header — estilo Stitch */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

                    {/* Left: Avatar + Info */}
                    <div className="flex items-start gap-4">
                        <Button variant="ghost" size="sm" onClick={onBack} className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 transition-colors shrink-0 mt-1">
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </Button>
                        {/* Avatar circle */}
                        <div className="relative shrink-0">
                            <div className="size-16 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-xl select-none">
                                {`${patient.last_name_1?.charAt(0) ?? ''}${patient.first_name?.charAt(0) ?? ''}`.toUpperCase()}
                            </div>
                            <div className="absolute -bottom-1.5 -right-1.5 size-6 bg-brand-600 rounded-md flex items-center justify-center shadow">
                                <Activity className="h-3.5 w-3.5 text-white" />
                            </div>
                        </div>
                        {/* Name + meta */}
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                                    {patient.first_name} {patient.last_name_1} {patient.last_name_2}
                                </h1>
                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-bold font-mono text-slate-600 whitespace-nowrap">
                                    CIP: {patient.cip || 'S/N'}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium mb-2">
                                {calculateAge(patient.birth_date)} años
                                {patient.gender && ` · ${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}`}
                                {patient.blood_group && ` · ${patient.blood_group}`}
                                {lastConsultation && ` · Última visita: ${format(new Date(lastConsultation), "dd MMM yyyy", { locale: es })}`}
                            </p>
                        </div>
                    </div>

                    {/* Right: clinical quick-access tooltips */}
                    <div className="flex items-center gap-2 shrink-0 self-center">
                        {/* Antecedentes */}
                        <div className="group relative">
                            <div onClick={() => toggleTooltip('background')} className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors cursor-help">
                                <Zap className="h-4 w-4" />
                            </div>
                            <div className={cn("absolute top-full right-0 mt-2 w-64 p-3 bg-white rounded-xl shadow-xl border border-gray-200 z-50 transition-all", activeTooltip === 'background' ? "opacity-100 visible" : "opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none")}>
                                <span className="block text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest">Antecedentes Médicos</span>
                                <p className="text-xs text-gray-600 leading-relaxed italic">{patient.background || 'No se han registrado antecedentes de interés.'}</p>
                                <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white border-t border-r border-gray-200 rotate-45"></div>
                            </div>
                        </div>
                        {/* Hábitos */}
                        <div className="group relative">
                            <div onClick={() => toggleTooltip('habits')} className="p-2 bg-green-50 text-green-600 rounded-lg border border-green-100 hover:bg-green-100 transition-colors cursor-help">
                                <Apple className="h-4 w-4" />
                            </div>
                            <div className={cn("absolute top-full right-0 mt-2 w-64 p-3 bg-white rounded-xl shadow-xl border border-gray-200 z-50 transition-all", activeTooltip === 'habits' ? "opacity-100 visible" : "opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none")}>
                                <span className="block text-[10px] font-black text-green-600 uppercase mb-2 tracking-widest">Hábitos de Vida</span>
                                <p className="text-xs text-gray-600 leading-relaxed italic">{patient.habits || 'No se han registrado hábitos particulares.'}</p>
                                <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white border-t border-r border-gray-200 rotate-45"></div>
                            </div>
                        </div>
                        {/* Alergias */}
                        <div className="group relative">
                            <div
                                onClick={() => toggleTooltip('allergies')}
                                className={cn(
                                    "p-2 rounded-lg border transition-colors cursor-help",
                                    allergies.length > 0
                                        ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                                        : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100"
                                )}
                            >
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className={cn("absolute top-full right-0 mt-2 w-64 p-3 bg-white rounded-xl shadow-xl border border-gray-200 z-50 text-left transition-all", activeTooltip === 'allergies' ? "opacity-100 visible" : "opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none")}>
                                <span className="block text-[10px] font-black text-red-600 uppercase mb-2 tracking-widest">Alergias Conocidas</span>
                                {allergies.length > 0 ? (
                                    <ul className="space-y-1.5">
                                        {allergies.map((a: any) => (
                                            <li key={a.id} className="text-xs text-gray-700 flex items-start gap-1.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                                <span>
                                                    <strong className="font-bold">{(a.allergy as any)?.description}</strong>
                                                    {a.notes && <span className="block text-[10px] text-gray-500 italic">{a.notes}</span>}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-500 italic">No se han registrado alergias.</p>
                                )}
                                <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white border-t border-r border-gray-200 rotate-45"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[60vh]">
                <div className="flex items-end gap-6 border-b border-slate-200 px-6 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 pt-4 text-xs font-bold tracking-widest uppercase transition-all relative whitespace-nowrap border-b-4 ${
                                activeTab === tab.id
                                    ? 'border-brand-500 text-brand-600'
                                    : 'border-transparent text-slate-400 hover:text-brand-600 hover:border-brand-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex flex-col min-h-0 relative">
                    {/* TAB: Resumen General */}
                    <div className={cn("flex-1 overflow-auto", activeTab !== 'general' && "hidden")}>
                        <GeneralOverviewTab patient={patient} onSwitchTab={setActiveTab} />
                    </div>

                    {/* TAB: Registro Clínico */}
                    <div className={cn("flex-1 flex flex-col min-h-0", activeTab !== 'consulta' && "hidden")}>
                        <ConsultationPanel patientId={patient.id} />
                    </div>

                    {/* TAB: Historial */}
                    <div className={cn("flex-1 overflow-auto", activeTab !== 'historial' && "hidden")}>
                        <ConsultationHistory patientId={patient.id} />
                    </div>

                    {/* TAB: Diagnósticos */}
                    <div className={cn("flex-1 overflow-hidden", activeTab !== 'diagnosticos' && "hidden")}>
                        <DiagnosesTab patientId={patient.id} />
                    </div>

                    {/* TAB: Documentos */}
                    <div className={cn("flex-1 flex flex-col min-h-0 overflow-hidden", activeTab !== 'documentos' && "hidden")}>
                        <DocumentsTab patientId={patient.id} />
                    </div>

                    {/* TAB: Información General */}
                    <div className={cn("p-8 flex-1 flex flex-col overflow-auto", activeTab !== 'informacion' && "hidden")}>
                        <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-300 text-left">

                            {/* Toolbar */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Ficha del Paciente</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Datos de identificación, contacto y clínicos del paciente</p>
                                </div>
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-brand-700 transition-colors"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Editar datos del paciente
                                </button>
                            </div>
                            <div className="grid grid-cols-12 gap-6">
                                {/* LEFT: Administrative & Identification */}
                                <div className="col-span-12 lg:col-span-8 space-y-6">
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Ubicación y Contacto</h4>
                                        </div>
                                        <div className="p-5">
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Teléfono Principal</span>
                                                    <span className="text-sm font-bold text-gray-900">{localPatient.phone || '---'}</span>
                                                </div>
                                                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                                    <span className="text-[9px] text-red-500 uppercase font-bold block mb-1">Emergencias</span>
                                                    <span className="text-sm font-bold text-red-900">{localPatient.emergency_phone || '---'}</span>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Dirección</span>
                                                    <span className="text-sm font-semibold text-gray-900 leading-tight block truncate" title={localPatient.address?.street}>
                                                        {localPatient.address?.street || 'No especificada'}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Localidad</span>
                                                    <span className="text-sm font-bold text-gray-900 block truncate capitalize" title={localPatient.locality || localPatient.address?.locality}>
                                                        {localPatient.locality || localPatient.address?.locality || '---'}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase block mb-1">Provincia / Región</span>
                                                    <span className="text-sm font-bold text-gray-900 block truncate capitalize">{localPatient.address?.province || 'No especificada'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-gray-400" />
                                            <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Estado Biométrico y Clínico</h4>
                                        </div>
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 text-center lg:text-left">
                                            <div className="p-3 bg-red-50/30 rounded-lg border border-red-50">
                                                <span className="block text-[9px] text-red-500 font-black uppercase mb-1">G. Sanguíneo</span>
                                                <span className="text-xl font-black text-red-600 leading-none">{localPatient.blood_group || '---'}</span>
                                            </div>
                                            <div className="p-3 bg-brand-50/30 rounded-lg border border-brand-50">
                                                <span className="block text-[9px] text-brand-500 font-black uppercase mb-1">Altura</span>
                                                <span className="text-lg font-black text-brand-700 leading-none">{localPatient.height ? `${localPatient.height} cm` : '---'}</span>
                                            </div>
                                            <div className="p-3 bg-brand-50/30 rounded-lg border border-brand-50">
                                                <span className="block text-[9px] text-brand-500 font-black uppercase mb-1">Peso</span>
                                                <span className="text-lg font-black text-brand-700 leading-none">{localPatient.weight ? `${localPatient.weight} kg` : '---'}</span>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <span className="block text-[9px] text-gray-400 font-black uppercase mb-1">IMC Calc.</span>
                                                <span className="text-lg font-black text-gray-900 leading-none">{calculateIMC(localPatient.weight, localPatient.height)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <ClinicalDataTab patientId={localPatient.id} />
                                </div>

                                {/* RIGHT: Location & Notes */}
                                <div className="col-span-12 lg:col-span-4 space-y-6">
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                            <Info className="h-4 w-4 text-gray-400" />
                                            <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Información de Identificación</h4>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            <div>
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Nombre Completo</span>
                                                <span className="text-xs font-bold text-gray-900 block leading-tight">
                                                    {localPatient.first_name} {localPatient.last_name_1} {localPatient.last_name_2}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">DNI / Pasaporte</span>
                                                    <span className="text-xs font-bold text-gray-900 block">{localPatient.dni}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">CIP</span>
                                                    <span className="text-xs font-black text-brand-600 block">{localPatient.cip || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">FID Relacionado</span>
                                                    <span className="text-xs font-bold text-brand-600 block">{localPatient.portfolio_name || 'Particular'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Nº Afiliación</span>
                                                    <span className="text-xs font-bold text-gray-900 block">{localPatient.insured_number || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Nacimiento</span>
                                                    <span className="text-[11px] font-bold text-gray-900 block">
                                                        {format(new Date(localPatient.birth_date), "dd/MM/yyyy")}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Género</span>
                                                    <span className="text-xs font-bold text-gray-900 block capitalize">{localPatient.gender || '---'}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Email</span>
                                                <span className="text-xs font-bold text-gray-900 block truncate" title={localPatient.email}>{localPatient.email || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Edit Patient Modal */}
        <EditPatientModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSaved={handlePatientUpdated}
            patient={localPatient}
        />
        </>
    );
}
