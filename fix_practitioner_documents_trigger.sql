-- Migration: Fix practitioner_documents trigger to handle fid field safely

-- Drop and recreate the trigger function with proper error handling
CREATE OR REPLACE FUNCTION public.sync_practitioner_data_to_documents()
RETURNS TRIGGER AS $$
DECLARE
    practitioner_fid TEXT;
BEGIN
    -- Get the practitioner's fid
    SELECT fid INTO practitioner_fid FROM public.practitioners WHERE id = NEW.practitioner_id;
    
    -- Only set fid if the column exists and has a value
    IF practitioner_fid IS NOT NULL THEN
        NEW.fid := practitioner_fid;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_sync_practitioner_data_to_documents ON public.practitioner_documents;
CREATE TRIGGER trigger_sync_practitioner_data_to_documents
    BEFORE INSERT ON public.practitioner_documents
    FOR EACH ROW EXECUTE FUNCTION public.sync_practitioner_data_to_documents();
