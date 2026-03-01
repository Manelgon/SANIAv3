// Edge Function: sync-user-role
// Reads the user's role from public.users and writes it to app_metadata.
// This bakes the role into the JWT so the frontend can read it from claims
// without querying the database on every session change.
//
// Call once after login (authStore.initialize / setSession).
// POST /functions/v1/sync-user-role  — no body required, JWT in Authorization header.
// Deploy: supabase functions deploy sync-user-role --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── JWT local decode ────────────────────────────────────────────────────────
interface JwtPayload {
  sub:  string;
  role: string;
  exp:  number;
  app_metadata?: { role?: string };
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad    = padded.length % 4;
    const b64    = pad ? padded + '='.repeat(4 - pad) : padded;
    return JSON.parse(atob(b64)) as JwtPayload;
  } catch {
    return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// ── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  // ── 1. Authenticate caller via JWT ────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader) return json({ error: 'Unauthorized: missing authorization header' }, 401);

  const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const claims   = decodeJwt(rawToken);

  if (!claims?.sub)                                    return json({ error: 'Unauthorized: malformed token' }, 401);
  if (claims.role === 'anon')                          return json({ error: 'Unauthorized: anonymous access not allowed' }, 401);
  if (claims.exp < Math.floor(Date.now() / 1000))     return json({ error: 'Unauthorized: token expired' }, 401);

  const userId = claims.sub;

  // ── 2. Check if app_metadata already has role (skip unnecessary update) ───
  const existingRole = claims.app_metadata?.role;
  if (existingRole) {
    // Role is already in JWT — nothing to do until it changes.
    return json({ synced: false, role: existingRole, reason: 'already_in_claims' });
  }

  // ── 3. Init service-role client ───────────────────────────────────────────
  const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ── 4. Fetch role from public.users ───────────────────────────────────────
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || !userData?.role) {
    console.error('[sync-user-role] Failed to fetch role:', userError);
    return json({ error: 'Could not find user role' }, 404);
  }

  const role: string = userData.role;

  // ── 5. Write role to app_metadata ─────────────────────────────────────────
  // app_metadata is stored in auth.users and included in all future JWTs.
  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });

  if (updateError) {
    console.error('[sync-user-role] Failed to update app_metadata:', updateError);
    return json({ error: 'Failed to sync role to JWT claims' }, 500);
  }

  console.log(`[sync-user-role] Synced role "${role}" for user ${userId}`);
  return json({ synced: true, role });
});
