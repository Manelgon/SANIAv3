import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { PractitionerDetailView } from '@/components/users/PractitionerDetailView';
import { Loader2 } from 'lucide-react';

export default function PractitionerProfilePage() {
    const { user } = useAuthStore();
    const [practitionerId, setPractitionerId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPractitionerId() {
            if (!user?.id) return;

            try {
                const { data, error } = await (supabase
                    .from('practitioners') as any)
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (error) throw error;
                if (data) setPractitionerId(data.id);
            } catch (error) {
                console.error('Error fetching practitioner id:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchPractitionerId();
    }, [user?.id]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!practitionerId) {
        return (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
                <p className="text-gray-500">No se pudo encontrar el expediente de este facultativo.</p>
            </div>
        );
    }

    return <PractitionerDetailView id={practitionerId} />;
}
