
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const patientSchema = z.object({
    email: z.string().email('Email inválido').optional(),
    password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
    confirmPassword: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
    firstName: z.string().min(2, 'Nombre requerido'),
    lastName1: z.string().min(2, 'Primer apellido requerido'),
    lastName2: z.string().optional().refine(v => !v || v.length >= 2, 'Mínimo 2 caracteres'),
    dni: z.string().min(9, 'DNI/NIF inválido').max(9, 'DNI/NIF inválido'),
    birthDate: z.string().refine((date) => !date || new Date(date) < new Date(), 'Fecha inválida'),
    // insuredNumber is now auto-generated in backend
    addressStreet: z.string().optional(),
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

    const { register, handleSubmit, reset, formState: { errors } } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema)
    });

    // Populate data for edit
    useEffect(() => {
        if (isEdit && initialData) {
            reset({
                firstName: initialData.first_name,
                lastName1: initialData.last_name_1,
                lastName2: initialData.last_name_2 || '',
                dni: initialData.dni,
                birthDate: initialData.birth_date,
                addressStreet: initialData.address?.street || '',
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

    // 1. Initial Load: User Role & Context
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

            // If we are in edit mode and the current selectedPortfolioId is the same as initialData,
            // we don't want to reset it.
        };
        loadPortfolios();
    }, [selectedPractitionerId, isEdit]);


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
                block: data.addressBlock,
                floor: data.addressFloor,
                province: data.addressProvince
            };

            if (isEdit) {
                // UPDATE
                const updatePayload: any = {
                    address: addressJson,
                    blood_group: data.bloodGroup || null,
                    height: data.height ? Number(data.height) : null,
                    weight: data.weight ? Number(data.weight) : null,
                    background: data.background || null,
                    habits: data.habits || null,
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
                    .eq('id', (initialData as any).id);

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

                const { error: profileError } = await (supabase
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
                        birth_date: data.birthDate,
                        blood_group: data.bloodGroup || null,
                        height: data.height ? Number(data.height) : null,
                        weight: data.weight ? Number(data.weight) : null,
                        background: data.background || null,
                        habits: data.habits || null,
                        gender: data.gender,
                    });

                if (profileError) {
                    throw new Error(`Usuario creado, pero error al guardar perfil: ${profileError.message || JSON.stringify(profileError)} (ID: ${userId})`);
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

    return (
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 max-h-[80vh] overflow-y-auto p-1">

            {/* 0. Datos del Facultativo (Top Section) */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-brand-600 border-b pb-2">Asignación de Facultativo</h3>
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4`}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Facultativo Responsable <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-70 disabled:bg-gray-100 disabled:text-gray-500"
                            value={selectedPractitionerId || ''}
                            onChange={(e) => setSelectedPractitionerId(e.target.value)}
                            disabled={currentUserRole !== 'super_admin'}
                        >
                            <option value="">-- Seleccionar Facultativo --</option>
                            {practitioners.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.first_name} {p.last_name_1} {p.last_name_2}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cartera de Pacientes (Portfolio) <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:bg-gray-100"
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
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Datos de Acceso</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input id="email" label="Email" type="email" required error={errors.email?.message} {...register('email')} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input id="password" label="Contraseña" type="password" required error={errors.password?.message} {...register('password')} />
                        <Input id="confirmPassword" label="Confirmar Contraseña" type="password" required error={errors.confirmPassword?.message} {...register('confirmPassword')} />
                    </div>
                </div>
            )}

            {/* 2. Datos Personales */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Datos Personales</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input id="firstName" label="Nombre" required error={errors.firstName?.message} {...register('firstName')} disabled={isEdit && currentUserRole !== 'super_admin'} />
                    <Input id="lastName1" label="Primer Apellido" required error={errors.lastName1?.message} {...register('lastName1')} disabled={isEdit && currentUserRole !== 'super_admin'} />
                    <Input id="lastName2" label="Segundo Apellido" required error={errors.lastName2?.message} {...register('lastName2')} disabled={isEdit && currentUserRole !== 'super_admin'} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input id="dni" label="DNI/NIF" placeholder="12345678X" required error={errors.dni?.message} {...register('dni')} disabled={isEdit && currentUserRole !== 'super_admin'} />
                    <Input id="birthDate" label="Fecha de Nacimiento" type="date" required error={errors.birthDate?.message} {...register('birthDate')} disabled={isEdit && currentUserRole !== 'super_admin'} />
                </div>
            </div>

            {/* 3. Dirección */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Dirección Postal</h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6">
                        <Input id="addressStreet" label="Calle/Vía" placeholder="Ej: Calle Mayor" {...register('addressStreet')} />
                    </div>
                    <div className="md:col-span-3">
                        <Input id="addressBlock" label="Bloque/Nº" {...register('addressBlock')} />
                    </div>
                    <div className="md:col-span-3">
                        <Input id="addressFloor" label="Piso/Puerta" {...register('addressFloor')} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select id="province" label="Provincia" required options={PROVINCES} error={errors.addressProvince?.message} {...register('addressProvince')} />
                </div>
            </div>

            {/* 4. Datos Clínicos */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Datos Clínicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select id="bloodGroup" label="Grupo Sanguíneo" options={BLOOD_GROUPS} error={errors.bloodGroup?.message} {...register('bloodGroup')} />
                    <Select id="gender" label="Sexo" options={GENDERS} error={errors.gender?.message} {...register('gender')} />
                    <Input id="height" label="Altura (cm)" type="number" placeholder="Ej: 175" error={errors.height?.message} {...register('height')} />
                    <Input id="weight" label="Peso (kg)" type="number" step="0.1" placeholder="Ej: 70.5" error={errors.weight?.message} {...register('weight')} />
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Antecedentes Médicos</label>
                        <textarea
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                            rows={3}
                            placeholder="Alergias, cirugías previas, enfermedades crónicas..."
                            {...register('background')}
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hábitos de Vida</label>
                        <textarea
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-brand-500"
                            rows={3}
                            placeholder="Tabaquismo, alcohol, ejercicio, dieta..."
                            {...register('habits')}
                        ></textarea>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" isLoading={isLoading}>
                    {isEdit ? 'Actualizar Información' : 'Registrar Paciente'}
                </Button>
            </div>
        </form>
    );
}
