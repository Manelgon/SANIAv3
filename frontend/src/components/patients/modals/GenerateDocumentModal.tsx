import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { FileText, Calendar, ShieldCheck, UserCheck, AlertCircle, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerateDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type DocumentType = {
    id: string;
    title: string;
    description: string;
    icon: any;
    status: 'active' | 'coming_soon';
    category: 'consultation' | 'general' | 'internal';
};

export function GenerateDocumentModal({ isOpen, onClose }: GenerateDocumentModalProps) {
    const documentTypes: DocumentType[] = [
        // A. Consultation Related
        {
            id: 'consultation_report',
            title: 'Informe de Consulta',
            description: 'Diagnóstico y observaciones. Vinculado a visita.',
            icon: FileText,
            status: 'coming_soon',
            category: 'consultation'
        },
        {
            id: 'attendance_proof',
            title: 'Justificante de Asistencia',
            description: 'Solo fecha, hora y centro. Sin diagnóstico.',
            icon: Calendar,
            status: 'coming_soon',
            category: 'consultation'
        },
        {
            id: 'medical_certificate',
            title: 'Certificado Médico Simple',
            description: 'Constancia de atención sin detalle patológico.',
            icon: FileSignature,
            status: 'coming_soon',
            category: 'consultation'
        },
        // B. General Administrative
        {
            id: 'rgpd_consent',
            title: 'Consentimiento RGPD + ARSOPL',
            description: 'Cláusulas obligatorias de protección de datos.',
            icon: ShieldCheck,
            status: 'coming_soon',
            category: 'general'
        },
        {
            id: 'representative_auth',
            title: 'Autorización Representante',
            description: 'Para menores o personas dependientes.',
            icon: UserCheck,
            status: 'active',
            category: 'general'
        },
        {
            id: 'consent_revocation',
            title: 'Revocación de Consentimiento',
            description: 'Retirada de permisos previamente otorgados.',
            icon: AlertCircle,
            status: 'active',
            category: 'general'
        },
        // C. Internal
    ];

    const renderSection = (title: string, category: string) => (
        <div className="mb-4 last:mb-0">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">{title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documentTypes.filter(d => d.category === category).map((doc) => (
                    <div
                        key={doc.id}
                        className={cn(
                            "relative overflow-hidden rounded-lg border p-3 flex items-start gap-3 transition-all",
                            doc.status === 'active'
                                ? "bg-white border-gray-200 hover:border-brand-300 hover:shadow-md cursor-pointer group"
                                : "bg-gray-50 border-gray-100 opacity-80 cursor-not-allowed"
                        )}
                        onClick={() => {
                            if (doc.status === 'active') {
                                // TODO: Handle generation
                                console.log('Generate', doc.id);
                            }
                        }}
                    >
                        {/* Icon */}
                        <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                            doc.status === 'active' ? "bg-brand-50 text-brand-600 group-hover:bg-brand-100" : "bg-gray-100 text-gray-400"
                        )}>
                            <doc.icon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className={cn(
                                    "text-sm font-bold truncate pr-2",
                                    doc.status === 'active' ? "text-gray-900 group-hover:text-brand-700" : "text-gray-500"
                                )}>
                                    {doc.title}
                                </span>
                                {doc.status === 'coming_soon' && (
                                    <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                        Próximamente
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">
                                {doc.description}
                            </p>
                        </div>

                        {/* Active Indicator */}
                        {doc.status === 'active' && (
                            <div className="absolute inset-0 border-2 border-transparent group-hover:border-brand-500/10 rounded-lg transition-all" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] bg-white border-2 border-brand-200 p-0 overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 bg-gray-50/30">
                    <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-brand-600" />
                        Generar Documento Administrativo
                    </DialogTitle>
                    <p className="text-sm text-gray-500 mt-1 leading-normal">
                        Seleccione el tipo de documento que desea generar.
                    </p>
                </DialogHeader>

                <div className="px-5 py-4 overflow-y-auto max-h-[70vh]">
                    {renderSection('A. Vinculados a Consulta', 'consultation')}
                    {renderSection('B. Administrativos Generales', 'general')}
                </div>

                <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/30 sm:justify-between sm:items-center gap-4">
                    <div className="flex items-start gap-2 max-w-lg text-left">
                        <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-[10px] text-gray-500 leading-tight">
                            <span className="font-bold text-blue-700 block mb-0.5">Garantía de Privacidad y RGPD</span>
                            Todos los documentos generados cumplen con el principio de minimización de datos.
                            El sistema registra automáticamente la fecha, el responsable (usted) y la versión del documento para garantizar la trazabilidad.
                        </div>
                    </div>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
