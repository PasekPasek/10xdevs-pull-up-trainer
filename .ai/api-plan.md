# REST API Plan

## 1. Resources
- `users` – Supabase `auth.users`; source of authenticated identities and ownership for domain records.
- `sessions` – Table `sessions`; stores pull-up training sessions including sets, status, AI metadata, timestamps.
- `sessionActions` – Derived from `sessions`; encapsulates state transitions (planned → in_progress → completed/failed) with validation guards.
- `aiGenerations` – Table `generations`; logs AI session creation attempts, durations, outcomes, and links to created sessions.
- `generationErrors` – Table `generation_error_logs`; detailed AI failure diagnostics for monitoring and retry flows.
- `events` – Table `events`; append-only audit trail supporting analytics, success metrics, and export/history reconciliation.
- `exports` – Virtual resource orchestrating CSV/JSON exports assembled from `sessions` (metadata persisted via `events`).
- `dashboard` – Composite read model aggregating latest session data, AI quota, and warnings for the main screen.
- `adminMetrics` – Composite aggregation across `sessions`, `generations`, and `events` to power the admin dashboard KPIs.

## 2. Endpoints

Unless stated otherwise, all endpoints:
- Require `Authorization: Bearer <Supabase JWT>` issued via Supabase Auth.
- Accept/return `application/json`.
- Respond with a standard envelope:
  ```json
  {
    "data": { "..." },
    "meta": { "requestId": "uuid", "warnings": [] }
  }
  ```
- Encode timestamps in ISO 8601 UTC.
- Support optimistic concurrency through `If-Match`/`ETag` headers carrying the session `updated_at` (when applicable).

### 2.1 Authentication (Supabase managed)
- **Method** `POST`
- **Path** `/auth/v1/token?grant_type=password`
- **Description** Password login via Supabase Auth REST endpoint.
- **Query parameters**: `grant_type=password` (fixed).
- **Request JSON** (password flow):
  ```json
  { "email": "user@example.com", "password": "string", "gotrue_meta_security": { "captcha_token": "optional" } }
  ```
- **Response JSON**: Supabase session payload (`access_token`, `refresh_token`, `expires_in`, `user`).
- **Success codes**: `200 OK` – login success.
- **Error codes**: `400 Bad Request` (validation), `401 Unauthorized` (invalid credentials), `429 Too Many Requests` (Supabase rate limit).
- **Notes**: Other Auth routes (sign-up, password reset) delegated to Supabase; UI integrates directly with Supabase JS client.

### 2.2 Sessions

#### Create session
- **Method** `POST`
- **Path** `/sessions`
- **Description** Create manual or historical session subject to single-active constraint and date rules.
- **Query parameters**: none.
- **Request JSON**:
  ```json
  {
    "status": "planned",
    "sessionDate": "2025-02-01T09:00:00Z",
    "sets": [12, 10, null, null, null],
    "rpe": null,
    "notes": "optional user note",
    "startNow": false
  }
  ```
  - `status` options: `planned`, `completed`, `failed` (historical only); default `planned`.
  - `sets` entries must be integers 1-60 or null when not yet performed.
  - `startNow=true` immediately transitions to `in_progress`.
- **Response JSON**:
  ```json
  {
    "data": {
      "session": {
        "id": "uuid",
        "status": "planned",
        "sessionDate": "2025-02-01T09:00:00Z",
        "sets": [12, 10, null, null, null],
        "totalReps": 22,
        "rpe": null,
        "isAiGenerated": false,
        "isModified": false,
        "aiComment": null,
        "createdAt": "2025-01-31T18:00:00Z",
        "updatedAt": "2025-01-31T18:00:00Z"
      }
    },
    "meta": {
      "warnings": [
        { "code": "REST_PERIOD", "message": "Last session was 18 hours ago" }
      ]
    }
  }
  ```
- **Success codes**: `201 Created` – session persisted.
- **Error codes**: `400 Bad Request` (validation, invalid reps/date), `403 Forbidden` (attempt to create historical planned), `409 Conflict` (existing active session), `422 Unprocessable Entity` (rest-period conflict acknowledged but blocked per policy override), `500 Internal Server Error`.

#### List sessions (history)
- **Method** `GET`
- **Path** `/sessions`
- **Description** Paginated history with filtering, sorting, and persisted preferences.
- **Query parameters**:
  - `page` (default 1), `pageSize` (default 10, max 50)
  - `status` (multi value): `completed`, `failed`, `planned`, `in_progress`
  - `dateFrom`, `dateTo` (ISO strings)
  - `sort` (`sessionDate_desc` default, or `sessionDate_asc`)
  - `persistedFilterId` (optional key from local storage to rehydrate saved filters)
- **Response JSON**:
  ```json
  {
    "data": {
      "sessions": [ { "id": "uuid", "status": "completed", "sessionDate": "...", "sets": [12, 15, 13, 11, 14], "totalReps": 65, "rpe": 7, "aiComment": "...", "isModified": false } ],
      "pagination": { "page": 1, "pageSize": 10, "totalPages": 5, "totalItems": 47 }
    },
    "meta": { "filters": { "status": ["completed"], "dateFrom": "2025-01-01" } }
  }
  ```
- **Success codes**: `200 OK`.
- **Error codes**: `400 Bad Request` (invalid filters), `401 Unauthorized`.

#### Get session
- **Method** `GET`
- **Path** `/sessions/{sessionId}`
- **Description** Retrieve single session; includes immutable flag and edit permissions.
- **Response JSON** adds `canEdit`, `canDelete`, `actions` array indicating allowed transitions.
- **Success codes**: `200 OK`.
- **Error codes**: `404 Not Found`, `403 Forbidden` (access outside tenant via RLS failure).

#### Edit session
- **Method** `PATCH`
- **Path** `/sessions/{sessionId}`
- **Description** Update planned or in-progress sessions (sets, notes, date). Requires `If-Match` header containing last `updatedAt`.
- **Request JSON** allows `sessionDate`, `sets`, `notes`, `markAsModified` (for AI sessions).
- **Response JSON**: Updated session object with new `updatedAt` and `isModified` toggled automatically when sets change.
- **Success codes**: `200 OK`.
- **Error codes**: `400 Bad Request` (invalid data), `409 Conflict` (ETag mismatch / optimistic lock), `422 Unprocessable Entity` (status disallows edit), `404 Not Found`.

#### Delete session
- **Method** `DELETE`
- **Path** `/sessions/{sessionId}`
- **Description** Remove planned or in-progress session after confirmation.
- **Success codes**: `204 No Content`.
- **Error codes**: `403 Forbidden` (immutable statuses), `404 Not Found`.

### 2.3 Session actions

#### Start session
- **Method** `POST`
- **Path** `/sessions/{sessionId}/start`
- **Description** Transition planned session to `in_progress`; records timestamp.
- **Request JSON**: optional `startAt` override (must be <= now).
- **Response JSON**: session object with status `in_progress`.
- **Success codes**: `200 OK`.
- **Error codes**: `409 Conflict` (already in active state), `422 Unprocessable Entity` (status not planned).

#### Complete session
- **Method** `POST`
- **Path** `/sessions/{sessionId}/complete`
- **Description** Mark session completed, validate at least one rep > 0, optionally capture RPE and final sets.
- **Request JSON**:
  ```json
  {
    "sets": [12, 15, 13, 11, 14],
    "rpe": 7,
    "completedAt": "2025-02-01T10:10:00Z"
  }
  ```
- **Response JSON**: session with status `completed`, immutable flags, and recorded `rpe`.
- **Success codes**: `200 OK`.
- **Error codes**: `400 Bad Request` (all sets zero, out-of-range reps), `409 Conflict` (status not in_progress), `422 Unprocessable Entity` (rest constraint if enforced at completion in future).

#### Fail session
- **Method** `POST`
- **Path** `/sessions/{sessionId}/fail`
- **Description** Mark in-progress session as failed.
- **Request JSON** optional `reason` string.
- **Response JSON**: session with status `failed`.
- **Success codes**: `200 OK`.
- **Error codes**: `409 Conflict` (status not in_progress), `422 Unprocessable Entity`.

### 2.4 AI sessions & quota

#### Get AI quota
- **Method** `GET`
- **Path** `/sessions/ai/quota`
- **Description** Remaining AI generations for 24h window plus reset countdown.
- **Response JSON**:
  ```json
  {
    "data": {
      "remaining": 3,
      "limit": 5,
      "resetsAt": "2025-02-02T09:30:00Z",
      "nextWindowSeconds": 5400
    }
  }
  ```
- **Success codes**: `200 OK`.
- **Error codes**: `401 Unauthorized`.

#### Generate AI session
- **Method** `POST`
- **Path** `/sessions/ai`
- **Description** Request AI-generated session; enforces rate limit, collects new-user max reps when needed; creates `sessions` + `generations` rows transactionally.
- **Request JSON**:
  ```json
  {
    "startNow": false,
    "maxPullups": 22,
    "model": "gpt-4o-mini"
  }
  ```
  - `maxPullups` required only when user lacks history.
- **Response JSON**:
  ```json
  {
    "data": {
      "session": { "id": "uuid", "status": "planned", "sets": [12, 16, 12, 12, 15], "aiComment": "..." },
      "generation": { "id": "uuid", "model": "gpt-4o-mini", "durationMs": 3200, "status": "success" }
    },
    "meta": { "quota": { "remaining": 4, "resetsAt": "..." } }
  }
  ```
- **Success codes**: `201 Created`.
- **Error codes**: `400 Bad Request` (missing maxPullups, invalid response from AI), `403 Forbidden` (rate limit exceeded), `408 Request Timeout` (AI >15s), `502 Bad Gateway` (provider error), `500 Internal Server Error`.

#### Retry AI generation
- **Method** `POST`
- **Path** `/sessions/ai/{generationId}/retry`
- **Description** Retry failed/timeout generation without consuming quota until success; reuses context.
- **Response JSON**: same as generate.
- **Success codes**: `200 OK` (success), `202 Accepted` (retry queued).
- **Error codes**: `404 Not Found`, `409 Conflict` (generation already succeeded), `429 Too Many Requests` (backoff enforcement).

#### List AI generations
- **Method** `GET`
- **Path** `/sessions/ai/history`
- **Description** User-visible history of AI generations with outcomes and linked sessions.
- **Query parameters**: `page`, `pageSize` (default 10), `status` filter.
- **Response JSON**: paginated list of generation records.
- **Success codes**: `200 OK`.

### 2.5 Validation helpers

#### Evaluate session creation constraints
- **Method** `GET`
- **Path** `/sessions/validation`
- **Description** Preflight checks for a prospective session date/status combination.
- **Query parameters**: `sessionDate` (ISO), `status`, `ignoreRestWarning` (bool).
- **Response JSON**:
  ```json
  {
    "data": {
      "blocking": false,
      "warnings": [
        { "code": "MULTIPLE_SAME_DAY", "message": "You already completed a session on 2025-02-01" }
      ],
      "lastCompletedSession": { "id": "uuid", "hoursSince": 18 }
    }
  }
  ```
- **Success codes**: `200 OK`.
- **Error codes**: `400 Bad Request` (missing parameters).

### 2.6 Dashboard

#### Fetch dashboard snapshot
- **Method** `GET`
- **Path** `/dashboard`
- **Description** Aggregate data for main dashboard: last completed session, active session, AI quota, outstanding warnings.
- **Response JSON**:
  ```json
  {
    "data": {
      "activeSession": { "id": "uuid", "status": "in_progress", "actions": ["complete", "fail", "edit", "delete"] },
      "lastCompletedSession": { "id": "uuid", "sessionDate": "...", "totalReps": 67, "rpe": 7 },
      "aiQuota": { "remaining": 3, "limit": 5, "resetsAt": "..." },
      "cta": { "primary": "Create with AI", "secondary": "Create manually" }
    }
  }
  ```
- **Success codes**: `200 OK`.
- **Error codes**: `401 Unauthorized`.

### 2.7 Exports

#### Initiate export
- **Method** `POST`
- **Path** `/exports`
- **Description** Start generation of CSV/JSON export; creates background job and emits `events` entry (`event_type=export_requested`).
- **Request JSON**:
  ```json
  {
    "format": "csv",
    "includeAiComments": true,
    "dateFrom": "2025-01-01",
    "dateTo": "2025-02-01"
  }
  ```
- **Response JSON**:
  ```json
  {
    "data": {
      "exportId": "uuid",
      "status": "pending"
    },
    "meta": { "estimatedReadyAt": "2025-02-01T10:00:05Z" }
  }
  ```
- **Success codes**: `202 Accepted`.
- **Error codes**: `400 Bad Request`, `429 Too Many Requests` (per-user throttling, e.g., 3 concurrent exports), `500 Internal Server Error`.

#### Poll export
- **Method** `GET`
- **Path** `/exports/{exportId}`
- **Description** Retrieve export status and signed download URL once ready.
- **Response JSON**:
  ```json
  {
    "data": {
      "exportId": "uuid",
      "status": "ready",
      "downloadUrl": "https://cdn.example.com/exports/uuid.csv",
      "expiresAt": "2025-02-01T12:00:00Z"
    }
  }
  ```
- **Success codes**: `200 OK`.
- **Error codes**: `404 Not Found`, `410 Gone` (expired export).

### 2.8 Events & audit

#### List user events
- **Method** `GET`
- **Path** `/events`
- **Description** Paginated view of user’s audit trail.
- **Query parameters**: `eventType` filter (multi), `page`, `pageSize`.
- **Response JSON**: array of events with `eventType`, `eventData`, `createdAt`.
- **Success codes**: `200 OK`.
- **Error codes**: `400 Bad Request`.
- **Notes**: Write access reserved to service role – no public `POST` route.

### 2.9 Admin metrics (admin-only)

All admin routes require token with `role=admin` claim and will additionally verify against Supabase RLS (policy ensures only admins).

#### Fetch KPI summary
- **Method** `GET`
- **Path** `/admin/metrics`
- **Description** Returns aggregate KPIs (total users, sessions, activation rate, AI adoption rate, failure rate, rest-period correlation).
- **Response JSON** includes metrics outlined in PRD 3.11.2.
- **Success codes**: `200 OK`.
- **Error codes**: `403 Forbidden`, `401 Unauthorized`.

#### Fetch AI reliability metrics
- **Method** `GET`
- **Path** `/admin/metrics/ai`
- **Description** Time-windowed AI generation stats (success%, average latency, failure breakdown).

#### Fetch recent errors
- **Method** `GET`
- **Path** `/admin/generation-errors`
- **Description** Paginated list of entries from `generation_error_logs` with filters by `errorType`, date.

## 3. Authentication and Authorization
- Supabase GoTrue handles user registration, login, password flows; front-end calls Supabase directly.
- API routes validate JWT via Supabase Admin SDK (`supabase.auth.getUser`), extracting `user_id` for RLS alignment.
- Astro API routes run with Service Role key for server-to-DB interaction; enforce user ownership at application layer to complement RLS.
- Admin routes require `user.app_metadata.role === 'admin'` (set via Supabase) and may employ middleware at `src/middleware/index.ts`.
- Rate limiting:
  - Global: 60 requests/minute per user IP via middleware.
  - AI generation: 5 successful generations per rolling 24h; tracked with `generations` table count.
  - Export initiation: 3 concurrent jobs per user.
- CSRF protection via SameSite cookies for browser calls; tokens sent via header.
- All endpoints served over HTTPS; responses set `Cache-Control: no-store` for sensitive data.

## 4. Validation and Business Logic

### Sessions
- Validate status transitions: `planned` → `in_progress` → (`completed`|`failed`); historical creation only permits `completed`/`failed`.
- Enforce single active session: check before create or start; handle database `idx_one_active_session` conflicts gracefully with 409.
- Set reps must be integers 1-60; allow null for not-yet-performed sets; ensure at least one rep > 0 before completion.
- Reject future sessions beyond 30 days; enforce past sessions cannot be `planned`/`in_progress`.
- `totalReps` computed server-side; request payload cannot supply it.
- `rpe` optional but, if present, must be 1-10.
- Immutability: completed/failed sessions disallow PATCH/DELETE; API surfaces `403` with message referencing rule.
- Rest-period warning: on create/start, check last completed/failed session within 24h; return warning metadata but allow override when policy permits.
- Multiple sessions per day warning: detect via query on same calendar date.
- Optimistic locking: require `If-Match` header with current `updatedAt`; respond `409` on mismatch.
- Store `(modified)` indicator automatically when AI session fields change; `isModified` toggled when incoming sets differ.

### AI Generations
- Before calling model, verify quota using `generations` count in last 24h; respond `403` with `AI_LIMIT_REACHED`.
- Timeout AI responses at 15 seconds; on timeout, log entry with `status=timeout` and return `408`.
- On failure, log into `generation_error_logs` with stack/message; response instructs user to retry; attempts that fail do not decrement quota.
- For new users, require `maxPullups` input and snap to bracketed progression defined in PRD 3.4.1.
- Ensure generated sets fall 1-60; sanitize/clip; mark generation as `error` if invalid.
- Preserve AI comment on edits; append "(modified)" when user adjusts sets.

### Dashboard & Validation Helpers
- `GET /dashboard` composes: last completed session (ordered by `session_date DESC`), active session (status in planned/in_progress), AI quota, warnings.
- `GET /sessions/validation` uses same logic as create but no persistence; attaches reasons for blocking/warning to encourage consistent UX.

### Events & Metrics
- Every session lifecycle change emits corresponding event (per PRD §6.3) with structured payload; service routes ensure event emission occurs in DB transaction.
- `events` endpoint exposes read-only audit trail to users; respects pagination and filtering.
- Admin metrics aggregate: activation rate, AI adoption, average sessions per user; heavy queries may use materialized views refreshed hourly.

### Exports
- Validate requested format (`csv` or `json`); enforce date range sanity.
- Exports generated asynchronously; job writes `events` with progress; final file stored in object storage with signed URL.
- Completed exports auto-expire after 24 hours.

### General
- Input validation centralized via zod/valibot schemas in Astro API routes.
- Standard error payload:
  ```json
  {
    "error": {
      "code": "AI_LIMIT_REACHED",
      "message": "AI session limit reached (5/5). Resets in 3 hours.",
      "details": {}
    }
  }
  ```
- Logging: successes and failures recorded via `events` and `generation_error_logs`; integrate with Sentry for exceptions.
- Localization support via message keys returned under `meta.warnings[].code` and `error.code`.
