import { Modal } from '@/components/ui/Modal';
import { PatientForm } from '../users/PatientForm';
import { UserPlus, X } from 'lucide-react';

interface CreatePatientModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreatePatientModal({ isOpen, onClose }: CreatePatientModalProps) {
    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            hideHeader
            className="max-w-[860px] w-full p-0 rounded-xl relative"
            contentClassName="overflow-hidden flex flex-col"
        >
            {/* Header — mismo estilo que Detalle de Consulta */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-brand-600/10 flex items-center justify-center text-brand-600 shrink-0">
                        <UserPlus className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-slate-900 text-base font-bold leading-tight">Registrar Nuevo Paciente</h2>
                        <p className="text-slate-500 text-xs font-medium mt-0.5">
                            Completa los datos para dar de alta a un nuevo paciente en la plataforma.
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="ml-1 size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Body — formulario con scroll */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6">
                <PatientForm
                    onSuccess={() => onClose()}
                    onCancel={onClose}
                />
            </div>
        </Modal>
    );
}
