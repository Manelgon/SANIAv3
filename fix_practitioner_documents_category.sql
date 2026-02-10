-- Migration: Add category column to practitioner_documents if it doesn't exist

DO $$
BEGIN
    -- Check if category column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'practitioner_documents' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE public.practitioner_documents 
        ADD COLUMN category practitioner_document_category DEFAULT 'other' NOT NULL;
        
        RAISE NOTICE 'Added category column to practitioner_documents table';
    ELSE
        RAISE NOTICE 'Category column already exists in practitioner_documents table';
    END IF;
END $$;
