-- =============================================================================
-- Migration: Create performance indexes
-- Created: 2025-10-10
-- Description: Strategic indexes for query performance and constraints
-- Tables Affected: sessions, generations, events
-- Special Notes:
--   - Indexes optimized for dashboard, history, and AI feature queries
--   - Partial unique index enforces single active session constraint
--   - GIN index on JSONB for flexible event data queries
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sessions indexes
-- -----------------------------------------------------------------------------

-- Index 1: User's sessions ordered by date (dashboard, history pagination)
-- Supports queries: "get last completed session", "history with pagination"
create index idx_sessions_user_date 
on sessions(user_id, session_date desc);

-- Index 2: One active session constraint (planned or in_progress)
-- Partial unique index enforces business rule: only one active session per user
-- Does not include completed/failed sessions (allows unlimited historical sessions)
create unique index idx_one_active_session 
on sessions(user_id) 
where status in ('planned', 'in_progress');

-- Index 3: User's sessions by status (filtering)
-- Supports queries: "get all completed sessions", "filter by status"
create index idx_sessions_user_status 
on sessions(user_id, status);

-- -----------------------------------------------------------------------------
-- generations indexes
-- -----------------------------------------------------------------------------

-- Index 4: Rate limiting queries (last 24 hours)
-- Supports queries: "count generations in last 24 hours for user"
-- Critical for enforcing 5 generations per 24 hours limit
create index idx_generations_user_created 
on generations(user_id, created_at desc);

-- Index 5: Success rate analytics
-- Supports queries: "calculate AI success rate", "filter by outcome"
create index idx_generations_status 
on generations(status);

-- -----------------------------------------------------------------------------
-- events indexes
-- -----------------------------------------------------------------------------

-- Index 6: Event type filtering (analytics queries)
-- Supports queries: "count events by type", "success metrics calculations"
create index idx_events_type 
on events(event_type);

-- Index 7: User's events timeline
-- Supports queries: "user activity history", "recent events for user"
create index idx_events_user_created 
on events(user_id, created_at desc);

-- Index 8: JSONB data queries (flexible event data filtering)
-- GIN index enables efficient queries on event_data fields
-- Example: "find all events with specific session_id in event_data"
create index idx_events_data_gin 
on events using gin (event_data);

