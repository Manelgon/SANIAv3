-- ULTIMATE STABILITY FIX FOR DOCUMENTS
-- This script fixes missing buckets, columns, triggers and RLS policies

-- 1. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES ('practitioner-documents', 'practitioner-documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. STORAGE POLICIES
DROP POLICY IF EXISTS "Super Admins can manage practitioner documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can manage their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Super Admins can manage patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can manage patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can view patient documents" ON storage.objects;

-- Practitioner Documents: Admins can do everything
CREATE POLICY "Super Admins can manage practitioner documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'practitioner-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Practitioner Documents: Practitioners can manage their own folder
CREATE POLICY "Practitioners can manage their own documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'practitioner-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()))
WITH CHECK (bucket_id = 'practitioner-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()));

-- Patient Documents: Admins can do everything
CREATE POLICY "Super Admins can manage patient documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'patient-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Patient Documents: Practitioners can manage all patient documents
CREATE POLICY "Practitioners can manage patient documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'patient-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'practitioner'))
WITH CHECK (bucket_id = 'patient-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'practitioner'));

-- 3. PRACTITIONER_DOCUMENTS TABLE FIXES
DO $migration$
BEGIN
    -- Add columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'practitioner_documents' AND column_name = 'category') THEN
        ALTER TABLE public.practitioner_documents ADD COLUMN category practitioner_document_category DEFAULT 'other' NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'practitioner_documents' AND column_name = 'fid') THEN
        ALTER TABLE public.practitioner_documents ADD COLUMN fid TEXT;
    END IF;
END $migration$;

-- Fix Trigger Function for Practitioners
CREATE OR REPLACE FUNCTION public.sync_practitioner_data_to_documents()
RETURNS TRIGGER AS $func$
DECLARE
    practitioner_fid TEXT;
BEGIN
    SELECT fid INTO practitioner_fid FROM public.practitioners WHERE id = NEW.practitioner_id;
    IF practitioner_fid IS NOT NULL THEN
        NEW.fid := practitioner_fid;
    END IF;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_practitioner_data_to_documents ON public.practitioner_documents;
CREATE TRIGGER trigger_sync_practitioner_data_to_documents
    BEFORE INSERT ON public.practitioner_documents
    FOR EACH ROW EXECUTE FUNCTION public.sync_practitioner_data_to_documents();

-- 4. PATIENT_DOCUMENTS TABLE FIXES
DO $migration$
BEGIN
    -- Ensure columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_documents' AND column_name = 'practitioner_id') THEN
        ALTER TABLE public.patient_documents ADD COLUMN practitioner_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_documents' AND column_name = 'category') THEN
        ALTER TABLE public.patient_documents ADD COLUMN category patient_document_category DEFAULT 'administrative_uploaded' NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_documents' AND column_name = 'fid') THEN
        ALTER TABLE public.patient_documents ADD COLUMN fid TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_documents' AND column_name = 'cip') THEN
        ALTER TABLE public.patient_documents ADD COLUMN cip TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_documents' AND column_name = 'document_type') THEN
        ALTER TABLE public.patient_documents ADD COLUMN document_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_documents' AND column_name = 'title') THEN
        ALTER TABLE public.patient_documents ADD COLUMN title TEXT;
    END IF;

    -- Populate existing records to avoid NOT NULL violations
    UPDATE public.patient_documents SET document_type = category::text WHERE document_type IS NULL;
    UPDATE public.patient_documents SET title = name WHERE title IS NULL;

    -- Enforce NOT NULL
    ALTER TABLE public.patient_documents ALTER COLUMN document_type SET NOT NULL;
    ALTER TABLE public.patient_documents ALTER COLUMN title SET NOT NULL;
END $migration$;

-- Fix/Create Trigger Function for Patients
CREATE OR REPLACE FUNCTION public.sync_patient_data_to_documents()
RETURNS TRIGGER AS $func$
DECLARE
    p_fid TEXT;
    p_cip TEXT;
BEGIN
    -- Pull CIP from patient
    SELECT cip INTO p_cip FROM public.patients WHERE id = NEW.patient_id;
    -- Pull FID from practitioner (if linked)
    IF NEW.practitioner_id IS NOT NULL THEN
        SELECT fid INTO p_fid FROM public.practitioners WHERE id = NEW.practitioner_id;
    END IF;

    IF p_fid IS NOT NULL THEN NEW.fid := p_fid; END IF;
    IF p_cip IS NOT NULL THEN NEW.cip := p_cip; END IF;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_patient_data_to_documents ON public.patient_documents;
CREATE TRIGGER trigger_sync_patient_data_to_documents
    BEFORE INSERT ON public.patient_documents
    FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_documents();

-- 5. RLS POLICIES FOR TABLES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Users Policy
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.users;
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.users FOR SELECT TO authenticated USING (true);

-- Practitioners Policy
DROP POLICY IF EXISTS "Practitioners are viewable by authenticated users" ON public.practitioners;
CREATE POLICY "Practitioners are viewable by authenticated users" ON public.practitioners FOR SELECT TO authenticated USING (true);

-- Practitioner Documents Policies
DROP POLICY IF EXISTS "Super admins can manage all practitioner documents" ON public.practitioner_documents;
DROP POLICY IF EXISTS "Practitioners can view their own document records" ON public.practitioner_documents;

CREATE POLICY "Super admins can manage all practitioner documents"
ON public.practitioner_documents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Practitioners can view their own document records"
ON public.practitioner_documents FOR SELECT TO authenticated
USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

-- Patient Documents Policies
DROP POLICY IF EXISTS "Super admins can manage all patient documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Practitioners can manage patient documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Practitioners can view patient documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Practitioners can insert patient documents" ON public.patient_documents;

CREATE POLICY "Super admins can manage all patient documents"
ON public.patient_documents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Practitioners can view patient documents"
ON public.patient_documents FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('practitioner', 'super_admin')));

CREATE POLICY "Practitioners can insert patient documents"
ON public.patient_documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('practitioner', 'super_admin')));

-- 6. STORAGE POLICIES (Idempotent)
DROP POLICY IF EXISTS "Super Admins can manage practitioner documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can manage their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Super Admins can manage patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can manage patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can view patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can upload patient documents" ON storage.objects;

-- Practitioner Documents: Admins everything
CREATE POLICY "Super Admins can manage practitioner documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'practitioner-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Practitioner Documents: Practitioners own folder
CREATE POLICY "Practitioners can manage their own documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'practitioner-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()))
WITH CHECK (bucket_id = 'practitioner-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()));

-- Patient Documents: Admins everything
CREATE POLICY "Super Admins can manage patient documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'patient-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Patient Documents: Practitioners view only
CREATE POLICY "Practitioners can view patient documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'patient-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'practitioner'));

-- Patient Documents: Practitioners upload only
CREATE POLICY "Practitioners can upload patient documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'patient-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'practitioner'));

-- 7. GRANT PERMISSIONS
GRANT ALL ON public.practitioner_documents TO authenticated;
GRANT ALL ON public.patient_documents TO authenticated;

-- Force schema reload
COMMENT ON TABLE public.patient_documents IS 'Final optimized table for patient documents.';
COMMENT ON TABLE public.practitioner_documents IS 'Final optimized table for practitioner documents.';
