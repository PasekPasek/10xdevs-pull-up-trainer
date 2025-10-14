# View Implementation Plan — Dashboard

## 1. Overview

The Dashboard displays the user's current state: active session (planned or in progress) with quick actions, last completed session summary, AI quota status, and primary CTAs (Create with AI, Create manually). It orchestrates the AI session creation flow via a modal.

## 2. View Routing

- Path: `/dashboard`
- Access: authenticated only (middleware); admin link shown conditionally.

## 3. Component Structure

- `DashboardPage` (Astro)
  - `DashboardView` (React)
    - `ActiveSessionCard` (if exists)
      - `ActionBar` (Start/Complete/Fail/Edit/Delete)
    - `LastCompletedCard` (if exists)
    - `AIQuotaBadge`
    - `PrimaryCTAs` (Create with AI, Create manually)
    - `AIWizardModal`

## 4. Component Details

### DashboardView

- Description: Composes snapshot data and renders cards and CTAs; owns modal state.
- Events:
  - Click Create with AI → open `AIWizardModal`.
  - Quick actions → call corresponding session endpoints and refresh snapshot.
- Types: `DashboardSnapshotResponse`, `SessionDetailDTO`, `AiQuotaDTO`.

### ActiveSessionCard

- Purpose: Show current planned/in progress session with sets, total reps, status badge, and actions permitted by `actions` array.
- Events: Start → `POST /sessions/{id}/start`; Complete → open `SessionCompleteDialog`; Fail → confirm; Edit → open `EditSessionDialog`; Delete → confirm.
- Validation: hide actions not present in `actions` list; ensure edit/complete validation on dialogs.

### LastCompletedCard

- Purpose: Show last completed session with date, sets/total, optional RPE, AI comment, "(modified)" indicator.

### AIQuotaBadge

- Purpose: Display remaining AI quota from snapshot and a countdown to `resetsAt`.

### PrimaryCTAs

- Purpose: Primary buttons; disable AI if quota 0; disable create buttons when active session exists (or show blocking banner).

### AIWizardModal

- Purpose: Flow for generating AI sessions per PRD.
- Steps:
  1. Fetch quota if needed (or use snapshot)
  2. For new users without history: prompt for max pull-ups (1–60)
  3. Submit `POST /sessions/ai`; show loading up to 15s; handle timeout/errors with retry
  4. Show generated sets + comment and “Start Now”
- Endpoints: `GET /sessions/ai/quota`, `POST /sessions/ai`, `POST /sessions/ai/{generationId}/retry`.

## 5. Types

- Reuse from `src/types.ts`:
  - `DashboardSnapshotResponse`, `SessionDetailDTO`, `SessionDTO`, `AiQuotaDTO`, `GenerateAiSessionCommand`, `GenerateAiSessionResponse`.
- View models:

```ts
export type AiWizardState = {
  step: "quota" | "input" | "loading" | "result";
  maxPullups?: number;
  generationId?: string;
};
```

## 6. State Management

- TanStack Query:
  - `useDashboardSnapshot()` → `GET /dashboard`.
  - Mutations for session actions: start, complete, fail, edit (PATCH with `If-Match`), delete.
  - AI mutations: generate, retry; invalidate snapshot on success.
- Local state for `AIWizardModal` visibility and step.

## 7. API Integration

- `GET /dashboard` for snapshot.
- Session actions:
  - Start: `POST /sessions/{id}/start`.
  - Complete: `POST /sessions/{id}/complete` with optional `rpe` and sets validation (≥1 set > 0; 1–60 bounds).
  - Fail: `POST /sessions/{id}/fail`.
  - Edit: `PATCH /sessions/{id}` with `If-Match: updatedAt`; respond to 409 with conflict dialog.
  - Delete: `DELETE /sessions/{id}`.
- AI:
  - Quota: `GET /sessions/ai/quota`.
  - Generate: `POST /sessions/ai` (requires `maxPullups` for new users; fixed model `gpt-4o-mini`).
  - Retry: `POST /sessions/ai/{generationId}/retry`.
- All calls with `Authorization: Bearer <token>`.

## 8. User Interactions

- Quick actions reflect allowed `actions` from snapshot.
- Completing a session opens a dialog to confirm sets and optional RPE.
- Editing opens a dialog with five-set form; send `If-Match` header.
- AI modal handles loading, error, and result with Start Now action.

## 9. Conditions and Validation

- Respect `actions` list; hide disallowed actions.
- Complete validation: ≥1 set > 0; 1–60 per set; RPE optional.
- Edit validation: 1–60 per set; date edit disallowed for `in_progress`.
- AI constraints: quota enforcement; clip generated sets to 1–60 if needed (server also sanitizes).

## 10. Error Handling

- 401: redirect to `/login`.
- 409 on PATCH: show `ETagConflictDialog` and offer refresh.
- AI errors: show error message and retry button; timeout after 15s.
- Global failures: toast with retry; buttons disabled during in-flight.

## 11. Implementation Steps

1. Create `src/pages/dashboard.astro`; mount `DashboardView`.
2. Implement `useDashboardSnapshot` and session/AI mutations in `src/lib/services/dashboard/hooks.ts` and `src/lib/services/sessions/hooks.ts`.
3. Build components: `ActiveSessionCard`, `LastCompletedCard`, `AIQuotaBadge`, `PrimaryCTAs`, `AIWizardModal`, `SessionCompleteDialog`, `EditSessionDialog`, `ETagConflictDialog`.
4. Wire quick actions and invalidations; ensure headers and If-Match handling.
5. A11y: focus management for dialogs; announce status updates.
6. Test: with/without active session, AI quota 0, generate flow success/failure, conflict handling.
