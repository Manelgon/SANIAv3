import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import {
    UserSquare2,
    Briefcase,
    LogOut,
    Bell,
    UserCircle2,
    Users,
    AlertTriangle,
    Search,
} from 'lucide-react';

export default function PractitionerLayout() {
    const { signOut, user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ patients: 0, portfolios: 0, alerts: 0 });

    const fetchStats = async () => {
        try {
            const { data, error } = await supabase.rpc('get_practitioner_stats') as any;
            if (error) throw error;
            if (data) {
                setStats({
                    patients: data.patients || 0,
                    portfolios: data.portfolios || 0,
                    alerts: data.alerts || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching practitioner stats:', error);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login', { replace: true });
        } catch {
            navigate('/login', { replace: true });
        }
    };

    const navItems = [
        { name: 'Mis Carteras', path: '/dashboard/portfolios', icon: Briefcase },
        { name: 'Mis Pacientes', path: '/dashboard/patients', icon: UserSquare2 },
        { name: 'Perfil', path: '/dashboard/perfil', icon: UserCircle2 },
    ];

    const userInitials = user?.email?.slice(0, 2).toUpperCase() ?? 'U';

    return (
        <div className="min-h-screen bg-bg-base flex flex-col">
            {/* HEADER */}
            <header className="bg-white border-b border-primary/10 sticky top-0 z-50">
                <div className="px-6 lg:px-10 py-3 flex items-center justify-between gap-4">
                    {/* Brand */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="size-9 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
                            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="size-5">
                                <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
                            </svg>
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-bold text-primary leading-tight">SanIA</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60 leading-tight">Panel de Facultativo</p>
                        </div>
                    </div>

                    {/* KPI Badges (desktop) */}
                    <div className="hidden lg:flex items-center gap-3 flex-1 justify-center">
                        <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-3.5 py-2 shadow-sm">
                            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                                <Users className="h-3.5 w-3.5" />
                            </div>
                            <div>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider leading-none">Mis Pacientes</p>
                                <p className="text-base font-bold text-primary leading-tight">{stats.patients}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-3.5 py-2 shadow-sm">
                            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                                <Briefcase className="h-3.5 w-3.5" />
                            </div>
                            <div>
                                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider leading-none">Mis Carteras</p>
                                <p className="text-base font-bold text-primary leading-tight">{stats.portfolios}</p>
                            </div>
                        </div>
                        {stats.alerts > 0 && (
                            <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2 shadow-sm">
                                <div className="p-1.5 bg-red-100 rounded-md text-red-600">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-red-400 tracking-wider leading-none">Alertas</p>
                                    <p className="text-base font-bold text-red-600 leading-tight">{stats.alerts}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search (desktop) */}
                    <div className="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 min-w-44">
                        <Search className="h-4 w-4 text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Buscar pacientes..."
                            className="bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none w-full"
                        />
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button className="p-2 text-slate-500 hover:text-primary rounded-lg hover:bg-primary-accent/20 transition-colors">
                            <Bell className="h-5 w-5" />
                        </button>
                        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
                            <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">{userInitials}</span>
                            </div>
                            <div className="hidden lg:block text-right">
                                <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-32">{user?.email}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Facultativo</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            title="Cerrar sesión"
                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="h-4.5 w-4.5" />
                        </button>
                    </div>
                </div>

                {/* NAV TABS */}
                <nav className="px-6 lg:px-10 border-t border-slate-100 bg-slate-50/50 flex items-center gap-1 overflow-x-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-4 py-3.5 text-sm border-b-4 transition-colors whitespace-nowrap ${
                                    isActive
                                        ? 'border-brand-500 text-brand-600 font-bold'
                                        : 'border-transparent text-slate-500 font-medium hover:text-brand-600 hover:border-brand-200'
                                }`
                            }
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>
            </header>

            {/* CONTENT */}
            <main className="flex-1 px-6 lg:px-10 py-6 overflow-auto">
                <Outlet />
            </main>

            <footer className="px-6 py-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">© {new Date().getFullYear()} SanIA Healthcare Systems</p>
            </footer>
        </div>
    );
}
