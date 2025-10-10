# Database Schema - Pull-Up Training Tracker MVP

## Overview

This database schema is designed for the Pull-Up Training Tracker MVP, a mobile-responsive web application that tracks pull-up training progress and provides AI-powered session recommendations. The schema uses PostgreSQL with Supabase and implements Row Level Security (RLS) for data protection.

**Key Design Principles:**
- Leverages Supabase `auth.users` for authentication (no custom user table)
- Immutable completed/failed sessions (enforced by triggers)
- Single active session constraint (enforced by partial unique index)
- AI rate limiting support (5 generations per 24 hours)
- Complete audit trail via events table
- ON DELETE CASCADE for complete user data removal

---

## ENUM Types

### 1. session_status

Represents the lifecycle states of a training session.

```sql
CREATE TYPE session_status AS ENUM (
    'planned',
    'in_progress',
    'completed',
    'failed'
);
```

**Values:**
- `planned`: Initial state when session is created
- `in_progress`: User has started the workout
- `completed`: Successfully finished
- `failed`: Unable to complete the planned workout

### 2. generation_status

Tracks the outcome of AI generation attempts.

```sql
CREATE TYPE generation_status AS ENUM (
    'success',
    'timeout',
    'error'
);
```

**Values:**
- `success`: AI successfully generated session
- `timeout`: Request exceeded 15-second timeout
- `error`: API error or other failure

---

## Tables

### 1. sessions

**Purpose:** Core business table storing user training sessions.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique session identifier |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Owner of the session |
| `status` | session_status | NOT NULL, DEFAULT 'planned' | Current session state |
| `session_date` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | User-provided training date |
| `set_1` | SMALLINT | NULL, CHECK (set_1 >= 1 AND set_1 <= 60) | Reps in set 1 |
| `set_2` | SMALLINT | NULL, CHECK (set_2 >= 1 AND set_2 <= 60) | Reps in set 2 |
| `set_3` | SMALLINT | NULL, CHECK (set_3 >= 1 AND set_3 <= 60) | Reps in set 3 |
| `set_4` | SMALLINT | NULL, CHECK (set_4 >= 1 AND set_4 <= 60) | Reps in set 4 |
| `set_5` | SMALLINT | NULL, CHECK (set_5 >= 1 AND set_5 <= 60) | Reps in set 5 |
| `total_reps` | INTEGER | NOT NULL, DEFAULT 0 | Sum of all sets (auto-calculated by trigger) |
| `rpe` | SMALLINT | NULL, CHECK (rpe >= 1 AND rpe <= 10) | Rate of Perceived Exertion (1-10 scale) |
| `is_ai_generated` | BOOLEAN | NOT NULL, DEFAULT false | Whether session was created by AI |
| `is_modified` | BOOLEAN | NOT NULL, DEFAULT false | Whether AI-generated session was edited |
| `ai_comment` | TEXT | NULL | AI-generated progress comment (2-3 sentences) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | System timestamp of creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | System timestamp of last update |

**Notes:**
- `session_date` is the user-chosen training date (can be past/future), separate from `created_at`
- `total_reps` is auto-calculated by trigger for query performance
- Sets are nullable to allow incremental filling during session creation
- `rpe` only collected for completed sessions (optional)
- `ai_comment` only present for AI-generated sessions

---

### 2. generations

**Purpose:** Tracks all AI generation attempts for rate limiting and success metrics.

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique generation identifier |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User who requested generation |
| `session_id` | UUID | NULL, REFERENCES sessions(id) ON DELETE SET NULL | Created session (NULL if failed) |
| `model` | VARCHAR(100) | NOT NULL | AI model name (e.g., 'gpt-4-turbo') |
| `duration_ms` | INTEGER | NOT NULL | API call duration in milliseconds |
| `status` | generation_status | NOT NULL | Outcome of generation attempt |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp of generation attempt |

**Notes:**
- Every AI generation attempt is logged, regardless of outcome
- `session_id` is NULL if generation failed (timeout/error)
- Used for rate limiting: count WHERE user_id = X AND created_at > NOW() - INTERVAL '24 hours'
- Used for success metrics: status = 'success' / total

---

### 3. generation_error_logs

**Purpose:** Detailed error logging for AI generation failures (debugging and monitoring).

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique error log identifier |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User who experienced error |
| `generation_id` | UUID | NULL, REFERENCES generations(id) ON DELETE CASCADE | Related generation attempt |
| `error_type` | VARCHAR(100) | NOT NULL | Error category (e.g., 'timeout', 'api_error') |
| `error_message` | TEXT | NOT NULL | Human-readable error message |
| `error_stack` | TEXT | NULL | Stack trace (if available) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp of error |

**Notes:**
- Structured error logging for debugging
- `generation_id` can be NULL if error occurs before generation record is created
- Integrated with Sentry or similar monitoring service

---

### 4. events

**Purpose:** General event tracking for analytics and success metrics (event sourcing pattern).

**Columns:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique event identifier |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User who triggered event |
| `event_type` | VARCHAR(50) | NOT NULL | Event type identifier |
| `event_data` | JSONB | NOT NULL, DEFAULT '{}' | Event-specific data payload |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp of event |

**Event Types (PRD 6.3):**
- `user_registered`
- `first_session_created`
- `session_created`
- `session_started`
- `session_completed`
- `session_failed`
- `ai_generation_attempted`
- `ai_generation_succeeded`
- `ai_generation_failed`
- `session_edited`
- `session_deleted`
- `rest_period_warning_shown`
- `rest_period_warning_ignored`

**Example event_data structures:**

```json
// session_created
{
  "session_id": "uuid",
  "creation_method": "manual" | "ai",
  "status": "planned"
}

// session_completed
{
  "session_id": "uuid",
  "rpe": 7,
  "total_reps": 65
}

// rest_period_warning_shown
{
  "hours_since_last": 18,
  "last_session_id": "uuid"
}
```

**Notes:**
- JSONB provides flexibility without schema migrations
- Used for success metrics calculations (US-054 to US-056)
- Index on `event_type` for efficient filtering

---

## Relationships

### Entity Relationship Diagram (Textual)

```
auth.users (Supabase Auth)
    ↓ 1:N (ON DELETE CASCADE)
    ├─→ sessions
    ├─→ generations
    ├─→ generation_error_logs
    └─→ events

generations
    ↓ N:1 (optional, ON DELETE SET NULL)
    └─→ sessions

generations
    ↓ 1:N (ON DELETE CASCADE)
    └─→ generation_error_logs
```

### Relationship Details

| Parent Table | Child Table | Relationship | Foreign Key | On Delete |
|--------------|-------------|--------------|-------------|-----------|
| `auth.users` | `sessions` | 1:N | `user_id` | CASCADE |
| `auth.users` | `generations` | 1:N | `user_id` | CASCADE |
| `auth.users` | `generation_error_logs` | 1:N | `user_id` | CASCADE |
| `auth.users` | `events` | 1:N | `user_id` | CASCADE |
| `sessions` | `generations` | N:1 (optional) | `session_id` | SET NULL |
| `generations` | `generation_error_logs` | 1:N (optional) | `generation_id` | CASCADE |

**Notes:**
- All user data cascades on account deletion (US-007 requirement)
- `generations.session_id` allows NULL (failed generations) and SET NULL on delete
- No foreign key from `events` to other tables (JSONB stores references)

---

## Indexes

### Performance-Critical Indexes

```sql
-- 1. Sessions: User's sessions ordered by date (dashboard, history)
CREATE INDEX idx_sessions_user_date 
ON sessions(user_id, session_date DESC);

-- 2. Sessions: One active session constraint (planned or in_progress)
CREATE UNIQUE INDEX idx_one_active_session 
ON sessions(user_id) 
WHERE status IN ('planned', 'in_progress');

-- 3. Sessions: User's sessions by status (filtering)
CREATE INDEX idx_sessions_user_status 
ON sessions(user_id, status);

-- 4. Generations: Rate limiting queries (last 24 hours)
CREATE INDEX idx_generations_user_created 
ON generations(user_id, created_at DESC);

-- 5. Generations: Success rate analytics
CREATE INDEX idx_generations_status 
ON generations(status);

-- 6. Events: Event type filtering (analytics queries)
CREATE INDEX idx_events_type 
ON events(event_type);

-- 7. Events: User's events timeline
CREATE INDEX idx_events_user_created 
ON events(user_id, created_at DESC);

-- 8. Events: JSONB data queries (if needed for specific event types)
CREATE INDEX idx_events_data_gin 
ON events USING GIN (event_data);
```

### Index Usage Patterns

| Index | Query Pattern | PRD Reference |
|-------|---------------|---------------|
| `idx_sessions_user_date` | Dashboard last session, history pagination | US-033, US-035 |
| `idx_one_active_session` | Enforce single active session | US-049, 3.2.6 |
| `idx_sessions_user_status` | Filter by status (completed/failed/etc.) | US-038 |
| `idx_generations_user_created` | Rate limiting check (5/24h) | US-027, 3.4.5 |
| `idx_generations_status` | AI success rate metrics | 6.2.2 |
| `idx_events_type` | Success metrics by event type | 6.1, 6.2 |
| `idx_events_user_created` | User activity timeline | Analytics |
| `idx_events_data_gin` | Complex JSONB queries | Future analytics |

---

## Triggers

### 1. Calculate Total Reps

**Purpose:** Auto-calculate `total_reps` when sets are inserted or updated.

```sql
CREATE OR REPLACE FUNCTION calculate_total_reps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_reps := COALESCE(NEW.set_1, 0) 
                    + COALESCE(NEW.set_2, 0) 
                    + COALESCE(NEW.set_3, 0) 
                    + COALESCE(NEW.set_4, 0) 
                    + COALESCE(NEW.set_5, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_total_reps
BEFORE INSERT OR UPDATE OF set_1, set_2, set_3, set_4, set_5
ON sessions
FOR EACH ROW
EXECUTE FUNCTION calculate_total_reps();
```

---

### 2. Auto-Update updated_at

**Purpose:** Automatically update `updated_at` timestamp on row modification.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sessions_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

### 3. Prevent Modification of Immutable Sessions

**Purpose:** Block UPDATE and DELETE operations on completed/failed sessions.

```sql
CREATE OR REPLACE FUNCTION prevent_immutable_session_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IN ('completed', 'failed') THEN
            RAISE EXCEPTION 'Cannot modify session with status: %', OLD.status;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('completed', 'failed') THEN
            RAISE EXCEPTION 'Cannot delete session with status: %', OLD.status;
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_update_immutable_sessions
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_session_modification();

CREATE TRIGGER trigger_prevent_delete_immutable_sessions
BEFORE DELETE ON sessions
FOR EACH ROW
EXECUTE FUNCTION prevent_immutable_session_modification();
```

**Notes:**
- Enforces immutability requirement (US-020 to US-023)
- Works in conjunction with RLS policies
- Raises descriptive exception for debugging

---

## Row Level Security (RLS) Policies

### Enable RLS on All Tables

```sql
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

---

### sessions Policies

```sql
-- Users can view only their own sessions
CREATE POLICY "Users can view own sessions"
ON sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can create own sessions"
ON sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update only their own sessions that are not completed/failed
-- (Additional protection beyond trigger)
CREATE POLICY "Users can update own active sessions"
ON sessions
FOR UPDATE
USING (
    auth.uid() = user_id 
    AND status IN ('planned', 'in_progress')
)
WITH CHECK (
    auth.uid() = user_id 
    AND status IN ('planned', 'in_progress')
);

-- Users can delete only their own sessions that are not completed/failed
-- (Additional protection beyond trigger)
CREATE POLICY "Users can delete own active sessions"
ON sessions
FOR DELETE
USING (
    auth.uid() = user_id 
    AND status IN ('planned', 'in_progress')
);
```

---

### generations Policies

```sql
-- Users can view only their own generation attempts
CREATE POLICY "Users can view own generations"
ON generations
FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert generation records
-- (Application backend handles this, not direct user access)
CREATE POLICY "Service role can insert generations"
ON generations
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

**Notes:**
- Users have read-only access to their generation history
- Inserts restricted to service role to prevent manipulation of rate limiting

---

### generation_error_logs Policies

```sql
-- Users can view only their own error logs
CREATE POLICY "Users can view own error logs"
ON generation_error_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert error logs
CREATE POLICY "Service role can insert error logs"
ON generation_error_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

**Notes:**
- Read-only access for users (transparency)
- Service role only for writes (security)

---

### events Policies

```sql
-- Users can view only their own events
CREATE POLICY "Users can view own events"
ON events
FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert events
-- (Application backend handles event tracking)
CREATE POLICY "Service role can insert events"
ON events
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

**Notes:**
- Users can audit their own activity
- All event logging controlled by application backend

---

## Migration Strategy

### Tools and Approach

**Primary Tool:** Supabase CLI with raw SQL migrations

**Migration Files Structure:**
```
supabase/migrations/
├── 20250110000001_create_enums.sql
├── 20250110000002_create_sessions_table.sql
├── 20250110000003_create_generations_table.sql
├── 20250110000004_create_error_logs_table.sql
├── 20250110000005_create_events_table.sql
├── 20250110000006_create_indexes.sql
├── 20250110000007_create_triggers.sql
└── 20250110000008_enable_rls.sql
```

### Migration Order

1. **Create ENUM types** (session_status, generation_status)
2. **Create tables** (sessions, generations, generation_error_logs, events)
3. **Create indexes** (performance and constraints)
4. **Create triggers** (auto-calculations and immutability)
5. **Enable RLS and create policies** (security)

### Development Seed Data

Optional seed data for development environment:

```sql
-- Example: Create test user's first session
-- (Requires valid user_id from auth.users)
INSERT INTO sessions (
    user_id,
    status,
    session_date,
    set_1, set_2, set_3, set_4, set_5,
    is_ai_generated,
    ai_comment
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Replace with real test user_id
    'completed',
    NOW() - INTERVAL '7 days',
    12, 15, 13, 11, 14,
    true,
    'Great starting point! Focus on controlled descent in each rep. Keep up the consistent work!'
);
```

---

## Common Query Patterns

### Dashboard Queries

**1. Get current active session:**
```sql
SELECT * FROM sessions
WHERE user_id = $1
  AND status IN ('planned', 'in_progress')
ORDER BY created_at DESC
LIMIT 1;
```

**2. Get last completed session:**
```sql
SELECT * FROM sessions
WHERE user_id = $1
  AND status = 'completed'
ORDER BY session_date DESC
LIMIT 1;
```

---

### History Queries

**3. Paginated history with filters:**
```sql
SELECT * FROM sessions
WHERE user_id = $1
  AND status = ANY($2) -- Array of statuses
  AND session_date BETWEEN $3 AND $4 -- Date range
ORDER BY session_date DESC
LIMIT 10 OFFSET $5; -- Pagination
```

---

### AI Features

**4. Rate limiting check (5 per 24 hours):**
```sql
SELECT COUNT(*) FROM generations
WHERE user_id = $1
  AND created_at > NOW() - INTERVAL '24 hours';
```

**5. Get recent sessions for AI context (last 5-10):**
```sql
SELECT 
    session_date,
    set_1, set_2, set_3, set_4, set_5,
    total_reps,
    rpe,
    status
FROM sessions
WHERE user_id = $1
  AND status IN ('completed', 'failed')
ORDER BY session_date DESC
LIMIT 10;
```

**6. AI generation success rate:**
```sql
SELECT 
    COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
FROM generations
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

### Warnings and Validations

**7. Check 24-hour rest period:**
```sql
SELECT 
    session_date,
    EXTRACT(EPOCH FROM (NOW() - session_date)) / 3600 as hours_since
FROM sessions
WHERE user_id = $1
  AND status IN ('completed', 'failed')
ORDER BY session_date DESC
LIMIT 1;
```

**8. Check multiple sessions on same date:**
```sql
SELECT COUNT(*) FROM sessions
WHERE user_id = $1
  AND DATE(session_date) = DATE($2)
  AND status IN ('completed', 'failed');
```

---

### Success Metrics (PRD 6.1-6.2)

**9. User Activation Rate (≥70% target):**
```sql
SELECT 
    COUNT(DISTINCT CASE 
        WHEN EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.user_id = users.id 
              AND status = 'completed'
        ) 
        THEN users.id 
    END) * 100.0 / COUNT(*) as activation_rate
FROM auth.users;
```

**10. AI Adoption Rate (≥60% target):**
```sql
SELECT 
    COUNT(DISTINCT user_id) * 100.0 / (
        SELECT COUNT(*) FROM auth.users
    ) as ai_adoption_rate
FROM generations
WHERE status = 'success';
```

**11. Average sessions per user:**
```sql
SELECT AVG(session_count) as avg_sessions_per_user
FROM (
    SELECT user_id, COUNT(*) as session_count
    FROM sessions
    GROUP BY user_id
) as user_sessions;
```

---

## Data Export Format

### JSON Export Structure

```json
{
  "export_date": "2025-01-10T12:00:00Z",
  "user_id": "uuid",
  "sessions": [
    {
      "id": "uuid",
      "session_date": "2025-01-03T10:30:00Z",
      "status": "completed",
      "sets": [12, 15, 13, 11, 14],
      "total_reps": 65,
      "rpe": 7,
      "is_ai_generated": true,
      "is_modified": false,
      "ai_comment": "Great progress this week!",
      "created_at": "2025-01-02T20:00:00Z",
      "updated_at": "2025-01-03T10:45:00Z"
    }
  ]
}
```

### CSV Export Structure

```csv
session_date,status,set_1,set_2,set_3,set_4,set_5,total_reps,rpe,ai_generated,modified,ai_comment,created_at
2025-01-03T10:30:00Z,completed,12,15,13,11,14,65,7,true,false,"Great progress this week!",2025-01-02T20:00:00Z
```

---

## Additional Considerations

### 1. Application-Level Validations

The following validations are handled in application code (not database constraints):

- **At least one set > 0 for completed sessions** (US-057)
  - Reason: Complex multi-column OR constraint is verbose in SQL
  - Validation occurs before status transition to 'completed'

- **Future sessions (≤30 days) only 'planned'** (3.2.5)
  - Reason: Time-dependent constraints difficult in database
  - Validation in session creation form

- **Historical sessions only 'completed' or 'failed'** (3.2.5)
  - Reason: Time-dependent constraints difficult in database
  - Validation in session creation form

### 2. Testing Strategy

**Database Testing:**
- Unit tests for trigger functions (calculate_total_reps, immutability)
- Integration tests for RLS policies (user isolation, service role access)
- Performance tests for common query patterns with realistic data volume

**Recommended Tools:**
- pgTAP for database unit testing
- Supabase local development environment
- Jest/Vitest for integration tests

### 3. Monitoring and Alerting

**Key Metrics to Monitor:**
- Slow query log (queries >100ms)
- Failed trigger executions
- RLS policy violations
- Table size growth rate
- Index usage statistics

**Integration Points:**
- Application errors → `generation_error_logs` table
- All errors → Sentry (external monitoring)
- Database logs → Supabase dashboard
- Success metrics → Admin dashboard (US-055)

### 4. Performance Considerations

**Expected Data Volume (MVP):**
- Users: 100-1,000
- Sessions per user: 10-100 (first 3 months)
- Total sessions: 1,000-100,000
- Events: 10,000-1,000,000

**Optimization Strategy:**
- Current indexes are sufficient for MVP
- Monitor slow query log after launch
- Consider materialized views for admin metrics if needed
- Partition `events` table by date if volume exceeds 1M rows

### 5. Security Notes

**Defense in Depth:**
- RLS policies (primary security layer)
- Triggers (data integrity layer)
- Application logic (business rules layer)

**Audit Trail:**
- All user actions logged in `events` table
- AI generation attempts in `generations` table
- Errors in `generation_error_logs` table
- Complete accountability and debugging support

### 6. Backup and Recovery

**Supabase Backup Strategy:**
- Daily automated backups (Supabase Pro plan)
- Point-in-time recovery (PITR)
- Manual backup before major migrations

**User Data Deletion (US-007):**
- ON DELETE CASCADE ensures complete removal
- No soft deletes in MVP
- Export functionality allows user backup before deletion

### 7. Future Schema Extensions

**Post-MVP Considerations:**
- `users_profiles` table (if display_name or preferences added)
- `training_programs` table (custom programs feature)
- `exercise_types` table (support for other exercises)
- `notifications` table (email/push notifications)
- Partitioning strategy for large tables

**Schema Versioning:**
- Use Supabase migrations for all changes
- Never modify existing migrations after deployment
- Test migrations in staging environment
- Document breaking changes in migration comments

---

## Summary

This database schema provides a solid foundation for the Pull-Up Training Tracker MVP with:

✅ **Complete user isolation** via RLS policies  
✅ **Data integrity** via triggers and constraints  
✅ **Performance optimization** via strategic indexes  
✅ **Audit trail** via events and generation tracking  
✅ **AI rate limiting** support (5 per 24 hours)  
✅ **Immutability** for completed/failed sessions  
✅ **Scalability** for expected MVP load  
✅ **Security** through defense-in-depth approach  

The schema is ready for implementation via Supabase CLI migrations and supports all requirements defined in the PRD and session planning notes.

