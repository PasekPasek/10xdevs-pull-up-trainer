-- =============================================================================
-- Migration: Create triggers for data integrity
-- Created: 2025-10-10
-- Description: Triggers for auto-calculations and immutability enforcement
-- Tables Affected: sessions
-- Special Notes:
--   - total_reps auto-calculation for query performance
--   - updated_at auto-update for audit trail
--   - Immutability enforcement for completed/failed sessions (business rule)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Trigger 1: Calculate total_reps
-- -----------------------------------------------------------------------------
-- Automatically calculates and updates total_reps when sets are modified
-- Ensures data consistency and eliminates need for application-level calculation
-- Fires on INSERT or UPDATE of any set column
-- -----------------------------------------------------------------------------

create or replace function calculate_total_reps()
returns trigger as $$
begin
    -- Sum all sets, treating NULL as 0
    -- Result stored in total_reps column for query performance
    new.total_reps := coalesce(new.set_1, 0) 
                    + coalesce(new.set_2, 0) 
                    + coalesce(new.set_3, 0) 
                    + coalesce(new.set_4, 0) 
                    + coalesce(new.set_5, 0);
    return new;
end;
$$ language plpgsql;

create trigger trigger_calculate_total_reps
before insert or update of set_1, set_2, set_3, set_4, set_5
on sessions
for each row
execute function calculate_total_reps();

-- -----------------------------------------------------------------------------
-- Trigger 2: Auto-update updated_at
-- -----------------------------------------------------------------------------
-- Automatically updates updated_at timestamp on any row modification
-- Provides audit trail for session changes
-- Fires on any UPDATE operation
-- -----------------------------------------------------------------------------

create or replace function update_updated_at_column()
returns trigger as $$
begin
    -- Set updated_at to current timestamp
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trigger_update_sessions_updated_at
before update on sessions
for each row
execute function update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Trigger 3: Prevent modification of immutable sessions
-- -----------------------------------------------------------------------------
-- Enforces immutability of completed and failed sessions
-- Business rule: once a session is completed/failed, it cannot be modified or deleted
-- This ensures training history integrity and prevents retroactive data manipulation
-- Raises exception with descriptive message if modification is attempted
-- -----------------------------------------------------------------------------

create or replace function prevent_immutable_session_modification()
returns trigger as $$
begin
    if tg_op = 'UPDATE' then
        -- Block updates to completed or failed sessions
        if old.status in ('completed', 'failed') then
            raise exception 'Cannot modify session with status: %. Completed and failed sessions are immutable.', old.status;
        end if;
        return new;
    elsif tg_op = 'DELETE' then
        -- Block deletion of completed or failed sessions
        if old.status in ('completed', 'failed') then
            raise exception 'Cannot delete session with status: %. Completed and failed sessions are immutable.', old.status;
        end if;
        return old;
    end if;
end;
$$ language plpgsql;

-- Trigger for UPDATE operations
create trigger trigger_prevent_update_immutable_sessions
before update on sessions
for each row
execute function prevent_immutable_session_modification();

-- Trigger for DELETE operations
create trigger trigger_prevent_delete_immutable_sessions
before delete on sessions
for each row
execute function prevent_immutable_session_modification();

