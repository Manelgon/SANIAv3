import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, Save, CheckCircle2, Clock, XCircle, MinusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

interface ConsultationPanelProps {
    patientId: string;
}

interface SelectedDiagnosis {
    code: string;
    description: string;
    isPending: boolean;
    existingStatus?: number; // 1: Sospecha, 2: Confirmado, 3: Resuelto
}

interface NewConsultationForm {
    motivo: string;
    exploracion: string;
    diagnosisSearch: string;
    selectedDiagnoses: SelectedDiagnosis[];
    tratamiento: string;
    aproximacion: string;
    scheduledAt?: string;
    // Vitals
    weight?: string;
    height?: string;
    systolic?: string;
    diastolic?: string;
    heartRate?: string;
    temp?: string;
    satO2?: string;
}

export function ConsultationPanel({ patientId }: ConsultationPanelProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [activeConsultation, setActiveConsultation] = useState<any>(null);
    const [constantCatalog, setConstantCatalog] = useState<Record<string, string>>({});

    // Diagnosis Search State
    const [diagnosisResults, setDiagnosisResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [patientDiagnoses, setPatientDiagnoses] = useState<Record<string, number>>({});

    const { register, handleSubmit, reset, watch, setValue } = useForm<NewConsultationForm>({
        defaultValues: {
            motivo: '',
            exploracion: '',
            diagnosisSearch: '',
            selectedDiagnoses: [],
            tratamiento: '',
            aproximacion: '',
            scheduledAt: new Date().toISOString().slice(0, 16),
        }
    });

    const diagnosisSearchValue = watch('diagnosisSearch');
    const selectedDiagnoses = watch('selectedDiagnoses') || [];

    const addDiagnosis = (result: any) => {
        if (selectedDiagnoses.some(d => d.code === result.codigo)) {
            toast.error('Este diagnóstico ya ha sido seleccionado');
            return;
        }
        const existingStatus = patientDiagnoses[result.codigo];
        const newSelected = [...selectedDiagnoses, {
            code: result.codigo,
            description: result.descripcion,
            // Default behavior: 
            // - If Active (1,2): true (Stay Active)
            // - If Inactive (3): false (Stay Inactive)
            // - If New: false (Confirmed/Active by default)
            isPending: (existingStatus === 1 || existingStatus === 2) ? true : false,
            existingStatus: existingStatus
        }];
        setValue('selectedDiagnoses', newSelected);
        setValue('diagnosisSearch', '');
        setDiagnosisResults([]);
        setShowResults(false);
    };

    const removeDiagnosis = (code: string) => {
        setValue('selectedDiagnoses', selectedDiagnoses.filter(d => d.code !== code));
    };

    const togglePending = (code: string) => {
        const newSelected = selectedDiagnoses.map(d =>
            d.code === code ? { ...d, isPending: !d.isPending } : d
        );
        setValue('selectedDiagnoses', newSelected);
    };

    // Debounced Diagnosis Search
    useEffect(() => {
        const fetchDiagnoses = async () => {
            // Don't search if the value matches a full selection (CODE - DESC)
            if (!diagnosisSearchValue || diagnosisSearchValue.length < 3 || diagnosisSearchValue.includes(' - ')) {
                if (!diagnosisSearchValue?.includes(' - ')) {
                    setDiagnosisResults([]);
                    setShowResults(false);
                }
                return;
            }

            setIsSearching(true);
            try {
                const { data, error } = await supabase
                    .from('diagnoses')
                    .select('codigo, descripcion')
                    .or(`codigo.ilike.%${diagnosisSearchValue}%,descripcion.ilike.%${diagnosisSearchValue}%`)
                    .limit(8);

                if (error) throw error;
                setDiagnosisResults(data || []);
                setShowResults(data && data.length > 0);
            } catch (err) {
                console.error('Error searching diagnoses:', err);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(fetchDiagnoses, 400);
        return () => clearTimeout(timer);
    }, [diagnosisSearchValue]);

    // Initial data fetch
    useEffect(() => {
        reset(); // Ensure form is clean
        setActiveConsultation(null); // Reset active consultation state
        loadConstantCatalog();
        fetchPatientDiagnoses();
    }, [patientId]);

    const fetchPatientDiagnoses = async () => {
        try {
            const { data, error } = await supabase
                .from('patient_diagnoses')
                .select('diagnosis_code, status')
                .eq('patient_id', patientId);

            if (error) throw error;
            if (data) {
                const mapping = data.reduce((acc: any, item: any) => {
                    acc[item.diagnosis_code] = item.status;
                    return acc;
                }, {});
                setPatientDiagnoses(mapping);
            }
        } catch (err) {
            console.error('Error fetching patient diagnoses:', err);
        }
    };

    const loadConstantCatalog = async () => {
        try {
            const { data, error } = await supabase
                .from('clinical_constants')
                .select('id, code');

            if (error) throw error;
            if (data) {
                const mapping = data.reduce((acc: any, item: any) => {
                    acc[item.code] = item.id;
                    return acc;
                }, {});
                setConstantCatalog(mapping);
            }
        } catch (error) {
            console.error('Error loading clinical constants catalog:', error);
        }
    };


    const onSubmit = async (data: NewConsultationForm) => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No usuario autenticado');

            const { data: practitioner, error: practError } = await supabase
                .from('practitioners')
                .select('id, fid, first_name, last_name_1, license_number')
                .eq('user_id', user.id)
                .single();

            if (practError) throw new Error('No se encontró el perfil del facultativo');

            const { data: patient, error: patError } = await supabase
                .from('patients')
                .select('portfolio_id, cip, first_name, last_name_1, last_name_2, dni, birth_date')
                .eq('id', patientId)
                .single();
            if (patError) throw new Error('Error al obtener datos del paciente');

            // 1. Create Consultation
            const { data: newConsultation, error: insertError } = await supabase
                .from('consultations')
                .insert({
                    patient_id: patientId,
                    practitioner_id: (practitioner as any).id,
                    portfolio_id: (patient as any).portfolio_id,
                    fid: (practitioner as any).fid || 'S/F',
                    cip: (patient as any).cip || 'S/C',
                    scheduled_at: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : new Date().toISOString(),
                    status: 'draft',
                } as any)
                .select()
                .single();

            if (insertError) {
                console.error('Error creating consultation:', insertError);
                throw new Error(`Error base: No se pudo crear la consulta. ${insertError.message}`);
            }

            const consultation = newConsultation as any;

            // 2. Create Diagnosis Notes (Batch)
            if (data.selectedDiagnoses.length === 0) {
                // Fallback to Z00.0 if nothing selected
                data.selectedDiagnoses = [{
                    code: 'Z00.0',
                    description: 'Consulta General',
                    isPending: false
                }];
            }

            const diagnosisInserts = data.selectedDiagnoses.map(diag => {
                let status = 'confirmed';

                if (!diag.existingStatus) {
                    // New: isPending means 'pending', !isPending means 'confirmed'
                    status = diag.isPending ? 'pending' : 'confirmed';
                } else {
                    // Existing: isPending means 'active/confirmed', !isPending means 'unconfirmed/resolved'
                    status = diag.isPending ? 'confirmed' : 'unconfirmed';
                }

                return {
                    consultation_id: consultation.id,
                    motivo: data.motivo || 'Consulta general',
                    exploracion: data.exploracion || 'Sin hallazgos detallados',
                    tratamiento: data.tratamiento,
                    aproximacion: data.aproximacion,
                    diagnosis_code: diag.code,
                    practitioner_id: (practitioner as any).id,
                    patient_id: patientId,
                    portfolio_id: (patient as any).portfolio_id,
                    fid: (practitioner as any).fid || 'S/F',
                    cip: (patient as any).cip || 'S/C',
                    status: status
                };
            });

            const { data: newDiagnoses, error: diagnosisInsertError } = await supabase
                .from('consultation_diagnoses')
                .insert(diagnosisInserts as any)
                .select();

            if (diagnosisInsertError) {
                console.error('Error saving diagnoses:', diagnosisInsertError);
                throw new Error(`Error al guardar los diagnósticos: ${diagnosisInsertError.message}`);
            }

            const primaryDiagnosis = (newDiagnoses as any[])[0];

            // 3. Save Vitals (Consultation Constants)
            const vitalMappings = [
                { field: 'weight', code: 'WEIGHT' },
                { field: 'height', code: 'HEIGHT' },
                { field: 'systolic', code: 'BP_SYS' },
                { field: 'diastolic', code: 'BP_DIA' },
                { field: 'heartRate', code: 'HEART_RATE' },
                { field: 'temp', code: 'TEMP' },
                { field: 'satO2', code: 'SATO2' },
            ];

            const constantsToInsert = vitalMappings
                .map(m => ({
                    consultation_id: consultation.id,
                    consultation_diagnosis_id: primaryDiagnosis.id,
                    patient_id: patientId,
                    practitioner_id: (practitioner as any).id,
                    constant_id: constantCatalog[m.code],
                    value: (data as any)[m.field] ? parseFloat((data as any)[m.field]) : null
                }))
                .filter(c => c.value !== null && c.constant_id);

            if (constantsToInsert.length > 0) {
                const { error: vitalsError } = await supabase
                    .from('consultation_constants')
                    .insert(constantsToInsert as any);

                if (vitalsError) {
                    console.error('Error saving vitals:', vitalsError);
                    toast.error('La consulta se guardó pero hubo un error con las constantes.');
                }
            }

            toast.success('Consulta guardada correctamente');
            setActiveConsultation(newConsultation);
            reset(); // Clear everything on success

        } catch (error: any) {
            console.error('Full Error Object:', error);
            toast.error(error.message || 'Error desconocido al guardar la consulta');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = "w-full bg-slate-50 border-none rounded-xl p-2.5 text-center text-sm font-bold text-brand-600 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500 bg-gray-50/50 relative">
            <LoadingOverlay isLoading={isLoading} message="Generando consulta e informe..." />
            <style>{`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                  -webkit-appearance: none; 
                  margin: 0; 
                }
                input[type=number] {
                  -moz-appearance: textfield;
                }
             `}</style>
            <div className="flex-1 overflow-y-auto p-6">
                <form className="w-full space-y-6">

                    {/* Header */}
                    <div className="flex items-end justify-between mb-2">
                        <div>
                            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 uppercase">
                                {activeConsultation ? 'Consulta en Curso' : 'Registro Clínico'}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-md shadow-brand-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
                        >
                            {isLoading
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Save className="h-4 w-4" />
                            }
                            GUARDAR CONSULTA
                        </button>
                    </div>

                    <fieldset disabled={isLoading} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* ═══ LEFT COLUMN (7/12) ═══ */}
                        <div className="lg:col-span-7 space-y-4">

                            {/* Diagnosis card — search + selected diagnoses together */}
                            <div className="bg-white rounded-xl border border-brand-600/10 shadow-sm p-6">
                                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    Diagnóstico (CIE-10)
                                </label>
                                {/* Search */}
                                <div className="relative mb-5">
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-500/20 text-sm text-slate-900 placeholder:text-slate-400"
                                        placeholder="Buscar código o descripción CIE-10..."
                                        autoComplete="off"
                                        {...register('diagnosisSearch')}
                                        onFocus={() => diagnosisResults.length > 0 && setShowResults(true)}
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </div>
                                    {showResults && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                            <div className="max-h-60 overflow-y-auto">
                                                {diagnosisResults.map((result) => (
                                                    <button
                                                        key={result.codigo}
                                                        type="button"
                                                        className="w-full text-left p-4 hover:bg-brand-50 border-b border-gray-50 last:border-none transition-colors group flex items-start gap-4"
                                                        onClick={() => addDiagnosis(result)}
                                                    >
                                                        <span className="font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded text-xs group-hover:bg-brand-100">
                                                            {result.codigo}
                                                        </span>
                                                        <span className="text-sm text-gray-700 font-medium line-clamp-2">
                                                            {result.descripcion}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Selected diagnoses — inside the same card */}
                                <div className="space-y-3">
                                    {selectedDiagnoses.length === 0 ? (
                                        <div className="py-6 flex items-center justify-center text-slate-300 text-xs font-medium uppercase tracking-widest text-center">
                                            Añada diagnósticos desde el buscador
                                        </div>
                                    ) : (
                                        selectedDiagnoses.map((diag) => {
                                            const isInactive = diag.existingStatus === 3;
                                            const isSelected = diag.isPending;
                                            const isExisting = !!diag.existingStatus;
                                            const isActive = isExisting && !isInactive;

                                            let bgColor = "bg-slate-50 border-slate-200";
                                            let textColor = "text-slate-700";
                                            let IconComp = Clock;
                                            let iconColor = "text-slate-400";
                                            let subText = "Pendiente de estudio";

                                            if (isInactive) {
                                                subText = "Inactivo anteriormente";
                                                if (isSelected) {
                                                    bgColor = "bg-brand-50/40 border-brand-200/40";
                                                    textColor = "text-brand-700";
                                                    IconComp = CheckCircle2;
                                                    iconColor = "text-brand-600";
                                                    subText = "Se activará en esta consulta";
                                                } else {
                                                    bgColor = "bg-red-50 border-red-100";
                                                    textColor = "text-red-700/70";
                                                    IconComp = XCircle;
                                                    iconColor = "text-red-400";
                                                }
                                            } else if (isActive) {
                                                subText = "Ya activo para este paciente";
                                                if (isSelected) {
                                                    bgColor = "bg-brand-50/40 border-brand-200/40";
                                                    textColor = "text-brand-700";
                                                    IconComp = CheckCircle2;
                                                    iconColor = "text-brand-600";
                                                } else {
                                                    bgColor = "bg-red-50 border-red-100";
                                                    textColor = "text-red-700/50";
                                                    IconComp = MinusCircle;
                                                    iconColor = "text-red-500";
                                                    subText = "Se marcará como resuelto";
                                                }
                                            } else {
                                                if (!isSelected) {
                                                    bgColor = "bg-brand-50/40 border-brand-200/40";
                                                    textColor = "text-brand-700";
                                                    IconComp = CheckCircle2;
                                                    iconColor = "text-brand-600";
                                                    subText = "Confirmado · Principal";
                                                } else {
                                                    bgColor = "bg-slate-50 border-slate-200";
                                                    textColor = "text-slate-600";
                                                    IconComp = Clock;
                                                    iconColor = "text-slate-400";
                                                    subText = "Pendiente de confirmar";
                                                }
                                            }

                                            return (
                                                <div key={diag.code} className={`flex items-center justify-between p-3 border rounded-xl animate-in fade-in duration-200 group ${bgColor}`}>
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <IconComp className={`h-5 w-5 shrink-0 ${iconColor}`} />
                                                        <div className="min-w-0">
                                                            <p className={`text-sm font-bold truncate ${textColor}`}>
                                                                {diag.code} {diag.description}
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{subText}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 ml-3 shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={diag.isPending}
                                                            onChange={() => togglePending(diag.code)}
                                                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 transition-all cursor-pointer"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeDiagnosis(diag.code)}
                                                            className="h-8 w-8 p-0 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        >
                                                            ×
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Motivo card */}
                            <div className="bg-white rounded-xl border border-brand-600/10 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Motivo de consulta</h3>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-500/20 transition-all min-h-[100px] resize-none text-slate-900 placeholder:text-slate-400 text-sm"
                                    placeholder="Describa el síntoma o motivo principal..."
                                    {...register('motivo')}
                                />
                            </div>

                            {/* Exploración física card */}
                            <div className="bg-white rounded-xl border border-brand-600/10 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Exploración Física</h3>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-500/20 transition-all min-h-[100px] resize-none text-slate-900 placeholder:text-slate-400 text-sm"
                                    placeholder="Hallazgos de la exploración física..."
                                    {...register('exploracion')}
                                />
                            </div>

                            {/* Aproximación diagnóstica card */}
                            <div className="bg-white rounded-xl border border-brand-600/10 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Aproximación Diagnóstica</h3>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-500/20 transition-all min-h-[100px] resize-none text-slate-900 placeholder:text-slate-400 text-sm"
                                    placeholder="Juicio clínico y diagnósticos diferenciales..."
                                    {...register('aproximacion')}
                                />
                            </div>

                            {/* Tratamiento card */}
                            <div className="bg-white rounded-xl border border-brand-600/10 shadow-sm p-6">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Tratamiento y Plan</h3>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-500/20 transition-all min-h-[120px] resize-none text-slate-900 placeholder:text-slate-400 text-sm"
                                    placeholder="Prescripciones, derivaciones y recomendaciones..."
                                    {...register('tratamiento')}
                                />
                            </div>
                        </div>

                        {/* ═══ RIGHT COLUMN (5/12) ═══ */}
                        <div className="lg:col-span-5 space-y-4">

                            {/* Constantes Vitales card */}
                            <div className="bg-white rounded-xl border border-brand-600/10 shadow-sm p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Constantes Vitales</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 px-1 block">Tensión (S/D)</label>
                                        <div className="flex gap-2">
                                            <input type="number" placeholder="120" {...register('systolic')} className={inputClass} />
                                            <span className="self-center text-slate-300 font-bold">/</span>
                                            <input type="number" placeholder="80" {...register('diastolic')} className={inputClass} />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 px-1 block">Frec. Cardíaca</label>
                                        <div className="relative">
                                            <input type="number" placeholder="72" {...register('heartRate')} className={inputClass} />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">LPM</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 px-1 block">SatO2 (%)</label>
                                        <div className="relative">
                                            <input type="number" placeholder="98" {...register('satO2')} className={inputClass} />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 px-1 block">Temp. (ºC)</label>
                                        <div className="relative">
                                            <input type="number" step="0.1" placeholder="36.5" {...register('temp')} className={inputClass} />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">ºC</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 px-1 block">Peso (Kg)</label>
                                        <div className="relative">
                                            <input type="number" step="0.1" placeholder="70.5" {...register('weight')} className={inputClass} />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">Kg</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500 px-1 block">Altura (cm)</label>
                                        <div className="relative">
                                            <input type="number" step="1" placeholder="175" {...register('height')} className={inputClass} />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">cm</span>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Notas Administrativas card */}
                            <div className="bg-white rounded-xl border border-brand-600/10 shadow-sm p-6 opacity-80">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Notas Administrativas</h3>
                                    <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">Próximamente</span>
                                </div>
                                <textarea
                                    className="w-full min-h-[100px] bg-slate-100 border border-slate-200 rounded-xl p-4 text-sm resize-none cursor-not-allowed italic text-slate-400 placeholder:text-slate-400"
                                    disabled
                                    placeholder="Notas internas sobre facturación, seguros, autorizaciones..."
                                />
                                <p className="text-[10px] text-slate-400 italic mt-2">
                                    Estas notas no se incluirán en el informe clínico
                                </p>
                            </div>
                        </div>{/* end right column */}

                        {/* Mobile Save Button */}
                        <div className="lg:hidden col-span-1 pt-2 pb-6">
                            <button
                                type="button"
                                onClick={handleSubmit(onSubmit)}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-md"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                GUARDAR CONSULTA
                            </button>
                        </div>

                    </fieldset>
                </form>
            </div>

        </div>
    );
}
