import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { X, FolderOpen, Lock, UserCircle, MapPin, Activity } from 'lucide-react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { PHONE_PREFIXES, splitPhone } from '@/lib/constants';

const patientSchema = z.object({
    email: z.string().email('Email inválido').optional(),
    password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
    confirmPassword: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
    firstName: z.string().min(2, 'Nombre requerido'),
    lastName1: z.string().min(2, 'Primer apellido requerido'),
    lastName2: z.string().optional().refine(v => !v || v.length >= 2, 'Mínimo 2 caracteres'),
    dni: z.string().min(9, 'DNI/NIF inválido').max(9, 'DNI/NIF inválido'),
    phone: z.string().min(9, 'Teléfono requerido (mínimo 9 dígitos)'),
    emergencyPhone: z.string().optional(),
    birthDate: z.string().refine((date) => !date || new Date(date) < new Date(), 'Fecha inválida'),
    // insuredNumber is now auto-generated in backend
    addressStreet: z.string().optional(),
    addressLocality: z.string().min(1, 'Localidad requerida'),
    addressBlock: z.string().optional(),
    addressFloor: z.string().optional(),
    addressProvince: z.string().min(1, 'Provincia requerida'),
    bloodGroup: z.string().optional(),
    height: z.string().optional(),
    weight: z.string().optional(),
    background: z.string().optional(),
    habits: z.string().optional(),
    gender: z.string().min(1, 'Sexo requerido'),
}).refine((data) => {
    if (!data.password && !data.confirmPassword) return true;
    return data.password === data.confirmPassword;
}, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

type PatientFormValues = z.infer<typeof patientSchema>;

const PROVINCES = [
    { value: 'madrid', label: 'Madrid' },
    { value: 'barcelona', label: 'Barcelona' },
    { value: 'valencia', label: 'Valencia' },
    { value: 'sevilla', label: 'Sevilla' },
    // Add more as needed
];

const BLOOD_GROUPS = [
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
];

const GENDERS = [
    { value: 'hombre', label: 'Hombre' },
    { value: 'mujer', label: 'Mujer' },
    { value: 'otro', label: 'Otro' },
];

export function PatientForm({ onSuccess, onCancel, initialData, isEdit }: {
    onSuccess?: () => void,
    onCancel: () => void,
    initialData?: any,
    isEdit?: boolean
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [practitioners, setPractitioners] = useState<any[]>([]);
    const [portfolios, setPortfolios] = useState<any[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [selectedPractitionerId, setSelectedPractitionerId] = useState<string | null>(initialData?.practitioner_id || null);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(initialData?.portfolio_id || null);

    // Phone Prefix State
    const [phonePrefix, setPhonePrefix] = useState('+34');
    const [emergencyPhonePrefix, setEmergencyPhonePrefix] = useState('+34');

    // State for Allergies and Habits
    const [availableAllergies, setAvailableAllergies] = useState<any[]>([]);
    const [selectedAllergies, setSelectedAllergies] = useState<any[]>([]);
    const [showAllAllergies, setShowAllAllergies] = useState(false);

    const [availableHabits, setAvailableHabits] = useState<any[]>([]);
    const [selectedHabits, setSelectedHabits] = useState<any[]>([]);
    const [showAllHabits, setShowAllHabits] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema)
    });

    // Populate data for edit
    useEffect(() => {
        if (isEdit && initialData) {
            const p = splitPhone(initialData.phone);
            const ep = splitPhone(initialData.emergency_phone);
            setPhonePrefix(p.prefix);
            setEmergencyPhonePrefix(ep.prefix);

            reset({
                firstName: initialData.first_name,
                lastName1: initialData.last_name_1,
                lastName2: initialData.last_name_2 || '',
                dni: initialData.dni,
                phone: p.number,
                emergencyPhone: ep.number,
                birthDate: initialData.birth_date,
                addressStreet: initialData.address?.street || '',
                addressLocality: initialData.locality || initialData.address?.locality || '',
                addressBlock: initialData.address?.block || '',
                addressFloor: initialData.address?.floor || '',
                addressProvince: initialData.address?.province || '',
                bloodGroup: initialData.blood_group || '',
                gender: initialData.gender || '',
                height: initialData.height?.toString() || '',
                weight: initialData.weight?.toString() || '',
                background: initialData.background || '',
                habits: initialData.habits || '',
            });

            // We already initialized the state with these, but ensuring state is in sync
            if (initialData.practitioner_id) {
                setSelectedPractitionerId(initialData.practitioner_id);
            }
            if (initialData.portfolio_id) {
                setSelectedPortfolioId(initialData.portfolio_id);
            }
        }
    }, [isEdit, initialData, reset]);

    // 1. Initial Load: User Role & Context, and Allergies List
    useEffect(() => {
        const loadContext = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userData } = await supabase
                .from('users')
                .select('role, practitioner_id')
                .eq('id', user.id)
                .single() as { data: any, error: any };

            const role = userData?.role || 'patient';
            setCurrentUserRole(role);

            // Fetch Allergies Catalog with Hierarchy
            const { data: allergiesData } = await supabase
                .from('allergies_list')
                .select('id, code, description, parent_id')
                .order('description');

            if (allergiesData) {
                // Map to flat options with group property for SearchableSelect
                // First find parents to use as group labels
                const parents = allergiesData.filter((a: any) => !a.parent_id && a.code.startsWith('CAT'));
                const parentMap = new Map(parents.map((p: any) => [p.id, p.description]));

                const options = allergiesData
                    .filter((a: any) => a.parent_id) // Only show children as selectable options? Or both? Usually children.
                    .map((a: any) => ({
                        id: a.id,
                        label: a.description,
                        group: parentMap.get(a.parent_id) || 'Otros'
                    }));

                // Also add those that are not parents but have no parent (Uncategorized or Top-level items like maybe simple list)
                // But our seed data is strict.

                // Handle the "Frutos Secos" case (Level 2 hierarchy)
                // If an item is a child of a child-parent? 
                // SearchableSelect supports 1 level of grouping in the UI provided.
                // We will flatten the deep hierarchy into the main description or just let it be.

                setAvailableAllergies(options);
            }

            // Fetch Habits Catalog
            const { data: habitsData } = await supabase
                .from('habits_list')
                .select('id, code, description, category')
                .order('description');

            if (habitsData) {
                const options = habitsData.map((h: any) => ({
                    id: h.id,
                    label: h.description,
                    group: h.category || 'General' // Use category column as group
                }));
                setAvailableHabits(options);
            }

            // If Edit Mode, also fetch patient's existing allergies
            if (isEdit && initialData?.id) {
                const { data: currentAllergies } = await supabase
                    .from('patient_allergies')
                    .select(`
                        id,
                        allergy_id,
                        status,
                        allergy:allergies_list(id, code, description)
                    `)
                    .eq('patient_id', initialData.id);

                if (currentAllergies) {
                    const formatted = currentAllergies.map((pa: any) => ({
                        id: pa.allergy.id,
                        code: pa.allergy.code,
                        description: pa.allergy.description,
                        status: pa.status || 2 // Default to Confirmed if null
                    }));
                    setSelectedAllergies(formatted);
                }

                const { data: currentHabits } = await supabase
                    .from('patient_habits')
                    .select(`
                        id,
                        habit_id,
                        status,
                        habit:habits_list(id, code, description)
                    `)
                    .eq('patient_id', initialData.id);

                if (currentHabits) {
                    const formattedHabits = currentHabits.map((ph: any) => ({
                        id: ph.habit.id,
                        code: ph.habit.code,
                        description: ph.habit.description,
                        status: ph.status || 1 // Default to Active
                    }));
                    setSelectedHabits(formattedHabits);
                }
            }

            if (role === 'super_admin') {
                // Fetch all practitioners for dropdown
                const { data: practs } = await supabase
                    .from('practitioners')
                    .select('id, first_name, last_name_1, last_name_2')
                    .order('first_name');
                setPractitioners(practs || []);
            } else if (role === 'practitioner') {
                let pId = userData?.practitioner_id;

                // Fallback: If not in users table, check practitioners table directly
                if (!pId) {
                    const { data: pData } = await (supabase
                        .from('practitioners')
                        .select('id, first_name, last_name_1, last_name_2') // Fetch name details too
                        .eq('user_id', (user as any).id)
                        .single() as any);
                    pId = pData?.id;

                    if (pData) {
                        setPractitioners([pData]);
                    }
                } else {
                    // If we have the ID from userData, we still need the name details for the dropdown
                    const { data: pData } = await supabase
                        .from('practitioners')
                        .select('id, first_name, last_name_1, last_name_2')
                        .eq('id', pId)
                        .single();

                    if (pData) {
                        setPractitioners([pData]);
                    }
                }

                if (pId) {
                    setSelectedPractitionerId(pId);
                }
            }
        };
        loadContext();
    }, []);

    // 2. Fetch Portfolios when Practitioner is selected
    useEffect(() => {
        const loadPortfolios = async () => {
            if (!selectedPractitionerId) {
                setPortfolios([]);
                // Only clear if not in edit mode with initial data or if user manually clears it
                if (!isEdit) setSelectedPortfolioId(null);
                return;
            }

            const { data: ports } = await supabase
                .from('portfolios')
                .select('id, name')
                .eq('practitioner_id', selectedPractitionerId)
                .order('name');
            setPortfolios(ports || []);
        };
        loadPortfolios();
    }, [selectedPractitionerId, isEdit]);

    const handleAddAllergy = (allergyId: string) => {
        if (!allergyId) return;

        const allergyToAdd = availableAllergies.find(a => a.id === allergyId);
        if (allergyToAdd && !selectedAllergies.some(sa => sa.id === allergyId)) {
            setSelectedAllergies([...selectedAllergies, { ...allergyToAdd, status: 2 }]); // Default to Confirmed
        }
    };

    const handleUpdateAllergyStatus = (allergyId: string, newStatus: number) => {
        setSelectedAllergies(prev => prev.map(a =>
            a.id === allergyId ? { ...a, status: newStatus } : a
        ));
    };

    const handleRemoveAllergy = (allergyId: string) => {
        setSelectedAllergies(selectedAllergies.filter(a => a.id !== allergyId));
    };

    const handleAddHabit = (habitId: string) => {
        if (!habitId) return;

        const habitToAdd = availableHabits.find(h => h.id === habitId);
        if (habitToAdd && !selectedHabits.some(sh => sh.id === habitId)) {
            setSelectedHabits([...selectedHabits, { ...habitToAdd, status: 1 }]); // Default to Active
        }
    };

    const handleUpdateHabitStatus = (habitId: string, newStatus: number) => {
        setSelectedHabits(prev => prev.map(h =>
            h.id === habitId ? { ...h, status: newStatus } : h
        ));
    };

    const handleRemoveHabit = (habitId: string) => {
        setSelectedHabits(selectedHabits.filter(h => h.id !== habitId));
    };


    const onSubmit = async (data: PatientFormValues) => {
        if (!selectedPractitionerId) {
            alert("Debes asignar un facultativo");
            return;
        }

        if (!selectedPortfolioId) {
            alert("Debes asignar una cartera (portfolio)");
            return;
        }

        setIsLoading(true);

        try {
            const addressJson = {
                street: data.addressStreet,
                locality: data.addressLocality,
                block: data.addressBlock,
                floor: data.addressFloor,
                province: data.addressProvince
            };

            let patientId = initialData?.id;

            if (isEdit) {
                // UPDATE
                const updatePayload: any = {
                    address: addressJson,
                    locality: data.addressLocality,
                    blood_group: data.bloodGroup || null,
                    height: data.height ? Number(data.height) : null,
                    weight: data.weight ? Number(data.weight) : null,
                    background: data.background || null,
                    habits: data.habits || null,
                    phone: `${phonePrefix} ${data.phone}`,
                    emergency_phone: data.emergencyPhone ? `${emergencyPhonePrefix} ${data.emergencyPhone}` : null,
                    gender: data.gender,
                    portfolio_id: selectedPortfolioId,
                    updated_at: new Date().toISOString()
                };

                // Add identity fields ONLY if Superadmin
                if (currentUserRole === 'super_admin') {
                    updatePayload.first_name = data.firstName;
                    updatePayload.last_name_1 = data.lastName1;
                    updatePayload.last_name_2 = data.lastName2 || null;
                    updatePayload.dni = data.dni;
                    updatePayload.birth_date = data.birthDate;
                    updatePayload.practitioner_id = selectedPractitionerId;
                }

                const { error: updateError } = await (supabase
                    .from('patients') as any)
                    .update(updatePayload)
                    .eq('id', patientId);

                if (updateError) throw updateError;
            } else {
                // CREATE (Insert)
                // 1. Create Auth User (using temp client)
                const tempClient = createClient(
                    import.meta.env.VITE_SUPABASE_URL,
                    import.meta.env.VITE_SUPABASE_ANON_KEY,
                    {
                        auth: {
                            persistSession: false,
                            autoRefreshToken: false,
                            detectSessionInUrl: false
                        }
                    }
                );

                const { data: authData, error: authError } = await tempClient.auth.signUp({
                    email: data.email!,
                    password: data.password!,
                    options: {
                        data: {
                            role: 'patient',
                        }
                    }
                });

                if (authError) throw authError;
                if (!authData.user) throw new Error("No se pudo crear el usuario en Auth");

                const userId = authData.user.id;

                // Give a small moment for the trigger to sync the user to public.users
                await new Promise(resolve => setTimeout(resolve, 1000));

                const { data: newPatient, error: profileError } = await (supabase
                    .from('patients') as any)
                    .insert({
                        user_id: userId,
                        practitioner_id: selectedPractitionerId,
                        portfolio_id: selectedPortfolioId,
                        first_name: data.firstName,
                        last_name_1: data.lastName1,
                        last_name_2: data.lastName2 || null,
                        dni: data.dni,
                        address: addressJson,
                        locality: data.addressLocality,
                        birth_date: data.birthDate,
                        blood_group: data.bloodGroup || null,
                        height: data.height ? Number(data.height) : null,
                        weight: data.weight ? Number(data.weight) : null,
                        background: data.background || null,
                        habits: data.habits || null,
                        phone: `${phonePrefix} ${data.phone}`,
                        emergency_phone: data.emergencyPhone ? `${emergencyPhonePrefix} ${data.emergencyPhone}` : null,
                        gender: data.gender,
                    })
                    .select()
                    .single();

                if (profileError) {
                    throw new Error(`Usuario creado, pero error al guardar perfil: ${profileError.message || JSON.stringify(profileError)} (ID: ${userId})`);
                }

                patientId = newPatient.id;
            }

            // --- ALLERGIES SAVING LOGIC ---
            if (patientId) {
                // Get current DB allergies for this patient
                const { data: dbAllergies } = await (supabase
                    .from('patient_allergies') as any)
                    .select('id, allergy_id')
                    .eq('patient_id', patientId);

                const dbAllergyIds = new Set(dbAllergies?.map((a: any) => a.allergy_id) || []);
                const selectedIds = new Set(selectedAllergies.map(a => a.id));

                // A. Insert New
                const toInsert = selectedAllergies
                    .filter(a => !dbAllergyIds.has(a.id))
                    .map(a => ({
                        patient_id: patientId,
                        allergy_id: a.id,
                        status: a.status || 2,
                        practitioner_id: selectedPractitionerId
                    }));

                if (toInsert.length > 0) {
                    const { error: insertError } = await (supabase
                        .from('patient_allergies') as any)
                        .insert(toInsert);
                    if (insertError) console.error("Error saving allergies:", insertError);
                }

                // B. Delete Removed
                const toRemove = (dbAllergies || [])
                    .filter((a: any) => !selectedIds.has(a.allergy_id))
                    .map((a: any) => a.id);

                if (toRemove.length > 0) {
                    const { error: deleteError } = await (supabase
                        .from('patient_allergies') as any)
                        .delete()
                        .in('id', toRemove);
                    if (deleteError) console.error("Error removing unselected allergies:", deleteError);
                }
            }

            // --- HABITS SAVING LOGIC ---
            if (patientId) {
                // Get current DB habits for this patient
                const { data: dbHabits } = await (supabase
                    .from('patient_habits') as any)
                    .select('id, habit_id')
                    .eq('patient_id', patientId);

                const dbHabitIds = new Set(dbHabits?.map((h: any) => h.habit_id) || []);
                const selectedHabitIds = new Set(selectedHabits.map(h => h.id));

                // A. Insert New
                const habitsToInsert = selectedHabits
                    .filter(h => !dbHabitIds.has(h.id))
                    .map(h => ({
                        patient_id: patientId,
                        habit_id: h.id,
                        status: h.status || 1,
                        practitioner_id: selectedPractitionerId
                    }));

                if (habitsToInsert.length > 0) {
                    const { error: insertHabitError } = await (supabase
                        .from('patient_habits') as any)
                        .insert(habitsToInsert);
                    if (insertHabitError) console.error("Error saving habits:", insertHabitError);
                }

                // B. Delete Removed
                const habitsToRemove = (dbHabits || [])
                    .filter((h: any) => !selectedHabitIds.has(h.habit_id))
                    .map((h: any) => h.id);

                if (habitsToRemove.length > 0) {
                    const { error: deleteHabitError } = await (supabase
                        .from('patient_habits') as any)
                        .delete()
                        .in('id', habitsToRemove);
                    if (deleteHabitError) console.error("Error removing unselected habits:", deleteHabitError);
                }
            }

            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error("Error saving patient:", error);
            alert("Error: " + (error.message || "Error desconocido"));
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:opacity-50";
    const labelClass = "block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5";

    return (
        <form
            onSubmit={handleSubmit(onSubmit as any)}
            className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5"
        >

            {/* 0. Asignación */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                    <div className="size-9 rounded-lg bg-brand-600/10 flex items-center justify-center text-brand-600 shrink-0">
                        <FolderOpen className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider">Asignación de Facultativo</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentUserRole === 'super_admin' && (
                        <div>
                            <label className={labelClass}>Facultativo Responsable <span className="text-red-500">*</span></label>
                            <select
                                className={inputClass}
                                value={selectedPractitionerId || ''}
                                onChange={(e) => setSelectedPractitionerId(e.target.value)}
                            >
                                <option value="">-- Seleccionar Facultativo --</option>
                                {practitioners.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.first_name} {p.last_name_1} {p.last_name_2}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className={labelClass}>Cartera de Pacientes (Portfolio) <span className="text-red-500">*</span></label>
                        <select
                            className={inputClass}
                            value={selectedPortfolioId || ''}
                            onChange={(e) => setSelectedPortfolioId(e.target.value)}
                            disabled={!selectedPractitionerId || (isEdit && currentUserRole !== 'super_admin' && currentUserRole !== 'practitioner')}
                        >
                            <option value="">-- Seleccionar Cartera --</option>
                            {portfolios.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* 1. Datos de Acceso */}
            {!isEdit && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="size-9 rounded-lg bg-brand-600/10 flex items-center justify-center text-brand-600 shrink-0">
                            <Lock className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider">Datos de Acceso</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input id="email" label="Email" type="email" required error={errors.email?.message} {...register('email')} className={inputClass} />
                        <div className="space-y-1.5">
                            <label className={labelClass}>Contraseña <span className="text-red-500">*</span></label>
                            <input type="password" {...register('password')} className={inputClass} placeholder="••••••••" />
                            {errors.password?.message && <p className="text-xs text-red-500">{errors.password.message}</p>}
                        </div>
                        <div className="md:col-span-2 space-y-1.5">
                            <label className={labelClass}>Confirmar Contraseña <span className="text-red-500">*</span></label>
                            <input type="password" {...register('confirmPassword')} className={inputClass} placeholder="••••••••" />
                            {errors.confirmPassword?.message && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Datos Personales */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                    <div className="size-9 rounded-lg bg-brand-600/10 flex items-center justify-center text-brand-600 shrink-0">
                        <UserCircle className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider">Datos Personales</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input id="firstName" label="Nombre" required error={errors.firstName?.message} {...register('firstName')} disabled={isEdit && currentUserRole !== 'super_admin'} className={inputClass} />
                    <Input id="lastName1" label="Primer Apellido" required error={errors.lastName1?.message} {...register('lastName1')} disabled={isEdit && currentUserRole !== 'super_admin'} className={inputClass} />
                    <Input id="lastName2" label="Segundo Apellido" error={errors.lastName2?.message} {...register('lastName2')} disabled={isEdit && currentUserRole !== 'super_admin'} className={inputClass} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Input id="dni" label="DNI/NIF" placeholder="12345678X" required error={errors.dni?.message} {...register('dni')} disabled={isEdit && currentUserRole !== 'super_admin'} className={inputClass} />
                    <Input id="birthDate" label="Fecha de Nacimiento" type="date" required error={errors.birthDate?.message} {...register('birthDate')} disabled={isEdit && currentUserRole !== 'super_admin'} className={inputClass} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1.5">
                        <label className={labelClass}>Teléfono <span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                            <select className={`${inputClass} w-28 shrink-0`} value={phonePrefix} onChange={(e) => setPhonePrefix(e.target.value)}>
                                {PHONE_PREFIXES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                            <input {...register('phone')} placeholder="600000000" className={`${inputClass} flex-1`} />
                        </div>
                        {errors.phone?.message && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>Teléfono Emergencias</label>
                        <div className="flex gap-2">
                            <select className={`${inputClass} w-28 shrink-0`} value={emergencyPhonePrefix} onChange={(e) => setEmergencyPhonePrefix(e.target.value)}>
                                {PHONE_PREFIXES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                            <input {...register('emergencyPhone')} placeholder="Opcional" className={`${inputClass} flex-1`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Dirección Postal */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                    <div className="size-9 rounded-lg bg-brand-600/10 flex items-center justify-center text-brand-600 shrink-0">
                        <MapPin className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider">Dirección Postal</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6">
                        <Input id="addressStreet" label="Calle/Vía" placeholder="Ej: Calle Mayor" {...register('addressStreet')} className={inputClass} />
                    </div>
                    <div className="md:col-span-3">
                        <Input id="addressBlock" label="Bloque/Nº" {...register('addressBlock')} className={inputClass} />
                    </div>
                    <div className="md:col-span-3">
                        <Input id="addressFloor" label="Piso/Puerta" {...register('addressFloor')} className={inputClass} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Input id="addressLocality" label="Localidad" required placeholder="Ej: San Sebastián" error={errors.addressLocality?.message} {...register('addressLocality')} className={inputClass} />
                    <Select id="province" label="Provincia" required options={PROVINCES} error={errors.addressProvince?.message} {...register('addressProvince')} className={inputClass} />
                </div>
            </div>

            {/* 4. Datos Clínicos */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                    <div className="size-9 rounded-lg bg-brand-600/10 flex items-center justify-center text-brand-600 shrink-0">
                        <Activity className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-brand-600 uppercase tracking-wider">Datos Clínicos</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select id="bloodGroup" label="Grupo Sanguíneo" options={BLOOD_GROUPS} error={errors.bloodGroup?.message} {...register('bloodGroup')} className={inputClass} />
                    <Select id="gender" label="Sexo" options={GENDERS} error={errors.gender?.message} {...register('gender')} className={inputClass} />
                    <Input id="height" label="Altura (cm)" type="number" placeholder="Ej: 175" error={errors.height?.message} {...register('height')} className={inputClass} />
                    <Input id="weight" label="Peso (kg)" type="number" step="0.1" placeholder="Ej: 70.5" error={errors.weight?.message} {...register('weight')} className={inputClass} />
                </div>

                <div className="space-y-2 mt-4">
                    <label className={labelClass}>Alergias Conocidas</label>

                    <SearchableSelect
                        options={availableAllergies}
                        onChange={(val) => {
                            if (val && typeof val === 'string') handleAddAllergy(val);
                        }}
                        placeholder="-- Buscar y Añadir Alergia --"
                        className="mb-2"
                        value=""
                    />

                    <div className="flex flex-wrap gap-2 mt-2">
                        {selectedAllergies.length > 0 && (
                            <div className="flex flex-col w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="flex flex-wrap gap-2">
                                    {(showAllAllergies ? selectedAllergies : selectedAllergies.slice(0, 3)).map(a => (
                                        <div key={a.id} className={`inline-flex items-center gap-2 border px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${a.status === 2 ? 'bg-brand-50 border-brand-200 text-brand-800' :
                                            a.status === 1 ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                                'bg-red-50 border-red-200 text-red-800'
                                            }`}>
                                            <span className="mr-1">{a.label || a.description}</span>

                                            {/* Status Toggles */}
                                            <div className="flex gap-1 ml-1 bg-white/60 rounded px-1 py-0.5 border border-black/5">
                                                <button type="button" onClick={() => handleUpdateAllergyStatus(a.id, 2)} className={`w-3 h-3 rounded-full border border-black/10 transition-transform hover:scale-110 ${a.status === 2 ? 'bg-brand-600 ring-1 ring-brand-300' : 'bg-slate-200 hover:bg-brand-200'}`} title="Confirmado" />
                                                <button type="button" onClick={() => handleUpdateAllergyStatus(a.id, 1)} className={`w-3 h-3 rounded-full border border-black/10 transition-transform hover:scale-110 ${a.status === 1 ? 'bg-amber-500 ring-1 ring-amber-300' : 'bg-slate-200 hover:bg-amber-200'}`} title="Pendiente" />
                                                <button type="button" onClick={() => handleUpdateAllergyStatus(a.id, 3)} className={`w-3 h-3 rounded-full border border-black/10 transition-transform hover:scale-110 ${a.status === 3 ? 'bg-red-500 ring-1 ring-red-300' : 'bg-gray-200 hover:bg-red-200'}`} title="Inactivo" />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAllergy(a.id)}
                                                className="hover:bg-black/10 rounded-full p-0.5 transition-colors ml-1 text-inherit"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {selectedAllergies.length > 3 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllAllergies(!showAllAllergies)}
                                        className="self-start mt-2 text-xs font-bold text-brand-600 hover:text-brand-700"
                                    >
                                        {showAllAllergies ? 'Ver menos' : `Ver más (${selectedAllergies.length - 3} restantes)`}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 mt-4">
                        <div>
                            <label className={labelClass}>Antecedentes Médicos</label>
                            <textarea
                                className={`${inputClass} min-h-[80px] resize-none`}
                                rows={3}
                                placeholder="Cirugías previas, enfermedades crónicas..."
                                {...register('background')}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Hábitos del Paciente</label>
                            <SearchableSelect
                                options={availableHabits}
                                onChange={(val) => {
                                    if (val && typeof val === 'string') handleAddHabit(val);
                                }}
                                placeholder="-- Buscar y Añadir Hábito (Tabaco, Alcohol...) --"
                                className="mb-2"
                                value=""
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {selectedHabits.length > 0 && (
                                    <div className="flex flex-col w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <div className="flex flex-wrap gap-2">
                                            {(showAllHabits ? selectedHabits : selectedHabits.slice(0, 3)).map(h => (
                                                <div
                                                    key={h.id}
                                                    className={`inline-flex items-center gap-2 border px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${h.status === 1 ? 'bg-brand-50 border-brand-200 text-brand-800' : 'bg-slate-100 border-slate-300 text-slate-700'
                                                        }`}
                                                >
                                                    <span className="mr-1">{h.label || h.description}</span>

                                                    <div className="flex gap-1 ml-1 bg-white/60 rounded px-1 py-0.5 border border-black/5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateHabitStatus(h.id, 1)}
                                                            className={`w-3 h-3 rounded-full border border-black/10 transition-transform hover:scale-110 ${h.status === 1 ? 'bg-brand-600 ring-1 ring-brand-300' : 'bg-slate-200 hover:bg-brand-200'}`}
                                                            title="Activo"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateHabitStatus(h.id, 2)}
                                                            className={`w-3 h-3 rounded-full border border-black/10 transition-transform hover:scale-110 ${h.status === 2 ? 'bg-slate-500 ring-1 ring-slate-400' : 'bg-slate-200 hover:bg-slate-300'}`}
                                                            title="Ex-hábito / Inactivo"
                                                        />
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveHabit(h.id)}
                                                        className="hover:bg-black/10 rounded-full p-0.5 transition-colors ml-1 text-inherit"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {selectedHabits.length > 3 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowAllHabits(!showAllHabits)}
                                                className="self-start mt-2 text-xs font-bold text-brand-600 hover:text-brand-700"
                                            >
                                                {showAllHabits ? 'Ver menos' : `Ver más (${selectedHabits.length - 3} restantes)`}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions — estilo Stitch / Detalle de Consulta */}
            <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl lg:col-span-2">
                <Button type="button" variant="outline" onClick={onCancel} className="border-slate-200 text-slate-700 hover:bg-slate-100">
                    Cancelar
                </Button>
                <Button type="submit" isLoading={isLoading} className="bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md">
                    {isEdit ? 'Actualizar Información' : 'Registrar Paciente'}
                </Button>
            </div>
        </form>
    );
}
