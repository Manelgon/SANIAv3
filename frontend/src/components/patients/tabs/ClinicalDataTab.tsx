
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { X, AlertTriangle, Activity, ClipboardList, CheckCircle2 } from 'lucide-react';

interface ClinicalDataTabProps {
    patientId: string;
}

export function ClinicalDataTab({ patientId }: ClinicalDataTabProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [availableAllergies, setAvailableAllergies] = useState<any[]>([]);
    const [selectedAllergies, setSelectedAllergies] = useState<any[]>([]);
    const [showAllAllergies, setShowAllAllergies] = useState(false);

    const [availableHabits, setAvailableHabits] = useState<any[]>([]);
    const [selectedHabits, setSelectedHabits] = useState<any[]>([]);
    const [showAllHabits, setShowAllHabits] = useState(false);

    const [background, setBackground] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        const loadClinicalData = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch Catalogues (Allergies)
                const { data: catAllergies } = await supabase
                    .from('allergies_list')
                    .select('id, code, description, parent_id')
                    .order('description');

                if (catAllergies) {
                    const parents = catAllergies.filter((a: any) => !a.parent_id && a.code.startsWith('CAT'));
                    const parentMap = new Map(parents.map((p: any) => [p.id, p.description]));
                    const options = catAllergies
                        .filter((a: any) => a.parent_id)
                        .map((a: any) => ({
                            id: a.id,
                            label: a.description,
                            group: parentMap.get(a.parent_id) || 'Otros'
                        }));
                    setAvailableAllergies(options);
                }

                // 2. Fetch Catalogues (Habits)
                const { data: catHabits } = await supabase
                    .from('habits_list')
                    .select('id, code, description, category')
                    .order('description');

                if (catHabits) {
                    const options = catHabits.map((h: any) => ({
                        id: h.id,
                        label: h.description,
                        group: h.category || 'General'
                    }));
                    setAvailableHabits(options);
                }

                // 3. Fetch Patient Specific Data
                const { data: pAllergies } = await supabase
                    .from('patient_allergies')
                    .select('id, allergy_id, status, allergy:allergies_list(id, code, description)')
                    .eq('patient_id', patientId);

                if (pAllergies) {
                    setSelectedAllergies(pAllergies.map((pa: any) => ({
                        id: pa.allergy.id,
                        description: pa.allergy.description,
                        status: pa.status || 2
                    })));
                }

                const { data: pHabits } = await supabase
                    .from('patient_habits')
                    .select('id, habit_id, status, habit:habits_list(id, code, description)')
                    .eq('patient_id', patientId);

                if (pHabits) {
                    setSelectedHabits(pHabits.map((ph: any) => ({
                        id: ph.habit.id,
                        description: ph.habit.description,
                        status: ph.status || 1
                    })));
                }

                const { data: patient } = await (supabase
                    .from('patients') as any)
                    .select('background')
                    .eq('id', patientId)
                    .single();

                if (patient) setBackground((patient as any).background || '');

            } catch (err) {
                console.error("Error loading clinical data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (patientId) loadClinicalData();
    }, [patientId]);

    const handleAddAllergy = (allergyId: string) => {
        const item = availableAllergies.find(a => a.id === allergyId);
        if (item && !selectedAllergies.some(sa => sa.id === allergyId)) {
            setSelectedAllergies([...selectedAllergies, { ...item, status: 2 }]);
        }
    };

    const handleUpdateAllergyStatus = (id: string, status: number) => {
        setSelectedAllergies(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    const handleRemoveAllergy = (id: string) => {
        setSelectedAllergies(prev => prev.filter(a => a.id !== id));
    };

    const handleAddHabit = (habitId: string) => {
        const item = availableHabits.find(h => h.id === habitId);
        if (item && !selectedHabits.some(sh => sh.id === habitId)) {
            setSelectedHabits([...selectedHabits, { ...item, status: 1 }]);
        }
    };

    const handleUpdateHabitStatus = (id: string, status: number) => {
        setSelectedHabits(prev => prev.map(h => h.id === id ? { ...h, status } : h));
    };

    const handleRemoveHabit = (id: string) => {
        setSelectedHabits(prev => prev.filter(h => h.id !== id));
    };

    const onSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            // 1. Update Background
            await (supabase.from('patients') as any).update({ background }).eq('id', patientId);

            // 2. Handle Allergies (Sync)
            const { data: dbAllergies } = await (supabase.from('patient_allergies') as any).select('id, allergy_id').eq('patient_id', patientId);
            const dbIds = new Set(dbAllergies?.map((a: any) => a.allergy_id) || []);
            const selectedIds = new Set(selectedAllergies.map(a => a.id));

            // Insert new
            const toInsert = selectedAllergies.filter(a => !dbIds.has(a.id)).map(a => ({
                patient_id: patientId,
                allergy_id: a.id,
                status: a.status
            }));
            if (toInsert.length > 0) await (supabase.from('patient_allergies') as any).insert(toInsert);

            // Delete removed
            const toRemove = dbAllergies?.filter((a: any) => !selectedIds.has(a.allergy_id)).map((a: any) => a.id);
            if (toRemove && toRemove.length > 0) await (supabase.from('patient_allergies') as any).delete().in('id', toRemove);

            // Update statuses of existing
            for (const a of selectedAllergies) {
                if (dbIds.has(a.id)) {
                    await (supabase.from('patient_allergies') as any).update({ status: a.status }).eq('patient_id', patientId).eq('allergy_id', a.id);
                }
            }

            // 3. Handle Habits (Sync)
            const { data: dbHabits } = await (supabase.from('patient_habits') as any).select('id, habit_id').eq('patient_id', patientId);
            const dbHIds = new Set(dbHabits?.map((h: any) => h.habit_id) || []);
            const selectedHIds = new Set(selectedHabits.map(h => h.id));

            // Insert new
            const hToInsert = selectedHabits.filter(h => !dbHIds.has(h.id)).map(h => ({
                patient_id: patientId,
                habit_id: h.id,
                status: h.status
            }));
            if (hToInsert.length > 0) await (supabase.from('patient_habits') as any).insert(hToInsert);

            // Delete removed
            const hToRemove = dbHabits?.filter((h: any) => !selectedHIds.has(h.habit_id)).map((h: any) => h.id);
            if (hToRemove && hToRemove.length > 0) await (supabase.from('patient_habits') as any).delete().in('id', hToRemove);

            // Update statuses
            for (const h of selectedHabits) {
                if (dbHIds.has(h.id)) {
                    await (supabase.from('patient_habits') as any).update({ status: h.status }).eq('patient_id', patientId).eq('habit_id', h.id);
                }
            }

            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando datos clínicos...</div>;

    return (
        <div className="p-4 lg:p-8 space-y-8 animate-in fade-in duration-500 text-left">
            <div className="max-w-4xl space-y-8">

                {/* 1. Alergias */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <h3 className="text-lg font-bold text-gray-900">Alergias Conocidas</h3>
                    </div>

                    <SearchableSelect
                        options={availableAllergies}
                        onChange={(val) => val && handleAddAllergy(val as string)}
                        placeholder="-- Buscar y Añadir Alergia --"
                        value=""
                    />

                    {selectedAllergies.length > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {(showAllAllergies ? selectedAllergies : selectedAllergies.slice(0, 3)).map(a => (
                                    <div key={a.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm ${a.status === 2 ? 'bg-green-50 border-green-200 text-green-700' :
                                        a.status === 1 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                            'bg-red-50 border-red-200 text-red-700'
                                        }`}>
                                        <span>{a.label || a.description}</span>
                                        <div className="flex gap-1 ml-1 bg-white/50 p-0.5 rounded border border-black/5">
                                            <button type="button" onClick={() => handleUpdateAllergyStatus(a.id, 2)} className={`w-3 h-3 rounded-full border border-black/10 ${a.status === 2 ? 'bg-green-500' : 'bg-gray-200'}`} title="Confirmado" />
                                            <button type="button" onClick={() => handleUpdateAllergyStatus(a.id, 1)} className={`w-3 h-3 rounded-full border border-black/10 ${a.status === 1 ? 'bg-yellow-500' : 'bg-gray-200'}`} title="Pendiente" />
                                            <button type="button" onClick={() => handleUpdateAllergyStatus(a.id, 3)} className={`w-3 h-3 rounded-full border border-black/10 ${a.status === 3 ? 'bg-red-500' : 'bg-gray-200'}`} title="Inactivo" />
                                        </div>
                                        <button onClick={() => handleRemoveAllergy(a.id)} className="ml-1 hover:bg-black/10 rounded-full p-0.5"><X className="h-3 w-3" /></button>
                                    </div>
                                ))}
                            </div>
                            {selectedAllergies.length > 3 && (
                                <button onClick={() => setShowAllAllergies(!showAllAllergies)} className="text-[10px] font-bold text-brand-600 hover:underline">
                                    {showAllAllergies ? 'Ver menos' : `Ver más (${selectedAllergies.length - 3} restantes)`}
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* 2. Hábitos */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <Activity className="h-5 w-5 text-green-500" />
                        <h3 className="text-lg font-bold text-gray-900">Hábitos de Vida</h3>
                    </div>

                    <SearchableSelect
                        options={availableHabits}
                        onChange={(val) => val && handleAddHabit(val as string)}
                        placeholder="-- Buscar y Añadir Hábito --"
                        value=""
                    />

                    {selectedHabits.length > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {(showAllHabits ? selectedHabits : selectedHabits.slice(0, 3)).map(h => (
                                    <div key={h.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm ${h.status === 1 ? 'bg-green-50 border-green-200 text-green-700' :
                                        'bg-gray-50 border-gray-200 text-gray-500'
                                        }`}>
                                        <span>{h.label || h.description}</span>
                                        <div className="flex gap-1 ml-1 bg-white/50 p-0.5 rounded border border-black/5">
                                            <button type="button" onClick={() => handleUpdateHabitStatus(h.id, 1)} className={`w-3 h-3 rounded-full border border-black/10 ${h.status === 1 ? 'bg-green-500' : 'bg-gray-200'}`} title="Activo" />
                                            <button type="button" onClick={() => handleUpdateHabitStatus(h.id, 2)} className={`w-3 h-3 rounded-full border border-black/10 ${h.status === 2 ? 'bg-gray-400' : 'bg-gray-200'}`} title="Inactivo" />
                                        </div>
                                        <button onClick={() => handleRemoveHabit(h.id)} className="ml-1 hover:bg-black/10 rounded-full p-0.5"><X className="h-3 w-3" /></button>
                                    </div>
                                ))}
                            </div>
                            {selectedHabits.length > 3 && (
                                <button onClick={() => setShowAllHabits(!showAllHabits)} className="text-[10px] font-bold text-brand-600 hover:underline">
                                    {showAllHabits ? 'Ver menos' : `Ver más (${selectedHabits.length - 3} restantes)`}
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* 3. Antecedentes */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <ClipboardList className="h-5 w-5 text-blue-500" />
                        <h3 className="text-lg font-bold text-gray-900">Antecedentes Médicos</h3>
                    </div>
                    <textarea
                        className="w-full min-h-[120px] p-4 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                        placeholder="Escriba aquí cirugías, enfermedades crónicas, etc."
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                    />
                </section>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-4 pt-4 border-t">
                    {saveStatus === 'success' && (
                        <span className="flex items-center gap-1.5 text-green-600 font-bold text-xs animate-in fade-in slide-in-from-right-2">
                            <CheckCircle2 className="h-4 w-4" /> Guardado correctamente
                        </span>
                    )}
                    {saveStatus === 'error' && (
                        <span className="text-red-600 font-bold text-xs">Error al guardar</span>
                    )}
                    <Button
                        onClick={onSave}
                        disabled={isSaving}
                        className="bg-brand hover:bg-brand-600 text-gray-900 px-8 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                    >
                        {isSaving ? 'Guardando...' : 'Guardar Cambios Clínicos'}
                    </Button>
                </div>

            </div>
        </div>
    );
}
