import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Loader2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
                .select('id, fid')
                .eq('user_id', user.id)
                .single();

            if (practError) throw new Error('No se encontró el perfil del facultativo');

            const { data: patient, error: patError } = await supabase
                .from('patients')
                .select('portfolio_id, cip')
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

    const inputClass = "w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-500 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500 bg-gray-50/50">
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
                <form className="max-w-[1600px] mx-auto space-y-6">

                    {/* Header Minimal */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-gray-800">
                                {activeConsultation ? 'Consulta en Curso' : 'Registro Clínico'}
                            </h2>
                            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                {new Date().toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isLoading} className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm">
                                {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                Guardar Consulta
                            </Button>
                        </div>
                    </div>

                    <fieldset disabled={isLoading} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch contents">
                        {/* ROW 1: Diagnosis Search & Motivo (3/4) | Selected List (1/4) */}
                        <div className="col-span-1 md:col-span-3 flex flex-col space-y-4">
                            {/* Diagnosis Search (Top) */}
                            <div className="space-y-2 relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Diagnóstico (CIE-10)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full p-4 pl-10 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                                        placeholder="Buscar diagnóstico por código o nombre..."
                                        autoComplete="off"
                                        {...register('diagnosisSearch')}
                                        onFocus={() => diagnosisResults.length > 0 && setShowResults(true)}
                                    />
                                    <div className="absolute left-3 top-4 text-gray-400">
                                        {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                    </div>

                                    {/* Search Results Dropdown */}
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
                            </div>

                            {/* Motivo (Bottom) */}
                            <div className="space-y-2 flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Motivo de Consulta</label>
                                <textarea
                                    className="flex-1 w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all min-h-[140px] resize-none font-medium text-lg"
                                    placeholder="Describa el motivo principal de la visita..."
                                    {...register('motivo')}
                                />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-1 flex flex-col space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Diagnósticos Seleccionados</label>
                            <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[220px] max-h-[220px]">
                                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                    {selectedDiagnoses.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-gray-300 text-xs font-medium uppercase tracking-widest text-center px-4">
                                            Añada diagnósticos desde el buscador
                                        </div>
                                    ) : (
                                        selectedDiagnoses.map((diag) => {
                                            const isInactive = diag.existingStatus === 3;
                                            const isSelected = diag.isPending;
                                            const isExisting = !!diag.existingStatus;
                                            const isActive = isExisting && !isInactive;

                                            let bgColor = "bg-gray-50/50 border-gray-100";
                                            let textColor = "text-gray-500";
                                            let label = "P";
                                            let labelColor = "text-gray-400";
                                            let codeColor = "text-gray-400";
                                            let subText = "Nuevo diagnóstico";

                                            if (isInactive) {
                                                label = "I";
                                                subText = "Inactivo anteriormente";
                                                if (isSelected) { // Activating
                                                    bgColor = "bg-green-50 border-green-100";
                                                    textColor = "text-green-700";
                                                    labelColor = "text-green-600";
                                                    codeColor = "text-green-600";
                                                    label = "A";
                                                    subText = "Se activará en esta consulta";
                                                } else {
                                                    bgColor = "bg-red-50 border-red-100";
                                                    textColor = "text-red-700 text-opacity-70";
                                                    labelColor = "text-red-400";
                                                    codeColor = "text-red-400";
                                                }
                                            } else if (isActive) {
                                                label = "A";
                                                subText = "Ya activo para este paciente";
                                                if (isSelected) { // Stays Active
                                                    bgColor = "bg-green-50 border-green-100";
                                                    textColor = "text-green-700";
                                                    labelColor = "text-green-600";
                                                    codeColor = "text-green-600";
                                                } else { // Deactivating/Resolving
                                                    bgColor = "bg-red-50 border-red-100";
                                                    textColor = "text-red-700 text-opacity-50";
                                                    labelColor = "text-red-600";
                                                    codeColor = "text-red-400";
                                                    label = "R";
                                                    subText = "Se marcará como resuelto";
                                                }
                                            } else { // New
                                                if (!isSelected) { // Confirmed (Default)
                                                    bgColor = "bg-green-50 border-green-100";
                                                    textColor = "text-green-700";
                                                    labelColor = "text-green-600";
                                                    codeColor = "text-green-600";
                                                    label = "A";
                                                    subText = "Nuevo diagnóstico activo";
                                                } else { // Pending
                                                    bgColor = "bg-gray-50 border-gray-100";
                                                    textColor = "text-gray-500";
                                                    labelColor = "text-gray-400";
                                                    codeColor = "text-gray-400";
                                                    label = "P";
                                                    subText = "Pendiente de confirmar";
                                                }
                                            }

                                            return (
                                                <div key={diag.code} className={`flex items-center justify-between p-3 border rounded-xl animate-in fade-in duration-200 group ${bgColor}`}>
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center border font-black text-xs shrink-0 ${labelColor} bg-white shadow-sm`}>
                                                            {label}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${codeColor}`}>
                                                                    {diag.code}
                                                                </span>
                                                                <h4 className={`text-sm font-bold truncate ${textColor}`}>
                                                                    {diag.description}
                                                                </h4>
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{subText}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-3">
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
                                                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
                        </div>


                        {/* ROW 2: Exploration (3/4) | Vitals (1/4) */}
                        <div className="col-span-1 md:col-span-3 flex flex-col space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Exploración Física</label>
                            <textarea
                                className="flex-1 w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all min-h-[200px]"
                                placeholder="Hallazgos..."
                                {...register('exploracion')}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-1 flex flex-col space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Constantes Vitales</label>
                            <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 flex flex-col justify-center">

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Tensión Arterial (mmHg)</label>
                                        <div className="flex gap-2">
                                            <input type="number" placeholder="Sys" {...register('systolic')} className={inputClass} />
                                            <span className="self-center text-gray-400 font-bold">/</span>
                                            <input type="number" placeholder="Dia" {...register('diastolic')} className={inputClass} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">F. Cardíaca (lpm)</label>
                                        <input type="number" {...register('heartRate')} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">SatO2 (%)</label>
                                        <input type="number" {...register('satO2')} className={inputClass} />
                                    </div>

                                    <div>
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Temp (ºC)</label>
                                        <input type="number" step="0.1" {...register('temp')} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Peso (kg)</label>
                                        <input type="number" step="0.1" {...register('weight')} className={inputClass} />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Altura (cm)</label>
                                        <input type="number" step="1" {...register('height')} className={inputClass} />
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* ROW 3: Aproximacion (3/4) | Empty (1/4) */}
                        <div className="col-span-1 md:col-span-3 space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Aproximación Diagnóstica</label>
                            <textarea
                                className="w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all min-h-[100px]"
                                placeholder="Impresión clínica..."
                                {...register('aproximacion')}
                            />
                        </div>
                        <div className="hidden md:block col-span-1">
                            {/* Empty space only visible on desktop to maintain grid alignment */}
                        </div>


                        {/* ROW 4: Treatment (Full width) */}
                        <div className="col-span-1 md:col-span-4 space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Plan / Tratamiento</label>
                            <textarea
                                className="w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all min-h-[120px]"
                                placeholder="Tratamiento y recomendaciones..."
                                {...register('tratamiento')}
                            />
                        </div>

                    </fieldset>
                </form>
            </div>
        </div>
    );
}
