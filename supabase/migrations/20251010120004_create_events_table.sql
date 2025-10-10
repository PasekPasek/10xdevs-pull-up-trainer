-- =============================================================================
-- Migration: Create events table
-- Created: 2025-10-10
-- Description: General event tracking for analytics and success metrics
-- Tables Affected: events (new)
-- Dependencies: auth.users
-- Special Notes:
--   - Event sourcing pattern for complete audit trail
--   - JSONB provides flexibility without schema migrations
--   - No foreign keys to other tables (references stored in JSONB)
--   - Used for success metrics calculations (PRD sections 6.1-6.2)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- events table
-- -----------------------------------------------------------------------------
-- Logs all user actions and system events for analytics and auditing
-- Event types include: user_registered, session_created, session_completed,
-- ai_generation_attempted, rest_period_warning_shown, etc.
-- JSONB event_data allows flexible schema per event type
-- -----------------------------------------------------------------------------
create table events (
    -- Primary identification
    id uuid primary key default gen_random_uuid(),
    
    -- User relationship (cascading delete for GDPR compliance)
    user_id uuid not null references auth.users(id) on delete cascade,
    
    -- Event classification
    event_type varchar(50) not null,
    
    -- Flexible event-specific data payload
    -- Structure varies by event_type (see db-plan.md for examples)
    event_data jsonb not null default '{}'::jsonb,
    
    -- Audit timestamp
    created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Enable Row Level Security
-- -----------------------------------------------------------------------------
-- RLS is enabled for all tables to ensure user data isolation
-- Policies will be defined in a separate migration
-- -----------------------------------------------------------------------------
alter table events enable row level security;

