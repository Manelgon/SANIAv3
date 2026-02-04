import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { Briefcase, User, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface Practitioner {
    id: string;
    first_name: string;
    last_name_1: string;
    last_name_2: string | null;
}

interface PortfolioFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export function PortfolioForm({ onSuccess, onCancel }: PortfolioFormProps) {
    const [name, setName] = useState("");
    const [practitionerId, setPractitionerId] = useState("");
    const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { role, user } = useAuthStore();

    useEffect(() => {
        const fetchPractitioners = async () => {
            setIsLoading(true);
            try {
                let query = supabase
                    .from('practitioners')
                    .select('id, first_name, last_name_1, last_name_2')
                    .order('last_name_1');

                // If it's a practitioner, only fetch their own record
                if (role === 'practitioner' && user) {
                    query = query.eq('user_id', (user as any).id);
                }

                const { data, error } = await query as { data: Practitioner[] | null, error: any };

                if (error) throw error;
                setPractitioners(data || []);

                // If only one practitioner (common for practitioner role), auto-select it
                if (data && data.length === 1) {
                    setPractitionerId(data[0].id);
                }
            } catch (err) {
                console.error("Error fetching practitioners:", err);
                setError("No se pudieron cargar los facultativos");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPractitioners();
    }, [role, user?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !practitionerId) {
            setError("Por favor, rellena todos los campos");
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            const { error: saveError } = await (supabase
                .from('portfolios') as any)
                .insert([
                    { name, practitioner_id: practitionerId }
                ]);

            if (saveError) throw saveError;
            onSuccess();
        } catch (err: any) {
            console.error("Error saving portfolio:", err);
            setError(err.message || "Error al crear la cartera");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {/* Portfolio Name */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-brand-500" />
                        Nombre de la Cartera
                    </label>
                    <Input
                        placeholder="Ej: Cartera General, Unidad de Cardiología..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-11 border-gray-200 focus:border-brand-500 focus:ring-brand-500"
                    />
                </div>

                {/* Practitioner Selection - Only show for admin */}
                {role === 'super_admin' ? (
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <User className="h-4 w-4 text-brand-500" />
                            Asignar Facultativo
                        </label>
                        <select
                            value={practitionerId}
                            onChange={(e) => setPractitionerId(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                            disabled={isLoading}
                        >
                            <option value="">Selecciona un facultativo...</option>
                            {practitioners.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.first_name} {p.last_name_1} {p.last_name_2 || ''}
                                </option>
                            ))}
                        </select>
                        {isLoading && (
                            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 ml-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Cargando facultativos...
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="p-3 bg-brand-50/50 rounded-lg border border-brand-100">
                        <p className="text-xs text-brand-600 font-medium flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            Se asignará automáticamente a tu perfil facultativo.
                        </p>
                    </div>
                )}
            </div>

            {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" type="button" onClick={onCancel} disabled={isSaving}>
                    Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={isSaving || isLoading}>
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creando...
                        </>
                    ) : (
                        "Crear Cartera"
                    )}
                </Button>
            </div>
        </form>
    );
}
