import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, User, Search, Calendar, Venus, Mars, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Patient {
    id: string;
    first_name: string;
    last_name_1: string;
    last_name_2: string | null;
    cip: string | null;
    dni: string;
    gender: string | null;
    birth_date: string;
    created_at: string;
}

interface Portfolio {
    id: string;
    name: string;
    practitioners: {
        first_name: string;
        last_name_1: string;
        last_name_2: string | null;
    };
}

interface PortfolioDetailViewProps {
    portfolioId: string;
    onBack: () => void;
}

export function PortfolioDetailView({ portfolioId, onBack }: PortfolioDetailViewProps) {
    const navigate = useNavigate();
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Portfolio Info
            const { data: portfolioData, error: portfolioError } = await supabase
                .from('portfolios')
                .select(`
                    id,
                    name,
                    practitioners (
                        first_name,
                        last_name_1,
                        last_name_2
                    )
                `)
                .eq('id', portfolioId)
                .single();

            if (portfolioError) throw portfolioError;
            setPortfolio(portfolioData as any);

            // Fetch Patients in this Portfolio
            const { data: patientsData, error: patientsError } = await supabase
                .from('patients')
                .select('*')
                .eq('portfolio_id', portfolioId)
                .order('last_name_1', { ascending: true });

            if (patientsError) throw patientsError;
            setPatients(patientsData || []);
        } catch (error) {
            console.error("Error fetching portfolio detail:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [portfolioId]);

    const filteredPatients = patients.filter(patient => {
        const query = searchTerm.toLowerCase();
        return (
            patient.first_name.toLowerCase().includes(query) ||
            patient.last_name_1.toLowerCase().includes(query) ||
            (patient.last_name_2 && patient.last_name_2.toLowerCase().includes(query)) ||
            (patient.cip && patient.cip.toLowerCase().includes(query)) ||
            patient.dni.toLowerCase().includes(query)
        );
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                <span className="text-gray-500 font-medium font-outfit">Cargando pacientes de la cartera...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="p-2 h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-gray-100 group"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-500 group-hover:text-brand-600 transition-colors" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100 flex items-center gap-1.5 shadow-sm">
                                <Briefcase className="h-3 w-3" />
                                Cartera
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                {portfolio?.id.split('-')[0]}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight font-outfit">
                            {portfolio?.name}
                        </h1>
                        <p className="text-xs text-gray-500 font-medium">
                            Facultativo: <span className="text-gray-900 font-bold">{portfolio?.practitioners.first_name} {portfolio?.practitioners.last_name_1}</span>
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar paciente en esta cartera..."
                        className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-medium text-sm text-gray-900 w-full sm:w-64 placeholder:text-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Paciente</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">CIP / DNI</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Género</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">F. Nacimiento</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredPatients.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 grayscale opacity-50">
                                        <div className="h-12 w-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                                            <User className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No hay pacientes asignados</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredPatients.map((patient) => (
                                <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => {
                                                const basePath = window.location.pathname.split('/portfolios')[0] + '/patients';
                                                navigate(`${basePath}/${patient.id}`);
                                            }}
                                            className="flex items-center gap-4 text-left group/btn"
                                        >
                                            <div className="h-10 w-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center border border-brand-100 shadow-sm group-hover/btn:bg-brand-600 group-hover/btn:text-white transition-all duration-300">
                                                <User className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 group-hover/btn:text-brand-600 transition-colors">
                                                    {patient.last_name_1} {patient.last_name_2 || ''}, {patient.first_name}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-400 group-hover/btn:text-brand-400 transition-colors uppercase tracking-wider">Ver historial clínico</span>
                                            </div>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold text-gray-700 font-mono tracking-tight">{patient.cip || 'S/N'}</span>
                                            <span className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter uppercase">{patient.dni}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            {patient.gender === 'hombre' ? (
                                                <div className="flex flex-col items-center gap-1 group/gender relative" title="Hombre">
                                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                                                        <Mars className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            ) : patient.gender === 'mujer' ? (
                                                <div className="flex flex-col items-center gap-1" title="Mujer">
                                                    <div className="p-1.5 bg-pink-50 text-pink-600 rounded-lg border border-pink-100">
                                                        <Venus className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs font-bold uppercase">{patient.gender || '-'}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-600">
                                            <Calendar className="h-3.5 w-3.5 text-brand-500" />
                                            {format(new Date(patient.birth_date), "dd/MM/yyyy", { locale: es })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const basePath = window.location.pathname.split('/portfolios')[0] + '/patients';
                                                navigate(`${basePath}/${patient.id}`);
                                            }}
                                            className="font-bold text-gray-400 hover:text-brand-600 h-9 px-4 rounded-xl"
                                        >
                                            Ver Ficha
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
