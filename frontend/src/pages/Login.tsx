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

    // Reset Password State
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [isResetLoading, setIsResetLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetEmail) return;

        setIsResetLoading(true);
        setResetMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) throw error;

            setResetMessage({
                type: 'success',
                text: 'Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.'
            });
            setTimeout(() => {
                setIsResetOpen(false);
                setResetMessage(null);
                setResetEmail('');
            }, 3000);

        } catch (error: any) {
            setResetMessage({
                type: 'error',
                text: error.message || 'Error al enviar el correo de recuperación'
            });
        } finally {
            setIsResetLoading(false);
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
                        <div>
                            <Input
                                id="password"
                                label="Contraseña"
                                type="password"
                                placeholder="••••••••"
                                error={errors.password?.message}
                                {...register('password')}
                            />
                            <div className="flex justify-end mt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsResetOpen(true)}
                                    className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                                >
                                    ¿Has olvidado tu contraseña?
                                </button>
                            </div>
                        </div>
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

            {/* Password Reset Modal */}
            {isResetOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-4">
                            <h3 className="text-xl font-semibold text-gray-900">Restablecer Contraseña</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
                            </p>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Correo Electrónico
                                </label>
                                <input
                                    id="reset-email"
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    placeholder="nombre@ejemplo.com"
                                    required
                                />
                            </div>

                            {resetMessage && (
                                <div className={`p-3 rounded-md text-sm ${resetMessage.type === 'success'
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                    {resetMessage.text}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsResetOpen(false);
                                        setResetMessage(null);
                                        setResetEmail('');
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                                >
                                    Cancelar
                                </button>
                                <Button
                                    type="submit"
                                    isLoading={isResetLoading}
                                    className="bg-brand-600 hover:bg-brand-700 text-white"
                                >
                                    Enviar Instrucciones
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
