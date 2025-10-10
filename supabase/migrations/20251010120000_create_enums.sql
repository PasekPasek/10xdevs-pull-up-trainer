-- =============================================================================
-- Migration: Create ENUM types for Pull-Up Training Tracker
-- Created: 2025-10-10
-- Description: Creates session_status and generation_status enum types
-- Tables Affected: Will be used by sessions and generations tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- session_status enum
-- -----------------------------------------------------------------------------
-- Represents the lifecycle states of a training session
-- Values:
--   - planned: Initial state when session is created
--   - in_progress: User has started the workout
--   - completed: Successfully finished
--   - failed: Unable to complete the planned workout
-- -----------------------------------------------------------------------------
create type session_status as enum (
    'planned',
    'in_progress',
    'completed',
    'failed'
);

-- -----------------------------------------------------------------------------
-- generation_status enum
-- -----------------------------------------------------------------------------
-- Tracks the outcome of AI generation attempts for rate limiting and metrics
-- Values:
--   - success: AI successfully generated session
--   - timeout: Request exceeded 15-second timeout
--   - error: API error or other failure
-- -----------------------------------------------------------------------------
create type generation_status as enum (
    'success',
    'timeout',
    'error'
);

