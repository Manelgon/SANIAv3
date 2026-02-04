import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { PatientForm } from "../users/PatientForm";

interface CreatePatientModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreatePatientModal({ isOpen, onClose }: CreatePatientModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] bg-white border-2 border-brand-200">
                <DialogHeader className="border-b border-gray-100 pb-4">
                    <DialogTitle className="text-xl font-bold text-gray-900">
                        Registrar Nuevo Paciente
                    </DialogTitle>
                    <p className="text-xs text-gray-500 mt-1">
                        Completa los datos para dar de alta a un nuevo paciente en la plataforma.
                    </p>
                </DialogHeader>

                <div className="mt-4">
                    <PatientForm
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
