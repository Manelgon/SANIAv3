import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
    const { user, signOut } = useAuthStore();

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Panel de Facultativo</h1>
            <p className="mb-4">Bienvenido, {user?.email}</p>
            <Button onClick={signOut} variant="outline">
                Cerrar Sesión
            </Button>
        </div>
    );
}
