import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TableColumnSelector, type ColumnDefinition } from "@/components/ui/TableColumnSelector";
import { Search, Stethoscope, Mail, Phone, Shield, ShieldOff, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { toast } from "sonner";

interface Practitioner {
    id: string;
    user_id: string;
    email: string;
    first_name: string;
    last_name_1: string;
    last_name_2: string;
    license_number: string;
    specialty: string;
    phone: string | null;
    emergency_phone: string | null;
    bio: string | null;
    address: any | null;
    active: boolean;
    created_at: string;
    last_sign_in_at: string | null;
    total_count?: number;
}

export default function PractitionersPage() {
    const navigate = useNavigate();
    const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 20;

    // Column Visibility State
    const allColumns: ColumnDefinition[] = [
        { id: 'practitioner', label: 'Facultativo', alwaysVisible: true },
        { id: 'license_number', label: 'Nº Colegiado' },
        { id: 'specialty', label: 'Especialidad' },
        { id: 'email', label: 'Email' },
        { id: 'phone', label: 'Teléfono' },
        { id: 'status', label: 'Estado' },
        { id: 'last_login', label: 'Última sesión' },
        { id: 'created_at', label: 'Fecha Alta' }
    ];

    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('practitioners_table_columns');
        return saved ? JSON.parse(saved) : ['practitioner', 'license_number', 'specialty', 'phone', 'status', 'last_login'];
    });

    const toggleColumn = (columnId: string) => {
        setVisibleColumns(prev => {
            const newColumns = prev.includes(columnId)
                ? prev.filter(id => id !== columnId)
                : [...prev, columnId];
            localStorage.setItem('practitioners_table_columns', JSON.stringify(newColumns));
            return newColumns;
        });
    };

    const fetchPractitioners = async (page: number = 1, search: string = "") => {
        setIsLoading(true);
        try {
            const { data, error } = await (supabase as any).rpc('get_practitioners_list', {
                p_search: search || null,
                p_limit: pageSize,
                p_offset: (page - 1) * pageSize
            });

            if (error) throw error;
            const practitionersData = (data as any[]) || [];
            setPractitioners(practitionersData);
            setTotalCount(practitionersData[0]?.total_count || 0);
        } catch (error: any) {
            console.error("Error fetching practitioners:", error);
            toast.error("Error al cargar la lista de facultativos");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchPractitioners(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch]);

    const togglePractitionerStatus = async (userId: string, currentStatus: boolean, practitionerName: string) => {
        try {
            const { error } = await (supabase as any).rpc('toggle_user_active', {
                user_uuid: userId,
                is_active: !currentStatus
            });

            if (error) throw error;

            toast.success(`${practitionerName} ha sido ${!currentStatus ? 'activado' : 'desactivado'}`);
            fetchPractitioners(currentPage, debouncedSearch);
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error("Error al cambiar el estado del facultativo");
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Facultativos</h1>
                    <p className="text-sm text-gray-500">Administra el equipo médico y sus perfiles profesionales.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, especialidad..."
                            className="h-10 w-full sm:w-72 rounded-md border border-gray-300 bg-white pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                    </div>
                </div>
            </div>

            <ResponsiveTable<Practitioner>
                isLoading={isLoading}
                rows={practitioners}
                getRowKey={(row) => row.id}
                onRowClick={(row) => navigate(`/admin/practitioners/${row.id}`)}
                columns={[
                    ...allColumns.filter(col => visibleColumns.includes(col.id)).map(col => {
                        const baseCol = {
                            key: col.id,
                            header: col.label,
                            className: '',
                        };

                        switch (col.id) {
                            case 'practitioner':
                                return {
                                    ...baseCol, render: (p: Practitioner) => (
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center border border-brand-100">
                                                <Stethoscope className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900">
                                                    {p.first_name} {p.last_name_1} {p.last_name_2 || ''}
                                                </span>
                                                <span className="text-[10px] uppercase font-bold text-gray-400">{p.specialty}</span>
                                            </div>
                                        </div>
                                    )
                                };
                            case 'license_number':
                                return { ...baseCol, render: (p: Practitioner) => <span className="font-mono text-xs font-bold text-brand-700">{p.license_number}</span> };
                            case 'specialty':
                                return { ...baseCol, render: (p: Practitioner) => <span className="text-xs font-medium text-gray-600">{p.specialty}</span> };
                            case 'email':
                                return { ...baseCol, render: (p: Practitioner) => <span className="text-xs text-gray-500">{p.email}</span> };
                            case 'phone':
                                return { ...baseCol, render: (p: Practitioner) => <span className="text-xs text-gray-500 font-mono">{p.phone || "-"}</span> };
                            case 'status':
                                return {
                                    ...baseCol, render: (p: Practitioner) => (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${p.active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                            {p.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    )
                                };
                            case 'last_login':
                                return { ...baseCol, render: (p: Practitioner) => <span className="text-xs text-gray-400">{p.last_sign_in_at ? format(new Date(p.last_sign_in_at), 'dd/MM/yyyy HH:mm', { locale: es }) : "Nunca"}</span> };
                            case 'created_at':
                                return { ...baseCol, render: (p: Practitioner) => <span className="text-xs text-gray-400">{format(new Date(p.created_at), 'dd/MM/yyyy', { locale: es })}</span> };
                            default:
                                return { ...baseCol, render: () => null };
                        }
                    }),
                    {
                        key: 'actions',
                        header: 'Acciones',
                        className: 'text-right',
                        render: (p: Practitioner) => (
                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className={`h-8 w-8 p-0 ${p.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePractitionerStatus(p.user_id, p.active, p.first_name);
                                    }}
                                    title={p.active ? "Desactivar" : "Activar"}
                                >
                                    {p.active ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 text-brand-600 hover:bg-brand-50 border-brand-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/admin/practitioners/${p.id}`);
                                    }}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </div>
                        )
                    }
                ]}
                mobileTitle={(p) => `${p.first_name} ${p.last_name_1}`}
                mobileMeta={(p) => (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="h-3 w-3" /> {p.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Phone className="h-3 w-3" /> {p.phone || '-'}
                        </div>
                    </div>
                )}
                mobileBadges={(p) => (
                    <>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-50 text-brand-700 border border-brand-100">
                            {p.specialty}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${p.active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {p.active ? 'Activo' : 'Inactivo'}
                        </span>
                    </>
                )}
                mobileActions={(p) => (
                    <div className="flex flex-col gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[10px] font-black uppercase tracking-widest"
                            onClick={(e) => {
                                e.stopPropagation();
                                togglePractitionerStatus(p.user_id, p.active, p.first_name);
                            }}
                        >
                            {p.active ? 'Baja' : 'Alta'}
                        </Button>
                    </div>
                )}
                emptyMessage="No se encontraron facultativos"
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
                        <div className="flex gap-1">
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`px-3 py-1 rounded text-sm font-medium ${currentPage === i + 1 ? 'bg-brand-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
