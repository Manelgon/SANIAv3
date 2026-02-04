import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { PractitionerForm } from "./PractitionerForm";
import { PatientForm } from "./PatientForm";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type UserType = 'practitioner' | 'patient';

export function CreateUserModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [userType, setUserType] = useState<UserType>('practitioner');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] bg-white border-2 border-brand-200">
                <DialogHeader className="border-b border-gray-100 pb-4">
                    <DialogTitle className="text-xl font-bold text-gray-900">
                        {userType === 'practitioner' ? 'Registrar Nuevo Facultativo' : 'Registrar Nuevo Paciente'}
                    </DialogTitle>
                    <div className="flex gap-2 mt-4">
                        <Button
                            variant={userType === 'practitioner' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setUserType('practitioner')}
                        >
                            Facultativo
                        </Button>
                        <Button
                            variant={userType === 'patient' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setUserType('patient')}
                        >
                            Paciente
                        </Button>
                    </div>
                </DialogHeader>

                <div className="mt-4">
                    {userType === 'practitioner' ? (
                        <PractitionerForm onSuccess={onClose} onCancel={onClose} />
                    ) : (
                        <PatientForm onSuccess={onClose} onCancel={onClose} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
