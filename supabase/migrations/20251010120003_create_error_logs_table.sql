-- =============================================================================
-- Migration: Create generation_error_logs table
-- Created: 2025-10-10
-- Description: Detailed error logging for AI generation failures
-- Tables Affected: generation_error_logs (new)
-- Dependencies: auth.users, generations
-- Special Notes:
--   - Provides structured error logging for debugging and monitoring
--   - generation_id can be NULL if error occurs before generation record creation
--   - Integrated with external monitoring services (e.g., Sentry)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- generation_error_logs table
-- -----------------------------------------------------------------------------
-- Stores detailed error information for failed AI generation attempts
-- Enables debugging, monitoring, and alerting for AI service issues
-- -----------------------------------------------------------------------------
create table generation_error_logs (
    -- Primary identification
    id uuid primary key default gen_random_uuid(),
    
    -- User relationship (cascading delete for GDPR compliance)
    user_id uuid not null references auth.users(id) on delete cascade,
    
    -- Generation relationship (optional - NULL if error occurred early)
    -- CASCADE delete to clean up error logs with generation records
    generation_id uuid references generations(id) on delete cascade,
    
    -- Error classification and details
    error_type varchar(100) not null,
    error_message text not null,
    -- Stack trace for debugging (if available)
    error_stack text,
    
    -- Audit timestamp
    created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Enable Row Level Security
-- -----------------------------------------------------------------------------
-- RLS is enabled for all tables to ensure user data isolation
-- Policies will be defined in a separate migration
-- -----------------------------------------------------------------------------
alter table generation_error_logs enable row level security;

