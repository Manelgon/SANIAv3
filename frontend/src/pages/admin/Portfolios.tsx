import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TableColumnSelector, type ColumnDefinition } from "@/components/ui/TableColumnSelector";
import { Plus, Search, MoreVertical, Briefcase, Calendar, User, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreatePortfolioModal } from "@/components/portfolios/CreatePortfolioModal";
import { PortfolioDetailView } from "@/components/portfolios/PortfolioDetailView";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";

interface PortfolioWithPractitioner {
    id: string;
    name: string;
    fid: string | null;
    created_at: string;
    practitioners: {
        first_name: string;
        last_name_1: string;
        last_name_2: string | null;
    };
}

export default function PortfoliosPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [portfolios, setPortfolios] = useState<PortfolioWithPractitioner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10;

    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);

    // Sync selected portfolio from URL
    useEffect(() => {
        if (id) {
            setSelectedPortfolioId(id);
        } else {
            setSelectedPortfolioId(null);
        }
    }, [id]);

    // Column Visibility State
    const allColumns: ColumnDefinition[] = [
        { id: 'name', label: 'Nombre de Cartera', alwaysVisible: true },
        { id: 'practitioner', label: 'Facultativo Asignado' },
        { id: 'date', label: 'Fecha de Creación' }
    ];
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'practitioner', 'date']);

    const toggleColumn = (columnId: string) => {
        setVisibleColumns(prev =>
            prev.includes(columnId)
                ? prev.filter(id => id !== columnId)
                : [...prev, columnId]
        );
    };

    const fetchPortfolios = async (page: number = 1, search: string = "") => {
        setIsLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            let query = supabase
                .from('portfolios')
                .select(`
                    id,
                    name,
                    fid,
                    created_at,
                    practitioners (
                        first_name,
                        last_name_1,
                        last_name_2
                    )
                `, { count: 'exact' });

            if (search) {
                // search in name or practitioner name
                query = query.or(`name.ilike.%${search}%,fid.ilike.%${search}%`);
                // Note: searching in joined tables in Supabase direct queries is tricky with .or()
                // For simplicity, we'll search portfolio name and fid.
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1)
                .abortSignal(controller.signal);

            if (error) throw error;
            setPortfolios(data as any || []);
            setTotalCount(count || 0);
        } catch (error: any) {
            console.error("Error fetching portfolios:", error);
            if (error.name === 'AbortError') {
                console.error("Fetch portfolios timed out");
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
        fetchPortfolios(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch]);

    const totalPages = Math.ceil(totalCount / pageSize);

    if (selectedPortfolioId) {
        return (
            <PortfolioDetailView
                portfolioId={selectedPortfolioId}
                onBack={() => {
                    const basePath = window.location.pathname.split('/portfolios')[0] + '/portfolios';
                    navigate(basePath);
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Carteras</h1>
                    <p className="text-sm text-gray-500">Administra las carteras de pacientes asignadas a los facultativos.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar cartera o facultativo..."
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
                        <Button onClick={() => setIsCreateModalOpen(true)} className="flex-1 sm:flex-none justify-center">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Cartera
                        </Button>
                    </div>
                </div>
            </div>

            <ResponsiveTable<PortfolioWithPractitioner>
                isLoading={isLoading}
                rows={portfolios}
                columns={[
                    ...allColumns.filter(col => visibleColumns.includes(col.id)).map(col => {
                        const baseCol = {
                            key: col.id,
                            header: col.label,
                            className: '',
                        };

                        switch (col.id) {
                            case 'name':
                                return {
                                    ...baseCol, render: (portfolio: PortfolioWithPractitioner) => (
                                        <div className="flex items-center gap-4">
                                            <div className="h-11 w-11 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center border border-brand-100 shadow-sm">
                                                <Briefcase className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 text-base">{portfolio.name}</span>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ver pacientes asignados</span>
                                            </div>
                                        </div>
                                    )
                                };
                            case 'practitioner':
                                return {
                                    ...baseCol, render: (portfolio: PortfolioWithPractitioner) => (
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 shadow-inner overflow-hidden">
                                                <User className="h-4.5 w-4.5 text-gray-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-900 font-bold leading-tight">
                                                    {portfolio.practitioners.first_name} {portfolio.practitioners.last_name_1}
                                                </span>
                                                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-black mt-0.5">Responsable</span>
                                            </div>
                                        </div>
                                    )
                                };
                            case 'date':
                                return {
                                    ...baseCol, render: (portfolio: PortfolioWithPractitioner) => (
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                            <Calendar className="h-3.5 w-3.5 text-brand-500" />
                                            {format(new Date(portfolio.created_at), "d 'de' MMM, yyyy", { locale: es })}
                                        </div>
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
                        render: (portfolio: PortfolioWithPractitioner) => (
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => {
                                        const basePath = window.location.pathname.split('/portfolios')[0] + '/portfolios';
                                        navigate(`${basePath}/${portfolio.id}`);
                                    }}
                                    className="p-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-all shadow-sm"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all active:scale-95">
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                            </div>
                        )
                    }
                ]}
                getRowKey={(row) => row.id}
                mobileTitle={(row) => row.name}
                mobileMeta={(row) => (
                    <div className="flex items-center gap-2 mt-1">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs text-gray-600">
                            Dr/a. {row.practitioners.first_name} {row.practitioners.last_name_1}
                        </span>
                    </div>
                )}
                mobileActions={(row) => (
                    <button
                        onClick={() => {
                            const basePath = window.location.pathname.split('/portfolios')[0] + '/portfolios';
                            navigate(`${basePath}/${row.id}`);
                        }}
                        className="p-3 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors shadow-sm"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                )}
                emptyMessage="No se encontraron carteras"
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
            <CreatePortfolioModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    fetchPortfolios(currentPage, searchTerm);
                }}
            />
        </div>
    );
}
