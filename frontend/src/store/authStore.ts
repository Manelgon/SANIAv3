import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type UserRole   = 'super_admin' | 'practitioner' | 'assistant' | 'billing' | 'patient';
type RoleSource = 'network' | 'cache' | null;

/** Role is considered stale after this many milliseconds (30 min). */
const ROLE_STALE_MS = 30 * 60 * 1_000;

const EDGE_FN_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : '';

interface AuthState {
    user:           User | null;
    session:        Session | null;
    role:           UserRole | null;
    roleFetchedAt:  Date | null;      // when the role was last fetched from network
    roleSource:     RoleSource;       // 'network' | 'cache' | null
    isLoading:      boolean;

    initialize:     () => Promise<void>;
    signOut:        () => Promise<void>;
    setSession:     (session: Session | null) => Promise<void>;
    /** Force a fresh role fetch from the DB (e.g. after role change by admin). */
    refreshRole:    () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user:          null,
    session:       null,
    role:          null,
    roleFetchedAt: null,
    roleSource:    null,
    isLoading:     true,

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
            set({ user: null, session: null, role: null, roleFetchedAt: null, roleSource: null, isLoading: false });
            return;
        }

        // Apply session immediately so the app renders before role is ready
        set({ user: session.user, session });

        const state = get();

        // If we already have a fresh role for THIS user, keep it (avoids redundant queries
        // on TOKEN_REFRESHED events where the user identity hasn't changed).
        const roleIsStale =
            !state.roleFetchedAt ||
            Date.now() - state.roleFetchedAt.getTime() > ROLE_STALE_MS;

        const sameUser = state.user?.id === session.user.id;

        if (sameUser && !roleIsStale && state.role) {
            set({ isLoading: false, roleSource: 'cache' });
            return;
        }

        await fetchAndSetRole(session.user.id, set, get);
    },

    refreshRole: async () => {
        const { session } = get();
        if (!session?.user) return;
        await fetchAndSetRole(session.user.id, set, get);
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, role: null, roleFetchedAt: null, roleSource: null });
    },
}));

// ── Helper (kept outside the store object for cleanliness) ────────────────────

async function fetchAndSetRole(
    userId: string,
    set: (s: Partial<AuthState>) => void,
    get: () => AuthState,
) {
    // ── Fast path 1: read role from JWT app_metadata (no DB round-trip) ──────
    // After the first login the Edge Function sync-user-role writes the role
    // into app_metadata, so subsequent sessions carry it directly in the JWT.
    const cachedSession = get().session;
    const claimRole = (
        (cachedSession?.user?.app_metadata as any)?.role ??
        (cachedSession?.user?.user_metadata as any)?.role
    ) as UserRole | undefined;

    if (claimRole) {
        set({ role: claimRole, roleFetchedAt: new Date(), roleSource: 'network', isLoading: false });
        return;
    }

    // ── Fast path 2: call sync-user-role Edge Function ────────────────────────
    // This writes the role to app_metadata so future sessions skip the DB query.
    try {
        const token = cachedSession?.access_token;
        if (token && EDGE_FN_BASE) {
            const syncRes = await fetch(`${EDGE_FN_BASE}/sync-user-role`, {
                method:  'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (syncRes.ok) {
                const syncData = await syncRes.json().catch(() => null);
                if (syncData?.role) {
                    set({ role: syncData.role as UserRole, roleFetchedAt: new Date(), roleSource: 'network', isLoading: false });
                    return;
                }
            }
        }
    } catch {
        // Non-fatal — fall through to DB query
    }

    // ── Slow path: query public.users table (fallback) ────────────────────────
    try {
        const fetchRolePromise = supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        // 15 s timeout to accommodate cold-start DB latency
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Role fetch timeout')), 15_000),
        );

        const { data: userData, error } = await Promise.race([
            fetchRolePromise,
            timeoutPromise,
        ]) as any;

        if (error) {
            console.error('[authStore] Error fetching user role:', error);
        }

        const newRole = (userData?.role as UserRole | undefined)
            ?? get().role; // keep previous role on transient error

        set({
            role:          newRole,
            roleFetchedAt: userData?.role ? new Date() : get().roleFetchedAt,
            roleSource:    userData?.role ? 'network' : 'cache',
            isLoading:     false,
        });
    } catch (error) {
        console.error('[authStore] Role fetch failed:', error);
        // Keep current role — do NOT null-out on transient failures
        // to avoid unauthorized redirects during slow connections.
        set({ isLoading: false, roleSource: 'cache' });
    }
}
