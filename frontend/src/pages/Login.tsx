import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';

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
    const [showPassword, setShowPassword] = useState(false);

    const [isResetOpen, setIsResetOpen] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [isResetLoading, setIsResetLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
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
                const { data: userRole } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', authData.session.user.id)
                    .single();
                interface RoleData { role: string }
                const role = ((userRole as unknown) as RoleData)?.role;
                if (role === 'super_admin') navigate('/admin/users');
                else if (role === 'practitioner') navigate('/dashboard');
                else if (role === 'patient') navigate('/portal');
                else navigate('/');
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
            setResetMessage({ type: 'success', text: 'Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.' });
            setTimeout(() => { setIsResetOpen(false); setResetMessage(null); setResetEmail(''); }, 3000);
        } catch (error: any) {
            setResetMessage({ type: 'error', text: error.message || 'Error al enviar el correo de recuperación' });
        } finally {
            setIsResetLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* LEFT PANEL — brand gradient, hidden on mobile */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-linear-to-br from-primary-accent to-primary-light flex-col justify-between p-12">
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: 'radial-gradient(#7ed8c8 0.5px, transparent 0.5px)',
                        backgroundSize: '20px 20px',
                    }}
                />
                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
                        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="size-6">
                            <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
                        </svg>
                    </div>
                    <span className="text-primary text-2xl font-bold tracking-tight">SanIA</span>
                </div>

                {/* Tagline */}
                <div className="relative z-10 max-w-md">
                    <h1 className="text-primary text-5xl font-black leading-tight tracking-tight mb-4">
                        Gestión médica inteligente
                    </h1>
                    <p className="text-primary/80 text-lg leading-relaxed">
                        Optimizando la atención sanitaria a través de tecnología avanzada y procesos simplificados para profesionales de la salud.
                    </p>
                </div>

                {/* Social proof */}
                <div className="relative z-10">
                    <p className="text-primary text-sm font-semibold">
                        Plataforma segura certificada para el entorno sanitario español
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-xs font-semibold text-primary">
                            🔒 Datos protegidos · RGPD
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full text-xs font-semibold text-primary">
                            ✓ ISO 27001
                        </span>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL — login form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 sm:p-12">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-2">
                        <div className="size-9 bg-primary rounded-lg flex items-center justify-center text-white">
                            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="size-5">
                                <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
                            </svg>
                        </div>
                        <span className="text-primary text-xl font-bold">SanIA</span>
                    </div>

                    {/* Heading */}
                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Panel de Acceso</h2>
                        <p className="text-slate-500 text-sm">Bienvenido de nuevo. Por favor, introduce tus credenciales.</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                                Correo Electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="nombre@ejemplo.com"
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                {...register('email')}
                            />
                            {errors.email && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.email.message}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                                    Contraseña
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsResetOpen(true)}
                                    className="text-xs text-primary hover:underline font-medium"
                                >
                                    ¿Has olvidado tu contraseña?
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Auth error */}
                        {authError && (
                            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <p>{authError}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-md shadow-primary/20 transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none group"
                        >
                            {isLoading ? (
                                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-xs text-slate-400 pt-4 border-t border-slate-100">
                        Acceso restringido a personal autorizado del sistema sanitario
                    </p>
                </div>
            </div>

            {/* Password Reset Modal */}
            {isResetOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 relative">
                        <div className="mb-5">
                            <h3 className="text-xl font-bold text-slate-900">Restablecer Contraseña</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.
                            </p>
                        </div>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label htmlFor="reset-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Correo Electrónico
                                </label>
                                <input
                                    id="reset-email"
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    placeholder="nombre@ejemplo.com"
                                    required
                                />
                            </div>
                            {resetMessage && (
                                <div className={`p-3 rounded-lg text-sm ${resetMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    {resetMessage.text}
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsResetOpen(false); setResetMessage(null); setResetEmail(''); }}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isResetLoading}
                                    className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 shadow-md shadow-primary/20 transition-all disabled:opacity-60 disabled:pointer-events-none"
                                >
                                    {isResetLoading ? 'Enviando...' : 'Enviar Instrucciones'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
