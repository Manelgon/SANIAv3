import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";

export default function PortalPage() {
    const { user, signOut } = useAuthStore();

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Portal del Paciente</h1>
            <p className="mb-4">Bienvenido, {user?.email}</p>
            <Button onClick={signOut} variant="outline">
                Cerrar Sesión
            </Button>
        </div>
    );
}
