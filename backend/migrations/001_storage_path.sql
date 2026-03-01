-- Migration 001: add storage_bucket / storage_path to patient_documents
-- and create document_access_logs for RGPD audit trail.
-- Run once in Supabase SQL Editor.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. New columns on patient_documents
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.patient_documents
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'patient-documents',
  ADD COLUMN IF NOT EXISTS storage_path   TEXT,
  ADD COLUMN IF NOT EXISTS title          TEXT,
  ADD COLUMN IF NOT EXISTS document_type  TEXT;

-- Make url nullable: new records store bucket/path instead of a URL
ALTER TABLE public.patient_documents
  ALTER COLUMN url DROP NOT NULL;

-- Index used by the Edge Function RLS check
CREATE INDEX IF NOT EXISTS idx_patient_documents_storage_path
  ON public.patient_documents(storage_path);

-- Composite index: bucket + path (exact match in Edge Function)
CREATE INDEX IF NOT EXISTS idx_patient_documents_bucket_path
  ON public.patient_documents(storage_bucket, storage_path)
  WHERE storage_path IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Backfill storage_path from existing URL column (public or signed URLs)
--    Handles:
--      /storage/v1/object/public/patient-documents/<path>
--      /storage/v1/object/sign/patient-documents/<path>?token=...
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE public.patient_documents
SET
  storage_bucket = 'patient-documents',
  storage_path   = regexp_replace(
                     regexp_replace(url, '^.*/patient-documents/', ''),
                     '\?.*$', ''   -- strip query string (signed token)
                   )
WHERE storage_path IS NULL
  AND url IS NOT NULL
  AND url NOT IN ('#', '', 'null');

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. RGPD Audit log — document_access_logs
--    Stores who accessed what document, when, from where, and why.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_access_logs (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  document_id UUID        REFERENCES public.patient_documents(id) ON DELETE SET NULL,
  patient_id  UUID        REFERENCES public.patients(id) ON DELETE SET NULL,
  bucket      TEXT        NOT NULL,
  path        TEXT        NOT NULL,
  purpose     TEXT        NOT NULL DEFAULT 'ui',  -- 'ui' | 'automation'
  expires_in  INTEGER     NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Queries: "all access by user"
CREATE INDEX IF NOT EXISTS idx_doc_access_user_time
  ON public.document_access_logs(user_id, accessed_at DESC);

-- Queries: "all access to a specific document"
CREATE INDEX IF NOT EXISTS idx_doc_access_document_time
  ON public.document_access_logs(document_id, accessed_at DESC);

-- Queries: "all access to documents of a patient"
CREATE INDEX IF NOT EXISTS idx_doc_access_patient_time
  ON public.document_access_logs(patient_id, accessed_at DESC);

-- Queries: "all automation calls in a time window"
CREATE INDEX IF NOT EXISTS idx_doc_access_purpose
  ON public.document_access_logs(purpose, accessed_at DESC);
