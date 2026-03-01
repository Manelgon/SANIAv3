import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Granular purpose sent to the Edge Function for RGPD logging and expiry clamping. */
export type SignPurpose = 'view' | 'download' | 'automation';

export interface StorageRef {
    bucket: string;
    path:   string;
}

// ── Live token cache ───────────────────────────────────────────────────────────
// Keep the most recent access_token in memory, refreshed via onAuthStateChange.
// This avoids the race where getSession() returns a stale cached token while
// Supabase is still running _recoverAndRefresh in the background.

let _cachedToken: string | null = null;

supabase.auth.onAuthStateChange((_event, session) => {
    _cachedToken = session?.access_token ?? null;
});

// Seed the cache immediately (synchronous path from localStorage)
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session && !_cachedToken) _cachedToken = session.access_token;
});

// ── URL parsing ────────────────────────────────────────────────────────────────

/**
 * Extracts { bucket, path } from any Supabase Storage URL.
 * Handles all variants:
 *   /storage/v1/object/public/<bucket>/<path>
 *   /storage/v1/object/sign/<bucket>/<path>?token=...
 *   /storage/v1/object/<bucket>/<path>
 * Path segments are decoded (%2F, spaces, etc.)
 */
export function extractStorageRef(inputUrl: string): StorageRef {
    const u = new URL(inputUrl);
    const p = u.pathname; // query string is ignored (signed tokens live there)

    const MARKER = '/storage/v1/object/';
    const i = p.indexOf(MARKER);
    if (i === -1) throw new Error(`Not a Supabase Storage URL: ${inputUrl}`);

    const after = p.slice(i + MARKER.length); // "public/bucket/path..." etc.
    const parts = after.split('/').filter(Boolean);

    let bucket: string;
    let pathParts: string[];

    if (parts[0] === 'public' || parts[0] === 'sign') {
        bucket    = parts[1];
        pathParts = parts.slice(2);
    } else {
        bucket    = parts[0];
        pathParts = parts.slice(1);
    }

    if (!bucket || pathParts.length === 0) {
        throw new Error(`Could not extract bucket/path from: ${inputUrl}`);
    }

    return { bucket, path: decodeURIComponent(pathParts.join('/')) };
}

/**
 * Resolves a storage ref from a document record.
 * Prefers explicit storage_bucket + storage_path (new records).
 * Falls back to parsing the legacy url field.
 * Returns null if neither is available or parseable.
 */
export function resolveStorageRef(doc: {
    url?:            string | null;
    storage_bucket?: string | null;
    storage_path?:   string | null;
}): StorageRef | null {
    if (doc.storage_bucket && doc.storage_path) {
        return { bucket: doc.storage_bucket, path: doc.storage_path };
    }
    if (doc.url && doc.url !== '#' && doc.url !== '' && doc.url !== 'null') {
        try { return extractStorageRef(doc.url); } catch { /* fall through */ }
    }
    return null;
}

// ── Edge Function client ───────────────────────────────────────────────────────

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-storage-url`;

/**
 * Requests a signed URL from the backend Edge Function.
 * - Bucket is fixed server-side (never sent by the browser).
 * - purpose 'view'|'download' → max 15 min (900 s)
 * - purpose 'automation'      → max 1 h   (3600 s)
 *
 * Retry strategy:
 *   - First attempt uses the cached live token.
 *   - On 401: force a session refresh and retry ONCE.
 *   - Second 401: session is truly invalid → sign out and throw a clear error.
 *
 * @param path       Storage object path, e.g. "{patient_id}/file.pdf"
 * @param expiresIn  Seconds — server clamps to the purpose maximum
 * @param purpose    'view' | 'download' | 'automation'
 */
export async function getSignedUrl(
    path:      string,
    expiresIn: number      = 900,
    purpose:   SignPurpose = 'view',
): Promise<string> {

    const getFreshToken = async (): Promise<string> => {
        // Use in-memory cached token first (kept fresh via onAuthStateChange).
        if (_cachedToken) return _cachedToken;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('SESSION_EXPIRED');
        _cachedToken = session.access_token;
        return session.access_token;
    };

    const callEdgeFn = (token: string) =>
        fetch(EDGE_FN_URL, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ path, expiresIn, purpose }),
        });

    // Single attempt — the edge runtime issue (ES256 vs HS256) was fixed
    // by deploying with --no-verify-jwt. Retrying with refreshSession() caused
    // unnecessary token_revoked events that confused Supabase Auth.
    const res = await callEdgeFn(await getFreshToken());

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const status = res.status;
        if (status === 401) throw new Error('SESSION_EXPIRED');
        throw new Error(err.error ?? `sign-storage-url failed: ${status}`);
    }

    const { signedUrl } = await res.json();
    return signedUrl as string;
}

/**
 * Convenience: resolves a document record to its storage ref,
 * then requests a signed URL from the Edge Function.
 * Falls back to the stored URL if the ref cannot be resolved.
 */
export async function getSignedUrlForDoc(
    doc: {
        url?:            string | null;
        storage_bucket?: string | null;
        storage_path?:   string | null;
    },
    expiresIn: number      = 900,
    purpose:   SignPurpose = 'view',
): Promise<string> {
    const ref = resolveStorageRef(doc);
    if (!ref) return doc.url ?? '#';
    return getSignedUrl(ref.path, expiresIn, purpose);
}

// ── Action helpers ─────────────────────────────────────────────────────────────

/** Opens a document in a new browser tab (15 min, purpose 'view'). */
export async function viewDocument(doc: {
    url?:            string | null;
    storage_bucket?: string | null;
    storage_path?:   string | null;
}): Promise<void> {
    try {
        const url = await getSignedUrlForDoc(doc, 900, 'view');
        window.open(url, '_blank');
    } catch (err: any) {
        if (err.message === 'SESSION_EXPIRED') {
            toast.error('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
        } else {
            toast.error('No se pudo abrir el documento. Inténtalo de nuevo.');
            console.error('[storage] viewDocument error:', err);
        }
    }
}

/** Downloads a document to disk (15 min, purpose 'download'). */
export async function downloadDocument(doc: {
    url?:            string | null;
    storage_bucket?: string | null;
    storage_path?:   string | null;
    name:            string;
}): Promise<void> {
    try {
        const url = await getSignedUrlForDoc(doc, 900, 'download');
        try {
            const res  = await fetch(url);
            const blob = await res.blob();
            const a = Object.assign(document.createElement('a'), {
                href:     URL.createObjectURL(blob),
                download: doc.name,
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        } catch {
            // Fallback: open in tab if blob fetch fails (e.g. CORS)
            window.open(url, '_blank');
        }
    } catch (err: any) {
        if (err.message === 'SESSION_EXPIRED') {
            toast.error('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
        } else {
            toast.error('No se pudo descargar el documento. Inténtalo de nuevo.');
            console.error('[storage] downloadDocument error:', err);
        }
    }
}

/** Returns a 1-hour signed URL for n8n / IA automation (purpose 'automation'). */
export async function getAutomationUrl(doc: {
    url?:            string | null;
    storage_bucket?: string | null;
    storage_path?:   string | null;
}): Promise<string> {
    return getSignedUrlForDoc(doc, 3600, 'automation');
}
