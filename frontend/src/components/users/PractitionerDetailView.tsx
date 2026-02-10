import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import {
    User,
    Mail,
    Phone,
    FileText,
    Calendar,
    MapPin,
    ArrowLeft,
    Upload,
    Trash2,
    Eye,
    Shield,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface PractitionerDocument {
    id: string;
    name: string;
    url: string;
    type: string;
    category: string;
    created_at: string;
}

export function PractitionerDetailView({ id: propId }: { id?: string }) {
    const { id: paramId } = useParams();
    const id = propId || paramId;
    const navigate = useNavigate();
    const { role } = useAuthStore();
    const isSuperAdmin = role === 'super_admin';

    const [practitioner, setPractitioner] = useState<any>(null);
    const [documents, setDocuments] = useState<PractitionerDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('other');

    // Form State (For editing)
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (id) {
            fetchPractitionerData();
        }
    }, [id]);

    const fetchPractitionerData = async () => {
        setLoading(true);
        try {
            // 1. Fetch practitioner info
            const { data, error } = await (supabase
                .from('practitioners') as any)
                .select(`
                    *,
                    user:user_id (
                        email,
                        active
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setPractitioner(data);
            setFormData(data);

            // 2. Fetch documents
            const { data: docs, error: docsError } = await (supabase
                .from('practitioner_documents') as any)
                .select('*')
                .eq('practitioner_id', id)
                .order('created_at', { ascending: false });

            console.log('Fetching documents for practitioner:', id);
            console.log('Documents fetched:', docs);
            console.log('Documents error:', docsError);

            if (docsError) throw docsError;
            setDocuments(docs || []);

        } catch (error) {
            console.error('Error fetching practitioner:', error);
            toast.error('Error al cargar la información del facultativo');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (file: File) => {
        if (!file) return;

        setUploading(true);
        setIsUploadModalOpen(false);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${id}/${Math.random()}.${fileExt}`;
            const filePath = `documents/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('practitioner-documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('practitioner-documents')
                .getPublicUrl(filePath);

            const { error: dbError } = await (supabase
                .from('practitioner_documents') as any)
                .insert({
                    practitioner_id: id,
                    name: file.name,
                    url: urlData.publicUrl,
                    type: file.type,
                    category: selectedCategory
                });

            if (dbError) throw dbError;

            toast.success('Documento subido correctamente');
            // Reset category if needed, or keep it for batch? usually reset.
            setSelectedCategory('other');
            fetchPractitionerData();
        } catch (error) {
            console.error('Error uploading:', error);
            toast.error('Error al subir el documento');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDoc = async (docId: string, url: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) return;

        try {
            // Delete from storage
            const filePath = url.split('/').pop();
            if (filePath) {
                await supabase.storage
                    .from('practitioner-documents')
                    .remove([`documents/${id}/${filePath}`]);
            }

            // Delete from DB
            const { error } = await (supabase
                .from('practitioner_documents') as any)
                .delete()
                .eq('id', docId);

            if (error) throw error;
            setDocuments(documents.filter(d => d.id !== docId));
            toast.success('Documento eliminado');
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Error al eliminar el documento');
        }
    };

    const handleUpdateCategory = async (docId: string, category: string) => {
        try {
            const { error } = await (supabase
                .from('practitioner_documents') as any)
                .update({ category })
                .eq('id', docId);

            if (error) throw error;
            toast.success('Categoría actualizada');
            setDocuments(documents.map(d => d.id === docId ? { ...d, category } : d));
        } catch (error) {
            toast.error('Error al actualizar categoría');
        }
    };

    const handleSaveProfile = async () => {
        if (!isSuperAdmin) return;

        setLoading(true);
        try {
            const { error } = await (supabase
                .from('practitioners') as any)
                .update({
                    first_name: formData.first_name,
                    last_name_1: formData.last_name_1,
                    last_name_2: formData.last_name_2,
                    dni: formData.dni,
                    phone: formData.phone,
                    emergency_phone: formData.emergency_phone,
                    license_number: formData.license_number,
                    specialty: formData.specialty,
                    bio: formData.bio,
                    address: formData.address,
                    birth_date: formData.birth_date
                })
                .eq('id', id);

            if (error) throw error;

            toast.success('Perfil actualizado correctamente');
            setEditing(false);
            fetchPractitionerData();
        } catch (error) {
            console.error('Error saving profile:', error);
            toast.error('Error al actualizar el perfil');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !practitioner) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!practitioner) return <div>No se encontró el facultativo</div>;

    const getCategoryStyles = (category: string) => {
        switch (category) {
            case 'diploma': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'medical_license': return 'bg-green-50 text-green-700 border-green-100';
            case 'insurance': return 'bg-orange-50 text-orange-700 border-orange-100';
            case 'signature_stamp': return 'bg-purple-50 text-purple-700 border-purple-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
            {/* Header */}
            <div className="bg-white p-4 lg:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {isSuperAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="rounded-full h-10 w-10 p-0">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <div className="h-14 w-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100 shrink-0">
                        <User className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 leading-tight">
                            {practitioner.first_name} {practitioner.last_name_1} {practitioner.last_name_2}
                        </h1>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{practitioner.specialty}</span>
                            <span className="h-1 w-1 rounded-full bg-gray-300" />
                            <span className="text-xs font-mono text-brand-600 font-bold">Col: {practitioner.license_number}</span>
                        </div>
                    </div>
                </div>

                {isSuperAdmin && (
                    <div className="flex gap-2">
                        {editing ? (
                            <>
                                <Button variant="outline" onClick={() => { setEditing(false); setFormData(practitioner); }}>Cancelar</Button>
                                <Button onClick={handleSaveProfile} className="bg-brand-600 hover:bg-brand-700">Guardar Cambios</Button>
                            </>
                        ) : (
                            <Button onClick={() => setEditing(true)} className="bg-brand-600 hover:bg-brand-700">Editar Perfil</Button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Info Profile */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic & Professional Info */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-brand-500" />
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Información Profesional y Personal</h3>
                            </div>
                        </div>
                        <div className="p-6 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nombre Completo</label>
                                        {editing ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                <Input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} placeholder="Nombre" />
                                                <Input value={formData.last_name_1} onChange={e => setFormData({ ...formData, last_name_1: e.target.value })} placeholder="Apellido 1" />
                                                <Input value={formData.last_name_2} onChange={e => setFormData({ ...formData, last_name_2: e.target.value })} placeholder="Apellido 2" />
                                            </div>
                                        ) : (
                                            <p className="font-bold text-gray-900">{practitioner.first_name} {practitioner.last_name_1} {practitioner.last_name_2 || ''}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">DNI / Pasaporte</label>
                                        {editing ? (
                                            <Input value={formData.dni} onChange={e => setFormData({ ...formData, dni: e.target.value })} />
                                        ) : (
                                            <p className="font-bold text-gray-900">{practitioner.dni || '---'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha de Nacimiento</label>
                                        {editing ? (
                                            <Input type="date" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} />
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-900 font-bold">
                                                <Calendar className="h-4 w-4 text-brand-500" />
                                                {practitioner.birth_date ? format(new Date(practitioner.birth_date), 'dd MMMM yyyy', { locale: es }) : '---'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Especialidad</label>
                                        {editing ? (
                                            <Input value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} />
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100">
                                                {practitioner.specialty}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nº Colegiado</label>
                                        {editing ? (
                                            <Input value={formData.license_number} onChange={e => setFormData({ ...formData, license_number: e.target.value })} />
                                        ) : (
                                            <p className="font-mono font-bold text-brand-700">{practitioner.license_number}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email de Acceso</label>
                                        <div className="flex items-center gap-2 text-gray-900 font-bold">
                                            <Mail className="h-4 w-4 text-brand-500" />
                                            {practitioner.user?.email}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Resumen Profesional / Bio</label>
                                {editing ? (
                                    <textarea
                                        className="w-full rounded-xl border-gray-200 p-3 text-sm focus:ring-brand-500 min-h-[100px]"
                                        value={formData.bio}
                                        onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 italic leading-relaxed">
                                        {practitioner.bio || "No se ha añadido ninguna biografía profesional."}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Address & Contact */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-brand-500" />
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Contacto y Ubicación</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Teléfono Principal</label>
                                        {editing ? (
                                            <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-900 font-bold">
                                                <Phone className="h-4 w-4 text-brand-500" />
                                                {practitioner.phone || '---'}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1">Teléfono Emergencias</label>
                                        {editing ? (
                                            <Input value={formData.emergency_phone} onChange={e => setFormData({ ...formData, emergency_phone: e.target.value })} />
                                        ) : (
                                            <div className="flex items-center gap-2 text-red-700 font-bold">
                                                <Phone className="h-4 w-4 text-red-500" />
                                                {practitioner.emergency_phone || '---'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Dirección</label>
                                        {editing ? (
                                            <div className="space-y-2">
                                                <Input value={formData.address?.street} onChange={e => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })} placeholder="Calle" />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input value={formData.address?.province} onChange={e => setFormData({ ...formData, address: { ...formData.address, province: e.target.value } })} placeholder="Provincia" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-gray-900 font-bold">
                                                {practitioner.address?.street || 'No especificada'}
                                                {practitioner.address?.province && <span className="block text-xs text-gray-500 mt-1 uppercase tracking-wider">{practitioner.address.province}</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Documents */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-brand-500" />
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Expediente</h3>
                            </div>
                            {isSuperAdmin && (
                                <button
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="p-1.5 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100 transition-colors cursor-pointer"
                                >
                                    <Upload className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="p-6 flex-1 overflow-auto">
                            {uploading && (
                                <div className="mb-4 p-3 bg-brand-50 rounded-xl border border-brand-100 flex items-center gap-3 animate-pulse">
                                    <Loader2 className="h-4 w-4 text-brand-500 animate-spin" />
                                    <span className="text-xs font-bold text-brand-700 uppercase tracking-widest">Subiendo...</span>
                                </div>
                            )}

                            {/* Upload Category Selection Modal */}
                            <Dialog open={isUploadModalOpen} onOpenChange={(open) => { if (!open) { setIsUploadModalOpen(false); } }}>
                                <DialogContent className="sm:max-w-md bg-white border-2 border-brand-200">
                                    <DialogHeader className="border-b border-gray-100 pb-3">
                                        <DialogTitle className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                            <Upload className="h-5 w-5 text-brand-600" />
                                            Subir Documento
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-6 pt-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">Tipo de Documento</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full rounded-xl border-gray-200 bg-gray-50 p-4 text-sm font-bold focus:ring-brand-500 outline-none appearance-none cursor-pointer"
                                                    value={selectedCategory}
                                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                                >
                                                    <option value="diploma">Título / Diploma</option>
                                                    <option value="medical_license">Licencia Médica</option>
                                                    <option value="insurance">Seguro R.C.</option>
                                                    <option value="signature_stamp">Firma / Sello</option>
                                                    <option value="other">Otro</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <ArrowLeft className="h-4 w-4 rotate-[270deg]" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold uppercase tracking-widest text-[10px]" onClick={() => { setIsUploadModalOpen(false); }}>
                                                Cancelar
                                            </Button>
                                            <label className="flex-1">
                                                <div className="w-full flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white rounded-xl h-12 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-brand-100 cursor-pointer transition-colors">
                                                    Seleccionar Archivo
                                                </div>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleUpload(file);
                                                        if (e.target) e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {uploading && (
                                <div className="mb-4 p-3 bg-brand-50 rounded-xl border border-brand-100 flex items-center gap-3 animate-pulse">
                                    <Loader2 className="h-4 w-4 text-brand-500 animate-spin" />
                                    <span className="text-xs font-bold text-brand-700 uppercase tracking-widest">Subiendo...</span>
                                </div>
                            )}

                            {documents.length > 0 ? (
                                <div className="space-y-3">
                                    {documents.map((doc) => (
                                        <div key={doc.id} className="group p-3 bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="h-7 w-7 bg-brand-50 text-brand-600 rounded flex items-center justify-center shrink-0">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-900 truncate" title={doc.name}>
                                                        {doc.name}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => window.open(doc.url, '_blank')} className="p-1 text-gray-400 hover:text-brand-600 transition-colors">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    {isSuperAdmin && (
                                                        <button onClick={() => handleDeleteDoc(doc.id, doc.url)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-autp">
                                                {isSuperAdmin ? (
                                                    <select
                                                        className="text-[9px] font-black uppercase tracking-wider border-none bg-gray-50 rounded px-2 py-0.5 outline-none cursor-pointer"
                                                        value={doc.category}
                                                        onChange={(e) => handleUpdateCategory(doc.id, e.target.value)}
                                                    >
                                                        <option value="diploma">Título</option>
                                                        <option value="medical_license">Licencia</option>
                                                        <option value="insurance">Seguro</option>
                                                        <option value="signature_stamp">Firma/Sello</option>
                                                        <option value="other">Otro</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getCategoryStyles(doc.category)}`}>
                                                        {doc.category === 'diploma' ? 'Título' :
                                                            doc.category === 'medical_license' ? 'Licencia' :
                                                                doc.category === 'insurance' ? 'Seguro' :
                                                                    doc.category === 'signature_stamp' ? 'Firma' : 'Otro'}
                                                    </span>
                                                )}
                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                                    {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                                    <FileText className="h-8 w-8 text-gray-200 mb-2" />
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sin documentos</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
