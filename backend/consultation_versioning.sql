-- =====================================================
-- CONSULTATION VERSIONING SYSTEM
-- =====================================================
-- This migration adds support for consultation versioning with:
-- - 24-hour edit window
-- - Complete audit trail
-- - Edit reason tracking
-- =====================================================

-- 1. Create consultation_versions table
CREATE TABLE IF NOT EXISTS public.consultation_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE NOT NULL,
    consultation_diagnosis_id UUID REFERENCES public.consultation_diagnoses(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    
    -- Snapshot of clinical data at this version
    diagnosis_code TEXT NOT NULL,
    motivo TEXT NOT NULL,
    exploracion TEXT NOT NULL,
    aproximacion TEXT,
    tratamiento TEXT,
    notes TEXT,
    
    -- Version metadata
    edit_reason TEXT NOT NULL, -- Reason for the edit (mandatory)
    edited_by UUID REFERENCES public.practitioners(id) ON DELETE SET NULL NOT NULL,
    edited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Audit data
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
    fid TEXT NOT NULL,
    cip TEXT NOT NULL,
    
    UNIQUE(consultation_diagnosis_id, version_number)
);

-- 2. Add versioning fields to consultation_diagnoses
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='consultation_diagnoses' AND column_name='version_number') THEN
        ALTER TABLE public.consultation_diagnoses 
        ADD COLUMN version_number INTEGER DEFAULT 1 NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='consultation_diagnoses' AND column_name='is_edited') THEN
        ALTER TABLE public.consultation_diagnoses 
        ADD COLUMN is_edited BOOLEAN DEFAULT false NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='consultation_diagnoses' AND column_name='last_edited_at') THEN
        ALTER TABLE public.consultation_diagnoses 
        ADD COLUMN last_edited_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='consultation_diagnoses' AND column_name='last_edited_by') THEN
        ALTER TABLE public.consultation_diagnoses 
        ADD COLUMN last_edited_by UUID REFERENCES public.practitioners(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Function to check if consultation can be edited
CREATE OR REPLACE FUNCTION public.can_edit_consultation(
    p_consultation_diagnosis_id UUID,
    p_practitioner_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_created_at TIMESTAMPTZ;
    v_original_practitioner UUID;
    v_hours_elapsed NUMERIC;
    v_can_edit BOOLEAN := false;
    v_reason TEXT;
BEGIN
    -- Get consultation data
    SELECT cd.created_at, cd.practitioner_id
    INTO v_created_at, v_original_practitioner
    FROM public.consultation_diagnoses cd
    WHERE cd.id = p_consultation_diagnosis_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'can_edit', false,
            'reason', 'Consulta no encontrada',
            'hours_elapsed', 0,
            'hours_remaining', 0
        );
    END IF;
    
    -- Calculate elapsed hours
    v_hours_elapsed := EXTRACT(EPOCH FROM (NOW() - v_created_at)) / 3600;
    
    -- Verify conditions
    IF v_original_practitioner != p_practitioner_id THEN
        v_reason := 'Solo el facultativo que creó la consulta puede editarla';
    ELSIF v_hours_elapsed > 24 THEN
        v_reason := 'Han transcurrido más de 24 horas desde la creación';
    ELSE
        v_can_edit := true;
        v_reason := 'Consulta editable';
    END IF;
    
    RETURN jsonb_build_object(
        'can_edit', v_can_edit,
        'reason', v_reason,
        'hours_elapsed', ROUND(v_hours_elapsed, 2),
        'hours_remaining', GREATEST(0, ROUND(24 - v_hours_elapsed, 2))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to save version before update
CREATE OR REPLACE FUNCTION public.save_consultation_version_before_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only save if clinical content actually changed
    IF (OLD.motivo IS DISTINCT FROM NEW.motivo OR 
        OLD.exploracion IS DISTINCT FROM NEW.exploracion OR 
        OLD.aproximacion IS DISTINCT FROM NEW.aproximacion OR 
        OLD.tratamiento IS DISTINCT FROM NEW.tratamiento OR
        OLD.diagnosis_code IS DISTINCT FROM NEW.diagnosis_code) THEN
        
        -- Save previous version to history
        INSERT INTO public.consultation_versions (
            consultation_id,
            consultation_diagnosis_id,
            version_number,
            diagnosis_code,
            motivo,
            exploracion,
            aproximacion,
            tratamiento,
            notes,
            edit_reason,
            edited_by,
            edited_at,
            practitioner_id,
            patient_id,
            portfolio_id,
            fid,
            cip
        ) VALUES (
            OLD.consultation_id,
            OLD.id,
            OLD.version_number,
            OLD.diagnosis_code,
            OLD.motivo,
            OLD.exploracion,
            COALESCE(OLD.aproximacion, ''),
            COALESCE(OLD.tratamiento, ''),
            OLD.notes,
            COALESCE(NEW.notes, 'Sin motivo especificado'), -- Edit reason passed temporarily in notes
            NEW.practitioner_id,
            NOW(),
            OLD.practitioner_id,
            OLD.patient_id,
            OLD.portfolio_id,
            OLD.fid,
            OLD.cip
        );
        
        -- Increment version number
        NEW.version_number := OLD.version_number + 1;
        NEW.is_edited := true;
        NEW.last_edited_at := NOW();
        NEW.last_edited_by := NEW.practitioner_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_save_consultation_version ON public.consultation_diagnoses;
CREATE TRIGGER trigger_save_consultation_version
    BEFORE UPDATE ON public.consultation_diagnoses
    FOR EACH ROW
    EXECUTE FUNCTION public.save_consultation_version_before_update();

-- 5. Function to get consultation history
CREATE OR REPLACE FUNCTION public.get_consultation_history(p_consultation_diagnosis_id UUID)
RETURNS TABLE (
    version_number INTEGER,
    diagnosis_code TEXT,
    motivo TEXT,
    exploracion TEXT,
    aproximacion TEXT,
    tratamiento TEXT,
    edit_reason TEXT,
    edited_by_name TEXT,
    edited_at TIMESTAMPTZ,
    is_current BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    -- Current version
    SELECT 
        cd.version_number,
        cd.diagnosis_code,
        cd.motivo,
        cd.exploracion,
        cd.aproximacion,
        cd.tratamiento,
        NULL::TEXT as edit_reason,
        p.first_name || ' ' || p.last_name_1 as edited_by_name,
        cd.created_at as edited_at,
        true as is_current
    FROM public.consultation_diagnoses cd
    JOIN public.practitioners p ON p.id = cd.practitioner_id
    WHERE cd.id = p_consultation_diagnosis_id
    
    UNION ALL
    
    -- Previous versions
    SELECT 
        cv.version_number,
        cv.diagnosis_code,
        cv.motivo,
        cv.exploracion,
        cv.aproximacion,
        cv.tratamiento,
        cv.edit_reason,
        p.first_name || ' ' || p.last_name_1 as edited_by_name,
        cv.edited_at,
        false as is_current
    FROM public.consultation_versions cv
    JOIN public.practitioners p ON p.id = cv.edited_by
    WHERE cv.consultation_diagnosis_id = p_consultation_diagnosis_id
    
    ORDER BY version_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS Policies for consultation_versions
ALTER TABLE public.consultation_versions ENABLE ROW LEVEL SECURITY;

-- Practitioners can view versions of their consultations
DROP POLICY IF EXISTS "Practitioners view own consultation versions" ON public.consultation_versions;
CREATE POLICY "Practitioners view own consultation versions" 
ON public.consultation_versions
FOR SELECT
USING (
    practitioner_id IN (
        SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
);

-- Super admins can view all versions
DROP POLICY IF EXISTS "Super admins view all consultation versions" ON public.consultation_versions;
CREATE POLICY "Super admins view all consultation versions" 
ON public.consultation_versions
FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_consultation_versions_diagnosis_id 
ON public.consultation_versions(consultation_diagnosis_id);

CREATE INDEX IF NOT EXISTS idx_consultation_versions_consultation_id 
ON public.consultation_versions(consultation_id);
