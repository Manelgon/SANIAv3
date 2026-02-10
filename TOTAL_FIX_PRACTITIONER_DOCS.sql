-- COMPREHENSIVE FIX FOR PRACTITIONER DOCUMENTS (v2 - with RLS)
-- This script adds missing columns, fixes the trigger, and adds RLS policies

DO $$
BEGIN
    -- 1. Ensure the category enum exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'practitioner_document_category') THEN
        CREATE TYPE practitioner_document_category AS ENUM ('diploma', 'medical_license', 'insurance', 'signature_stamp', 'other');
    END IF;

    -- 2. Add 'category' column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'practitioner_documents' AND column_name = 'category'
    ) THEN
        ALTER TABLE public.practitioner_documents ADD COLUMN category practitioner_document_category DEFAULT 'other' NOT NULL;
    END IF;

    -- 3. Add 'fid' column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'practitioner_documents' AND column_name = 'fid'
    ) THEN
        ALTER TABLE public.practitioner_documents ADD COLUMN fid TEXT;
    END IF;
END $$;

-- 4. Recreate the trigger function with safe column access
CREATE OR REPLACE FUNCTION public.sync_practitioner_data_to_documents()
RETURNS TRIGGER AS $$
DECLARE
    practitioner_fid TEXT;
BEGIN
    SELECT fid INTO practitioner_fid FROM public.practitioners WHERE id = NEW.practitioner_id;
    NEW.fid := practitioner_fid;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_practitioner_data_to_documents ON public.practitioner_documents;
CREATE TRIGGER trigger_sync_practitioner_data_to_documents
    BEFORE INSERT ON public.practitioner_documents
    FOR EACH ROW EXECUTE FUNCTION public.sync_practitioner_data_to_documents();

-- 5. Enable RLS and Add Policies
ALTER TABLE public.practitioner_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Super admins can manage all practitioner documents" ON public.practitioner_documents;
DROP POLICY IF EXISTS "Practitioners can view their own document records" ON public.practitioner_documents;

-- Policy: Super Admins can do everything
CREATE POLICY "Super admins can manage all practitioner documents"
ON public.practitioner_documents
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- Policy: Practitioners can view their own documents
CREATE POLICY "Practitioners can view their own document records"
ON public.practitioner_documents
FOR SELECT
TO authenticated
USING (
    practitioner_id IN (
        SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
);

-- 6. Grant permissions
GRANT ALL ON public.practitioner_documents TO authenticated;
GRANT ALL ON public.practitioner_documents TO service_role;
