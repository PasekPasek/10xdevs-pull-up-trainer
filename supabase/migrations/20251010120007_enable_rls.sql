-- =============================================================================
-- Migration: Enable Row Level Security and create policies
-- Created: 2025-10-10
-- Description: RLS policies for complete user data isolation
-- Tables Affected: sessions, generations, generation_error_logs, events
-- Special Notes:
--   - Defense in depth: RLS + triggers + application logic
--   - Granular policies: one per operation per role
--   - Service role access for backend operations
--   - Complete user isolation for data privacy and GDPR compliance
-- =============================================================================

-- =============================================================================
-- SESSIONS TABLE POLICIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SELECT policy for authenticated users
-- -----------------------------------------------------------------------------
-- Allows users to view only their own sessions
-- Supports: dashboard queries, history views, session details
-- -----------------------------------------------------------------------------
create policy "authenticated users can view own sessions"
on sessions
for select
to authenticated
using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- SELECT policy for anonymous users
-- -----------------------------------------------------------------------------
-- No access for anonymous users (authentication required)
-- -----------------------------------------------------------------------------
create policy "anonymous users cannot view sessions"
on sessions
for select
to anon
using (false);

-- -----------------------------------------------------------------------------
-- INSERT policy for authenticated users
-- -----------------------------------------------------------------------------
-- Allows users to create sessions for themselves only
-- Enforces user_id matches authenticated user
-- -----------------------------------------------------------------------------
create policy "authenticated users can create own sessions"
on sessions
for insert
to authenticated
with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- INSERT policy for anonymous users
-- -----------------------------------------------------------------------------
-- No insert access for anonymous users (authentication required)
-- -----------------------------------------------------------------------------
create policy "anonymous users cannot create sessions"
on sessions
for insert
to anon
with check (false);

-- -----------------------------------------------------------------------------
-- UPDATE policy for authenticated users
-- -----------------------------------------------------------------------------
-- Allows users to update only their own active sessions (planned/in_progress)
-- Additional protection beyond trigger (defense in depth)
-- Completed and failed sessions are immutable
-- -----------------------------------------------------------------------------
create policy "authenticated users can update own active sessions"
on sessions
for update
to authenticated
using (
    auth.uid() = user_id 
    and status in ('planned', 'in_progress')
)
with check (
    auth.uid() = user_id 
    and status in ('planned', 'in_progress')
);

-- -----------------------------------------------------------------------------
-- UPDATE policy for anonymous users
-- -----------------------------------------------------------------------------
-- No update access for anonymous users (authentication required)
-- -----------------------------------------------------------------------------
create policy "anonymous users cannot update sessions"
on sessions
for update
to anon
using (false);

-- -----------------------------------------------------------------------------
-- DELETE policy for authenticated users
-- -----------------------------------------------------------------------------
-- Allows users to delete only their own active sessions (planned/in_progress)
-- Additional protection beyond trigger (defense in depth)
-- Completed and failed sessions cannot be deleted (immutable)
-- -----------------------------------------------------------------------------
create policy "authenticated users can delete own active sessions"
on sessions
for delete
to authenticated
using (
    auth.uid() = user_id 
    and status in ('planned', 'in_progress')
);

-- -----------------------------------------------------------------------------
-- DELETE policy for anonymous users
-- -----------------------------------------------------------------------------
-- No delete access for anonymous users (authentication required)
-- -----------------------------------------------------------------------------
create policy "anonymous users cannot delete sessions"
on sessions
for delete
to anon
using (false);

-- =============================================================================
-- GENERATIONS TABLE POLICIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SELECT policy for authenticated users
-- -----------------------------------------------------------------------------
-- Allows users to view only their own generation attempts
-- Supports: generation history, rate limiting checks, analytics
-- -----------------------------------------------------------------------------
create policy "authenticated users can view own generations"
on generations
for select
to authenticated
using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- SELECT policy for anonymous users
-- -----------------------------------------------------------------------------
-- No access for anonymous users (authentication required)
-- -----------------------------------------------------------------------------
create policy "anonymous users cannot view generations"
on generations
for select
to anon
using (false);

-- -----------------------------------------------------------------------------
-- INSERT policy for service role only
-- -----------------------------------------------------------------------------
-- Only backend service can insert generation records
-- Prevents user manipulation of rate limiting system
-- Application backend handles all AI generation logging
-- Note: service_role bypasses RLS, but policy documents intent
-- -----------------------------------------------------------------------------
create policy "service role can insert generations"
on generations
for insert
to service_role
with check (true);

-- -----------------------------------------------------------------------------
-- INSERT policy for authenticated users
-- -----------------------------------------------------------------------------
-- Authenticated users cannot directly insert generation records
-- Must go through application backend for rate limiting enforcement
-- -----------------------------------------------------------------------------
create policy "authenticated users cannot insert generations"
on generations
for insert
to authenticated
with check (false);

-- -----------------------------------------------------------------------------
-- INSERT policy for anonymous users
-- -----------------------------------------------------------------------------
-- No insert access for anonymous users
-- -----------------------------------------------------------------------------
create policy "anonymous users cannot insert generations"
on generations
for insert
to anon
with check (false);

-- =============================================================================
-- GENERATION_ERROR_LOGS TABLE POLICIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SELECT policy for authenticated users
-- -----------------------------------------------------------------------------
-- Allows users to view only their own error logs
-- Provides transparency into AI generation failures
-- -----------------------------------------------------------------------------
create policy "authenticated users can view own error logs"
on generation_error_logs
for select
to authenticated
using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- SELECT policy for anonymous users
-- -----------------------------------------------------------------------------
-- No access for anonymous users (authentication required)
-- -----------------------------------------------------------------------------
create policy "anonymous users cannot view error logs"
on generation_error_logs
for select
to anon
using (false);

-- -----------------------------------------------------------------------------
-- INSERT policy for service role only
-- -----------------------------------------------------------------------------
-- Only backend service can insert error logs
-- Prevents user manipulation of error tracking
-- Integrated with external monitoring services
-- Note: service_role bypasses RLS, but policy documents intent
-- -----------------------------------------------------------------------------
create policy "service role can insert error logs"
on generation_error_logs
for insert
to service_role
with check (true);

-- -----------------------------------------------------------------------------
-- INSERT policy for authenticated users
-- -----------------------------------------------------------------------------
-- Authenticated users cannot directly insert error logs
-- Must go through application backend
-- -----------------------------------------------------------------------------
create policy "authenticated users cannot insert error logs"
on generation_error_logs
for insert
to authenticated
with check (false);

-- -----------------------------------------------------------------------------
-- INSERT policy for anonymous users
-- -----------------------------------------------------------------------------
-- No insert access for anonymous users
-- -----------------------------------------------------------------------------
create policy "anonymous users cannot insert error logs"
on generation_error_logs
for insert
to anon
with check (false);

-- =============================================================================
-- EVENTS TABLE POLICIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SELECT policy for authenticated users
-- -----------------------------------------------------------------------------
-- Allows users to view only their own events
-- Supports: user activity audit trail, analytics
-- -----------------------------------------------------------------------------
create policy "authenticated users can view own events"
on events
for select
to authenticated
using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- SELECT policy for anonymous users
-- -----------------------------------------------------------------------------
-- No access for anonymous users (authentication required)
-- -----------------------------------------------------------------------------
create policy "anonymous users cannot view events"
on events
for select
to anon
using (false);

-- -----------------------------------------------------------------------------
-- INSERT policy for service role only
-- -----------------------------------------------------------------------------
-- Only backend service can insert events
-- Application backend handles all event tracking
-- Ensures complete audit trail and event sourcing integrity
-- Note: service_role bypasses RLS, but policy documents intent
-- -----------------------------------------------------------------------------
create policy "service role can insert events"
on events
for insert
to service_role
with check (true);

-- -----------------------------------------------------------------------------
-- INSERT policy for authenticated users
-- -----------------------------------------------------------------------------
-- Authenticated users cannot directly insert events
-- Must go through application backend for consistent event logging
-- -----------------------------------------------------------------------------
create policy "authenticated users cannot insert events"
on events
for insert
to authenticated
with check (false);

-- -----------------------------------------------------------------------------
-- INSERT policy for anonymous users
-- -----------------------------------------------------------------------------
-- No insert access for anonymous users
-- -----------------------------------------------------------------------------
create policy "anonymous users cannot insert events"
on events
for insert
to anon
with check (false);

