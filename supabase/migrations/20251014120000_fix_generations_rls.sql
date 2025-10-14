-- =============================================================================
-- Migration: Fix RLS policies for generations, events, and error logs
-- Created: 2025-10-14
-- Description: Allow authenticated users to insert their own records
-- Tables Affected: generations, events, generation_error_logs
-- Special Notes:
--   - Users can only insert records for themselves (user_id = auth.uid())
--   - This enables the application to work without service_role client
--   - RLS still protects users from accessing other users' data
-- =============================================================================

-- =============================================================================
-- GENERATIONS TABLE POLICIES
-- =============================================================================

-- Drop the old restrictive policies
drop policy if exists "authenticated users cannot insert generations" on generations;
drop policy if exists "service role can insert generations" on generations;

-- Create new policy allowing users to insert their own generations
create policy "authenticated users can insert own generations"
on generations
for insert
to authenticated
with check (auth.uid() = user_id);

-- =============================================================================
-- GENERATION_ERROR_LOGS TABLE POLICIES
-- =============================================================================

-- Drop the old restrictive policies
drop policy if exists "authenticated users cannot insert error logs" on generation_error_logs;
drop policy if exists "service role can insert error logs" on generation_error_logs;

-- Create new policy allowing users to insert their own error logs
create policy "authenticated users can insert own error logs"
on generation_error_logs
for insert
to authenticated
with check (auth.uid() = user_id);

-- =============================================================================
-- EVENTS TABLE POLICIES
-- =============================================================================

-- Events policy was already fixed in migration 20251011120000_fix_events_rls.sql
-- No changes needed here
