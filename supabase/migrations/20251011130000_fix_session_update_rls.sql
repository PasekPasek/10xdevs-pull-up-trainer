-- =============================================================================
-- Migration: Fix session UPDATE RLS policy to allow status transitions
-- Created: 2025-10-11
-- Description: Allow authenticated users to transition sessions to completed/failed
-- Issue: Previous policy blocked completion because WITH CHECK required new status
--        to be 'planned' or 'in_progress', but we need to allow transitions to
--        'completed' and 'failed'
-- =============================================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "authenticated users can update own active sessions" ON sessions;

-- Create new policy that allows status transitions
-- USING clause: Can only update sessions that ARE currently active (planned/in_progress)
-- WITH CHECK clause: Allows ANY valid status after update (includes completed/failed)
CREATE POLICY "authenticated users can update own sessions"
ON sessions
FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id
    AND status IN ('planned', 'in_progress')
)
WITH CHECK (
    auth.uid() = user_id
    -- Allow any valid status transition including to completed/failed
    AND status IN ('planned', 'in_progress', 'completed', 'failed')
);
