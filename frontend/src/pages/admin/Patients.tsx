import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { TableColumnSelector, type ColumnDefinition } from "@/components/ui/TableColumnSelector";
import { Plus, Search, MoreVertical, FileText, Calendar, Venus, Mars, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreatePatientModal } from "@/components/patients/CreatePatientModal";
import { EditPatientModal } from "@/components/patients/EditPatientModal";
import { PatientDetailView } from "@/components/patients/PatientDetailView";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";

interface Patient {
    id: string;
    practitioner_id: string;
    portfolio_id: string;
    portfolio_name: string | null;
    first_name: string;
    last_name_1: string;
    last_name_2: string;
    cip: string;
    dni: string;
    birth_date: string;
    gender: string | null;
    blood_group: string | null;
    height: number | null;
    weight: number | null;
    background: string | null;
    habits: string | null;
    locality: string | null;
    insured_number: string | null;
    address: any | null;
    phone: string | null;
    emergency_phone: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    total_count?: number;
}

const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const calculateIMC = (weight: number | null, height: number | null) => {
    if (!weight || !height) return "-";
    const heightInMeters = height / 100;
    const imc = weight / (heightInMeters * heightInMeters);
    return imc.toFixed(1);
};

async function fetchPatientsFn(page: number, search: string, pageSize: number) {
    const { data, error } = await (supabase as any).rpc('get_patients_list', {
        p_search: search || null,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
    });
    if (error) throw error;
    const list = (data as any[]) || [];
    return { data: list, count: list[0]?.total_count || 0 };
}

export default function PatientsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(() => {
        const saved = localStorage.getItem('patients_page_size');
        return saved ? Number(saved) : 20;
    });

    // Column Visibility State
    const allColumns: ColumnDefinition[] = [
        { id: 'patient', label: 'Paciente', alwaysVisible: true },
        { id: 'cip', label: 'CIP' },
        { id: 'dni', label: 'DNI' },
        { id: 'phone', label: 'Teléfono' },
        { id: 'gender', label: 'Género' },
        { id: 'portfolio', label: 'Cartera/ID' },
        { id: 'insured_number', label: 'Póliza' },
        { id: 'blood_group', label: 'G.S.' },
        { id: 'age', label: 'Edad' },
        { id: 'imc', label: 'IMC' },
        { id: 'birth_date', label: 'F. Nacimiento' },
        { id: 'address', label: 'Dirección' },
        { id: 'background', label: 'Antecedentes' },
        { id: 'habits', label: 'Hábitos' },
        { id: 'last_sign_in_at', label: 'Última sesión' },
        { id: 'created_at', label: 'Creación' }
    ];
    // Load saved columns from localStorage or default
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('patients_table_columns');
        return saved ? JSON.parse(saved) : ['patient', 'cip', 'dni', 'phone', 'gender', 'blood_group', 'age', 'imc', 'birth_date', 'last_sign_in_at', 'created_at'];
    });

    const toggleColumn = (columnId: string) => {
        setVisibleColumns(prev => {
            const newColumns = prev.includes(columnId)
                ? prev.filter(id => id !== columnId)
                : [...prev, columnId];

            // Save to localStorage
            localStorage.setItem('patients_table_columns', JSON.stringify(newColumns));
            return newColumns;
        });
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
        queryKey: ['patients', currentPage, debouncedSearch, pageSize],
        queryFn: () => fetchPatientsFn(currentPage, debouncedSearch, pageSize),
        placeholderData: (prev) => prev,
    });

    const patients: Patient[] = queryResult?.data ?? [];
    const totalCount = queryResult?.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const selectedPatient = id ? (patients.find(p => p.id === id) ?? null) : null;

    if (selectedPatient) {
        return (
            <PatientDetailView
                patient={selectedPatient}
                onBack={() => {
                    const basePath = window.location.pathname.split('/patients')[0] + '/patients';
                    navigate(basePath);
                }}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mis Pacientes</h1>
                    <p className="text-sm text-slate-500">Listado de pacientes asignados a tus carteras.</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-4 py-2 font-bold text-sm shadow-sm">
                    <Plus className="h-4 w-4" />
                    Nuevo Paciente
                </Button>
            </div>

            {/* Search + Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, CIP o DNI..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-900 placeholder:text-slate-400 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            ×
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <TableColumnSelector
                        columns={allColumns}
                        visibleColumns={visibleColumns}
                        onToggleColumn={toggleColumn}
                    />
                    {totalCount > 0 && (
                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                            {totalCount} paciente{totalCount !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>

            <ResponsiveTable<Patient>
                isLoading={isLoading}
                rows={patients}
                columns={[
                    ...allColumns.filter(col => visibleColumns.includes(col.id)).map(col => {
                        const baseCol = {
                            key: col.id,
                            header: col.label,
                            className: '',
                        };

                        switch (col.id) {
                            case 'patient':
                                return {
                                    ...baseCol, render: (patient: Patient) => (
                                        <button
                                            onClick={() => {
                                                const basePath = window.location.pathname.split('/patients')[0] + '/patients';
                                                navigate(`${basePath}/${patient.id}`);
                                            }}
                                            className="flex items-center gap-3 text-left group"
                                        >
                                            <div className="size-9 rounded-lg bg-brand-600 text-white flex items-center justify-center font-black text-sm shrink-0 select-none group-hover:bg-brand-700 transition-colors">
                                                {`${patient.last_name_1?.charAt(0) ?? ''}${patient.first_name?.charAt(0) ?? ''}`.toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 text-sm group-hover:text-brand-600 transition-colors leading-tight">
                                                    {patient.last_name_1} {patient.last_name_2}, {patient.first_name}
                                                </span>
                                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">Ver ficha →</span>
                                            </div>
                                        </button>
                                    )
                                };
                            case 'cip':
                                return {
                                    ...baseCol, render: (patient: Patient) => (
                                        <div className="flex items-center gap-2">
                                            <div className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-600">
                                                {patient.cip || 'S/N'}
                                            </div>
                                        </div>
                                    )
                                };
                            case 'dni':
                                return { ...baseCol, render: (patient: Patient) => <span className="text-sm text-gray-500 font-mono">{patient.dni}</span> };
                            case 'phone':
                                return { ...baseCol, render: (patient: Patient) => <span className="text-sm text-gray-500 font-mono">{patient.phone || "-"}</span> };
                            case 'gender':
                                return {
                                    ...baseCol, render: (patient: Patient) => (
                                        <div className="flex justify-center">
                                            {patient.gender === 'hombre' ? (
                                                <div className="flex flex-col items-center gap-1 group/gender relative">
                                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                                                        <Mars className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase">H</span>
                                                </div>
                                            ) : patient.gender === 'mujer' ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="p-1.5 bg-pink-50 text-pink-600 rounded-lg border border-pink-100">
                                                        <Venus className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-pink-600 uppercase">M</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 capitalize text-xs">
                                                    {patient.gender || "-"}
                                                </span>
                                            )}
                                        </div>
                                    )
                                };
                            case 'portfolio':
                                return {
                                    ...baseCol, render: (patient: Patient) => (
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {patient.portfolio_name || "Sin Cartera"}
                                            </span>
                                            <span className="text-[10px] font-mono text-gray-400">
                                                {patient.portfolio_id?.split('-')[0] || "---"}
                                            </span>
                                        </div>
                                    )
                                };
                            case 'insured_number':
                                return { ...baseCol, render: (patient: Patient) => <span className="text-xs text-gray-500 font-medium">{patient.insured_number || "-"}</span> };
                            case 'blood_group':
                                return {
                                    ...baseCol, render: (patient: Patient) => (
                                        <span className="px-2 py-1 bg-red-50 text-red-700 text-[11px] font-bold rounded-md border border-red-100">
                                            {patient.blood_group || "-"}
                                        </span>
                                    )
                                };
                            case 'age':
                                return { ...baseCol, render: (patient: Patient) => <span className="font-medium text-gray-700">{calculateAge(patient.birth_date)}</span> };
                            case 'imc':
                                return {
                                    ...baseCol, render: (patient: Patient) => (
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-gray-900">{calculateIMC(patient.weight, patient.height)}</span>
                                            {(patient.weight && patient.height) && (
                                                <span className="text-[9px] text-gray-400 capitalize">{patient.weight}kg / {patient.height}cm</span>
                                            )}
                                        </div>
                                    )
                                };
                            case 'birth_date':
                                return {
                                    ...baseCol, render: (patient: Patient) => (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Calendar className="h-3.5 w-3.5 text-brand-500" />
                                            {format(new Date(patient.birth_date), "dd/MM/yyyy")}
                                        </div>
                                    )
                                };
                            case 'address':
                                return { ...baseCol, render: (patient: Patient) => <span className="text-xs text-gray-500 max-w-[200px] truncate block">{patient.address?.street ? `${patient.address.street}, ${patient.address.province}` : "-"}</span> };
                            case 'background':
                                return { ...baseCol, render: (patient: Patient) => <span className="text-xs text-gray-500 max-w-[200px] truncate block">{patient.background || "-"}</span> };
                            case 'habits':
                                return { ...baseCol, render: (patient: Patient) => <span className="text-xs text-gray-500 max-w-[200px] truncate block">{patient.habits || "-"}</span> };
                            case 'last_sign_in_at':
                                return { ...baseCol, render: (patient: Patient) => <span className="text-sm text-gray-500">{patient.last_sign_in_at ? format(new Date(patient.last_sign_in_at), 'dd/MM/yyyy HH:mm', { locale: es }) : "Nunca"}</span> };
                            case 'created_at':
                                return {
                                    ...baseCol, render: (patient: Patient) => (
                                        <div className="flex items-center gap-2 text-xs justify-center text-gray-500">
                                            <FileText className="h-3.5 w-3.5 text-gray-400" />
                                            {format(new Date(patient.created_at), "d 'de' MMM, yyyy", { locale: es })}
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
                        render: (patient: Patient) => (
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => {
                                        const basePath = window.location.pathname.split('/patients')[0] + '/patients';
                                        navigate(`${basePath}/${patient.id}`);
                                    }}
                                    className="p-2 text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-all shadow-sm"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        setPatientToEdit(patient);
                                        setIsEditModalOpen(true);
                                    }}
                                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all active:scale-95"
                                >
                                    <MoreVertical className="h-5 w-5" />
                                </button>
                            </div>
                        )
                    }
                ]}
                getRowKey={(row) => row.id}
                mobileTitle={(row) => `${row.last_name_1} ${row.last_name_2}, ${row.first_name}`}
                mobileMeta={(row) => (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                        {row.cip && <span className="font-mono bg-gray-100 px-1 rounded">CIP: {row.cip}</span>}
                        <span className="font-mono">DNI: {row.dni}</span>
                    </div>
                )}
                mobileBadges={(row) => (
                    <>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {calculateAge(row.birth_date)} años
                        </span>
                        {row.gender && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${row.gender === 'hombre' ? 'bg-blue-50 text-blue-700' :
                                row.gender === 'mujer' ? 'bg-pink-50 text-pink-700' : 'bg-gray-50 text-gray-600'
                                }`}>
                                {row.gender}
                            </span>
                        )}
                        {row.portfolio_name && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
                                {row.portfolio_name}
                            </span>
                        )}
                    </>
                )}
                mobileActions={(row) => (
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => {
                                const basePath = window.location.pathname.split('/patients')[0] + '/patients';
                                navigate(`${basePath}/${row.id}`);
                            }}
                            className="p-3 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors shadow-sm"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    </div>
                )}
                emptyMessage="No se encontraron pacientes"
                footer={
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); localStorage.setItem('patients_page_size', String(size)); }}
                    />
                }
            />

            <CreatePatientModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    refetch();
                }}
            />
            <EditPatientModal
                isOpen={isEditModalOpen}
                patient={patientToEdit}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setPatientToEdit(null);
                    refetch();
                }}
            />
        </div >
    );
}
