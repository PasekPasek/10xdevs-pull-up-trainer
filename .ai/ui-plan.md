# UI Architecture for Pull-Up Training Tracker MVP

## 1. UI Structure Overview

- **Framework and composition**: Astro 5 pages with React 19 islands, TypeScript 5, Tailwind 4, shadcn/ui; single shared layout `src/layouts/Layout.astro` for authenticated app shell (header, nav, toasts). Light theme only.
- **Routes**: `/login`, `/register`, `/dashboard`, `/sessions/new`, `/sessions/:id`, `/history`, `/admin`.
- **State and data**: TanStack Query for server state (short `staleTime`, `keepPreviousData` on history), `react-hook-form` + zod for forms, optimistic concurrency via `If-Match` ETag for `PATCH` edits, unified fetcher that unwraps `{ data, meta }` envelope and maps `error.code` to UI messages.
- **Auth and routing**: Supabase JS auth with “Remember me” default; route protection via `src/middleware/index.ts` (redirect 401/403 to `/login`), admin gating via `user.app_metadata.role === 'admin'`.
- **Date/time**: Inputs use `datetime-local`; server stores UTC; display via `Intl.DateTimeFormat` in browser locale; AI quota countdown computed client-side from `resetsAt` (no polling).
- **Accessibility**: Keyboard navigable controls, ARIA-labelled form fields, visible focus states, WCAG AA color contrast, dialogs focus-trap and Esc to close, meaningful button labels.
  - Icons via `lucide-react` with accessible labels; non-color cues accompany color status indicators.
- **Error handling**: Inline field errors from zod, toasts for system errors; 409 conflict shows refresh dialog; AI limit reached disables primary CTA with countdown; network failures get retry affordances.
- **Performance**: Cache narrowly (dashboard ~5s, history none), avoid global stores, use React islands only where interactivity is needed.

### API integration overview (by purpose)

- **Auth (Supabase)**: UI uses Supabase JS (no custom REST wrapper in app) for login/register; no forgot/reset in MVP.
- **Dashboard**: `GET /dashboard` (aggregate active session, last completed, AI quota, CTA states).
- **Sessions CRUD**:
  - Create: `POST /sessions`
  - List (history): `GET /sessions`
  - Get one: `GET /sessions/{sessionId}`
  - Edit: `PATCH /sessions/{sessionId}` (send `If-Match` with `updatedAt`)
  - Delete: `DELETE /sessions/{sessionId}`
- **Session actions**: `POST /sessions/{sessionId}/start`, `POST /sessions/{sessionId}/complete`, `POST /sessions/{sessionId}/fail`
- **Validation helper**: `GET /sessions/validation` (preflight warnings for manual create)
- **AI**: `GET /sessions/ai/quota`, `POST /sessions/ai`, `POST /sessions/ai/{generationId}/retry`, `GET /sessions/ai/history`
  - Fixed model: `gpt-4o-mini`. On failure/timeout (15s), use `POST /sessions/ai/{generationId}/retry`. Failed/timeout attempts do not decrement quota until success.
- **Events**: `GET /events` (read-only; not surfaced directly in MVP UI, used for future history/exports)
- **Admin**: `GET /admin/metrics` (minimal KPIs)

### Cross-cutting PRD user story coverage

- **Authentication**: US-001 (register), US-002 (login). Out of scope in MVP: US-003/US-004 (forgot/reset), US-005 (change password), US-007 (delete account).
- **Sessions lifecycle**: US-008..US-023 (create, start, complete, fail, edit/delete rules).
- **AI generation & quota**: US-024..US-031 (new/existing users, comments), US-027..US-030 (limits, errors, timeout).
- **Dashboard**: US-032..US-034.
- **History**: US-035..US-042 (pagination, sort, filters, persistence).
- **Warnings & validation**: US-043..US-046 (rest/multiple-same-day/inline), US-057..US-058 (no reps, rep bounds).
- **Concurrency & blocking**: US-048 (optimistic lock), US-049 (single active session rule).
- **Timezone & accessibility**: US-050 (local time), US-051..US-053 (a11y).
- **Admin**: US-054..US-056 (access, KPIs, monitoring UI surface minimal). Out of scope: US-047 (export).

## 2. View List

### A. Login

- **View path**: `/login`
- **Main purpose**: Authenticate returning users with email/password and persist session (“Remember me” default).
- **Key information to display**:
  - Email, password fields with validation messages
  - Remember me (checked by default), show/hide password
  - Link to register; no forgot password in MVP
  - Error messages for invalid credentials or network errors
- **Key view components**:
  - shadcn/ui: `Card`, `Form`, `Input`, `Button`, `Checkbox`
  - Custom: `PasswordField` (show/hide), `AuthErrorNotice`
- **Key API/SDK**: Supabase JS sign-in; on success redirect to `/dashboard`.
- **UX, accessibility, security**:
  - Auto-focus email; Enter submits; strong focus indicators
  - Do not leak error details; generic invalid-credentials copy
  - Already-authenticated users redirected away from `/login`
- **Mapped PRD stories**: US-002, US-051..US-053, US-061.

### B. Register

- **View path**: `/register`
- **Main purpose**: Create a new account; auto-login on success.
- **Key information to display**:
  - Email, password with inline strength meter and requirements
  - “Remember me” default, show/hide password
  - Success redirects to `/dashboard`
- **Key view components**:
  - shadcn/ui: `Card`, `Form`, `Input`, `Button`, `Checkbox`, `Progress` (strength meter)
  - Custom: `PasswordRequirements`, `PasswordField`
- **Key API/SDK**: Supabase JS sign-up; no email verification.
- **UX, accessibility, security**:
  - Client-side validation mirrors password policy
  - Prevent duplicate submissions; loading states; disable button during in-flight
- **Mapped PRD stories**: US-001, US-051..US-053.

### C. Dashboard

- **View path**: `/dashboard`
- **Main purpose**: Primary hub showing active session, last completed, AI quota, and creation CTAs.
- **Key information to display**:
  - Active session card (if any) with quick actions: `start` (if planned), `complete`, `fail`, `edit`, `delete`
  - Last completed session summary (date, sets, total reps, RPE [optional])
  - AI quota widget (remaining/limit, countdown)
  - Primary CTAs: “Create with AI”, “Create manually” (disabled if blocked by active session)
  - New-user welcome state when no history/active session exists
- **Key view components**:
  - `SessionCard` (status badge, sets list, total reps, RPE [optional], AI comment, “(modified)”)
  - `AIQuotaBadge`
  - `AIWizardModal` (steps: quota → optional max reps → loading → result with “Start Now”)
  - `StickyPrimaryCTA` on mobile
- **Key API endpoints**:
  - `GET /dashboard` (drives entire view)
  - Prefetch `GET /sessions/ai/quota`
  - Mutations via quick actions (see Session Details)
- **UX, accessibility, security**:
  - Disable creation CTAs when active session exists; surface banner with quick links to resolve
  - Announce status changes (start/complete/fail) to screen readers
  - Confirm destructive actions (delete, fail) with accessible dialogs
- **Mapped PRD stories**: US-032..US-034, US-027, US-049.

### D. Create Manual Session

- **View path**: `/sessions/new`
- **Main purpose**: Create a planned or historical session; optionally start now for today/future.
- **Key information to display**:
  - 5 numeric set inputs (1–60), running total, `datetime-local` (default now), status selector constrained by date (planned for future; completed/failed for past)
  - `Start now` checkbox enabled for today/future only
  - RPE input (optional) when creating a historical completed session
  - Inline warnings from preflight: rest period, multiple same day (non-blocking), and active-session blocking with quick actions
  - No notes field in MVP (UI omits notes even if API supports `notes`)
- **Key view components**:
  - `SessionForm` (zod validation, 5 inputs, total calculator)
  - `InlineAlert` for warnings; `BlockingAlert` for active-session rule
  - `StickyPrimaryCTA` submit on mobile
- **Key API endpoints**:
  - Preflight: `GET /sessions/validation`
  - Submit: `POST /sessions` (include `startNow` when requested)
- **UX, accessibility, security**:
  - Numeric-only inputs with min/max; error text near fields; keyboard-friendly
  - Show “Continue anyway” for warnings; “Cancel” resets to safe defaults
  - On 409 (blocking), surface quick actions (view/start/complete/fail/delete)
- **Mapped PRD stories**: US-008..US-011, US-043..US-046, US-057..US-058, US-049.

### E. Session Details

- **View path**: `/sessions/:id`
- **Main purpose**: Inspect a single session with full breakdown and perform allowed actions.
- **Key information to display**:
  - Sets [5], total reps, status, timestamps, optional RPE
  - AI comments and “(modified)” indicator when applicable
  - Allowed `actions` from API: drive which buttons render
- **Key view components**:
  - `SessionCard` (full)
  - `ActionBar` with: `Start`, `Complete` (dialog with editable sets + optional RPE), `Fail` (confirm), `Edit` (dialog for planned/in_progress), `Delete` (confirm)
  - `ETagConflictDialog` on 409
- **Key API endpoints**:
  - `GET /sessions/{sessionId}` (includes `actions`)
  - `POST /sessions/{id}/start`, `POST /sessions/{id}/complete`, `POST /sessions/{id}/fail`
  - `PATCH /sessions/{id}` (send `If-Match` = `updatedAt`)
  - `DELETE /sessions/{id}`
- **UX, accessibility, security**:
  - Guard edits/deletes for immutable statuses (completed/failed): hide buttons
  - Validate completion payload (≥1 rep > 0; 1–60 per set); RPE optional; date cannot be changed for in-progress sessions
  - Announce status changes; confirm destructive actions
- **Mapped PRD stories**: US-012..US-023, US-057..US-058, US-048.

### F. History

- **View path**: `/history`
- **Main purpose**: Paginated, filterable session history with saved preferences.
- **Key information to display**:
  - Session cards (compact) for 10/page; totals, status, date/time
  - Filters: date presets + custom range, status multi-select, sort order
  - Pagination controls; empty states for no data / no results
- **Key view components**:
  - `FiltersPanel` (collapsible on mobile), `StatusCheckboxGroup`, `DateRangePicker`, `SortToggle`
  - `PaginationControl` with `keepPreviousData`
  - `SessionCard` (condensed)
- **Key API endpoints**:
  - `GET /sessions` with `page`, `pageSize`, `status[]`, `dateFrom`, `dateTo`, `sort`
- **UX, accessibility, security**:
  - Persist filters in `localStorage`; initialize from query string
  - Keyboard operable filters and pagination; visible focus states
  - Clear Filters button resets URL and UI
- **Mapped PRD stories**: US-035..US-042, US-040, US-050.

### G. Admin Metrics

- **View path**: `/admin`
- **Main purpose**: Minimal KPI dashboard for admins.
- **Key information to display**:
  - Total registered users, total sessions,
  - AI generation success rate, activation rate (≥1 completed)
- **Key view components**:
  - `KpiCard` grid (4-up), optional `Skeleton` while loading
- **Key API endpoints**:
  - `GET /admin/metrics`
- **UX, accessibility, security**:
  - Gate route via middleware and client check against `user.app_metadata.role`
  - Clear unauthorized message and redirect to `/login` for non-admin
- **Mapped PRD stories**: US-054..US-055.

## 3. User Journey Map

### Primary flow (new user using AI)

1. Register → auto-login → `/dashboard` (welcome state from `GET /dashboard`).
2. Click “Create with AI” → `AIWizardModal` opens.
3. Step 1: Fetch `GET /sessions/ai/quota` → if `remaining=0`, disable CTA and show countdown; else continue.
4. Step 2 (no history): Prompt for max pull-ups (1–60). Validate.
5. Step 3: Submit `POST /sessions/ai` → show loading; handle `408/502` with retry; on success show generated sets + comment and “Start Now”.
6. Optional: “Start Now” → `POST /sessions/{id}/start` → dashboard updates active session.
7. Complete session: open Complete dialog → validate sets + optional RPE → `POST /sessions/{id}/complete` → success toast → immutable state.
8. History reflects new completed session; dashboard shows latest metrics.

### Alternative flow (manual creation)

1. From `/dashboard`, click “Create manually” → `/sessions/new`.
2. Form entry: 5 sets (1–60), `datetime-local` (default now); optional `startNow` (today/future only). If creating historical completed, RPE is optional.
3. Preflight `GET /sessions/validation` shows warnings (rest/multiple same day); user may continue.
4. Submit `POST /sessions` (with `startNow` when checked); handle `409` (active session) with quick actions.
5. Redirect to `/dashboard`; quick actions available on the active/planned session.

### Conflict and error handling

- **Optimistic lock (409)**: On `PATCH` or completion, show `ETagConflictDialog` instructing to refresh; offer a refresh button.
- **AI limit (403)**: Disable AI CTA; show “Resets in Xh Ym” countdown.
- **Timeout (408) / provider error (502)**: Show retry without consuming quota; secondary “Create manually”.
- **Unauthorized (401/403)**: Middleware redirects to `/login`.

### Admin path

1. Admin user opens `/admin` → middleware allows; fetch `GET /admin/metrics` → render KPIs.

## 4. Layout and Navigation Structure

- **Global layout** (`src/layouts/Layout.astro`):
  - Header with app logo/title, primary nav links (`Dashboard`, `History`, conditional `Admin`), and right-aligned avatar menu (Profile stub, `Sign out`).
  - Content container with responsive spacing; toasts portal.
  - Mobile: `StickyPrimaryCTA` appears on `/dashboard` and `/sessions/new` where creation actions are relevant.
- **Navigation & routing**:
  - Public: `/login`, `/register`; redirect to `/dashboard` if already authenticated.
  - Private: `/dashboard`, `/sessions/*`, `/history`, `/admin` guarded by middleware; unauthorized redirects to `/login`.
  - Intra-app links: session cards link to `/sessions/:id`; history cards link to details; breadcrumbs not required (flat IA).
- **URL state**:
  - `/history` encodes filters in query string; UI initializes from URL and persists to `localStorage`.
- **Admin gating**:
  - `Admin` nav visible only when `user.app_metadata.role === 'admin'`; otherwise 403 → redirect.

## 5. Key Components (reused across views)

- **HeaderNav**: Global navigation with active route styling and avatar menu (`Sign out`).
- **StickyPrimaryCTA**: Mobile-only fixed CTA for primary action (e.g., Create with AI / Create manually / Submit).
- **SessionCard**: Displays date/time (local), 5 sets, total reps, status badge, RPE (optional), AI comment, “(modified)”; variants: full (details) and condensed (history).
- **StatusBadge**: Color + icon variants for `planned`, `in_progress`, `completed`, `failed` (non-color cues included).
- **AIQuotaBadge**: Shows `remaining/limit`, countdown to `resetsAt`.
- **AIWizardModal**: Stepper modal orchestrating quota check → optional max reps input → generation loading → result with “Start Now”.
- **SessionForm**: 5 numeric inputs (1–60), running total, `datetime-local`, status selector (when historical), `startNow` toggle; zod validation.
- **SessionCompleteDialog**: Dialog with editable 5 sets (validated) + optional RPE slider; submit to complete.
- **ConfirmationDialog**: Reusable alert dialog for delete/fail/irreversible actions with clear copy.
- **FiltersPanel**: Collapsible panel for history filters (date presets, custom range, status multi-select, sort toggle).
- **PaginationControl**: Page navigation (Previous/Next, page numbers) with `keepPreviousData` UX.
- **InlineAlert / BlockingAlert**: Informational warnings (rest/multiple-same-day) vs. active-session blocking with quick action buttons.
- **ETagConflictDialog**: Informs about concurrent edits and offers refresh.
- **ErrorToast**: Standardized toast surface for system-level failures.
- **Countdown**: Client-side countdown to AI reset time from `resetsAt`.
- **TimeDisplay**: Utility for consistent local time rendering from UTC timestamps.

— End —
