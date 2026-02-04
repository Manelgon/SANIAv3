import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// Validation Schema
const updatePasswordSchema = z.object({
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordPage() {
    const navigate = useNavigate();
    const setSession = useAuthStore((state) => state.setSession);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Ensure we have a session (handled by the link click usually, but good to check)
    useEffect(() => {
        // Upon clicking the email link, Supabase sets the session in local storage
        // and redirects to this page with the hash fragment containing the access token.
        // The Supabase client automatically handles this and restores the session.
        //However, we should verify specific event types if we want to be strict.

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If no session, perhaps the link is invalid or expired
                setMessage({ type: 'error', text: 'El enlace de recuperación es inválido o ha expirado.' });
            }
        };
        checkSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // This is the specific event for password recovery flow
            }
            if (session) {
                setSession(session);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [setSession]);


    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<UpdatePasswordFormValues>({
        resolver: zodResolver(updatePasswordSchema),
    });

    const onSubmit = async (data: UpdatePasswordFormValues) => {
        setIsLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: data.password
            });

            if (error) throw error;

            setMessage({
                type: 'success',
                text: 'Tu contraseña ha sido actualizada correctamente. Redirigiendo...'
            });

            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.message || 'Error al actualizar la contraseña'
            });
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
                        Restablecer Contraseña
                    </h2>
                    <p className="text-sm text-gray-500">
                        Ingresa tu nueva contraseña a continuación
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <Input
                            id="password"
                            label="Nueva Contraseña"
                            type="password"
                            placeholder="••••••••"
                            error={errors.password?.message}
                            {...register('password')}
                        />
                        <Input
                            id="confirmPassword"
                            label="Confirmar Contraseña"
                            type="password"
                            placeholder="••••••••"
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                        />
                    </div>

                    {message && (
                        <div className={`flex items-center gap-2 p-3 text-sm rounded-md border ${message.type === 'success'
                                ? 'bg-green-50 text-green-700 border-green-100'
                                : 'bg-red-50 text-red-500 border-red-100'
                            }`}>
                            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            <p>{message.text}</p>
                        </div>
                    )}

                    <Button type="submit" className="w-full" isLoading={isLoading} disabled={!!message && message.type === 'error' && message.text.includes('inválido')}>
                        Actualizar Contraseña
                    </Button>
                </form>
            </div>
        </div>
    );
}
