import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    pageSizeOptions?: number[];
}

export function Pagination({
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
    if (totalCount === 0) return null;

    const from = (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalCount);

    // Build visible page numbers with ellipsis
    const getPages = (): (number | '...')[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | '...')[] = [1];
        if (currentPage > 3) pages.push('...');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            pages.push(i);
        }
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-100">
            {/* Left: info + page size */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                    <span className="font-semibold text-slate-700">{from}–{to}</span> de{' '}
                    <span className="font-semibold text-slate-700">{totalCount}</span> resultados
                </span>
                <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Mostrar</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            onPageSizeChange(Number(e.target.value));
                            onPageChange(1);
                        }}
                        className="h-7 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    >
                        {pageSizeOptions.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <span className="text-slate-400">por página</span>
                </div>
            </div>

            {/* Right: page buttons */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    title="Primera página"
                    className="size-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Página anterior"
                    className="size-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {getPages().map((page, idx) =>
                    page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="size-7 flex items-center justify-center text-xs text-slate-400">
                            ···
                        </span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page as number)}
                            className={`size-7 flex items-center justify-center rounded-lg text-xs font-semibold border transition-colors ${
                                currentPage === page
                                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                    : 'border-slate-200 text-slate-600 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200'
                            }`}
                        >
                            {page}
                        </button>
                    )
                )}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Página siguiente"
                    className="size-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Última página"
                    className="size-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronsRight className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
