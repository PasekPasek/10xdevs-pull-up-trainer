-- =============================================================================
-- Migration: Create generations table
-- Created: 2025-10-10
-- Description: Tracks all AI generation attempts for rate limiting and metrics
-- Tables Affected: generations (new)
-- Dependencies: generation_status enum, auth.users, sessions
-- Special Notes:
--   - Every AI generation attempt is logged regardless of outcome
--   - session_id is NULL if generation failed (timeout/error)
--   - Used for rate limiting: 5 generations per 24 hours per user
--   - Used for success metrics and monitoring
-- =============================================================================

-- -----------------------------------------------------------------------------
-- generations table
-- -----------------------------------------------------------------------------
-- Logs every AI generation request for rate limiting and analytics
-- Links to created session on success, NULL on failure
-- Provides data for success rate calculations and performance monitoring
-- -----------------------------------------------------------------------------
create table generations (
    -- Primary identification
    id uuid primary key default gen_random_uuid(),
    
    -- User relationship (cascading delete for GDPR compliance)
    user_id uuid not null references auth.users(id) on delete cascade,
    
    -- Session relationship (optional - NULL if generation failed)
    -- SET NULL on session deletion to preserve generation history
    session_id uuid references sessions(id) on delete set null,
    
    -- AI model information
    model varchar(100) not null,
    
    -- Performance metrics
    duration_ms integer not null,
    
    -- Generation outcome
    status generation_status not null,

    -- Structured payloads for auditing
    prompt_data jsonb,
    response_data jsonb,
    
    -- Audit timestamp
    created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Enable Row Level Security
-- -----------------------------------------------------------------------------
-- RLS is enabled for all tables to ensure user data isolation
-- Policies will be defined in a separate migration
-- -----------------------------------------------------------------------------
alter table generations enable row level security;

