import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { PatientForm } from "../users/PatientForm";

interface EditPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: any;
}

export function EditPatientModal({ isOpen, onClose, patient }: EditPatientModalProps) {
    if (!patient) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] bg-white border-2 border-brand-200">
                <DialogHeader className="border-b border-gray-100 pb-4">
                    <DialogTitle className="text-xl font-bold text-gray-900">
                        Editar Información del Paciente
                    </DialogTitle>
                    <p className="text-xs text-gray-500 mt-1">
                        Estás editando la ficha de <span className="font-bold text-brand-600">{patient.first_name} {patient.last_name_1}</span>. Solo se permite actualizar la dirección y datos clínicos.
                    </p>
                </DialogHeader>

                <div className="mt-4">
                    <PatientForm
                        isEdit={true}
                        initialData={patient}
                        onSuccess={() => {
                            onClose();
                        }}
                        onCancel={onClose}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
