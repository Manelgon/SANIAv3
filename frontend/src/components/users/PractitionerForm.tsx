
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { FileText, Upload, X } from 'lucide-react';

const practitionerSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Mínimo 6 caracteres'),
    firstName: z.string().min(2, 'Nombre requerido'),
    lastName1: z.string().min(2, 'Primer apellido requerido'),
    lastName2: z.string().optional(),
    dni: z.string().min(9, 'DNI/NIF inválido').max(9, 'DNI/NIF inválido'),
    birthDate: z.string().refine((date) => new Date(date) < new Date(), 'Fecha inválida'),
    licenseNumber: z.string().min(1, 'Número de colegiado requerido'),
    specialty: z.string().min(1, 'Especialidad requerida'),
    bio: z.string().optional(),
    addressStreet: z.string().optional(),
    addressBlock: z.string().optional(),
    addressFloor: z.string().optional(),
    addressProvince: z.string().min(1, 'Provincia requerida'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

type PractitionerFormValues = z.infer<typeof practitionerSchema>;

const PROVINCES = [
    { value: 'madrid', label: 'Madrid' },
    { value: 'barcelona', label: 'Barcelona' },
    { value: 'valencia', label: 'Valencia' },
    { value: 'sevilla', label: 'Sevilla' },
    // Add more as needed
];



export function PractitionerForm({ onSuccess, onCancel }: { onSuccess?: () => void, onCancel: () => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<{ file: File; category: string }[]>([]);

    const { register, handleSubmit, formState: { errors } } = useForm<PractitionerFormValues>({
        resolver: zodResolver(practitionerSchema)
    });
    const [specialties, setSpecialties] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        async function fetchSpecialties() {
            try {
                const { data, error } = await (supabase
                    .from('specialties') as any)
                    .select('name')
                    .order('name');

                if (error) {
                    console.error('Error fetching specialties:', error);
                    return;
                }

                if (data) {
                    setSpecialties(data.map((s: any) => ({ value: s.name, label: s.name })));
                }
            } catch (err) {
                console.error('Unexpected error fetching specialties:', err);
            }
        }

        fetchSpecialties();
    }, []);

    const onSubmit = async (data: PractitionerFormValues) => {
        setIsLoading(true);

        try {
            // 1. Create Auth User (using temp client to avoid admin logout)
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
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        role: 'practitioner',
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("No se pudo crear el usuario en Auth");

            const userId = authData.user.id;

            // 2. Insert into public.practitioners (using Admin session)
            const addressJson = {
                street: data.addressStreet,
                block: data.addressBlock,
                floor: data.addressFloor,
                province: data.addressProvince
            };

            const { error: profileError } = await (supabase
                .from('practitioners') as any)
                .insert({
                    user_id: userId,
                    first_name: data.firstName,
                    last_name_1: data.lastName1,
                    last_name_2: data.lastName2 || null,
                    dni: data.dni,
                    address: addressJson,
                    license_number: data.licenseNumber,
                    specialty: data.specialty,
                    bio: data.bio || null,
                    birth_date: data.birthDate,
                });

            if (profileError) {
                console.error("Profile creation error:", profileError);
                throw new Error("Usuario creado, pero error al guardar perfil: " + profileError.message);
            }

            // 3. Upload Documents if any
            if (selectedFiles.length > 0) {
                // Get the practitioner id we just created
                const { data: pData } = await (supabase
                    .from('practitioners') as any)
                    .select('id')
                    .eq('user_id', userId)
                    .single();

                const practitionerId = pData?.id;

                if (practitionerId) {
                    for (const { file, category } of selectedFiles) {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${practitionerId}/${Math.random()}.${fileExt}`;
                        const filePath = `documents/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                            .from('practitioner-documents')
                            .upload(filePath, file);

                        if (!uploadError) {
                            const { data: urlData } = supabase.storage
                                .from('practitioner-documents')
                                .getPublicUrl(filePath);

                            await (supabase.from('practitioner_documents') as any).insert({
                                practitioner_id: practitionerId,
                                name: file.name,
                                url: urlData.publicUrl,
                                type: file.type,
                                category: category
                            });
                        }
                    }
                }
            }

            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error("Error creating practitioner:", error);
            alert("Error: " + (error.message || "Error desconocido"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto p-1">

            {/* 1. Datos de Acceso */}
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

            {/* 2. Datos Personales */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Datos Personales</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input id="firstName" label="Nombre" required error={errors.firstName?.message} {...register('firstName')} />
                    <Input id="lastName1" label="Primer Apellido" required error={errors.lastName1?.message} {...register('lastName1')} />
                    <Input id="lastName2" label="Segundo Apellido" error={errors.lastName2?.message} {...register('lastName2')} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input id="dni" label="DNI/NIF" placeholder="12345678X" required error={errors.dni?.message} {...register('dni')} />
                    <Input id="birthDate" label="Fecha de Nacimiento" type="date" required error={errors.birthDate?.message} {...register('birthDate')} />
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

            {/* 4. Datos Profesionales */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Datos Profesionales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input id="licenseNumber" label="Número de Colegiado" required error={errors.licenseNumber?.message} {...register('licenseNumber')} />
                    <Select id="specialty" label="Especialidad" required options={specialties} error={errors.specialty?.message} {...register('specialty')} />
                </div>
                <div>
                    <label htmlFor="bio" className="text-sm font-medium text-black">Resumen Curricular</label>
                    <textarea
                        id="bio"
                        className="flex min-h-[80px] w-full rounded-md border border-black bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                        {...register('bio')}
                    />
                </div>
            </div>

            {/* 5. Documentación Profesional */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-medium text-gray-900">Documentación Profesional</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Expediente facultativo</span>
                    </div>
                </div>

                <div className="bg-gray-50/50 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-300 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white shadow-sm border border-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                <Upload className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">Adjuntar archivos</p>
                                <p className="text-[11px] text-gray-500 font-medium leading-tight">Títulos, licencias médicas o seguros</p>
                            </div>
                        </div>

                        <input
                            type="file"
                            id="file-upload"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                const newFiles = files.map(f => ({ file: f, category: 'other' }));
                                setSelectedFiles([...selectedFiles, ...newFiles]);
                            }}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 px-4 text-[10px] font-black uppercase tracking-widest border-gray-200 shadow-sm whitespace-nowrap"
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            Seleccionar
                        </Button>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                            {selectedFiles.map((f, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm group/file">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="h-7 w-7 bg-brand-50 text-brand-600 rounded flex items-center justify-center shrink-0">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 truncate max-w-[200px]">{f.file.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            className="text-[10px] font-bold uppercase tracking-wider border-none bg-gray-50 rounded px-2 py-1 outline-none ring-0 focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
                                            value={f.category}
                                            onChange={(e) => {
                                                const updated = [...selectedFiles];
                                                updated[idx].category = e.target.value;
                                                setSelectedFiles(updated);
                                            }}
                                        >
                                            <option value="diploma">Título/Diploma</option>
                                            <option value="medical_license">Licencia Médica</option>
                                            <option value="insurance">Seguro R.C.</option>
                                            <option value="signature_stamp">Firma/Sello</option>
                                            <option value="other">Otro</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit" isLoading={isLoading}>Registrar Facultativo</Button>
            </div>
        </form>
    );
}
