import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { TableColumnSelector, type ColumnDefinition } from "@/components/ui/TableColumnSelector";
import { Plus, Search, MoreVertical, User, FileText, Calendar, Edit3, Venus, Mars, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreatePatientModal } from "@/components/patients/CreatePatientModal";
import { EditPatientModal } from "@/components/patients/EditPatientModal";
import { PatientDetailView } from "@/components/patients/PatientDetailView";

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
    insured_number: string | null;
    address: any | null;
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

export default function PatientsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 20;

    // Sync selected patient from URL
    useEffect(() => {
        if (id && patients.length > 0) {
            const patient = patients.find(p => p.id === id);
            if (patient) {
                setSelectedPatient(patient);
            }
        } else if (!id) {
            setSelectedPatient(null);
        }
    }, [id, patients]);

    // Column Visibility State
    const allColumns: ColumnDefinition[] = [
        { id: 'patient', label: 'Paciente', alwaysVisible: true },
        { id: 'cip', label: 'CIP' },
        { id: 'dni', label: 'DNI' },
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
        return saved ? JSON.parse(saved) : ['patient', 'cip', 'dni', 'gender', 'blood_group', 'age', 'imc', 'birth_date', 'last_sign_in_at', 'created_at'];
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

    const fetchPatients = async (page: number = 1, search: string = "") => {
        setIsLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const { data, error } = await (supabase as any).rpc('get_patients_list', {
                p_search: search || null,
                p_limit: pageSize,
                p_offset: (page - 1) * pageSize
            }, {
                abortSignal: controller.signal
            });

            if (error) throw error;
            const patientsData = (data as any[]) || [];
            setPatients(patientsData);
            setTotalCount(patientsData[0]?.total_count || 0);
        } catch (error: any) {
            console.error("Error fetching patients:", error);
            if (error.name === 'AbortError') {
                console.error("Fetch patients timed out");
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
        fetchPatients(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch]);

    const totalPages = Math.ceil(totalCount / pageSize);

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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestión de Pacientes</h1>
                    <p className="text-sm text-gray-500">Administra la base de datos de pacientes y sus historias clínicas.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, CIP o DNI..."
                            className="h-10 w-72 rounded-md border border-gray-300 bg-white pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <TableColumnSelector
                        columns={allColumns}
                        visibleColumns={visibleColumns}
                        onToggleColumn={toggleColumn}
                    />
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Paciente
                    </Button>
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto overflow-y-visible pb-20">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                {visibleColumns.includes('patient') && <th className="px-6 py-3 font-medium">Paciente</th>}
                                {visibleColumns.includes('cip') && <th className="px-6 py-3 font-medium">CIP</th>}
                                {visibleColumns.includes('dni') && <th className="px-6 py-3 font-medium text-left">DNI</th>}
                                {visibleColumns.includes('gender') && <th className="px-6 py-3 font-medium text-center">Sexo</th>}
                                {visibleColumns.includes('portfolio') && <th className="px-6 py-3 font-medium text-left">Cartera/ID</th>}
                                {visibleColumns.includes('insured_number') && <th className="px-6 py-3 font-medium text-center">Póliza</th>}
                                {visibleColumns.includes('blood_group') && <th className="px-6 py-3 font-medium text-center">G.S.</th>}
                                {visibleColumns.includes('age') && <th className="px-6 py-3 font-medium text-center">Edad</th>}
                                {visibleColumns.includes('imc') && <th className="px-6 py-3 font-medium text-center">IMC</th>}
                                {visibleColumns.includes('birth_date') && <th className="px-6 py-3 font-medium">F. Nacimiento</th>}
                                {visibleColumns.includes('address') && <th className="px-6 py-3 font-medium">Dirección</th>}
                                {visibleColumns.includes('background') && <th className="px-6 py-3 font-medium">Antecedentes</th>}
                                {visibleColumns.includes('habits') && <th className="px-6 py-3 font-medium">Hábitos</th>}
                                {visibleColumns.includes('last_sign_in_at') && <th className="px-6 py-3 font-medium text-center">Última sesión</th>}
                                {visibleColumns.includes('created_at') && <th className="px-6 py-3 font-medium text-center">Creación</th>}
                                <th className="px-6 py-3 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium">Cargando pacientes...</span>
                                                <button
                                                    onClick={() => fetchPatients()}
                                                    className="text-xs text-brand-600 hover:text-brand-700 font-bold underline"
                                                >
                                                    ¿Tarda demasiado? Reintentar
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : patients.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.length + 1} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron pacientes
                                    </td>
                                </tr>
                            ) : (
                                patients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                                        {visibleColumns.includes('patient') && (
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => {
                                                        const basePath = window.location.pathname.split('/patients')[0] + '/patients';
                                                        navigate(`${basePath}/${patient.id}`);
                                                    }}
                                                    className="flex items-center gap-3 text-left hover:opacity-75 transition-opacity group"
                                                >
                                                    <div className="h-9 w-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center border border-brand-100 group-hover:bg-brand-100 transition-colors">
                                                        <User className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900 text-base group-hover:text-brand-600 transition-colors">
                                                            {patient.last_name_1} {patient.last_name_2}, {patient.first_name}
                                                        </span>
                                                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Ver ficha</span>
                                                    </div>
                                                </button>
                                            </td>
                                        )}
                                        {visibleColumns.includes('cip') && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-600">
                                                        {patient.cip || 'S/N'}
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('dni') && (
                                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                                {patient.dni}
                                            </td>
                                        )}
                                        {visibleColumns.includes('gender') && (
                                            <td className="px-6 py-4 text-center">
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
                                            </td>
                                        )}
                                        {visibleColumns.includes('portfolio') && (
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {patient.portfolio_name || "Sin Cartera"}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-gray-400">
                                                        {patient.portfolio_id?.split('-')[0] || "---"}
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('insured_number') && (
                                            <td className="px-6 py-4 text-center text-xs text-gray-500 font-medium">
                                                {patient.insured_number || "-"}
                                            </td>
                                        )}
                                        {visibleColumns.includes('blood_group') && (
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-1 bg-red-50 text-red-700 text-[11px] font-bold rounded-md border border-red-100">
                                                    {patient.blood_group || "-"}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.includes('age') && (
                                            <td className="px-6 py-4 text-center font-medium text-gray-700">
                                                {calculateAge(patient.birth_date)}
                                            </td>
                                        )}
                                        {visibleColumns.includes('imc') && (
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-gray-900">{calculateIMC(patient.weight, patient.height)}</span>
                                                    {(patient.weight && patient.height) && (
                                                        <span className="text-[9px] text-gray-400 capitalize">{patient.weight}kg / {patient.height}cm</span>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('birth_date') && (
                                            <td className="px-6 py-4 text-gray-500">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Calendar className="h-3.5 w-3.5 text-brand-500" />
                                                    {format(new Date(patient.birth_date), "dd/MM/yyyy")}
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.includes('address') && (
                                            <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">
                                                {patient.address?.street ? `${patient.address.street}, ${patient.address.province}` : "-"}
                                            </td>
                                        )}
                                        {visibleColumns.includes('background') && (
                                            <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">
                                                {patient.background || "-"}
                                            </td>
                                        )}
                                        {visibleColumns.includes('habits') && (
                                            <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">
                                                {patient.habits || "-"}
                                            </td>
                                        )}
                                        {visibleColumns.includes('last_sign_in_at') && (
                                            <td className="px-6 py-4 text-center text-sm text-gray-500">
                                                {patient.last_sign_in_at ? format(new Date(patient.last_sign_in_at), 'dd/MM/yyyy HH:mm', { locale: es }) : "Nunca"}
                                            </td>
                                        )}
                                        {visibleColumns.includes('created_at') && (
                                            <td className="px-6 py-4 text-center text-sm text-gray-500">
                                                <div className="flex items-center gap-2 text-xs justify-center">
                                                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                                                    {format(new Date(patient.created_at), "d 'de' MMM, yyyy", { locale: es })}
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-right relative">
                                            <button
                                                onClick={() => setOpenDropdownId(openDropdownId === patient.id ? null : patient.id)}
                                                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all active:scale-95"
                                            >
                                                <MoreVertical className="h-5 w-5" />
                                            </button>

                                            {openDropdownId === patient.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setOpenDropdownId(null)}
                                                    ></div>
                                                    <div className={`absolute right-6 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-20 py-1.5 animate-in fade-in zoom-in-95 duration-100 ${patients.indexOf(patient) >= Math.max(0, patients.length - 2) && patients.length > 2
                                                        ? "bottom-full mb-1 origin-bottom-right"
                                                        : "mt-1 origin-top-right"
                                                        }`}>
                                                        <button
                                                            onClick={() => {
                                                                const basePath = window.location.pathname.split('/patients')[0] + '/patients';
                                                                navigate(`${basePath}/${patient.id}`);
                                                                setOpenDropdownId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                                                        >
                                                            <User className="h-4 w-4" />
                                                            Ver Ficha Completa
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setPatientToEdit(patient);
                                                                setIsEditModalOpen(true);
                                                                setOpenDropdownId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                            Editar Información
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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

            <CreatePatientModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    fetchPatients(currentPage, searchTerm);
                }}
            />
            <EditPatientModal
                isOpen={isEditModalOpen}
                patient={patientToEdit}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setPatientToEdit(null);
                    fetchPatients(currentPage, searchTerm);
                }}
            />
        </div >
    );
}
