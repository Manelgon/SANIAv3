import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import {
    Users,
    Shield,
    UserSquare2,
    Briefcase,
    Activity,
    Settings,
    LogOut,
    Bell,
    HelpCircle
} from 'lucide-react';

export default function AdminLayout() {
    const { signOut, user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        users: 0,
        patients: 0,
        portfolios: 0,
        alerts: 0
    });

    const fetchStats = async () => {
        try {
            const { data, error } = await supabase.rpc('get_admin_stats') as any;
            if (error) throw error;

            if (data) {
                setStats({
                    users: data.users || 0,
                    patients: data.patients || 0,
                    portfolios: data.portfolios || 0,
                    alerts: data.alerts || 0
                });
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login', { replace: true });
        } catch (error) {
            console.error("Error during sign out:", error);
            // Force redirect even if signOut fails
            navigate('/login', { replace: true });
        }
    };

    const navItems = [
        { name: 'Usuarios', path: '/admin/users', icon: Users },
        { name: 'Portfolios', path: '/admin/portfolios', icon: Briefcase },
        { name: 'Roles y Permisos', path: '/admin/roles', icon: Shield },
        { name: 'Pacientes', path: '/admin/patients', icon: UserSquare2 },
        { name: 'Actividad/Logs', path: '/admin/logs', icon: Activity },
        { name: 'Ajustes', path: '/admin/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* HEADER */}
            <header className="bg-white border-b border-gray-200">
                <div className="px-4 md:px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 md:gap-8 flex-1 min-w-0">
                        <h1 className="text-lg md:text-xl font-bold tracking-tight text-brand-900 truncate">
                            SanIA <span className="text-gray-500 font-normal hidden sm:inline">| Super Admin Panel</span>
                        </h1>

                        {/* KPI STATS (Hidden on mobile) */}
                        <div className="hidden lg:flex items-center gap-4 ml-6 text-sm">
                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                                <span className="text-gray-500 text-xs">Usuarios:</span>
                                <span className="font-bold text-brand-700">{stats.users}</span>
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                                <span className="text-gray-500 text-xs">Pacientes:</span>
                                <span className="font-bold text-brand-700">{stats.patients}</span>
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                                <span className="text-gray-500 text-xs">Portfolios:</span>
                                <span className="font-bold text-brand-700">{stats.portfolios}</span>
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                                <span className="text-gray-500 text-xs">Alertas:</span>
                                <span className="font-bold text-red-600">{stats.alerts}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium text-gray-900">{user?.email || 'Admin Root'}</p>
                            <p className="text-xs text-gray-500">SUPER ADMIN | MedSys</p>
                        </div>

                        <div className="flex items-center gap-1 md:gap-2 border-l border-gray-200 pl-2 md:pl-4">
                            <button className="hidden sm:block p-2 text-gray-500 hover:text-brand-600 rounded-full hover:bg-gray-100"><Bell className="h-5 w-5" /></button>
                            <button className="hidden sm:block p-2 text-gray-500 hover:text-brand-600 rounded-full hover:bg-gray-100"><HelpCircle className="h-5 w-5" /></button>
                            <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50" title="Salir">
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <nav className="px-6 flex items-center gap-1 overflow-x-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive
                                    ? 'border-brand-600 text-brand-700 bg-brand-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            <main className="flex-1 p-6 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}
