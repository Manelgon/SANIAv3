import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertCircle } from 'lucide-react';

// Validation Schema
const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const navigate = useNavigate();
    const setSession = useAuthStore((state) => state.setSession);
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        setAuthError(null);

        try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) throw error;
            if (authData.session) {
                await setSession(authData.session);
                // Redirect logic will be handled by role check or simple redirect for now
                // We can force a fetch of role here to be sure

                const { data: userRole } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', authData.session.user.id)
                    .single();

                // Helper interface for type safety
                interface RoleData { role: string }
                const role = ((userRole as unknown) as RoleData)?.role;

                if (role === 'super_admin') {
                    navigate('/admin/users');
                } else if (role === 'practitioner') {
                    navigate('/dashboard');
                } else if (role === 'patient') {
                    navigate('/portal');
                } else {
                    navigate('/');
                }
            }
        } catch (error: any) {
            setAuthError(error.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-brand-900">SanIA</h1>
                    <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                        Iniciar Sesión
                    </h2>
                    <p className="text-sm text-gray-500">
                        Ingresa tus credenciales para acceder al sistema
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <Input
                            id="email"
                            label="Correo Electrónico"
                            type="email"
                            placeholder="nombre@ejemplo.com"
                            error={errors.email?.message}
                            {...register('email')}
                        />
                        <Input
                            id="password"
                            label="Contraseña"
                            type="password"
                            placeholder="••••••••"
                            error={errors.password?.message}
                            {...register('password')}
                        />
                    </div>

                    {authError && (
                        <div className="flex items-center gap-2 p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-md">
                            <AlertCircle className="h-4 w-4" />
                            <p>{authError}</p>
                        </div>
                    )}

                    <Button type="submit" className="w-full" isLoading={isLoading}>
                        Entrar
                    </Button>
                </form>
            </div>
        </div>
    );
}
