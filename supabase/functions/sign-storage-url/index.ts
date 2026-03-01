// Edge Function: sign-storage-url
// Returns a short-lived signed URL for a private Storage object.
// Security model:
//   - Requires valid JWT (no anonymous access)
//   - Bucket is fixed server-side (never trusted from client)
//   - expiresIn clamped by purpose: ui→900s, automation→3600s
//   - Authorization: document MUST exist in patient_documents with that path
//   - Practitioners may only access documents of their own patients
//   - Access logged for RGPD audit trail (best-effort, non-blocking)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── JWT local decode ───────────────────────────────────────────────────────────
// The Supabase API gateway validates JWT signatures BEFORE forwarding requests
// to Edge Functions (confirmed in dashboard logs: "invalid": null).
// We decode the payload locally to extract user.id and verify expiry without
// an extra network round-trip to /auth/v1/user (which has been unreliable).
interface JwtPayload {
  sub:  string;   // user id
  role: string;   // 'authenticated' | 'anon' | ...
  exp:  number;   // unix timestamp
  iss:  string;
  aud?: string | string[];
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Convert base64url → base64, then pad to a multiple of 4 characters.
    // base64url strips trailing '=' — we must restore them before atob().
    // Correct padding table:
    //   length % 4 === 0  → no padding
    //   length % 4 === 2  → add '=='
    //   length % 4 === 3  → add '='
    //   length % 4 === 1  → invalid (never happens in valid JWT)
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    const padded = pad === 0 ? b64 : b64 + '==='.slice(0, 4 - pad);

    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch (e) {
    console.error('[decodeJwt] failed:', e);
    return null;
  }
}

// ── Config ─────────────────────────────────────────────────────────────────────

const FIXED_BUCKET = 'patient-documents'; // bucket is never trusted from client

const EXPIRES: Record<string, number> = {
  view:       900,   // 15 min — open in browser tab
  download:   900,   // 15 min — save to disk
  ui:         900,   // legacy alias
  automation: 3600,  // 1 h   — n8n / IA processing window
};
const DEFAULT_EXPIRES = EXPIRES.view;

// ── Path safety ────────────────────────────────────────────────────────────────

function isPathSafe(path: string): boolean {
  if (!path || path.trim() === '') return false;
  // No path traversal
  if (path.includes('..')) return false;
  // No leading slash
  if (path.startsWith('/')) return false;
  // Basic structure: must look like "{uuid}/{filename}"
  if (!/^[0-9a-f\-]{36}\/[^\s]{1,300}$/i.test(path)) return false;
  return true;
}

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── 1. Decode JWT locally (no network call) ──────────────────────
  // The Supabase API gateway validates JWT signatures BEFORE forwarding to
  // Edge Functions (confirmed in logs: "invalid": null, auth_user is populated).
  // We decode the payload locally to extract user.id — fast and reliable.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const claims   = decodeJwt(rawToken);

  if (!claims?.sub) {
    return json({ error: 'Unauthorized: malformed token' }, 401);
  }
  if (claims.role === 'anon') {
    return json({ error: 'Unauthorized: anonymous access not allowed' }, 401);
  }
  if (claims.exp < Math.floor(Date.now() / 1000)) {
    return json({ error: 'Unauthorized: token expired' }, 401);
  }

  const userId = claims.sub; // authenticated user UUID

  const supabaseUrl    = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Admin client (service_role) — for all DB queries and Storage signing
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 2. Parse & validate body ──────────────────────────────────────
  let body: { path?: string; expiresIn?: number; purpose?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { path, purpose = 'ui', expiresIn } = body;

  if (!path) return json({ error: '"path" is required' }, 400);

  if (!isPathSafe(path)) {
    return json({ error: 'Invalid path' }, 400);
  }

  // Clamp expiresIn by purpose
  const maxForPurpose = EXPIRES[purpose] ?? EXPIRES.ui;
  const clampedExpiry = Math.min(
    Math.max(30, expiresIn ?? DEFAULT_EXPIRES),
    maxForPurpose,
  );

  // ── 3. Load user role ─────────────────────────────────────────────
  // adminClient already created above with service_role key

  const { data: profile, error: profileErr } = await adminClient
    .from('users')         // public.users is the role table in this project
    .select('role')
    .eq('id', userId)
    .single();

  if (profileErr || !profile) return json({ error: 'User profile not found' }, 403);
  if (profile.role !== 'super_admin' && profile.role !== 'practitioner') {
    return json({ error: 'Forbidden: insufficient role' }, 403);
  }

  // ── 4. Authorize via DB ───────────────────────────────────────────
  // The document MUST exist in patient_documents with this exact path.
  // This prevents signing arbitrary paths that aren't referenced in the DB.
  const { data: doc, error: docErr } = await adminClient
    .from('patient_documents')
    .select('id, patient_id, practitioner_id')
    .eq('storage_bucket', FIXED_BUCKET)
    .eq('storage_path', path)
    .maybeSingle();

  if (docErr) {
    console.error('DB lookup error:', docErr);
    return json({ error: 'Internal error' }, 500);
  }
  if (!doc) {
    return json({ error: 'Document not found' }, 404);
  }

  // Practitioners: verify they have a legitimate relationship with this document.
  // Access is granted if ANY of the following is true:
  //   A) The practitioner uploaded the document (practitioner_id matches)
  //   B) The patient is in one of the practitioner's portfolios
  if (profile.role === 'practitioner') {
    const { data: practitioner } = await adminClient
      .from('practitioners')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!practitioner) return json({ error: 'Practitioner record not found' }, 403);

    // Path A: practitioner is the document's owner
    const isDocOwner = doc.practitioner_id === practitioner.id;

    if (!isDocOwner) {
      // Path B: patient belongs to one of the practitioner's portfolios
      const { data: portfolios } = await adminClient
        .from('portfolios')
        .select('id')
        .eq('practitioner_id', practitioner.id);

      const portfolioIds = portfolios?.map((p: { id: string }) => p.id) ?? [];

      let inPortfolio = false;
      if (portfolioIds.length > 0) {
        const { count } = await adminClient
          .from('portfolio_patients')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', doc.patient_id)
          .in('portfolio_id', portfolioIds);

        inPortfolio = (count ?? 0) > 0;
      }

      if (!inPortfolio) {
        return json({ error: 'Forbidden: not your patient' }, 403);
      }
    }
  }

  // ── 5. Generate signed URL (service role) ─────────────────────────
  const { data: signed, error: signErr } = await adminClient.storage
    .from(FIXED_BUCKET)
    .createSignedUrl(path, clampedExpiry);

  if (signErr || !signed) {
    console.error('Storage sign error:', signErr);
    return json({ error: 'Could not generate signed URL' }, 500);
  }

  // ── 6. Audit log (best-effort, non-blocking) ──────────────────────
  const ip        = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  const userAgent = req.headers.get('user-agent') ?? null;

  adminClient.from('document_access_logs').insert({
    user_id:     userId,
    document_id: doc.id,
    patient_id:  doc.patient_id,
    bucket:      FIXED_BUCKET,
    path,
    purpose,
    expires_in:  clampedExpiry,
    ip_address:  ip,
    user_agent:  userAgent,
  }).then(() => {}).catch((e) => console.error('Access log failed:', e));

  return json({ signedUrl: signed.signedUrl, expiresIn: clampedExpiry });
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function corsResponse() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    },
  });
}
