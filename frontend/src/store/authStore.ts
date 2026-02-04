import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type UserRole = 'super_admin' | 'practitioner' | 'assistant' | 'billing' | 'patient';

interface ActionData {
    role: string;
}

interface AuthState {
    user: User | null;
    session: Session | null;
    role: UserRole | null;
    isLoading: boolean;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
    setSession: (session: Session | null) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    role: null,
    isLoading: true,

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await get().setSession(session);

            supabase.auth.onAuthStateChange(async (_event, session) => {
                await get().setSession(session);
            });
        } catch (error) {
            console.error('Auth initialization error:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    setSession: async (session) => {
        if (!session?.user) {
            set({ user: null, session: null, role: null, isLoading: false });
            return;
        }

        // Set user and session immediately so the app can start rendering
        set({ user: session.user, session: session });

        try {
            // Fetch role from public.users with a timeout
            const fetchRolePromise = supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();

            // 10 second timeout for role fetching
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Role fetch timeout')), 10000)
            );

            const { data: userData, error } = await Promise.race([
                fetchRolePromise,
                timeoutPromise
            ]) as any;

            if (error) {
                console.error('Error fetching user role:', error);
            }

            const newRole = ((userData as unknown) as ActionData)?.role as UserRole || get().role;

            set({
                role: newRole,
                isLoading: false
            });
        } catch (error) {
            console.error('Error setting session role:', error);
            // DO NOT default to patient. Keep current role or set to null 
            // to avoid unauthorized redirects if it was just a transient fetch error.
            set({ isLoading: false });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, role: null });
    },
}));
