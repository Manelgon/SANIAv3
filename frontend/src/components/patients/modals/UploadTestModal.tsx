import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import {
    FlaskConical, Scan, Radiation, Brain, Activity, HeartPulse,
    Microscope, Wind, Zap, Bone, Upload, FileText, X, ChevronRight,
    CheckCircle2, Loader2, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface UploadTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    onUploaded?: () => void;
}

type TestType = {
    id: string;
    label: string;
    description: string;
    icon: any;
    color: string;
};

const TEST_TYPES: TestType[] = [
    { id: 'analitica',      label: 'Analítica',             description: 'Hemograma, bioquímica, orina...', icon: FlaskConical,  color: 'text-rose-500 bg-rose-50 border-rose-100'     },
    { id: 'radiografia',    label: 'Radiografía',           description: 'Tórax, columna, extremidades...', icon: Scan,          color: 'text-sky-500 bg-sky-50 border-sky-100'         },
    { id: 'tac',            label: 'TAC / Escáner',         description: 'Tomografía axial computarizada.', icon: Radiation,     color: 'text-amber-500 bg-amber-50 border-amber-100'   },
    { id: 'resonancia',     label: 'Resonancia Magnética',  description: 'Cerebro, columna, articulaciones.',icon: Brain,        color: 'text-violet-500 bg-violet-50 border-violet-100'},
    { id: 'ecografia',      label: 'Ecografía',             description: 'Abdominal, pélvica, vascular...',  icon: Activity,     color: 'text-teal-500 bg-teal-50 border-teal-100'     },
    { id: 'electrocardiograma', label: 'ECG / Holter',      description: 'Electrocardiograma, Holter 24h.', icon: HeartPulse,   color: 'text-red-500 bg-red-50 border-red-100'         },
    { id: 'biopsia',        label: 'Biopsia / Anatomía P.', description: 'Resultados anatomopatológicos.',  icon: Microscope,   color: 'text-orange-500 bg-orange-50 border-orange-100'},
    { id: 'espirometria',   label: 'Espirometría',          description: 'Función pulmonar y flujos.',      icon: Wind,          color: 'text-cyan-500 bg-cyan-50 border-cyan-100'     },
    { id: 'electroencefalograma', label: 'EEG',             description: 'Electroencefalograma.',           icon: Zap,          color: 'text-yellow-500 bg-yellow-50 border-yellow-100'},
    { id: 'densitometria',  label: 'Densitometría',         description: 'Medición de densidad ósea.',      icon: Bone,          color: 'text-stone-500 bg-stone-50 border-stone-100'  },
    { id: 'cultivo',        label: 'Cultivo / Microb.',     description: 'Cultivos, antibiogramas...',      icon: FlaskConical,  color: 'text-green-500 bg-green-50 border-green-100'  },
    { id: 'otro',           label: 'Otro',                  description: 'Otro tipo de prueba o resultado.', icon: FileText,     color: 'text-slate-500 bg-slate-50 border-slate-200'  },
];

const TIPO_LABELS: Record<string, string> = Object.fromEntries(TEST_TYPES.map(t => [t.id, t.label]));

export function UploadTestModal({ isOpen, onClose, patientId, onUploaded }: UploadTestModalProps) {
    const { user } = useAuthStore();
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedType, setSelectedType] = useState<TestType | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [customLabel, setCustomLabel] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setStep(1);
        setSelectedType(null);
        setFile(null);
        setIsDragging(false);
        setIsUploading(false);
        setCustomLabel('');
    };

    const handleClose = () => { reset(); onClose(); };

    const handleContinue = () => {
        if (!selectedType) return;
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
        setFile(null);
    };

    const handleFileDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) setFile(dropped);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0];
        if (picked) setFile(picked);
    };

    const handleUpload = async () => {
        if (!file || !selectedType || !user?.id) return;
        setIsUploading(true);

        try {
            // Get practitioner
            const { data: practitioner, error: pErr } = await supabase
                .from('practitioners')
                .select('id')
                .eq('user_id', user.id)
                .single();
            if (pErr || !practitioner) throw new Error('Facultativo no encontrado');

            // Upload to storage
            const ext = file.name.split('.').pop();
            const storagePath = `${patientId}/${selectedType.id.toUpperCase()}_${Date.now()}.${ext}`;
            const { error: storageErr } = await supabase.storage
                .from('patient-documents')
                .upload(storagePath, file, { upsert: false });
            if (storageErr) throw storageErr;

            // Determine title
            const typeLabel = selectedType.id === 'otro' && customLabel.trim()
                ? customLabel.trim()
                : selectedType.label;
            const docTitle = `${typeLabel} · ${new Date().toLocaleDateString('es-ES')}`;

            // Insert record — store bucket/path, NOT a URL (bucket is private)
            const { error: dbErr } = await (supabase.from('patient_documents') as any).insert({
                patient_id:      patientId,
                name:            file.name,
                title:           docTitle,
                document_type:   selectedType.id,
                storage_bucket:  'patient-documents',
                storage_path:    storagePath,
                url:             null,           // legacy field, left null for new records
                type:            ext || 'pdf',
                category:        'medical_test',
                practitioner_id: (practitioner as any).id,
            });
            if (dbErr) throw dbErr;

            toast.success(`${typeLabel} subida correctamente`);
            onUploaded?.();
            handleClose();
        } catch (err: any) {
            console.error('Upload error:', err);
            toast.error('Error al subir el archivo: ' + (err.message || 'Error desconocido'));
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[720px] bg-white border border-slate-200 p-0 overflow-hidden rounded-2xl shadow-xl">

                {/* ── HEADER ───────────────────────────────────────── */}
                <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <Upload className="h-4 w-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-slate-900">
                                Subir Resultado / Prueba Médica
                            </DialogTitle>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {step === 1 ? 'Paso 1 de 2 — Selecciona el tipo de prueba' : `Paso 2 de 2 — Adjunta el archivo · ${selectedType?.label}`}
                            </p>
                        </div>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mt-3">
                        <div className={cn('h-1.5 flex-1 rounded-full transition-all', step >= 1 ? 'bg-primary' : 'bg-slate-200')} />
                        <div className={cn('h-1.5 flex-1 rounded-full transition-all', step >= 2 ? 'bg-primary' : 'bg-slate-200')} />
                    </div>
                </DialogHeader>

                {/* ── STEP 1: Type selection ────────────────────────── */}
                {step === 1 && (
                    <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                            {TEST_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type)}
                                    className={cn(
                                        'relative text-left rounded-xl border-2 p-3.5 flex items-start gap-3 transition-all',
                                        selectedType?.id === type.id
                                            ? 'border-primary bg-primary/5 ring-2 ring-primary/10'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                    )}
                                >
                                    <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0 border', type.color)}>
                                        <type.icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn('text-sm font-bold leading-tight', selectedType?.id === type.id ? 'text-primary' : 'text-slate-800')}>
                                            {type.label}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                                            {type.description}
                                        </p>
                                    </div>
                                    {selectedType?.id === type.id && (
                                        <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Custom label if "Otro" */}
                        {selectedType?.id === 'otro' && (
                            <div className="mt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                    Especifica el tipo de prueba
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Gammagrafía ósea, PET-CT..."
                                    value={customLabel}
                                    onChange={e => setCustomLabel(e.target.value)}
                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* ── STEP 2: File upload ───────────────────────────── */}
                {step === 2 && (
                    <div className="px-6 py-5">

                        {/* Selected type recap */}
                        {selectedType && (
                            <div className={cn('flex items-center gap-3 p-3 rounded-xl border mb-5', selectedType.color)}>
                                <div className={cn('size-8 rounded-lg flex items-center justify-center border', selectedType.color)}>
                                    <selectedType.icon className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{selectedType.label}</p>
                                    <p className="text-[10px] text-slate-500">{selectedType.description}</p>
                                </div>
                            </div>
                        )}

                        {/* Drop zone */}
                        {!file ? (
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleFileDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    'border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all',
                                    isDragging
                                        ? 'border-primary bg-primary/5 scale-[1.01]'
                                        : 'border-slate-200 bg-slate-50/50 hover:border-primary/50 hover:bg-primary/5'
                                )}
                            >
                                <div className="size-14 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center mb-4 text-slate-300">
                                    <Upload className="h-7 w-7" />
                                </div>
                                <p className="text-sm font-bold text-slate-700 mb-1">
                                    {isDragging ? 'Suelta el archivo aquí' : 'Arrastra el archivo aquí'}
                                </p>
                                <p className="text-xs text-slate-400 mb-4">o haz clic para seleccionar</p>
                                <span className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors">
                                    Seleccionar archivo
                                </span>
                                <p className="text-[10px] text-slate-400 mt-4">
                                    Formatos aceptados: PDF, JPG, PNG, DICOM · Máx. 50 MB
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.dcm,.tiff"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-2xl p-4 bg-white">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{formatFileSize(file.size)}</p>
                                    </div>
                                    <button
                                        onClick={() => setFile(null)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        Archivo listo para subir
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Custom label for "otro" */}
                        {selectedType?.id === 'otro' && (
                            <div className="mt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                                    Nombre de la prueba
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Gammagrafía ósea, PET-CT..."
                                    value={customLabel}
                                    onChange={e => setCustomLabel(e.target.value)}
                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* ── FOOTER ───────────────────────────────────────── */}
                <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 max-w-xs">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        Almacenado con cifrado RGPD. Acceso restringido al equipo clínico.
                    </div>
                    <div className="flex items-center gap-2">
                        {step === 2 && (
                            <Button variant="outline" onClick={handleBack} className="h-9 text-xs font-bold">
                                ← Atrás
                            </Button>
                        )}
                        <Button variant="outline" onClick={handleClose} className="h-9 text-xs font-bold">
                            Cancelar
                        </Button>
                        {step === 1 ? (
                            <button
                                onClick={handleContinue}
                                disabled={!selectedType}
                                className="flex items-center gap-2 h-9 px-5 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
                            >
                                Continuar
                                <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleUpload}
                                disabled={!file || isUploading}
                                className="flex items-center gap-2 h-9 px-5 bg-emerald-600 text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 transition-all"
                            >
                                {isUploading ? (
                                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Subiendo...</>
                                ) : (
                                    <><Upload className="h-3.5 w-3.5" /> Subir archivo</>
                                )}
                            </button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Re-export for use in type badge mapping
export { TIPO_LABELS };
