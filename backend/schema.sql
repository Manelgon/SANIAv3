  -- ENUMS (Safe creation)
  CREATE OR REPLACE FUNCTION public.create_enum_user_role() RETURNS void AS $$
  BEGIN
      CREATE TYPE user_role AS ENUM ('super_admin', 'practitioner', 'assistant', 'billing', 'patient');
  EXCEPTION
      WHEN duplicate_object THEN null;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.create_enum_user_role();
  DROP FUNCTION public.create_enum_user_role();

  CREATE OR REPLACE FUNCTION public.create_enum_consultation_status() RETURNS void AS $$
  BEGIN
      CREATE TYPE consultation_status AS ENUM ('draft', 'signed', 'closed');
  EXCEPTION
      WHEN duplicate_object THEN null;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.create_enum_consultation_status();
  DROP FUNCTION public.create_enum_consultation_status();

  -- 1. USERS & ROLES
  CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    active BOOLEAN DEFAULT true,
    practitioner_id UUID, 
    patient_id UUID,
    fid TEXT,
    cip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.practitioners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    fid TEXT UNIQUE NOT NULL, -- Mandatory
    license_number TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name_1 TEXT NOT NULL,
    last_name_2 TEXT NOT NULL, -- Mandatory
    specialty TEXT NOT NULL,
    bio TEXT,
    dni TEXT UNIQUE NOT NULL,
    birth_date DATE NOT NULL, -- Required for FID generation
    address JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_user UNIQUE (user_id)
  );

  CREATE TABLE IF NOT EXISTS public.staff (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    fid TEXT NOT NULL, -- Mandatory
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 2. PATIENTS MANAGEMENT
  CREATE TABLE IF NOT EXISTS public.patients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL NOT NULL, 
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE SET NULL NOT NULL, 
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL UNIQUE NOT NULL, 
    cip TEXT UNIQUE NOT NULL, -- Mandatory
    first_name TEXT NOT NULL,
    last_name_1 TEXT NOT NULL,
    last_name_2 TEXT NOT NULL, -- Mandatory
    dni TEXT UNIQUE NOT NULL,
    birth_date DATE NOT NULL,
    address JSONB NOT NULL,
    insured_number TEXT NOT NULL, -- Mandatory
    blood_group TEXT NOT NULL, -- Mandatory
    height NUMERIC, -- Height in cm
    weight NUMERIC, -- Weight in kg
    background TEXT, -- Medical background
    habits TEXT, -- Lifestyle habits
    gender TEXT NOT NULL, -- Mandatory (hombre/mujer/otro)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 3. CLINICAL ACTIVITY
  CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE NOT NULL,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL, 
    fid TEXT NOT NULL,
    cip TEXT NOT NULL,
    status consultation_status DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  -- CIE-10 Catalog (Master Data)
  CREATE TABLE IF NOT EXISTS public.diagnoses (
    codigo TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    nodo_final TEXT, 
    manifestacion TEXT,
    perinatal TEXT,
    pediatrico TEXT,
    obstetrico TEXT,
    adulto TEXT,
    mujer TEXT,
    hombre TEXT,
    poa_exento TEXT,
    dp_no_principal TEXT,
    vcdp TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.specialties (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 4. ALLERGIES
  CREATE TABLE IF NOT EXISTS public.allergies_list (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.patient_allergies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    allergy_id UUID REFERENCES public.allergies_list(id) ON DELETE RESTRICT,
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
    cip TEXT,
    -- 1: Pendiente, 2: Confirmada, 3: No Confirmada
    status INTEGER CHECK (status IN (1, 2, 3)) DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.patient_diagnoses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    diagnosis_code TEXT REFERENCES public.diagnoses(codigo) ON DELETE RESTRICT,
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
    cip TEXT,
    -- 1: Sospecha, 2: Confirmado, 3: Descartado/Resuelto
    status INTEGER CHECK (status IN (1, 2, 3)) DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- CONSTANTS (Vitals) Catalog
  CREATE TABLE IF NOT EXISTS public.clinical_constants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Patient Constants (Linked to Consultation)
  CREATE TABLE IF NOT EXISTS public.consultation_constants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE NOT NULL,
    consultation_diagnosis_id UUID REFERENCES public.consultation_diagnoses(id) ON DELETE SET NULL,
    constant_id UUID REFERENCES public.clinical_constants(id) ON DELETE RESTRICT NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
    value NUMERIC NOT NULL,
    cip TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 5. DOCUMENTS
  CREATE OR REPLACE FUNCTION public.create_enum_practitioner_document_category() RETURNS void AS $$
  BEGIN
      CREATE TYPE practitioner_document_category AS ENUM ('diploma', 'medical_license', 'insurance', 'signature_stamp', 'other');
  EXCEPTION
      WHEN duplicate_object THEN null;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.create_enum_practitioner_document_category();
  DROP FUNCTION public.create_enum_practitioner_document_category();

  -- Safe migration to add 'signature_stamp' if it doesn't exist (for existing databases)
  DO $$
  BEGIN
      ALTER TYPE practitioner_document_category ADD VALUE IF NOT EXISTS 'signature_stamp';
  EXCEPTION
      WHEN others THEN null; -- Handle cases where it might fail or not be supported in transaction block appropriately
  END $$;

  CREATE TABLE IF NOT EXISTS public.practitioner_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE NOT NULL,
    category practitioner_document_category DEFAULT 'other' NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL, 
    fid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Trigger to sync practitioner data (FID) to documents
  CREATE OR REPLACE FUNCTION public.sync_practitioner_data_to_documents()
  RETURNS TRIGGER AS $$
  BEGIN
      SELECT fid INTO NEW.fid FROM public.practitioners WHERE id = NEW.practitioner_id;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trigger_sync_practitioner_data_to_documents ON public.practitioner_documents;
  CREATE TRIGGER trigger_sync_practitioner_data_to_documents
      BEFORE INSERT ON public.practitioner_documents
      FOR EACH ROW EXECUTE FUNCTION public.sync_practitioner_data_to_documents();

  CREATE OR REPLACE FUNCTION public.create_enum_patient_document_category() RETURNS void AS $$
  BEGIN
      CREATE TYPE patient_document_category AS ENUM ('administrative_generated', 'administrative_uploaded', 'medical_test');
  EXCEPTION
      WHEN duplicate_object THEN null;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.create_enum_patient_document_category();
  DROP FUNCTION public.create_enum_patient_document_category();

  CREATE TABLE IF NOT EXISTS public.patient_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE SET NULL,
    category patient_document_category DEFAULT 'administrative_uploaded' NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL, 
    fid TEXT,
    cip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Trigger to sync patient data to documents
  DROP TRIGGER IF EXISTS trigger_sync_patient_data_to_documents ON public.patient_documents;
  CREATE TRIGGER trigger_sync_patient_data_to_documents
      BEFORE INSERT ON public.patient_documents
      FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_clinical_record();

  -- 5. AUDIT & SECURITY
  CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- RLS Enable
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.allergies_list ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.patient_diagnoses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.clinical_constants ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.consultation_constants ENABLE ROW LEVEL SECURITY;

  -- RLS for Allergies List (Catalog)
  DROP POLICY IF EXISTS "Anyone can read allergies list" ON public.allergies_list;
  CREATE POLICY "Anyone can read allergies list" ON public.allergies_list
    FOR SELECT USING (auth.role() = 'authenticated');
    
  DROP POLICY IF EXISTS "Super admins can manage allergies list" ON public.allergies_list;
  CREATE POLICY "Super admins can manage allergies list" ON public.allergies_list
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

  -- RLS for Clinical Constants (Catalog)
  DROP POLICY IF EXISTS "Anyone can read clinical constants" ON public.clinical_constants;
  CREATE POLICY "Anyone can read clinical constants" ON public.clinical_constants
    FOR SELECT USING (auth.role() = 'authenticated');

  DROP POLICY IF EXISTS "Super admins can manage clinical constants" ON public.clinical_constants;
  CREATE POLICY "Super admins can manage clinical constants" ON public.clinical_constants
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

  -- RLS for Consultation Constants
  DROP POLICY IF EXISTS "Practitioners manage consultation constants" ON public.consultation_constants;
  CREATE POLICY "Practitioners manage consultation constants" ON public.consultation_constants
    FOR ALL
    USING (patient_id IN (SELECT id FROM public.patients WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())))
    WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())));

  DROP POLICY IF EXISTS "Super admins manage consultation constants" ON public.consultation_constants;
  CREATE POLICY "Super admins manage consultation constants" ON public.consultation_constants
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

  -- RLS for Patient Allergies
  DROP POLICY IF EXISTS "Practitioners manage their patients allergies" ON public.patient_allergies;
  CREATE POLICY "Practitioners manage their patients allergies" ON public.patient_allergies
    FOR ALL
    USING (patient_id IN (SELECT id FROM public.patients WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())))
    WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())));

  DROP POLICY IF EXISTS "Super admins manage all allergies" ON public.patient_allergies;
  CREATE POLICY "Super admins manage all allergies" ON public.patient_allergies
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

  -- RLS for Patient Diagnoses
  DROP POLICY IF EXISTS "Practitioners manage their patients diagnoses" ON public.patient_diagnoses;
  CREATE POLICY "Practitioners manage their patients diagnoses" ON public.patient_diagnoses
    FOR ALL
    USING (patient_id IN (SELECT id FROM public.patients WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())))
    WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())));

  DROP POLICY IF EXISTS "Super admins manage all diagnoses" ON public.patient_diagnoses;
  CREATE POLICY "Super admins manage all diagnoses" ON public.patient_diagnoses
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

  -- RLS for Patients
  DROP POLICY IF EXISTS "Super administrators can manage all patients" ON public.patients;
  CREATE POLICY "Super administrators can manage all patients" ON public.patients
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

  DROP POLICY IF EXISTS "Practitioners manage own patients" ON public.patients;
  CREATE POLICY "Practitioners manage own patients" ON public.patients
    FOR ALL
    USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()))
    WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

  DROP POLICY IF EXISTS "Individual patients can view own record" ON public.patients;
  CREATE POLICY "Individual patients can view own record" ON public.patients
    FOR SELECT
    USING (user_id = auth.uid());

  -- RLS for Portfolios
  DROP POLICY IF EXISTS "Super administrators can manage all portfolios" ON public.portfolios;
  CREATE POLICY "Super administrators can manage all portfolios" ON public.portfolios
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

  DROP POLICY IF EXISTS "Practitioners manage own portfolios" ON public.portfolios;
  CREATE POLICY "Practitioners manage own portfolios" ON public.portfolios
    FOR ALL
    USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()))
    WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()));

  DROP POLICY IF EXISTS "Authenticated users can read portfolios" ON public.portfolios;
  CREATE POLICY "Authenticated users can read portfolios" ON public.portfolios
    FOR SELECT
    USING (auth.role() = 'authenticated');

  -- Safe migration for portfolios table: Add and set NOT NULL constraints
  CREATE OR REPLACE FUNCTION public.migrate_portfolios_columns() RETURNS void AS $$
  BEGIN
      BEGIN
          ALTER TABLE public.portfolios ALTER COLUMN fid SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.migrate_portfolios_columns();
  DROP FUNCTION public.migrate_portfolios_columns();

  -- Add columns if they don't exist (for updates on existing tables)
  CREATE OR REPLACE FUNCTION public.migrate_practitioners_columns() RETURNS void AS $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='practitioners' AND column_name='last_name_1') THEN
          ALTER TABLE public.practitioners ADD COLUMN last_name_1 TEXT;
      END IF;

      -- Enforce NOT NULL constraints on practitioners (Safe Updates)
      BEGIN
          ALTER TABLE public.practitioners ALTER COLUMN specialty SET NOT NULL;
      EXCEPTION WHEN others THEN null; 
      END;
      
      BEGIN
          ALTER TABLE public.practitioners ALTER COLUMN dni SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.practitioners ALTER COLUMN birth_date SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.practitioners ALTER COLUMN address SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.practitioners ALTER COLUMN fid SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.practitioners ALTER COLUMN last_name_2 SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.migrate_practitioners_columns();
  DROP FUNCTION public.migrate_practitioners_columns();

  -- Safe migration for patients table: Split last_name into last_name_1 if needed
  CREATE OR REPLACE FUNCTION public.migrate_patients_columns() RETURNS void AS $$
  BEGIN
      -- If 'last_name' exists but 'last_name_1' does not, rename it
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='last_name') 
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='last_name_1') THEN
          ALTER TABLE public.patients RENAME COLUMN last_name TO last_name_1;
      END IF;

      -- Add last_name_2 if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='last_name_2') THEN
          ALTER TABLE public.patients ADD COLUMN last_name_2 TEXT;
      END IF;

      -- Enforce NOT NULL constraints on patients (Safe Updates)
      BEGIN
          ALTER TABLE public.patients ALTER COLUMN last_name_1 SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.patients ALTER COLUMN last_name_2 SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.patients ALTER COLUMN dni SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.patients ALTER COLUMN birth_date SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.patients ALTER COLUMN address SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.patients ALTER COLUMN practitioner_id SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.patients ALTER COLUMN user_id SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.patients ALTER COLUMN cip SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.patients ALTER COLUMN gender SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.patients ALTER COLUMN blood_group SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;

      BEGIN
          ALTER TABLE public.patients ALTER COLUMN insured_number SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.migrate_patients_columns();
  DROP FUNCTION public.migrate_patients_columns();

  -- Enforce UNIQUE constraints on patients (Safe Updates)
  CREATE OR REPLACE FUNCTION public.migrate_patients_constraints() RETURNS void AS $$
  BEGIN
      BEGIN
          ALTER TABLE public.patients ADD CONSTRAINT patients_user_id_key UNIQUE (user_id);
      EXCEPTION WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; 
      END;

      BEGIN
          ALTER TABLE public.patients ADD CONSTRAINT patients_dni_key UNIQUE (dni);
      EXCEPTION WHEN duplicate_table THEN null; WHEN duplicate_object THEN null;
      END;

      BEGIN
          ALTER TABLE public.patients ADD CONSTRAINT patients_cip_key UNIQUE (cip);
      EXCEPTION WHEN duplicate_table THEN null; WHEN duplicate_object THEN null;
      END;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.migrate_patients_constraints();
  DROP FUNCTION public.migrate_patients_constraints();

  -- Safe migration: Add unique constraint to patient_diagnoses
  CREATE OR REPLACE FUNCTION public.migrate_patient_diagnoses_constraints() RETURNS void AS $$
  BEGIN
      BEGIN
          ALTER TABLE public.patient_diagnoses ADD CONSTRAINT patient_diagnoses_unique UNIQUE (patient_id, diagnosis_code);
      EXCEPTION WHEN others THEN null; 
      END;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.migrate_patient_diagnoses_constraints();
  DROP FUNCTION public.migrate_patient_diagnoses_constraints();

  -- Safe migration: Add active column to users if missing
  CREATE OR REPLACE FUNCTION public.migrate_users_active() RETURNS void AS $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='active') THEN
          ALTER TABLE public.users ADD COLUMN active BOOLEAN DEFAULT true;
      END IF;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.migrate_users_active();
  DROP FUNCTION public.migrate_users_active();

  -- Safe migration: Add conditional integrity constraints to users
  CREATE OR REPLACE FUNCTION public.migrate_users_role_constraints() RETURNS void AS $$
  BEGIN
      BEGIN
          ALTER TABLE public.users ADD CONSTRAINT users_role_integrity CHECK (
              (role = 'practitioner' AND practitioner_id IS NOT NULL AND fid IS NOT NULL) OR
              (role = 'patient' AND patient_id IS NOT NULL AND portfolio_id IS NOT NULL AND cip IS NOT NULL) OR
              (role NOT IN ('practitioner', 'patient'))
          );
      EXCEPTION WHEN others THEN null;
      END;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.migrate_users_role_constraints();
  DROP FUNCTION public.migrate_users_role_constraints();

  -- RPC: Get Admin Users List (joins public.users with auth.users and profiles)
  DROP FUNCTION IF EXISTS public.get_admin_users();
  CREATE OR REPLACE FUNCTION public.get_admin_users(
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
  )
  RETURNS TABLE (
    id UUID,
    email TEXT,
    role public.user_role,
    active BOOLEAN,
    full_name TEXT,
    fid TEXT,
    cip TEXT,
    practitioner_id UUID,
    patient_id UUID,
    portfolio_id UUID,
    portfolio_name TEXT,
    insured_number TEXT,
    updated_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    is_confirmed BOOLEAN,
    total_count BIGINT
  ) AS $$
  BEGIN
    RETURN QUERY
    WITH filtered_users AS (
      SELECT 
        u.id, u.email, u.role, u.active,
        COALESCE(
          p.first_name || ' ' || p.last_name_1 || ' ' || COALESCE(p.last_name_2, ''),
          pat.first_name || ' ' || pat.last_name_1 || ' ' || COALESCE(pat.last_name_2, ''),
          'N/A'
        ) as full_name,
        u.fid, u.cip, u.practitioner_id, u.patient_id, u.portfolio_id,
        port.name as portfolio_name, u.insured_number, u.updated_at,
        au.last_sign_in_at, u.created_at,
        (au.email_confirmed_at IS NOT NULL) as is_confirmed
      FROM public.users u
      JOIN auth.users au ON u.id = au.id
      LEFT JOIN public.practitioners p ON u.practitioner_id = p.id
      LEFT JOIN public.patients pat ON u.patient_id = pat.id
      LEFT JOIN public.portfolios port ON u.portfolio_id = port.id
      WHERE (p_search IS NULL OR 
             u.email ILIKE '%' || p_search || '%' OR
             u.fid ILIKE '%' || p_search || '%' OR
             u.cip ILIKE '%' || p_search || '%' OR
             p.first_name || ' ' || p.last_name_1 ILIKE '%' || p_search || '%' OR
             pat.first_name || ' ' || pat.last_name_1 ILIKE '%' || p_search || '%')
    )
    SELECT *, (SELECT COUNT(*) FROM filtered_users)
    FROM filtered_users
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- RPC: Toggle User Active Status (Syncs with Auth Ban)
  CREATE OR REPLACE FUNCTION public.toggle_user_active(user_uuid UUID, is_active BOOLEAN)
  RETURNS VOID AS $$
  BEGIN
    -- Update public status
    UPDATE public.users SET active = is_active WHERE id = user_uuid;
    
    -- Sync with Auth Ban (Active = false -> Banned)
    IF is_active THEN
      UPDATE auth.users SET banned_until = NULL WHERE id = user_uuid;
    ELSE
      UPDATE auth.users SET banned_until = '2099-01-01 00:00:00' WHERE id = user_uuid;
    END IF;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Safe migration for patients table: Add portfolio_id
  CREATE OR REPLACE FUNCTION public.migrate_patients_portfolio() RETURNS void AS $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='portfolio_id') THEN
          ALTER TABLE public.patients ADD COLUMN portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE SET NULL;
      END IF;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.migrate_patients_portfolio();
  DROP FUNCTION public.migrate_patients_portfolio();

  -- Safe migration: Add portfolio_id to consultations
  CREATE OR REPLACE FUNCTION public.migrate_consultations_portfolio() RETURNS void AS $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='portfolio_id') THEN
          ALTER TABLE public.consultations ADD COLUMN portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE;
      END IF;

       -- Enforce NOT NULL (Safe Update)
      BEGIN
          ALTER TABLE public.consultations ALTER COLUMN portfolio_id SET NOT NULL;
      EXCEPTION WHEN others THEN null;
      END;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.migrate_consultations_portfolio();
  DROP FUNCTION public.migrate_consultations_portfolio();

  -- RLS: Restrict Consultation Creation to Practitioners
  DROP POLICY IF EXISTS "Practitioners can create consultations" ON public.consultations;
  CREATE POLICY "Practitioners can create consultations" ON public.consultations
    FOR INSERT
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.practitioners WHERE user_id = auth.uid())
      AND practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    );

  DROP POLICY IF EXISTS "Practitioners manage their consultations" ON public.consultations;
  CREATE POLICY "Practitioners manage their consultations" ON public.consultations
    FOR ALL
    USING (
      practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    )
    WITH CHECK (
      practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    );

  DROP POLICY IF EXISTS "Patients view their own consultations" ON public.consultations;
  CREATE POLICY "Patients view their own consultations" ON public.consultations
    FOR SELECT
    USING (
      patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    );

  -- RLS for Diagnoses Catalog (Read-only for all authenticated)
  DROP POLICY IF EXISTS "Authenticated users can read diagnoses" ON public.diagnoses;
  CREATE POLICY "Authenticated users can read diagnoses" ON public.diagnoses
    FOR SELECT
    USING (auth.role() = 'authenticated');

  -- RLS for Consultation Diagnoses
  DROP POLICY IF EXISTS "Practitioners manage consultation diagnoses" ON public.consultation_diagnoses;
  DROP POLICY IF EXISTS "Patients view consultation diagnoses" ON public.consultation_diagnoses;

  -- Practitioners: Manage (ALL) their own diagnoses
  CREATE POLICY "Practitioners manage consultation diagnoses" ON public.consultation_diagnoses
    FOR ALL
    USING (
      practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    )
    WITH CHECK (
      practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    );

  -- Patients: View (SELECT) their own diagnoses
  CREATE POLICY "Patients view consultation diagnoses" ON public.consultation_diagnoses
    FOR SELECT
    USING (
      patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    );

  -- Transactional table linking Consultations <-> Diagnoses (Re-added with new columns)
  DROP TABLE IF EXISTS public.consultation_diagnoses CASCADE;
  CREATE TABLE IF NOT EXISTS public.consultation_diagnoses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE NOT NULL,
    diagnosis_code TEXT REFERENCES public.diagnoses(codigo) ON DELETE CASCADE NOT NULL, 
    practitioner_id UUID REFERENCES public.practitioners(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
    fid TEXT NOT NULL,
    cip TEXT NOT NULL,
    motivo TEXT NOT NULL,
    exploracion TEXT NOT NULL,
    aproximacion TEXT,
    tratamiento TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  ALTER TABLE public.consultation_diagnoses ENABLE ROW LEVEL SECURITY;

  -- Trigger to sync diagnosis status to patient_diagnoses
  CREATE OR REPLACE FUNCTION public.sync_diagnosis_to_patient()
  RETURNS TRIGGER AS $$
  DECLARE
      v_status_int INTEGER;
  BEGIN
      -- Map enum status to integer status for patient_diagnoses
      v_status_int := CASE 
          WHEN NEW.status = 'confirmed' THEN 2
          WHEN NEW.status = 'pending' THEN 1
          WHEN NEW.status = 'unconfirmed' THEN 3
          ELSE 2
      END;

      INSERT INTO public.patient_diagnoses (
          patient_id, 
          diagnosis_code, 
          practitioner_id, 
          cip, 
          status, 
          updated_at
      )
      VALUES (
          NEW.patient_id, 
          NEW.diagnosis_code, 
          NEW.practitioner_id, 
          NEW.cip, 
          v_status_int, 
          NOW()
      )
      ON CONFLICT (patient_id, diagnosis_code) 
      DO UPDATE SET 
          status = v_status_int,
          practitioner_id = NEW.practitioner_id,
          updated_at = NOW();

      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  DROP TRIGGER IF EXISTS trigger_sync_diagnosis_to_patient ON public.consultation_diagnoses;
  CREATE TRIGGER trigger_sync_diagnosis_to_patient
  AFTER INSERT OR UPDATE OF status ON public.consultation_diagnoses
  FOR EACH ROW EXECUTE FUNCTION public.sync_diagnosis_to_patient();

  -- RLS for Consultation Diagnoses
  DROP POLICY IF EXISTS "Practitioners manage consultation diagnoses" ON public.consultation_diagnoses;
  DROP POLICY IF EXISTS "Patients view consultation diagnoses" ON public.consultation_diagnoses;

  -- Practitioners: Manage (ALL) their own diagnoses
  CREATE POLICY "Practitioners manage consultation diagnoses" ON public.consultation_diagnoses
    FOR ALL
    USING (
      practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    )
    WITH CHECK (
      practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    );

  -- Practitioners: View (SELECT) diagnoses for their assigned patients
  DROP POLICY IF EXISTS "Practitioners view assigned patients diagnoses" ON public.consultation_diagnoses;
  CREATE POLICY "Practitioners view assigned patients diagnoses" ON public.consultation_diagnoses
    FOR SELECT
    USING (
      patient_id IN (
        SELECT id FROM public.patients 
        WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
      )
    );

  -- Patients: View (SELECT) their own diagnoses
  DROP POLICY IF EXISTS "Patients view consultation diagnoses" ON public.consultation_diagnoses;
  CREATE POLICY "Patients view consultation diagnoses" ON public.consultation_diagnoses
    FOR SELECT
    USING (
      patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    );

  -- Super Admins: Manage ALL
  DROP POLICY IF EXISTS "Super admins manage consultations" ON public.consultations;
  CREATE POLICY "Super admins manage consultations" ON public.consultations
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

  DROP POLICY IF EXISTS "Super admins manage consultation diagnoses" ON public.consultation_diagnoses;
  CREATE POLICY "Super admins manage consultation diagnoses" ON public.consultation_diagnoses
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

  DROP POLICY IF EXISTS "Super admins manage consultation constants" ON public.consultation_constants;
  CREATE POLICY "Super admins manage consultation constants" ON public.consultation_constants
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));
 
    -- Safe migration: Add fid, cip, and portfolio_id columns to users if missing
    CREATE OR REPLACE FUNCTION public.migrate_users_identifiers() RETURNS void AS $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='fid') THEN
            ALTER TABLE public.users ADD COLUMN fid TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='cip') THEN
            ALTER TABLE public.users ADD COLUMN cip TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='portfolio_id') THEN
       ALTER TABLE public.users ADD COLUMN portfolio_id UUID REFERENCES public.portfolios(id);
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='insured_number') THEN
       ALTER TABLE public.users ADD COLUMN insured_number TEXT;
   END IF;
   END;
   $$ LANGUAGE plpgsql;
    SELECT public.migrate_users_identifiers();
    DROP FUNCTION public.migrate_users_identifiers();
 
   -- Function to handle new user creation from Auth
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.users (id, email, role)
     VALUES (
       NEW.id,
       NEW.email,
       COALESCE(NEW.raw_user_meta_data->>'role', 'patient')::public.user_role
     );
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Trigger for new user
   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

   -- Trigger to sync FID from practitioners to users
   CREATE OR REPLACE FUNCTION public.sync_practitioner_to_user()
   RETURNS TRIGGER AS $$
   BEGIN
       UPDATE public.users 
       SET fid = NEW.fid, practitioner_id = NEW.id
       WHERE id = NEW.user_id;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
 
   DROP TRIGGER IF EXISTS trigger_sync_practitioner_to_user ON public.practitioners;
   CREATE TRIGGER trigger_sync_practitioner_to_user
   AFTER INSERT OR UPDATE OF fid, user_id ON public.practitioners
   FOR EACH ROW EXECUTE FUNCTION public.sync_practitioner_to_user();
 
   -- Trigger to sync CIP from patients to users
    CREATE OR REPLACE FUNCTION public.sync_patient_to_user()
    RETURNS TRIGGER AS $$
    DECLARE
        p_fid TEXT;
    BEGIN
        -- Get the assigned practitioner's FID
        SELECT fid INTO p_fid FROM public.practitioners WHERE id = NEW.practitioner_id;

        UPDATE public.users 
        SET cip = NEW.cip, 
            patient_id = NEW.id,
            practitioner_id = NEW.practitioner_id,
            portfolio_id = NEW.portfolio_id,
            insured_number = NEW.insured_number,
            fid = p_fid
        WHERE id = NEW.user_id;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
 
   DROP TRIGGER IF EXISTS trigger_sync_patient_to_user ON public.patients;
   CREATE TRIGGER trigger_sync_patient_to_user
   AFTER INSERT OR UPDATE OF cip, user_id, practitioner_id, portfolio_id, insured_number ON public.patients
   FOR EACH ROW EXECUTE FUNCTION public.sync_patient_to_user();
 
    -- Backfill existing data
    CREATE OR REPLACE FUNCTION public.backfill_user_identifiers() RETURNS void AS $$
    BEGIN
        -- Sync Practitioners own data
        UPDATE public.users u
        SET fid = p.fid, practitioner_id = p.id
        FROM public.practitioners p
        WHERE u.id = p.user_id AND (u.fid IS NULL OR u.practitioner_id IS NULL);
  
        -- Sync Patients data (including their assigned practitioner data)
        UPDATE public.users u
        SET cip = pat.cip, 
            patient_id = pat.id,
            practitioner_id = pat.practitioner_id,
            portfolio_id = pat.portfolio_id,
            insured_number = pat.insured_number,
            fid = pr.fid
        FROM public.patients pat
        LEFT JOIN public.practitioners pr ON pat.practitioner_id = pr.id
        WHERE u.id = pat.user_id AND (u.cip IS NULL OR u.patient_id IS NULL OR u.practitioner_id IS NULL OR u.portfolio_id IS NULL OR u.insured_number IS NULL);
    END;
    $$ LANGUAGE plpgsql;
   SELECT public.backfill_user_identifiers();
   DROP FUNCTION public.backfill_user_identifiers();
 
   -- Safe migration: Add fid and cip to clinical tables if missing
   CREATE OR REPLACE FUNCTION public.migrate_clinical_identifiers() RETURNS void AS $$
   BEGIN
       -- Consultations
       IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='fid') THEN
           ALTER TABLE public.consultations ADD COLUMN fid TEXT;
       END IF;
       IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='cip') THEN
           ALTER TABLE public.consultations ADD COLUMN cip TEXT;
       END IF;
 
       -- Consultation Diagnoses
       IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultation_diagnoses' AND column_name='fid') THEN
           ALTER TABLE public.consultation_diagnoses ADD COLUMN fid TEXT;
       END IF;
       IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultation_diagnoses' AND column_name='cip') THEN
           ALTER TABLE public.consultation_diagnoses ADD COLUMN cip TEXT;
       END IF;
   END;
   $$ LANGUAGE plpgsql;
   SELECT public.migrate_clinical_identifiers();
   DROP FUNCTION public.migrate_clinical_identifiers();
 
   -- Function to populate identifiers on Insert
   CREATE OR REPLACE FUNCTION public.sync_identifiers_to_consultations()
   RETURNS TRIGGER AS $$
   BEGIN
       SELECT fid INTO NEW.fid FROM public.practitioners WHERE id = NEW.practitioner_id;
       SELECT cip INTO NEW.cip FROM public.patients WHERE id = NEW.patient_id;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
 
   DROP TRIGGER IF EXISTS trigger_sync_identifiers_to_consultations ON public.consultations;
   CREATE TRIGGER trigger_sync_identifiers_to_consultations
   BEFORE INSERT ON public.consultations
   FOR EACH ROW EXECUTE FUNCTION public.sync_identifiers_to_consultations();
 
   -- Function to populate identifiers on Insert for Diagnoses
   CREATE OR REPLACE FUNCTION public.sync_identifiers_to_diagnoses()
   RETURNS TRIGGER AS $$
   BEGIN
       SELECT fid INTO NEW.fid FROM public.practitioners WHERE id = NEW.practitioner_id;
       SELECT cip INTO NEW.cip FROM public.patients WHERE id = NEW.patient_id;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
 
   DROP TRIGGER IF EXISTS trigger_sync_identifiers_to_diagnoses ON public.consultation_diagnoses;
   CREATE TRIGGER trigger_sync_identifiers_to_diagnoses
   BEFORE INSERT ON public.consultation_diagnoses
   FOR EACH ROW EXECUTE FUNCTION public.sync_identifiers_to_diagnoses();
 
   -- Backfill existing clinical data
   CREATE OR REPLACE FUNCTION public.backfill_clinical_identifiers() RETURNS void AS $$
   BEGIN
       -- Update Consultations
       UPDATE public.consultations c
       SET fid = p.fid, cip = pat.cip
       FROM public.practitioners p, public.patients pat
       WHERE c.practitioner_id = p.id AND c.patient_id = pat.id
       AND (c.fid IS NULL OR c.cip IS NULL);
 
       -- Update Consultation Diagnoses
       UPDATE public.consultation_diagnoses cd
       SET fid = p.fid, cip = pat.cip
       FROM public.practitioners p, public.patients pat
       WHERE cd.practitioner_id = p.id AND cd.patient_id = pat.id
       AND (cd.fid IS NULL OR cd.cip IS NULL);
   END;
   $$ LANGUAGE plpgsql;
   SELECT public.backfill_clinical_identifiers();
   DROP FUNCTION public.backfill_clinical_identifiers();
 
   -- Safe migration: Add fid to portfolios if missing
   CREATE OR REPLACE FUNCTION public.migrate_portfolios_fid() RETURNS void AS $$
   BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolios' AND column_name='fid') THEN
           ALTER TABLE public.portfolios ADD COLUMN fid TEXT;
       END IF;
   END;
   $$ LANGUAGE plpgsql;
   SELECT public.migrate_portfolios_fid();
   DROP FUNCTION public.migrate_portfolios_fid();
 
   -- Function to populate fid on Insert for Portfolios
   CREATE OR REPLACE FUNCTION public.sync_fid_to_portfolios()
   RETURNS TRIGGER AS $$
   BEGIN
       SELECT fid INTO NEW.fid FROM public.practitioners WHERE id = NEW.practitioner_id;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
 
   DROP TRIGGER IF EXISTS trigger_sync_fid_to_portfolios ON public.portfolios;
   CREATE TRIGGER trigger_sync_fid_to_portfolios
   BEFORE INSERT ON public.portfolios
   FOR EACH ROW EXECUTE FUNCTION public.sync_fid_to_portfolios();
 
   -- Backfill existing portfolios
   CREATE OR REPLACE FUNCTION public.backfill_portfolios_fid() RETURNS void AS $$
   BEGIN
       UPDATE public.portfolios p
       SET fid = prac.fid
       FROM public.practitioners prac
       WHERE p.practitioner_id = prac.id AND p.fid IS NULL;
   END;
   $$ LANGUAGE plpgsql;
   SELECT public.backfill_portfolios_fid();
   DROP FUNCTION public.backfill_portfolios_fid();

    -- RPC: Get Global Admin Stats
    CREATE OR REPLACE FUNCTION public.get_admin_stats()
    RETURNS JSONB AS $$
    DECLARE
      result JSONB;
    BEGIN
      SELECT jsonb_build_object(
        'users', (SELECT count(*) FROM public.users),
        'patients', (SELECT count(*) FROM public.patients),
        'portfolios', (SELECT count(*) FROM public.portfolios),
        'alerts', (SELECT count(*) FROM public.users WHERE active = false)
      ) INTO result;
      RETURN result;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- RPC: Get Practitioner Stats
    CREATE OR REPLACE FUNCTION public.get_practitioner_stats()
    RETURNS JSONB AS $$
    DECLARE
      prac_id UUID;
      result JSONB;
    BEGIN
      SELECT id INTO prac_id FROM public.practitioners WHERE user_id = auth.uid();
      
      SELECT jsonb_build_object(
        'portfolios', (SELECT count(*) FROM public.portfolios WHERE practitioner_id = prac_id),
        'patients', (SELECT count(*) FROM public.patients WHERE practitioner_id = prac_id),
        'alerts', 0
      ) INTO result;
      RETURN result;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 8. AUTOMATED IDENTIFIERS (CIP & FID)
    CREATE OR REPLACE FUNCTION public.generate_medical_id(ln1 TEXT, ln2 TEXT, bday DATE)
    RETURNS TEXT AS $$
    DECLARE
      initials TEXT;
      random_part TEXT;
      date_part TEXT;
    BEGIN
      -- 2 initials from last_name_1 + 2 initials from last_name_2 (or 'XX' if missing)
      initials := UPPER(SUBSTRING(COALESCE(ln1, 'X'), 1, 2)) || UPPER(SUBSTRING(COALESCE(ln2, 'X'), 1, 2));
      IF LENGTH(initials) < 4 THEN
        initials := RPAD(initials, 4, 'X');
      END IF;

      -- 8 random digits
      random_part := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');

      -- DDMMYYYY
      date_part := TO_CHAR(bday, 'DDMMYYYY');

      RETURN initials || random_part || date_part;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger Function for CIP
    CREATE OR REPLACE FUNCTION public.trigger_generate_cip()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.cip IS NULL THEN
        NEW.cip := public.generate_medical_id(NEW.last_name_1, NEW.last_name_2, NEW.birth_date);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_generate_cip ON public.patients;
    CREATE TRIGGER trigger_generate_cip
      BEFORE INSERT ON public.patients
      FOR EACH ROW EXECUTE FUNCTION public.trigger_generate_cip();

    -- Function to generate Automated Policy Number (POL-YYYY-RANDOM)
    CREATE OR REPLACE FUNCTION public.generate_policy_number()
    RETURNS TEXT AS $$
    DECLARE
        year_part TEXT;
        random_part TEXT;
    BEGIN
        year_part := TO_CHAR(NOW(), 'YYYY');
        random_part := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        RETURN 'POL-' || year_part || '-' || random_part;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger Function for Policy Number
    CREATE OR REPLACE FUNCTION public.trigger_generate_insured_number()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.insured_number IS NULL OR NEW.insured_number = '' THEN
            NEW.insured_number := public.generate_policy_number();
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_generate_insured_number ON public.patients;
    CREATE TRIGGER trigger_generate_insured_number
        BEFORE INSERT ON public.patients
        FOR EACH ROW EXECUTE FUNCTION public.trigger_generate_insured_number();
    
    -- Backfill: Generate Policy Numbers for existing patients that don't have one
    DO $$
    BEGIN
        UPDATE public.patients
        SET insured_number = public.generate_policy_number()
        WHERE insured_number IS NULL OR insured_number = '';
    END $$;

    -- Trigger Function for FID
    CREATE OR REPLACE FUNCTION public.trigger_generate_fid()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.fid IS NULL THEN
        NEW.fid := public.generate_medical_id(NEW.last_name_1, NEW.last_name_2, NEW.birth_date);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_generate_fid ON public.practitioners;
    CREATE TRIGGER trigger_generate_fid
      BEFORE INSERT ON public.practitioners
      FOR EACH ROW EXECUTE FUNCTION public.trigger_generate_fid();
    
    -- Sync Patient Data to Clinical Records (Allergies, Diagnoses)
    CREATE OR REPLACE FUNCTION public.sync_patient_data_to_clinical_record()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.cip IS NULL OR NEW.practitioner_id IS NULL THEN
            SELECT cip, practitioner_id INTO NEW.cip, NEW.practitioner_id
            FROM public.patients WHERE id = NEW.patient_id;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_sync_patient_data_to_allergies ON public.patient_allergies;
    CREATE TRIGGER trigger_sync_patient_data_to_allergies
        BEFORE INSERT ON public.patient_allergies
        FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_clinical_record();

    DROP TRIGGER IF EXISTS trigger_sync_patient_data_to_diagnoses ON public.patient_diagnoses;
    CREATE TRIGGER trigger_sync_patient_data_to_diagnoses
        BEFORE INSERT ON public.patient_diagnoses
        FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_clinical_record();

    DROP TRIGGER IF EXISTS trigger_sync_patient_data_to_constants ON public.consultation_constants;
    CREATE TRIGGER trigger_sync_patient_data_to_constants
        BEFORE INSERT ON public.consultation_constants
        FOR EACH ROW EXECUTE FUNCTION public.sync_patient_data_to_clinical_record();

    -- Function to sync vitals (weight, height) back to patient profile
    CREATE OR REPLACE FUNCTION public.sync_vitals_to_patient_profile()
    RETURNS TRIGGER AS $$
    DECLARE
        const_code TEXT;
    BEGIN
        SELECT code INTO const_code FROM public.clinical_constants WHERE id = NEW.constant_id;

        IF const_code = 'WEIGHT' THEN
            UPDATE public.patients SET weight = NEW.value, updated_at = NOW() WHERE id = NEW.patient_id;
        ELSIF const_code = 'HEIGHT' THEN
            UPDATE public.patients SET height = NEW.value, updated_at = NOW() WHERE id = NEW.patient_id;
        END IF;

        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_sync_vitals_to_patient_profile ON public.consultation_constants;
    CREATE TRIGGER trigger_sync_vitals_to_patient_profile
    AFTER INSERT OR UPDATE ON public.consultation_constants
    FOR EACH ROW EXECUTE FUNCTION public.sync_vitals_to_patient_profile();

    -- 9. SCHEMA FIXES (MIGRATIONS)
    -- Safe migration for clinical columns
    CREATE OR REPLACE FUNCTION public.migrate_patients_clinical_columns() RETURNS void AS $$
    BEGIN
        -- Add clinical columns to patients if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='blood_group') THEN
            ALTER TABLE public.patients ADD COLUMN blood_group TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='height') THEN
            ALTER TABLE public.patients ADD COLUMN height NUMERIC;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='weight') THEN
            ALTER TABLE public.patients ADD COLUMN weight NUMERIC;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='background') THEN
            ALTER TABLE public.patients ADD COLUMN background TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='habits') THEN
            ALTER TABLE public.patients ADD COLUMN habits TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='gender') THEN
            ALTER TABLE public.patients ADD COLUMN gender TEXT;
        END IF;

        -- Make last_name_2 optional
        BEGIN
            ALTER TABLE public.patients ALTER COLUMN last_name_2 DROP NOT NULL;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Could not alter last_name_2, might already be optional or other issue';
        END;
    END;
    $$ LANGUAGE plpgsql;
    SELECT public.migrate_patients_clinical_columns();
    DROP FUNCTION public.migrate_patients_clinical_columns();

    -- RPC: Get Patients List with Auth Info
    DROP FUNCTION IF EXISTS public.get_patients_list();
    CREATE OR REPLACE FUNCTION public.get_patients_list(
        p_search TEXT DEFAULT NULL,
        p_limit INTEGER DEFAULT 20,
        p_offset INTEGER DEFAULT 0
    )
    RETURNS TABLE (
        id UUID,
        practitioner_id UUID,
        portfolio_id UUID,
        portfolio_name TEXT,
        first_name TEXT,
        last_name_1 TEXT,
        last_name_2 TEXT,
        cip TEXT,
        dni TEXT,
        birth_date DATE,
        gender TEXT,
        blood_group TEXT,
        height NUMERIC,
        weight NUMERIC,
        background TEXT,
        habits TEXT,
        address JSONB,
        insured_number TEXT,
        created_at TIMESTAMPTZ,
        last_sign_in_at TIMESTAMPTZ,
        total_count BIGINT
    ) AS $body$
    BEGIN
        RETURN QUERY
        WITH filtered_patients AS (
            SELECT 
                p.id, p.practitioner_id, p.portfolio_id, port.name as portfolio_name, 
                p.first_name, p.last_name_1, p.last_name_2, p.cip, p.dni, p.birth_date, 
                p.gender, p.blood_group, p.height, p.weight, p.background, p.habits, 
                p.address, p.insured_number, p.created_at, au.last_sign_in_at
            FROM public.patients p
            LEFT JOIN auth.users au ON p.user_id = au.id
            LEFT JOIN public.portfolios port ON p.portfolio_id = port.id
            WHERE (p_search IS NULL OR 
                   p.first_name ILIKE '%' || p_search || '%' OR
                   p.last_name_1 ILIKE '%' || p_search || '%' OR
                   p.last_name_2 ILIKE '%' || p_search || '%' OR
                   p.cip ILIKE '%' || p_search || '%' OR
                   p.dni ILIKE '%' || p_search || '%')
        )
        SELECT *, (SELECT COUNT(*) FROM filtered_patients)
        FROM filtered_patients
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset;
    END;
    $body$ LANGUAGE plpgsql SECURITY DEFINER;


    -- Rename evolutivo to exploracion if it exists (Fix for existing DBs)
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultation_diagnoses' AND column_name='evolutivo') THEN
            ALTER TABLE public.consultation_diagnoses RENAME COLUMN evolutivo TO exploracion;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultation_constants' AND column_name='consultation_diagnosis_id') THEN
            ALTER TABLE public.consultation_constants ADD COLUMN consultation_diagnosis_id UUID REFERENCES public.consultation_diagnoses(id) ON DELETE SET NULL;
        END IF;

        -- Seed clinical constants catalog
        INSERT INTO public.clinical_constants (code, name, unit)
        VALUES 
            ('WEIGHT', 'Peso', 'kg'),
            ('HEIGHT', 'Altura', 'cm'),
            ('BP_SYS', 'Tensión Arterial Sistólica', 'mmHg'),
            ('BP_DIA', 'Tensión Arterial Diastólica', 'mmHg'),
            ('HEART_RATE', 'Frecuencia Cardíaca', 'lpm'),
            ('TEMP', 'Temperatura', 'ºC'),
            ('SATO2', 'Saturación de Oxígeno', '%')
        ON CONFLICT (code) DO UPDATE SET 
            name = EXCLUDED.name,
            unit = EXCLUDED.unit;

        -- Seed minimal diagnosis catalog (CIE-10)
        INSERT INTO public.diagnoses (codigo, descripcion)
        VALUES 
            ('Z00.0', 'Examen médico general'),
            ('Z00.1', 'Control de salud de rutina del niño'),
            ('R50.9', 'Fiebre, no especificada'),
            ('R51', 'Cefalea'),
            ('R05', 'Tos'),
            ('J00', 'Rinofaringitis aguda [resfriado común]'),
            ('K29.7', 'Gastritis, no especificada'),
            ('M54.5', 'Lumbago no especificado'),
            ('I10', 'Hipertensión esencial (primaria)')
        ON CONFLICT (codigo) DO NOTHING;

    END $$;

  -- Trigger to enforce role-based update permissions on patients
  CREATE OR REPLACE FUNCTION public.check_patient_update_permissions()
  RETURNS TRIGGER AS $func$
  DECLARE
      user_role_val user_role;
  BEGIN
      SELECT role INTO user_role_val FROM public.users WHERE id = auth.uid();

      IF user_role_val != 'super_admin' THEN
          IF OLD.practitioner_id IS DISTINCT FROM NEW.practitioner_id OR
             OLD.first_name IS DISTINCT FROM NEW.first_name OR
             OLD.last_name_1 IS DISTINCT FROM NEW.last_name_1 OR
             OLD.last_name_2 IS DISTINCT FROM NEW.last_name_2 OR
             OLD.dni IS DISTINCT FROM NEW.dni OR
             OLD.birth_date IS DISTINCT FROM NEW.birth_date OR
             OLD.user_id IS DISTINCT FROM NEW.user_id OR
             OLD.cip IS DISTINCT FROM NEW.cip OR
             OLD.insured_number IS DISTINCT FROM NEW.insured_number
          THEN
              RAISE EXCEPTION 'No tienes permisos para modificar datos de identidad o asignación de facultativo.';
          END IF;
      END IF;

      RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  DROP TRIGGER IF EXISTS tr_check_patient_update_permissions ON public.patients;
  CREATE TRIGGER tr_check_patient_update_permissions
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.check_patient_update_permissions();

  -- Robust Migration for Diagnosis Status ENUM
  DO $$
  BEGIN
      -- 1. Create type if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'diagnosis_status_type') THEN
          CREATE TYPE diagnosis_status_type AS ENUM ('pending', 'confirmed', 'unconfirmed');
      ELSE
          -- 2. If it exists but doesn't have the new values, we need to handle it safely.
          -- Since ALTER TYPE ADD VALUE cannot be used in the same transaction as column defaults/updates,
          -- we recreate the type if we detect the "old" set of values.
          IF EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'diagnosis_status_type' AND e.enumlabel = 'active') THEN
              
              -- Temporarily change column type to text to allow dropping the enum
              IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultation_diagnoses' AND column_name='status') THEN
                  ALTER TABLE public.consultation_diagnoses ALTER COLUMN status DROP DEFAULT;
                  ALTER TABLE public.consultation_diagnoses ALTER COLUMN status TYPE TEXT USING status::TEXT;
              END IF;

              DROP TYPE diagnosis_status_type CASCADE;
              CREATE TYPE diagnosis_status_type AS ENUM ('pending', 'confirmed', 'unconfirmed');

              -- Convert back if column exists
              IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultation_diagnoses' AND column_name='status') THEN
                  UPDATE public.consultation_diagnoses 
                  SET status = CASE 
                      WHEN status IN ('active', 'resolved') THEN 'confirmed'
                      WHEN status = 'inactive' THEN 'unconfirmed'
                      WHEN status = 'pending' THEN 'pending'
                      ELSE 'confirmed'
                  END;
                  ALTER TABLE public.consultation_diagnoses ALTER COLUMN status TYPE diagnosis_status_type USING status::diagnosis_status_type;
                  ALTER TABLE public.consultation_diagnoses ALTER COLUMN status SET DEFAULT 'confirmed';
                  ALTER TABLE public.consultation_diagnoses ALTER COLUMN status SET NOT NULL;
              END IF;
          END IF;
      END IF;

      -- 3. Ensure the column exists with the correct default
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultation_diagnoses' AND column_name='status') THEN
          ALTER TABLE public.consultation_diagnoses ADD COLUMN status diagnosis_status_type DEFAULT 'confirmed' NOT NULL;
      END IF;
  END $$;

  -- Ensure existing rows have required fields and enforce NOT NULL constraints
  CREATE OR REPLACE FUNCTION public.enforce_consultation_diagnoses_constraints() RETURNS void AS $$
  BEGIN
      -- 1. Update status to new values
      -- Mapping: NULL -> confirmed. (Other values already mapped in the main migration above)
      UPDATE public.consultation_diagnoses SET status = 'confirmed' WHERE status IS NULL;
      
      -- 2. Update fid from practitioner's license_number where NULL
      UPDATE public.consultation_diagnoses cd
      SET fid = p.license_number
      FROM public.practitioners p
      WHERE cd.practitioner_id = p.id AND cd.fid IS NULL;
      
      -- 3. Update cip from patient's cip where NULL
      UPDATE public.consultation_diagnoses cd
      SET cip = pt.cip
      FROM public.patients pt
      WHERE cd.patient_id = pt.id AND cd.cip IS NULL;
      
      -- 4. Set default values for text fields
      UPDATE public.consultation_diagnoses SET motivo = 'Consulta general' WHERE motivo IS NULL;
      UPDATE public.consultation_diagnoses SET exploracion = 'Sin hallazgos detallados' WHERE exploracion IS NULL;
      
      -- 5. Set default timestamps
      UPDATE public.consultation_diagnoses SET created_at = NOW() WHERE created_at IS NULL;
      
      -- 6. Enforce NOT NULL constraints
      BEGIN
          ALTER TABLE public.consultation_diagnoses ALTER COLUMN status SET NOT NULL;
          ALTER TABLE public.consultation_diagnoses ALTER COLUMN fid SET NOT NULL;
          ALTER TABLE public.consultation_diagnoses ALTER COLUMN cip SET NOT NULL;
          ALTER TABLE public.consultation_diagnoses ALTER COLUMN motivo SET NOT NULL;
          ALTER TABLE public.consultation_diagnoses ALTER COLUMN exploracion SET NOT NULL;
          ALTER TABLE public.consultation_diagnoses ALTER COLUMN created_at SET NOT NULL;
      EXCEPTION
          WHEN others THEN
              -- Constraints might already exist or other error, continue
              NULL;
      END;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.enforce_consultation_diagnoses_constraints();
  DROP FUNCTION public.enforce_consultation_diagnoses_constraints();

  -- Migrate existing consultations to ensure required fields are populated
  CREATE OR REPLACE FUNCTION public.migrate_consultations_required_fields() RETURNS void AS $$
  BEGIN
      -- Update fid from practitioner's license_number where NULL
      UPDATE public.consultations c
      SET fid = p.license_number
      FROM public.practitioners p
      WHERE c.practitioner_id = p.id AND c.fid IS NULL;
      
      -- Update cip from patient's cip where NULL
      UPDATE public.consultations c
      SET cip = pt.cip
      FROM public.patients pt
      WHERE c.patient_id = pt.id AND c.cip IS NULL;
      
      -- Set default timestamps for NULL values
      UPDATE public.consultations 
      SET created_at = NOW() 
      WHERE created_at IS NULL;
      
      UPDATE public.consultations 
      SET updated_at = NOW() 
      WHERE updated_at IS NULL;
      
      -- Enforce NOT NULL constraints
      BEGIN
          ALTER TABLE public.consultations ALTER COLUMN fid SET NOT NULL;
          ALTER TABLE public.consultations ALTER COLUMN cip SET NOT NULL;
          ALTER TABLE public.consultations ALTER COLUMN created_at SET NOT NULL;
          ALTER TABLE public.consultations ALTER COLUMN updated_at SET NOT NULL;
      EXCEPTION
          WHEN others THEN
              -- Constraints already exist or other error, continue
              NULL;
      END;
  END;
  $$ LANGUAGE plpgsql;
  SELECT public.migrate_consultations_required_fields();
  DROP FUNCTION public.migrate_consultations_required_fields();

  -- RPC: Bulk update diagnosis status by code for a patient
  CREATE OR REPLACE FUNCTION public.update_diagnosis_status_by_code(
    p_patient_id UUID,
    p_diagnosis_code TEXT,
    p_new_status diagnosis_status_type
  ) RETURNS INTEGER AS $$
  DECLARE
    updated_count INTEGER;
    current_user_role TEXT;
  BEGIN
    -- Get current user's role
    SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
    
    -- Security check: Only practitioners and super_admins can update
    IF current_user_role NOT IN ('practitioner', 'super_admin') THEN
      RAISE EXCEPTION 'Unauthorized: Only practitioners and administrators can update diagnosis status';
    END IF;
    
    -- For practitioners, verify they are assigned to this patient
    IF current_user_role = 'practitioner' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.patients p
        JOIN public.practitioners pr ON pr.id = p.practitioner_id
        WHERE p.id = p_patient_id AND pr.user_id = auth.uid()
      ) THEN
        RAISE EXCEPTION 'Unauthorized: Practitioner not assigned to this patient';
      END IF;
    END IF;
    
    -- Update all consultation_diagnoses with this diagnosis_code for this patient
    UPDATE public.consultation_diagnoses
    SET status = p_new_status
    WHERE patient_id = p_patient_id
      AND diagnosis_code = p_diagnosis_code;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Set owner and revoke public access
  ALTER FUNCTION public.update_diagnosis_status_by_code(UUID, TEXT, diagnosis_status_type) OWNER TO postgres;
  REVOKE ALL ON FUNCTION public.update_diagnosis_status_by_code(UUID, TEXT, diagnosis_status_type) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.update_diagnosis_status_by_code(UUID, TEXT, diagnosis_status_type) TO authenticated;

  -- 10. PERFORMANCE INDEXES
  -- Foreign Key Indexes
  CREATE INDEX IF NOT EXISTS idx_users_practitioner_id ON public.users(practitioner_id);
  CREATE INDEX IF NOT EXISTS idx_users_patient_id ON public.users(patient_id);
  CREATE INDEX IF NOT EXISTS idx_users_portfolio_id ON public.users(portfolio_id);
  
  CREATE INDEX IF NOT EXISTS idx_practitioners_user_id ON public.practitioners(user_id);
  
  CREATE INDEX IF NOT EXISTS idx_patients_practitioner_id ON public.patients(practitioner_id);
  CREATE INDEX IF NOT EXISTS idx_patients_portfolio_id ON public.patients(portfolio_id);
  CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
  
  CREATE INDEX IF NOT EXISTS idx_portfolios_practitioner_id ON public.portfolios(practitioner_id);
  
  CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON public.consultations(patient_id);
  CREATE INDEX IF NOT EXISTS idx_consultations_practitioner_id ON public.consultations(practitioner_id);
  CREATE INDEX IF NOT EXISTS idx_consultations_portfolio_id ON public.consultations(portfolio_id);
  
  CREATE INDEX IF NOT EXISTS idx_consultation_diagnoses_consultation_id ON public.consultation_diagnoses(consultation_id);
  CREATE INDEX IF NOT EXISTS idx_consultation_diagnoses_patient_id ON public.consultation_diagnoses(patient_id);
  CREATE INDEX IF NOT EXISTS idx_consultation_diagnoses_practitioner_id ON public.consultation_diagnoses(practitioner_id);

  -- Search & Filtering Indexes
  CREATE INDEX IF NOT EXISTS idx_patients_names ON public.patients (last_name_1, first_name);
  CREATE INDEX IF NOT EXISTS idx_patients_cip ON public.patients (cip);
  CREATE INDEX IF NOT EXISTS idx_patients_dni ON public.patients (dni);
  
  CREATE INDEX IF NOT EXISTS idx_practitioners_names ON public.practitioners (last_name_1, first_name);
  CREATE INDEX IF NOT EXISTS idx_practitioners_dni ON public.practitioners (dni);
  CREATE INDEX IF NOT EXISTS idx_practitioners_license ON public.practitioners (license_number);

  CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

  -- 11. USER ACTIVATION & SECURITY FLOW
  
  -- 11.1 Change default active status to false for NEW users
  ALTER TABLE public.users ALTER COLUMN active SET DEFAULT false;

  -- 11.2 Trigger: Auto-activate user when email is confirmed in auth.users
  -- NOTE: This requires permissions on auth.users which might be restricted.
  -- Alternative: Use a security definer function that checks auth.users on public.users insert/update?
  -- Or rely on the existing handle_new_user if it exists (it doesn't seems so).
  -- SUPABASE SPECIFIC: We can creating a trigger on auth.users if we have permissions, 
  -- but usually we do this via the dashboard or a privileged migration. 
  -- AS THIS IS RUNNING AS A TOOL, I will try to create the function and trigger.
  
  CREATE OR REPLACE FUNCTION public.handle_auth_user_confirmation() 
  RETURNS TRIGGER AS $$
  BEGIN
    -- When email_confirmed_at changes from NULL to a date, activate the user
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
      UPDATE public.users SET active = true WHERE id = NEW.id;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Safe creation of trigger on auth.users (requires superuser/supabase_admin usually)
  -- We'll try, if it fails user might need to run it in dashboard SQL editor.
  DO $$
  BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_confirmed') THEN
          CREATE TRIGGER on_auth_user_confirmed
          AFTER UPDATE OF email_confirmed_at ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_confirmation();
      END IF;
  EXCEPTION
      WHEN insufficient_privilege THEN
          RAISE WARNING 'Could not create trigger on auth.users due to permissions. Please run manually in Supabase Dashboard SQL Editor.';
  END $$;

  -- 11.3 RPC: Toggle User Active Status (and Ban/Unban in Auth)
  CREATE OR REPLACE FUNCTION public.toggle_user_active(
    user_uuid UUID,
    is_active BOOLEAN
  ) RETURNS VOID AS $$
  DECLARE
    v_banned_until TIMESTAMPTZ;
  BEGIN
    -- Only Super Admin or Practitioner (for their patients?) - strict to Super Admin for now or check policy
    IF NOT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Admins can toggle user status';
    END IF;

    -- Update public.users
    UPDATE public.users SET active = is_active WHERE id = user_uuid;

    -- Sync with auth.users (Ban/Unban)
    -- If active = true -> banned_until = NULL
    -- If active = false -> banned_until = 'infinity'
    IF is_active THEN
      v_banned_until := NULL;
    ELSE
      v_banned_until := 'infinity';
    END IF;

    -- We need to update auth.users. This requires elevated privileges (SECURITY DEFINER)
    -- AND the function must belong to a role that has access to auth schema (postgres usually).
    UPDATE auth.users SET banned_until = v_banned_until WHERE id = user_uuid;

  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  -- Secure the RPC
  ALTER FUNCTION public.toggle_user_active(UUID, BOOLEAN) OWNER TO postgres;
  REVOKE ALL ON FUNCTION public.toggle_user_active(UUID, BOOLEAN) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.toggle_user_active(UUID, BOOLEAN) TO authenticated;
