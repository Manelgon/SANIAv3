import { Button } from '@/components/ui/Button';
import { ConsultationPanel } from './tabs/ConsultationPanel';
import { ConsultationHistory } from './tabs/ConsultationHistory';
import { DiagnosesTab } from './tabs/DiagnosesTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { ArrowLeft, User, ClipboardList, Info, Calendar, Phone, Activity, Venus, Mars, AlertTriangle, Zap, Apple, History as HistoryIcon, FileText, Droplet } from 'lucide-react';
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
    const activeTab = searchParams.get('tab') || 'consulta';
    const [allergies, setAllergies] = useState<any[]>([]);
    const [lastConsultation, setLastConsultation] = useState<string | null>(null);

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

    const setActiveTab = (tabId: string) => {
        setSearchParams({ tab: tabId }, { replace: true });
    };

    const tabs = [
        { id: 'consulta', label: 'Consulta', icon: Activity },
        { id: 'historial', label: 'Historial de Consultas', icon: Calendar },
        { id: 'diagnosticos', label: 'Diagnósticos', icon: ClipboardList },
        { id: 'documentos', label: 'Documentos', icon: FileText },
        { id: 'informacion', label: 'Información General', icon: Info },
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
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header / Navigation */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                    <Button variant="ghost" size="sm" onClick={onBack} className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 transition-colors shrink-0">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Button>
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="min-w-0 truncate relative cursor-pointer"
                            onClick={() => toggleTooltip('patient-info')}
                        >
                            <h1 className="text-xl font-bold text-gray-900 leading-tight truncate hover:text-brand-600 transition-colors">
                                {patient.last_name_1} {patient.last_name_2}, {patient.first_name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-600 uppercase tracking-tight whitespace-nowrap">
                                    CIP: {patient.cip || 'S/N'}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest whitespace-nowrap hidden sm:inline-block">Ficha del Paciente</span>
                            </div>

                            {/* Patient Info Tooltip */}
                            <div className={cn(
                                "absolute top-full left-0 mt-2 w-64 p-3 bg-white rounded-xl shadow-xl border border-gray-200 z-50 transition-all text-left",
                                activeTooltip === 'patient-info' ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
                            )}>
                                <span className="block text-[10px] font-black text-brand-600 uppercase mb-2 tracking-widest">Información del Paciente</span>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-800"><strong className="text-gray-500">Nombre:</strong> {patient.first_name} {patient.last_name_1} {patient.last_name_2}</p>
                                    <p className="text-xs text-gray-800"><strong className="text-gray-500">DNI:</strong> {patient.dni}</p>
                                    <p className="text-xs text-gray-800"><strong className="text-gray-500">CIP:</strong> {patient.cip || 'S/N'}</p>
                                    <p className="text-xs text-gray-800"><strong className="text-gray-500">Edad:</strong> {calculateAge(patient.birth_date)} años</p>
                                </div>
                                <div className="absolute -top-1.5 left-4 w-3 h-3 bg-white border-t border-l border-gray-200 rotate-45"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 w-full lg:w-auto justify-between lg:justify-end">
                    {/* Hover Stats */}
                    <div className="flex items-center gap-2 border-r pr-4 border-gray-100 h-10">
                        {/* Antecedentes Hover */}
                        <div className="group relative">
                            <div
                                onClick={() => toggleTooltip('background')}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors cursor-help"
                            >
                                <Zap className="h-4 w-4" />
                            </div>
                            <div className={cn(
                                "absolute top-full left-0 lg:left-1/2 lg:-translate-x-1/2 mt-2 w-64 p-3 bg-white rounded-xl shadow-xl border border-gray-200 z-50 transition-all",
                                activeTooltip === 'background' ? "opacity-100 visible" : "opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none"
                            )}>
                                <span className="block text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest">Antecedentes Médicos</span>
                                <p className="text-xs text-gray-600 leading-relaxed italic">
                                    {patient.background || 'No se han registrado antecedentes de interés.'}
                                </p>
                                <div className="absolute -top-1.5 left-3 lg:left-1/2 lg:-translate-x-1/2 w-3 h-3 bg-white border-t border-l border-gray-200 rotate-45"></div>
                            </div>
                        </div>

                        {/* Hábitos Hover */}
                        <div className="group relative">
                            <div
                                onClick={() => toggleTooltip('habits')}
                                className="p-2 bg-green-50 text-green-600 rounded-lg border border-green-100 hover:bg-green-100 transition-colors cursor-help"
                            >
                                <Apple className="h-4 w-4" />
                            </div>
                            <div className={cn(
                                "absolute top-full left-[-2.5rem] lg:left-1/2 lg:-translate-x-1/2 mt-2 w-64 p-3 bg-white rounded-xl shadow-xl border border-gray-200 z-50 transition-all",
                                activeTooltip === 'habits' ? "opacity-100 visible" : "opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none"
                            )}>
                                <span className="block text-[10px] font-black text-green-600 uppercase mb-2 tracking-widest">Hábitos de Vida</span>
                                <p className="text-xs text-gray-600 leading-relaxed italic">
                                    {patient.habits || 'No se han registrado hábitos particulares.'}
                                </p>
                                <div className="absolute -top-1.5 left-12 lg:left-1/2 lg:-translate-x-1/2 w-3 h-3 bg-white border-t border-l border-gray-200 rotate-45"></div>
                            </div>
                        </div>

                        {/* Blood Group Hover */}
                        <div className="group relative">
                            <div
                                onClick={() => toggleTooltip('bloodGroup')}
                                className="p-2 bg-pink-50 text-pink-600 rounded-lg border border-pink-100 hover:bg-pink-100 transition-colors cursor-help"
                            >
                                <Droplet className="h-4 w-4" />
                            </div>
                            <div className={cn(
                                "absolute top-full left-[-3.5rem] lg:left-1/2 lg:-translate-x-1/2 mt-2 w-64 p-3 bg-white rounded-xl shadow-xl border border-gray-200 z-50 transition-all text-center",
                                activeTooltip === 'bloodGroup' ? "opacity-100 visible" : "opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none"
                            )}>
                                <span className="block text-[10px] font-black text-pink-600 uppercase mb-2 tracking-widest">Grupo Sanguíneo</span>
                                <p className="text-xl font-black text-gray-800">
                                    {patient.blood_group || 'N/A'}
                                </p>
                                <div className="absolute -top-1.5 left-16 lg:left-1/2 lg:-translate-x-1/2 w-3 h-3 bg-white border-t border-l border-gray-200 rotate-45"></div>
                            </div>
                        </div>

                        {/* Alergias Hover */}
                        <div className="group relative">
                            <div
                                onClick={() => toggleTooltip('allergies')}
                                className={cn(
                                    "p-2 rounded-lg border transition-colors cursor-help",
                                    allergies.length > 0
                                        ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                                        : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100 font-bold"
                                )}>
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className={cn(
                                "absolute top-full left-[-5rem] lg:left-1/2 lg:-translate-x-1/2 mt-2 w-64 p-3 bg-white rounded-xl shadow-xl border border-gray-200 z-50 text-left transition-all",
                                activeTooltip === 'allergies' ? "opacity-100 visible" : "opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none"
                            )}>
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
                                    <p className="text-xs text-gray-500 italic">No se han registrado alergias para este paciente.</p>
                                )}
                                <div className="absolute -top-1.5 left-20 lg:left-1/2 lg:-translate-x-1/2 w-3 h-3 bg-white border-t border-l border-gray-200 rotate-45"></div>
                            </div>
                        </div>
                    </div>

                    <div className="hidden sm:flex flex-col items-end border-r pr-4 border-gray-100">
                        <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Última Consulta</span>
                        <div className="flex items-center gap-1.5">
                            <HistoryIcon className="h-3 w-3 text-brand-500" />
                            <span className="text-gray-900 font-black text-sm text-right">
                                {lastConsultation ? format(new Date(lastConsultation), 'dd/MM/yyyy', { locale: es }) : "S/N"}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider text-right">Edad y Género</span>
                        <div className="flex items-center gap-2">
                            {patient.gender === 'hombre' ? (
                                <Mars className="h-5 w-5 text-blue-500" />
                            ) : patient.gender === 'mujer' ? (
                                <Venus className="h-5 w-5 text-pink-500" />
                            ) : (
                                <User className="h-5 w-5 text-gray-400" />
                            )}
                            <span className="text-gray-900 font-black text-xl leading-none">{calculateAge(patient.birth_date)} años</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[60vh]">
                <div className="flex border-b border-gray-100 bg-gray-50/30 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative border-r border-gray-100 last:border-r-0 whitespace-nowrap ${activeTab === tab.id
                                    ? 'text-brand-600 bg-white'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-brand-500' : 'text-gray-400'}`} />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                    {/* TAB: Registro Clínico */}
                    <div className={cn("flex-1 flex flex-col min-h-0 overflow-hidden", activeTab !== 'consulta' && "hidden")}>
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
                            <div className="grid grid-cols-12 gap-6">
                                {/* LEFT: Administrative & Identification */}
                                <div className="col-span-12 lg:col-span-8 space-y-6">
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                            <Info className="h-4 w-4 text-gray-400" />
                                            <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Información de Identificación</h4>
                                        </div>
                                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                                            <div>
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Nombre Completo</span>
                                                <span className="text-sm font-bold text-gray-900 leading-tight">
                                                    {patient.first_name} {patient.last_name_1} {patient.last_name_2}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">DNI / Pasaporte</span>
                                                <span className="text-sm font-bold text-gray-900 leading-tight">{patient.dni}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Nº Afiliación / CIP</span>
                                                <span className="text-sm font-black text-brand-600 leading-tight">{patient.insured_number || patient.cip || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Fecha de Nacimiento</span>
                                                <span className="text-sm font-bold text-gray-900 leading-tight">
                                                    {format(new Date(patient.birth_date), "dd 'de' MMMM, yyyy", { locale: es })}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Género</span>
                                                <span className="text-sm font-bold text-gray-900 leading-tight capitalize">{patient.gender || 'No especificado'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Email / Usuario</span>
                                                <span className="text-sm font-bold text-gray-900 leading-tight">{patient.email || 'N/A'}</span>
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
                                                <span className="text-xl font-black text-red-600 leading-none">{patient.blood_group || '---'}</span>
                                            </div>
                                            <div className="p-3 bg-brand-50/30 rounded-lg border border-brand-50">
                                                <span className="block text-[9px] text-brand-500 font-black uppercase mb-1">Altura</span>
                                                <span className="text-lg font-black text-brand-700 leading-none">{patient.height ? `${patient.height} cm` : '---'}</span>
                                            </div>
                                            <div className="p-3 bg-brand-50/30 rounded-lg border border-brand-50">
                                                <span className="block text-[9px] text-brand-500 font-black uppercase mb-1">Peso</span>
                                                <span className="text-lg font-black text-brand-700 leading-none">{patient.weight ? `${patient.weight} kg` : '---'}</span>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <span className="block text-[9px] text-gray-400 font-black uppercase mb-1">IMC Calc.</span>
                                                <span className="text-lg font-black text-gray-900 leading-none">{calculateIMC(patient.weight, patient.height)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: Location & Notes */}
                                <div className="col-span-12 lg:col-span-4 space-y-6">
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Ubicación y Contacto</h4>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            <div>
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Dirección de Residencia</span>
                                                <span className="text-sm font-semibold text-gray-900 leading-relaxed block p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    {patient.address?.street || 'Calle no especificada'}
                                                    {(patient.address?.block || patient.address?.floor) && (
                                                        <span className="block text-xs text-gray-500 mt-1 font-medium italic">
                                                            {patient.address?.block && `Bloque ${patient.address.block}`}
                                                            {patient.address?.floor && `${patient.address?.block ? ', ' : ''}Piso ${patient.address.floor}`}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Provincia / Región</span>
                                                <span className="text-sm font-bold text-gray-900 leading-none capitalize">{patient.address?.province || 'No especificada'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                            <ClipboardList className="h-4 w-4 text-gray-400" />
                                            <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Notas Administrativas</h4>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            <div className="space-y-1">
                                                <span className="block text-[10px] text-blue-500 font-black uppercase">Antecedentes</span>
                                                <p className="text-xs text-blue-900 leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100 italic">
                                                    {patient.background || 'No se han registrado antecedentes de interés.'}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="block text-[10px] text-green-500 font-black uppercase">Hábitos de Vida</span>
                                                <p className="text-xs text-green-900 leading-relaxed bg-green-50/50 p-3 rounded-lg border border-green-100 italic">
                                                    {patient.habits || 'No se han registrado hábitos particulares.'}
                                                </p>
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
    );
}
