
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
    key: string;
    header: string;
    className?: string;
    render: (row: T) => ReactNode;
    mobile?: boolean;
};

interface ResponsiveTableProps<T> {
    rows: T[];
    columns: Column<T>[];
    getRowKey: (row: T) => string;
    mobileTitle: (row: T) => ReactNode;
    mobileMeta?: (row: T) => ReactNode;
    mobileBadges?: (row: T) => ReactNode;
    mobileActions: (row: T) => ReactNode;
    emptyMessage?: string;
    isLoading?: boolean;
    onRowClick?: (row: T) => void;
    footer?: ReactNode;
}

export function ResponsiveTable<T>({
    rows,
    columns,
    getRowKey,
    mobileTitle,
    mobileMeta,
    mobileBadges,
    mobileActions,
    emptyMessage = "No hay datos disponibles",
    isLoading = false,
    onRowClick,
    footer,
}: ResponsiveTableProps<T>) {
    if (isLoading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Header skeleton */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex gap-6">
                    {[40, 28, 20, 12].map((w, i) => (
                        <div key={i} className={`h-2.5 rounded bg-slate-200 animate-pulse`} style={{ width: `${w}%` }} />
                    ))}
                </div>
                {/* Row skeletons */}
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-4 py-4 border-b border-slate-100 flex items-center gap-4">
                        <div className="size-9 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 rounded bg-slate-100 animate-pulse" style={{ width: `${60 - i * 5}%` }} />
                            <div className="h-2 rounded bg-slate-100 animate-pulse" style={{ width: `${40 - i * 4}%` }} />
                        </div>
                        <div className="h-2.5 rounded bg-slate-100 animate-pulse w-16" />
                        <div className="h-2.5 rounded bg-slate-100 animate-pulse w-20" />
                        <div className="h-6 w-6 rounded-lg bg-slate-100 animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    if (!rows || rows.length === 0) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden p-8 flex flex-col items-center justify-center text-center">
                <p className="text-sm text-gray-500 font-medium">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <>
            {/* MÓVIL: cards */}
            <div className="grid gap-3 md:hidden">
                {rows.map((row) => (
                    <div
                        key={getRowKey(row)}
                        className={cn(
                            "rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
                            onRowClick && "cursor-pointer hover:border-brand-200 hover:shadow-md transition-all"
                        )}
                        onClick={() => onRowClick?.(row)}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-900 mb-1">
                                    {mobileTitle(row)}
                                </div>
                                {mobileMeta && (
                                    <div className="text-xs text-slate-500 space-y-0.5">{mobileMeta(row)}</div>
                                )}
                                {mobileBadges && (
                                    <div className="mt-3 flex flex-wrap gap-2">{mobileBadges(row)}</div>
                                )}
                            </div>
                            <div className="shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>{mobileActions(row)}</div>
                        </div>
                    </div>
                ))}
                {footer && <div>{footer}</div>}
            </div>

            {/* MD+: tabla */}
            <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ring-1 ring-black/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className={cn(
                                            "px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400",
                                            col.className
                                        )}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                            {rows.map((row) => (
                                <tr
                                    key={getRowKey(row)}
                                    className={cn(
                                        "hover:bg-brand-50/40 transition-colors",
                                        onRowClick && "cursor-pointer"
                                    )}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={cn("px-4 py-3.5 align-middle text-slate-600", col.className)}
                                        >
                                            {col.key === 'actions' ? (
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    {col.render(row)}
                                                </div>
                                            ) : (
                                                col.render(row)
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Footer natural — pagination lives inside the card */}
                {footer && <div>{footer}</div>}
            </div>
        </>
    );
}
