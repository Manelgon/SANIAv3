-- FIX: Enable INSERT on consultation_versions for authenticated users
-- This is required because the database trigger that saves the version runs with the user's permissions,
-- so the user (practitioner) needs permission to insert into the history table.

-- 1. Enable RLS (already enabled, but good practice to ensure)
ALTER TABLE consultation_versions ENABLE ROW LEVEL SECURITY;

-- 2. Add Policy for INSERT
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON consultation_versions;

CREATE POLICY "Enable insert for authenticated users"
ON consultation_versions FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Add Policy for SELECT (View History)
-- Allows users to see history (you might want to restrict this later to just the practitioner involved)
DROP POLICY IF EXISTS "Enable select for authenticated users" ON consultation_versions;

CREATE POLICY "Enable select for authenticated users"
ON consultation_versions FOR SELECT
TO authenticated
USING (true);
