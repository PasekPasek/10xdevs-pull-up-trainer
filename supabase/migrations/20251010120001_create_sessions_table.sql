-- =============================================================================
-- Migration: Create sessions table
-- Created: 2025-10-10
-- Description: Core business table storing user training sessions
-- Tables Affected: sessions (new)
-- Dependencies: session_status enum, auth.users
-- Special Notes:
--   - Uses auth.users from Supabase Auth (no custom user table)
--   - ON DELETE CASCADE for complete user data removal
--   - total_reps will be auto-calculated by trigger (next migration)
--   - Sets are nullable to allow incremental filling during creation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sessions table
-- -----------------------------------------------------------------------------
-- Stores all training sessions with their configuration and results
-- Each user can have multiple sessions, but only one active (planned/in_progress)
-- Completed and failed sessions are immutable (enforced by triggers)
-- -----------------------------------------------------------------------------
create table sessions (
    -- Primary identification
    id uuid primary key default gen_random_uuid(),
    
    -- User relationship (cascading delete for GDPR compliance)
    user_id uuid not null references auth.users(id) on delete cascade,
    
    -- Session state and timing
    status session_status not null default 'planned',
    -- session_date is user-chosen training date (can be past/future)
    -- separate from created_at which is system timestamp
    session_date timestamptz not null default now(),
    
    -- Training data (5 sets maximum, each 1-60 reps)
    -- nullable to allow incremental filling during session creation
    set_1 smallint check (set_1 >= 1 and set_1 <= 60),
    set_2 smallint check (set_2 >= 1 and set_2 <= 60),
    set_3 smallint check (set_3 >= 1 and set_3 <= 60),
    set_4 smallint check (set_4 >= 1 and set_4 <= 60),
    set_5 smallint check (set_5 >= 1 and set_5 <= 60),
    
    -- Auto-calculated total (will be managed by trigger)
    -- stored for query performance (avoid repeated calculations)
    total_reps integer not null default 0,
    
    -- Rate of Perceived Exertion (1-10 scale)
    -- only collected for completed sessions (optional)
    rpe smallint check (rpe >= 1 and rpe <= 10),
    
    -- AI generation tracking
    is_ai_generated boolean not null default false,
    is_modified boolean not null default false,
    -- AI-generated progress comment (2-3 sentences)
    ai_comment text,
    
    -- Audit timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Enable Row Level Security
-- -----------------------------------------------------------------------------
-- RLS is enabled for all tables to ensure user data isolation
-- Policies will be defined in a separate migration
-- -----------------------------------------------------------------------------
alter table sessions enable row level security;

