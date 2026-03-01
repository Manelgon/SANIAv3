import { Modal } from '@/components/ui/Modal';
import { PatientForm } from "../users/PatientForm";
import { UserCircle, X } from 'lucide-react';

interface EditPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: any;
    onSaved?: () => void;
}

export function EditPatientModal({ isOpen, onClose, patient, onSaved }: EditPatientModalProps) {
    if (!patient) return null;

    const fullName = `${patient.first_name} ${patient.last_name_1 || ''}`.trim();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            hideHeader
            className="max-w-[860px] w-full p-0 rounded-xl relative"
            contentClassName="overflow-hidden flex flex-col"
        >
            {/* Header alineado con el modal de nuevo paciente */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-brand-600/10 flex items-center justify-center text-brand-600 shrink-0">
                        <UserCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-slate-900 text-base font-bold leading-tight">
                            Editar Información del Paciente
                        </h2>
                        <p className="text-slate-500 text-xs font-medium mt-0.5">
                            Estás editando la ficha de <span className="font-bold text-brand-600">{fullName}</span>. Solo se permite actualizar la dirección y los datos clínicos.
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

            {/* Body — mismo formulario que nuevo paciente, en modo edición */}
            <div className="flex-1 overflow-y-auto min-h-0 p-6">
                <PatientForm
                    isEdit={true}
                    initialData={patient}
                    onSuccess={() => {
                        onSaved ? onSaved() : onClose();
                    }}
                    onCancel={onClose}
                />
            </div>
        </Modal>
    );
}
