import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { PortfolioForm } from "./PortfolioForm";

interface CreatePortfolioModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreatePortfolioModal({ isOpen, onClose }: CreatePortfolioModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white border-2 border-brand-200">
                <DialogHeader className="border-b border-gray-100 pb-4">
                    <DialogTitle className="text-xl font-bold text-gray-900">
                        Crear Nueva Cartera
                    </DialogTitle>
                    <p className="text-xs text-gray-500 mt-1">
                        Las carteras permiten organizar a los pacientes por facultativo.
                    </p>
                </DialogHeader>

                <div className="mt-6">
                    <PortfolioForm
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
