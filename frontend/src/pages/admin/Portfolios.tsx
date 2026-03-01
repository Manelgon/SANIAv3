import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { TableColumnSelector, type ColumnDefinition } from "@/components/ui/TableColumnSelector";
import { Plus, Search, X, MoreVertical, Briefcase, Calendar, User, ChevronRight } from "lucide-react";
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

async function fetchPortfoliosFn(page: number, search: string, pageSize: number) {
    let query = supabase
        .from('portfolios')
        .select(`
            id, name, fid, created_at,
            practitioners (first_name, last_name_1, last_name_2)
        `, { count: 'exact' });

    if (search) {
        query = query.or(`name.ilike.%${search}%,fid.ilike.%${search}%`);
    }

    const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;
    return { data: (data as any) || [], count: count || 0 };
}

export default function PortfoliosPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(() => {
        const saved = localStorage.getItem('portfolios_page_size');
        return saved ? Number(saved) : 10;
    });

    const selectedPortfolioId = id ?? null;

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

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: queryResult, isLoading, refetch } = useQuery({
        queryKey: ['portfolios', currentPage, debouncedSearch, pageSize],
        queryFn: () => fetchPortfoliosFn(currentPage, debouncedSearch, pageSize),
        placeholderData: (prev) => prev,
    });

    const portfolios: PortfolioWithPractitioner[] = queryResult?.data ?? [];
    const totalCount = queryResult?.count ?? 0;
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
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mis Carteras</h1>
                    <p className="text-sm text-slate-500">Administra las carteras de pacientes asignadas.</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 font-bold text-sm shadow-sm">
                    <Plus className="h-4 w-4" />
                    Nueva Cartera
                </Button>
            </div>

            {/* Search + Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar cartera o FID..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-900 placeholder:text-slate-400 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <TableColumnSelector
                        columns={allColumns}
                        visibleColumns={visibleColumns}
                        onToggleColumn={toggleColumn}
                    />
                    {portfolios.length > 0 && (
                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                            {portfolios.length} cartera{portfolios.length !== 1 ? 's' : ''}
                        </span>
                    )}
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
                footer={
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); localStorage.setItem('portfolios_page_size', String(size)); }}
                        pageSizeOptions={[5, 10, 20, 50]}
                    />
                }
            />
            <CreatePortfolioModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    refetch();
                }}
            />
        </div>
    );
}
