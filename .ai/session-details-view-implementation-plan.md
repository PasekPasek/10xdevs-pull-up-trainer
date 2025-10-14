# View Implementation Plan — Session Details

## 1. Overview

The Session Details view presents a single session with full breakdown (sets, total reps, status, timestamps, optional RPE, AI comment, “(modified)”) and allows permitted actions based on `actions` from API: Start, Complete, Fail, Edit, Delete.

## 2. View Routing

- Path: `/sessions/:id`
- Access: authenticated only.

## 3. Component Structure

- `SessionDetailsPage` (Astro)
  - `SessionDetailsView` (React)
    - `SessionCard` (full)
    - `ActionBar`
      - `StartButton`
      - `CompleteDialog`
      - `FailConfirmDialog`
      - `EditDialog`
      - `DeleteConfirmDialog`
    - `ETagConflictDialog`

## 4. Component Details

### SessionDetailsView

- Description: Fetches session by id; renders card and action controls according to `actions`.
- Events: Action triggers corresponding API calls; refetch after success.
- Types: `SessionDetailDTO`.

### SessionCard

- Purpose: Display all session metadata: date/time (local), status badge, sets list, total reps, RPE, AI comment, “(modified)”.

### ActionBar and dialogs

- Purpose: Render only allowed actions from `actions` array.
- Actions:
  - Start → `POST /sessions/{id}/start`.
  - Complete → `POST /sessions/{id}/complete` with validated sets and optional RPE.
  - Fail → `POST /sessions/{id}/fail` (confirm irreversible).
  - Edit → `PATCH /sessions/{id}` (planned/in_progress only); send `If-Match: updatedAt`.
  - Delete → `DELETE /sessions/{id}` (planned/in_progress only) with confirmation.
- Validation in dialogs:
  - Complete: ≥1 set > 0; 1–60 per set; RPE optional.
  - Edit: 1–60 per set; date uneditable for `in_progress`.

## 5. Types

- From `src/types.ts`: `SessionDetailDTO`, `SessionAction`, `CompleteSessionCommand`, `StartSessionCommand`, `FailSessionCommand`, `UpdateSessionCommand`.
- View types:

```ts
export type EditSessionFormValues = {
  sets: [number | null, number | null, number | null, number | null, number | null];
  sessionDate?: string; // only for planned sessions
  aiComment?: string | null; // only for AI sessions when allowed
};

export type CompleteSessionFormValues = {
  sets: [number | null, number | null, number | null, number | null, number | null];
  rpe?: number | null;
};
```

## 6. State Management

- TanStack Query:
  - `useSession(id)` → `GET /sessions/{id}`.
  - Mutations: start, complete, fail, edit (PATCH with ETag), delete (invalidate and navigate).
- Local dialog visibility state.

## 7. API Integration

- Get one: `GET /sessions/{id}` → `SessionDetailDTO` with `actions`, `canEdit`, `canDelete`.
- Start: `POST /sessions/{id}/start`.
- Complete: `POST /sessions/{id}/complete` with `{ sets, rpe? }`.
- Fail: `POST /sessions/{id}/fail`.
- Edit: `PATCH /sessions/{id}` with `If-Match: updatedAt`.
- Delete: `DELETE /sessions/{id}`.

## 8. User Interactions

- Conditional rendering of actions from `actions`.
- Dialog confirmations for destructive actions.
- On successful delete: navigate back to `/dashboard` with toast.

## 9. Conditions and Validation

- Completed/failed are immutable: hide Edit/Delete.
- In-progress: date uneditable; Edit sets only.
- Validation for complete/edit: 1–60 per set; ≥1 set > 0 for complete; RPE optional for complete.
- Handle 409 (ETag mismatch) during PATCH by showing `ETagConflictDialog`.

## 10. Error Handling

- 404: show not found state with link back to `/dashboard`.
- 401: redirect to `/login`.
- 409: ETag conflict dialog with refresh.
- 5xx / network: toast + retry.

## 11. Implementation Steps

1. Add route `src/pages/sessions/[id].astro`; mount `SessionDetailsView`.
2. Implement `useSession(id)` and mutations in `src/lib/services/sessions/hooks.ts`.
3. Build `SessionCard`, `ActionBar`, and dialogs.
4. Wire ETag header on PATCH; show conflict dialog on 409.
5. Test: allowed/disallowed actions by status, complete/fail flows, edit restrictions, delete behavior.
