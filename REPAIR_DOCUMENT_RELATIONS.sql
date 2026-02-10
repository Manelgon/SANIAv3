-- ULTIMATE REPAIR FOR PATIENT DOCUMENTS
-- This script ensures ALL columns exist and fixes the relationships

-- 1. Ensure the patient_document_category enum exists
DO $migration$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_document_category') THEN
        CREATE TYPE patient_document_category AS ENUM ('medical_test', 'administrative_uploaded', 'administrative_generated', 'consultation_report', 'patient_provided', 'other');
    ELSE
        -- Add new values if enum already exists
        BEGIN
            ALTER TYPE patient_document_category ADD VALUE IF NOT EXISTS 'consultation_report';
            ALTER TYPE patient_document_category ADD VALUE IF NOT EXISTS 'patient_provided';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $migration$;

-- 2. Ensure ALL columns exist in patient_documents
DO $migration$
BEGIN
    -- practitioner_id (Crucial for the link)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_documents' AND column_name = 'practitioner_id') THEN
        ALTER TABLE public.patient_documents ADD COLUMN practitioner_id UUID;
    END IF;

    -- category
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_documents' AND column_name = 'category') THEN
        ALTER TABLE public.patient_documents ADD COLUMN category patient_document_category DEFAULT 'administrative_uploaded' NOT NULL;
    END IF;

    -- fid
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_documents' AND column_name = 'fid') THEN
        ALTER TABLE public.patient_documents ADD COLUMN fid TEXT;
    END IF;

    -- cip
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_documents' AND column_name = 'cip') THEN
        ALTER TABLE public.patient_documents ADD COLUMN cip TEXT;
    END IF;

    -- document_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_documents' AND column_name = 'document_type') THEN
        ALTER TABLE public.patient_documents ADD COLUMN document_type TEXT;
    END IF;

    -- title
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

-- 3. Now set up/repair the Foreign Key relationships
-- Repair relationship to practitioners
ALTER TABLE public.patient_documents 
DROP CONSTRAINT IF EXISTS patient_documents_practitioner_id_fkey;

ALTER TABLE public.patient_documents
ADD CONSTRAINT patient_documents_practitioner_id_fkey 
FOREIGN KEY (practitioner_id) 
REFERENCES public.practitioners(id) 
ON DELETE SET NULL;

-- Repair relationship to patients
ALTER TABLE public.patient_documents 
DROP CONSTRAINT IF EXISTS patient_documents_patient_id_fkey;

ALTER TABLE public.patient_documents
ADD CONSTRAINT patient_documents_patient_id_fkey 
FOREIGN KEY (patient_id) 
REFERENCES public.patients(id) 
ON DELETE CASCADE;

-- 4. Set up/Fix the sync trigger
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

-- RLS Policies for Tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.users;
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Practitioners are viewable by authenticated users" ON public.practitioners;
CREATE POLICY "Practitioners are viewable by authenticated users" ON public.practitioners FOR SELECT TO authenticated USING (true);

-- Practitioners can view/insert patient documents
DROP POLICY IF EXISTS "Practitioners can manage patient documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Practitioners can view/insert patient documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Practitioners can view patient documents" ON public.patient_documents;
DROP POLICY IF EXISTS "Practitioners can insert patient documents" ON public.patient_documents;

CREATE POLICY "Practitioners can view patient documents"
ON public.patient_documents FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('practitioner', 'super_admin')));

CREATE POLICY "Practitioners can insert patient documents"
ON public.patient_documents FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('practitioner', 'super_admin')));

INSERT INTO storage.buckets (id, name, public)
VALUES ('practitioner-documents', 'practitioner-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Super Admins can manage practitioner documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can manage their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Super Admins can manage patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can manage patient documents" ON storage.objects;

-- Practitioner Documents: Admins can do everything
DROP POLICY IF EXISTS "Super Admins can manage practitioner documents" ON storage.objects;
CREATE POLICY "Super Admins can manage practitioner documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'practitioner-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Practitioner Documents: Practitioners can manage their own folder
DROP POLICY IF EXISTS "Practitioners can manage their own documents" ON storage.objects;
CREATE POLICY "Practitioners can manage their own documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'practitioner-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()))
WITH CHECK (bucket_id = 'practitioner-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.practitioners WHERE user_id = auth.uid()));

-- Patient Documents: Admins can do everything
DROP POLICY IF EXISTS "Super Admins can manage patient documents" ON storage.objects;
CREATE POLICY "Super Admins can manage patient documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'patient-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Patient Documents: Practitioners can view and upload all patient documents
DROP POLICY IF EXISTS "Practitioners can manage patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can view/upload patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can view patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can upload patient documents" ON storage.objects;

CREATE POLICY "Practitioners can view patient documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'patient-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'practitioner'));

CREATE POLICY "Practitioners can upload patient documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'patient-documents' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'practitioner'));
