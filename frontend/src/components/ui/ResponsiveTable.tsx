
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
    isLoading?: boolean; // Added isLoading prop
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
}: ResponsiveTableProps<T>) {
    if (isLoading) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden p-8 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mb-2"></div>
                <p className="text-sm text-gray-500">Cargando datos...</p>
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
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
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

                            <div className="shrink-0 ml-2">{mobileActions(row)}</div>
                        </div>
                    </div>
                ))}
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
                                            "px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500",
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
                                    className="hover:bg-slate-50/80 transition-colors"
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={cn("px-6 py-4 align-middle text-slate-600", col.className)}
                                        >
                                            {col.render(row)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
