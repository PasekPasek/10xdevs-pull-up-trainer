-- =============================================================================
-- Migration: Fix Events RLS Policy to Allow Authenticated Users
-- Created: 2025-10-11
-- Description: Allow authenticated users to insert their own events
-- This fixes the issue where createSession fails because it cannot insert events
-- =============================================================================

-- Drop the restrictive policy for authenticated users
DROP POLICY IF EXISTS "authenticated users cannot insert events" ON events;

-- Create a new policy that allows authenticated users to insert their own events
CREATE POLICY "authenticated users can insert own events"
ON events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
