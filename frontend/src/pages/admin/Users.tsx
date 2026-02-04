import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { TableColumnSelector, type ColumnDefinition } from "@/components/ui/TableColumnSelector";
import { Plus, Search, MoreVertical, Shield, ShieldOff, CheckCircle, XCircle, ChevronRight, FileText } from "lucide-react";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import { PractitionerDocumentsModal } from "@/components/users/PractitionerDocumentsModal";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";

interface AdminUser {
    id: string;
    email: string;
    role: 'super_admin' | 'practitioner' | 'assistant' | 'billing' | 'patient';
    active: boolean;
    full_name: string;
    fid: string | null;
    cip: string | null;
    practitioner_id: string | null;
    patient_id: string | null;
    portfolio_id: string | null;
    portfolio_name: string | null;
    insured_number: string | null;
    updated_at: string;
    last_sign_in_at: string | null;
    created_at: string;
    is_confirmed: boolean;
    total_count?: number;
}

export default function UsersPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 20;

    // Practitioner Documents Modal State
    const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
    const [selectedPractitioner, setSelectedPractitioner] = useState<{ id: string; name: string } | null>(null);

    // Column Visibility State
    const allColumns: ColumnDefinition[] = [
        { id: 'user', label: 'Usuario', alwaysVisible: true },
        { id: 'fid', label: 'FID' },
        { id: 'cip', label: 'CIP' },
        { id: 'insured_number', label: 'Póliza' },
        { id: 'role', label: 'Rol' },
        { id: 'portfolio', label: 'Cartera' },
        { id: 'practitioner_id', label: 'ID Facultativo' },
        { id: 'patient_id', label: 'ID Paciente' },
        { id: 'status', label: 'Estado' },
        { id: 'updated_at', label: 'Actualizado' },
        { id: 'last_login', label: 'Última Sesión' }
    ];
    // Load saved columns from localStorage or default
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('users_table_columns_v2');
        return saved ? JSON.parse(saved) : ['user', 'fid', 'cip', 'role', 'status', 'last_login'];
    });

    const toggleColumn = (columnId: string) => {
        setVisibleColumns(prev => {
            const newColumns = prev.includes(columnId)
                ? prev.filter(id => id !== columnId)
                : [...prev, columnId];

            // Save to localStorage
            localStorage.setItem('users_table_columns_v2', JSON.stringify(newColumns));
            return newColumns;
        });
    };

    const fetchUsers = async (page: number = 1, search: string = "") => {
        setIsLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const { data, error } = await (supabase as any).rpc('get_admin_users', {
                p_search: search || null,
                p_limit: pageSize,
                p_offset: (page - 1) * pageSize
            }, {
                abortSignal: controller.signal
            });
            if (error) throw error;
            const usersData = (data as any[]) || [];
            setUsers(usersData);
            setTotalCount(usersData[0]?.total_count || 0);
        } catch (error: any) {
            console.error("Error fetching users:", error);
            if (error.name === 'AbortError') {
                console.error("Fetch users timed out");
            }
        } finally {
            clearTimeout(timeoutId);
            setIsLoading(false);
        }
    };

    // Debounced search logic
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Single fetch source of truth
    useEffect(() => {
        fetchUsers(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch]);

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await (supabase as any).rpc('toggle_user_active', {
                user_uuid: userId,
                is_active: !currentStatus
            });

            if (error) throw error;

            // Optimistic update
            setUsers(users.map(u =>
                u.id === userId ? { ...u, active: !currentStatus } : u
            ));
        } catch (error) {
            console.error("Error toggling user status:", error);
            alert("Error al cambiar estado del usuario");
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'super_admin': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'practitioner': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'patient': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getRoleTextColor = (role: string) => {
        switch (role) {
            case 'super_admin': return 'text-purple-700';
            case 'practitioner': return 'text-blue-700';
            case 'patient': return 'text-green-700';
            default: return 'text-gray-700';
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Usuarios</h1>
                    <p className="text-sm text-gray-500">Administra los usuarios, roles y accesos del sistema.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar usuario..."
                            className="h-10 w-full sm:w-64 rounded-md border border-gray-300 bg-white pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <TableColumnSelector
                            columns={allColumns}
                            visibleColumns={visibleColumns}
                            onToggleColumn={toggleColumn}
                        />
                        <Button onClick={() => setIsCreateModalOpen(true)} className="flex-1 sm:flex-none justify-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Añadir Usuario
                        </Button>
                    </div>
                </div>
            </div>

            <ResponsiveTable<AdminUser>
                isLoading={isLoading}
                rows={users}
                columns={[
                    ...allColumns.filter(col => visibleColumns.includes(col.id)).map(col => {
                        const baseCol = {
                            key: col.id,
                            header: col.label,
                            className: '',
                        };

                        switch (col.id) {
                            case 'user':
                                return {
                                    ...baseCol, render: (user: AdminUser) => (
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{user.full_name}</span>
                                            <span className="text-xs text-gray-500">{user.email}</span>
                                        </div>
                                    )
                                };
                            case 'fid':
                                return {
                                    ...baseCol, render: (user: AdminUser) => (
                                        user.fid ? <code className={`text-xs font-mono font-semibold ${getRoleTextColor(user.role)}`}>{user.fid}</code> : <span className="text-gray-400 text-xs">-</span>
                                    )
                                };
                            case 'cip':
                                return {
                                    ...baseCol, render: (user: AdminUser) => (
                                        user.cip ? <code className={`text-xs font-mono font-semibold ${getRoleTextColor(user.role)}`}>{user.cip}</code> : <span className="text-gray-400 text-xs">-</span>
                                    )
                                };
                            case 'insured_number':
                                return {
                                    ...baseCol, render: (user: AdminUser) => (
                                        user.insured_number ? <code className={`text-xs font-mono font-semibold ${getRoleTextColor(user.role)}`}>{user.insured_number}</code> : <span className="text-gray-400 text-xs">-</span>
                                    )
                                };
                            case 'role':
                                return {
                                    ...baseCol, render: (user: AdminUser) => (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    )
                                };
                            case 'portfolio':
                                return {
                                    ...baseCol, render: (user: AdminUser) => (
                                        <span className={`text-xs ${getRoleTextColor(user.role)}`}>{user.portfolio_name || user.portfolio_id || '-'}</span>
                                    )
                                };
                            case 'practitioner_id':
                                return {
                                    ...baseCol, render: (user: AdminUser) => (
                                        <span className={`text-xs font-mono ${getRoleTextColor(user.role)}`}>{user.practitioner_id ? user.practitioner_id.slice(0, 8) + '...' : '-'}</span>
                                    )
                                };
                            case 'patient_id':
                                return {
                                    ...baseCol, render: (user: AdminUser) => (
                                        <span className={`text-xs font-mono ${getRoleTextColor(user.role)}`}>{user.patient_id ? user.patient_id.slice(0, 8) + '...' : '-'}</span>
                                    )
                                };
                            case 'status':
                                return {
                                    ...baseCol, render: (user: AdminUser) => (
                                        <div className="flex flex-col gap-1">
                                            {user.active ? (
                                                <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                                                    <CheckCircle className="h-3 w-3" /> Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs text-red-700 font-medium">
                                                    <XCircle className="h-3 w-3" /> Inactivo
                                                </span>
                                            )}
                                            {user.is_confirmed ? (
                                                <span className="text-[10px] text-gray-400">Email Confirmado</span>
                                            ) : (
                                                <span className="text-[10px] text-orange-500 font-medium">Pendiente Confirmación</span>
                                            )}
                                        </div>
                                    )
                                };
                            case 'updated_at':
                                return {
                                    ...baseCol, render: (user: AdminUser) => (
                                        <span className={`text-xs ${getRoleTextColor(user.role)}`}>{format(new Date(user.updated_at), "d MMM, HH:mm", { locale: es })}</span>
                                    )
                                };
                            case 'last_login':
                                return {
                                    ...baseCol, render: (user: AdminUser) => (
                                        <span className={`text-xs ${getRoleTextColor(user.role)}`}>{user.last_sign_in_at ? format(new Date(user.last_sign_in_at), "d MMM yyyy, HH:mm", { locale: es }) : "Nunca"}</span>
                                    )
                                };
                            default:
                                return { ...baseCol, render: () => null };
                        }
                    }),
                    {
                        key: 'actions',
                        header: 'Acciones',
                        className: 'text-right',
                        render: (user: AdminUser) => (
                            <div className="flex justify-end gap-2">
                                {user.role === 'practitioner' && user.practitioner_id && (
                                    <button
                                        onClick={() => {
                                            setSelectedPractitioner({ id: user.practitioner_id!, name: user.full_name });
                                            setIsDocsModalOpen(true);
                                        }}
                                        className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                                        title="Ver documentos profesionales"
                                    >
                                        <FileText className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => toggleUserStatus(user.id, user.active)}
                                    className={`p-1.5 rounded-md transition-colors ${user.active
                                        ? "text-red-600 hover:bg-red-50"
                                        : "text-green-600 hover:bg-green-50"
                                        }`}
                                    title={user.active ? "Desactivar usuario" : "Activar usuario"}
                                >
                                    {user.active ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                                </button>
                                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md">
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                            </div>
                        )
                    }
                ]}
                getRowKey={(user) => user.id}
                mobileTitle={(user) => user.full_name}
                mobileMeta={(user) => (
                    <>
                        <div className="text-gray-500">{user.email}</div>
                        {user.fid && <div className="text-xs font-mono mt-0.5">FID: {user.fid}</div>}
                    </>
                )}
                mobileBadges={(user) => (
                    <>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                        </span>
                        {user.active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-100 font-medium">
                                <CheckCircle className="h-3 w-3" /> Activo
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-100 font-medium">
                                <XCircle className="h-3 w-3" /> Inactivo
                            </span>
                        )}
                    </>
                )}
                mobileActions={(user) => (
                    <div className="flex flex-col gap-2">
                        {user.role === 'practitioner' && user.practitioner_id && (
                            <button
                                onClick={() => {
                                    setSelectedPractitioner({ id: user.practitioner_id!, name: user.full_name });
                                    setIsDocsModalOpen(true);
                                }}
                                className="p-2 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors shadow-sm"
                                title="Ver documentos profesionales"
                            >
                                <FileText className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            onClick={() => toggleUserStatus(user.id, user.active)}
                            className={`p-2 rounded-lg transition-colors shadow-sm ${user.active
                                ? "text-red-600 bg-red-50 hover:bg-red-100"
                                : "text-green-600 bg-green-50 hover:bg-green-100"
                                }`}
                        >
                            {user.active ? <ShieldOff className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                        </button>
                    </div>
                )}
                emptyMessage="No se encontraron usuarios"
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 rounded-lg shadow-sm">
                    <div className="flex justify-between flex-1 sm:hidden">
                        <Button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            variant="outline"
                        >
                            Anterior
                        </Button>
                        <Button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            variant="outline"
                        >
                            Siguiente
                        </Button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Mostrando <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> a <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> de{' '}
                                <span className="font-medium">{totalCount}</span> resultados
                            </p>
                        </div>
                        <div>
                            <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-l-md border border-gray-300 bg-white hover:bg-gray-50 focus:z-20 disabled:opacity-50"
                                >
                                    <span className="sr-only">Anterior</span>
                                    <ChevronRight className="h-5 w-5 rotate-180" />
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold border ${currentPage === i + 1
                                            ? "z-10 bg-brand-600 text-white border-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                                            : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 text-gray-400 rounded-r-md border border-gray-300 bg-white hover:bg-gray-50 focus:z-20 disabled:opacity-50"
                                >
                                    <span className="sr-only">Siguiente</span>
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    fetchUsers(currentPage, searchTerm); // Refresh list after creation
                }}
            />

            <PractitionerDocumentsModal
                isOpen={isDocsModalOpen}
                onClose={() => setIsDocsModalOpen(false)}
                practitionerId={selectedPractitioner?.id || ''}
                practitionerName={selectedPractitioner?.name || ''}
            />
        </div>
    );
}
