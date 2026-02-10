import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';

interface EditReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    hoursRemaining: number;
}

export function EditReasonModal({ isOpen, onClose, onSubmit, hoursRemaining }: EditReasonModalProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!reason.trim()) {
            setError('El motivo de la edición es obligatorio');
            return;
        }

        if (reason.trim().length < 10) {
            setError('El motivo debe tener al menos 10 caracteres');
            return;
        }

        onSubmit(reason.trim());
        setReason('');
        setError('');
        onClose();
    };

    const handleClose = () => {
        setReason('');
        setError('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        Motivo de la Edición
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                        <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold">Ventana de edición activa</p>
                            <p className="text-xs mt-1">
                                Tiempo restante: <span className="font-bold">{hoursRemaining.toFixed(1)} horas</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="edit-reason" className="text-sm font-medium text-gray-700">
                            ¿Por qué necesitas editar esta consulta? <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                            id="edit-reason"
                            value={reason}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                setReason(e.target.value);
                                setError('');
                            }}
                            placeholder="Ej: Corrección de diagnóstico tras revisión de pruebas complementarias..."
                            rows={4}
                            className={error ? 'border-red-300 focus:border-red-500' : ''}
                        />
                        {error && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {error}
                            </p>
                        )}
                        <p className="text-xs text-gray-500">
                            Este motivo quedará registrado en el historial de la consulta para auditoría.
                        </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                        <p className="font-semibold mb-1">📋 Información importante:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>La versión anterior se guardará automáticamente</li>
                            <li>No se eliminará ningún dato del historial</li>
                            <li>El cambio quedará registrado con fecha y hora</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={!reason.trim()}>
                        Confirmar Edición
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
