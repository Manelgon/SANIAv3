import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import {
    FileText,
    Download,
    Eye,
    Trash2,
    Loader2,
    Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PractitionerDocument {
    id: string;
    name: string;
    url: string;
    type: string;
    category: 'diploma' | 'medical_license' | 'insurance' | 'other';
    created_at: string;
}

interface PractitionerDocumentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    practitionerId: string;
    practitionerName: string;
}

export function PractitionerDocumentsModal({
    isOpen,
    onClose,
    practitionerId,
    practitionerName
}: PractitionerDocumentsModalProps) {
    const [documents, setDocuments] = useState<PractitionerDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && practitionerId) {
            fetchDocuments();
        }
    }, [isOpen, practitionerId]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase
                .from('practitioner_documents') as any)
                .select('*')
                .eq('practitioner_id', practitionerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error('Error fetching practitioner documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, url: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) return;

        try {
            // Delete from storage
            const filePath = url.split('/').pop();
            if (filePath) {
                await supabase.storage
                    .from('practitioner-documents')
                    .remove([`documents/${practitionerId}/${filePath}`]);
            }

            // Delete from DB
            const { error } = await (supabase
                .from('practitioner_documents') as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
            setDocuments(documents.filter(doc => doc.id !== id));
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Error al eliminar el documento');
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'diploma': return { label: 'Título/Diploma', color: 'bg-blue-50 text-blue-700 border-blue-100' };
            case 'medical_license': return { label: 'Licencia Médica', color: 'bg-green-50 text-green-700 border-green-100' };
            case 'insurance':
                return { label: 'Seguro R.C.', color: 'bg-green-50 text-green-700 border-green-100' };
            case 'signature_stamp':
                return { label: 'Firma/Sello', color: 'bg-purple-50 text-purple-700 border-purple-100' };
            default:
                return { label: 'Otro', color: 'bg-gray-50 text-gray-700 border-gray-100' };
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] bg-white border-2 border-brand-200">
                <DialogHeader className="border-b border-gray-100 pb-4">
                    <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-brand-600" />
                        Documentación de {practitionerName}
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4 min-h-[400px] max-h-[60vh] overflow-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 text-brand-500 animate-spin mb-4" />
                            <p className="text-sm text-gray-500">Cargando documentos...</p>
                        </div>
                    ) : documents.length > 0 ? (
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Documento</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</th>
                                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {documents.map((doc) => {
                                    const catStyle = getCategoryLabel(doc.category);
                                    return (
                                        <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: es })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-brand-50 text-brand-600 rounded flex items-center justify-center shrink-0">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-bold text-gray-900 group-hover:text-brand-600 transition-colors truncate max-w-[200px]">
                                                        {doc.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${catStyle.color}`}>
                                                    {catStyle.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-brand-600"
                                                        onClick={() => window.open(doc.url, '_blank')}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-brand-600"
                                                        onClick={() => window.open(doc.url, '_blank')}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                                                        onClick={() => handleDelete(doc.id, doc.url)}
                                                    >
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
                        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/20 rounded-lg">
                            <FileText className="h-12 w-12 text-gray-200 mb-4" />
                            <p className="text-gray-500 font-medium italic">No hay documentos registrados para este facultativo.</p>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t flex justify-end">
                    <Button onClick={onClose}>Cerrar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
