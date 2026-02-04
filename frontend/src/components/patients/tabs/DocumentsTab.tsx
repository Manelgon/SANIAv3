import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import {
    FileText,
    Upload,
    Plus,
    FileUp,
    Download,
    Eye,
    Trash2,
    Loader2,
    Search,
    Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GenerateDocumentModal } from '@/components/patients/modals/GenerateDocumentModal';

interface DocumentsTabProps {
    patientId: string;
}

interface Document {
    id: string;
    name: string;
    url: string;
    type: string;
    category: 'administrative_generated' | 'administrative_uploaded' | 'medical_test';
    created_at: string;
    practitioner_id: string;
    practitioner?: {
        first_name: string;
        last_name_1: string;
    };
}

export function DocumentsTab({ patientId }: DocumentsTabProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, [patientId]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('patient_documents')
                .select(`
                    *,
                    practitioner:practitioners(first_name, last_name_1)
                `)
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'administrative_generated':
                return { label: 'Admin (Generado)', color: 'bg-blue-50 text-blue-700 border-blue-100' };
            case 'administrative_uploaded':
                return { label: 'Admin (Subido)', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
            case 'medical_test':
                return { label: 'Prueba Médica', color: 'bg-green-50 text-green-700 border-green-100' };
            default:
                return { label: category, color: 'bg-gray-50 text-gray-700 border-gray-100' };
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header Actions */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm h-10 px-4 gap-2"
                            onClick={() => setIsGenerateModalOpen(true)}
                        >
                            <Plus className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Generar Doc. Administrativo</span>
                        </Button>
                        <Button variant="outline" className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 h-10 px-4 gap-2">
                            <Upload className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Subir Resultado/Prueba</span>
                        </Button>
                        <Button variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 h-10 px-4 gap-2">
                            <FileUp className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Subir Doc. Administrativo</span>
                        </Button>
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar documentos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 text-brand-500 animate-spin mb-4" />
                        <p className="text-sm text-gray-500 font-medium italic">Cargando repositorio de documentos...</p>
                    </div>
                ) : filteredDocuments.length > 0 ? (
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b border-gray-100">
                                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">Fecha</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">Nombre del Documento</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">Categoría</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">Facultativo</th>
                                <th className="text-right px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredDocuments.map((doc) => {
                                const catStyle = getCategoryLabel(doc.category);
                                return (
                                    <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-600">
                                                    {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-brand-50 text-brand-600 rounded flex items-center justify-center shrink-0">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
                                                    {doc.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${catStyle.color}`}>
                                                {catStyle.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                    {doc.practitioner?.first_name?.[0]}{doc.practitioner?.last_name_1?.[0]}
                                                </div>
                                                <span className="text-sm text-gray-600 font-medium">
                                                    {doc.practitioner ? `${doc.practitioner.first_name} ${doc.practitioner.last_name_1}` : '---'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-brand-600">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-brand-600">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-20 bg-gray-50/20">
                        <div className="h-20 w-20 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-6">
                            <FileText className="h-10 w-10 text-gray-200" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Repositorio Vacío</h3>
                        <p className="text-sm text-gray-500 max-w-sm text-center mt-2 italic font-medium leading-relaxed">
                            No se han encontrado documentos vinculados a este paciente. Utilice los botones superiores para registrar nueva documentación.
                        </p>
                    </div>
                )}
            </div>

            <GenerateDocumentModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
            />
        </div >
    );
}
