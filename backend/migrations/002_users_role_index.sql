-- Migration 002: speed-up fixes for role lookup and authStore timeouts.
-- Run once in Supabase SQL Editor if you see "Role fetch timeout" in the browser console.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Index on public.users(id) — authStore queries this to get the user's role.
--    Without it, a sequential scan on a large users table causes timeouts.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Also index the role column for analytics / future role-based queries.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
