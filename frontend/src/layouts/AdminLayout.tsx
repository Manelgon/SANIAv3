import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import {
    Users,
    UserSquare2,
    Briefcase,
    LogOut,
    Bell,
    Stethoscope,
    ChevronRight,
    ShieldCheck,
} from 'lucide-react';

export default function AdminLayout() {
    const { signOut, user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ users: 0, practitioners: 0, patients: 0, portfolios: 0, alerts: 0 });
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const fetchStats = async () => {
        try {
            const { data, error } = await supabase.rpc('get_admin_stats') as any;
            if (error) throw error;
            if (data) {
                setStats({
                    users: data.users || 0,
                    practitioners: data.practitioners || 0,
                    patients: data.patients || 0,
                    portfolios: data.portfolios || 0,
                    alerts: data.alerts || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
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
        { name: 'Usuarios', path: '/admin/users', icon: Users, count: stats.users },
        { name: 'Facultativos', path: '/admin/practitioners', icon: Stethoscope, count: stats.practitioners },
        { name: 'Pacientes', path: '/admin/patients', icon: UserSquare2, count: stats.patients },
        { name: 'Carteras', path: '/admin/portfolios', icon: Briefcase, count: stats.portfolios },
    ];

    const userInitials = user?.email?.slice(0, 2).toUpperCase() ?? 'SA';

    return (
        <div className="min-h-screen flex bg-bg-base">
            {/* SIDEBAR */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-primary text-white transition-transform duration-300
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:relative lg:translate-x-0 lg:flex
            `}>
                {/* Logo */}
                <div className="px-5 py-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="size-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="size-5 text-primary-accent">
                                <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white leading-tight">SanIA</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50 leading-tight">Super Admin</p>
                        </div>
                    </div>
                </div>

                {/* Stats summary */}
                <div className="px-4 py-4 border-b border-white/10">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/5 rounded-lg p-2.5 text-center">
                            <p className="text-lg font-bold text-primary-accent">{stats.users}</p>
                            <p className="text-[9px] text-white/50 uppercase tracking-wider">Usuarios</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2.5 text-center">
                            <p className="text-lg font-bold text-primary-accent">{stats.patients}</p>
                            <p className="text-[9px] text-white/50 uppercase tracking-wider">Pacientes</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    <p className="px-3 mb-3 text-[9px] font-bold uppercase tracking-widest text-white/30">
                        Gestión del Sistema
                    </p>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-white/15 text-white border-l-4 border-primary-accent pl-2'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                                    <span className="flex-1">{item.name}</span>
                                    {item.count > 0 && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary-accent text-primary' : 'bg-white/10 text-white/60'}`}>
                                            {item.count}
                                        </span>
                                    )}
                                    <ChevronRight className={`h-3 w-3 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User + Logout */}
                <div className="px-4 py-4 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="size-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-white">{userInitials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{user?.email || 'Admin'}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <ShieldCheck className="h-2.5 w-2.5 text-primary-accent" />
                                <p className="text-[9px] text-white/40 uppercase tracking-wider">Super Admin</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                            <Bell className="h-3.5 w-3.5" />
                            {stats.alerts > 0 && (
                                <span className="bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5">{stats.alerts}</span>
                            )}
                        </button>
                        <button
                            onClick={handleSignOut}
                            title="Cerrar sesión"
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white/70 hover:text-red-300 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Salir
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile header */}
                <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="size-7 bg-primary rounded-md flex items-center justify-center text-white">
                            <svg fill="none" viewBox="0 0 48 48" className="size-4">
                                <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
                            </svg>
                        </div>
                        <span className="font-bold text-primary text-sm">SanIA Admin</span>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
