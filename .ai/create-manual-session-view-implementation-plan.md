# View Implementation Plan — Create Manual Session

## 1. Overview

The Create Manual Session view enables authenticated users to create a pull-up training session as planned (default), start it immediately for today/future, or log a historical completed/failed session. It mirrors backend validation: date constraints, five-set structure with rep bounds, RPE optional (encouraged) for completed, single active session rule, non-blocking warnings (rest period, multiple same-day), and blocking when an active session exists.

## 2. View Routing

- Path: `/sessions/new`
- Access: authenticated only; enforced by `src/middleware/index.ts`.

## 3. Component Structure

- `CreateManualSessionPage` (Astro)
  - `SessionForm` (React)
    - `DateTimeField`
    - `StatusSelector` (past only)
    - `StartNowToggle` (today/future only)
    - `SetsGrid`
      - `SetInput` × 5
    - `RunningTotal`
    - `RPEInput` (completed only; optional)
    - `InlineAlert` (warnings)
    - `BlockingAlert` (active session)
    - `PrimarySubmitButton`

## 4. Component Details

### CreateManualSessionPage

- Description: Page shell that mounts the interactive form.
- Main elements: heading, container, React island.
- Events: none.
- Validation: none.
- Types: none.
- Props: none.

### SessionForm

- Description: Form controlling creation of planned/start-now/historical sessions with preflight validation.
- Main elements:
  - `datetime-local` input
  - Status selector (past: `completed` or `failed`)
  - Start Now toggle (today/future)
  - Five numeric inputs (1–60 or empty = null)
  - Running total readout
  - RPE slider/input (1–10) shown when status is `completed` (optional)
  - Inline warnings + blocking alert
  - Submit button
- Handled interactions:
  - Change date/time → recompute past vs today/future; trigger debounced preflight.
  - Toggle Start Now → enforce status `planned`, hide status selector.
  - Change status (past) → toggle RPE visibility.
  - Change sets → validate 1–60, allow empty=null; update total.
  - Submit → call `POST /sessions`; on success, redirect to `/dashboard`.
- Validation conditions:
  - Sets: exactly 5; each non-null integer 1–60.
  - Date rules: past → status in {completed, failed}; future ≤ +30 days.
  - Start Now: allowed only for today/future; cannot combine with explicit non-default status.
  - Completed: at least one set > 0; RPE optional (when provided, must be 1–10).
  - Failed: `rpe` must be undefined.
- Types: uses DTOs from `src/types.ts` plus view models in Types section.
- Props: none.

### DateTimeField

- Purpose: Capture session local datetime and convert to UTC ISO for API.
- Elements: label + `<input type="datetime-local">`.
- Events: onChange → update form state and preflight.
- Validation: valid datetime; max future +30d via `max` attr and runtime.
- Props: `{ value, onChange, min?, max? }`.

### StatusSelector

- Purpose: Choose historical status: `completed` or `failed` (past only).
- Elements: select/segmented control.
- Events: onChange → toggle RPE visibility.
- Validation: restricted options for past.
- Props: `{ value, onChange, options }`.

### StartNowToggle

- Purpose: Start immediately for today/future.
- Elements: switch/checkbox.
- Events: onChange → set `startNow`, force status `planned`.
- Validation: disabled for past; cannot combine with explicit status.
- Props: `{ checked, onChange, disabled }`.

### SetsGrid / SetInput

- Purpose: Capture 5 sets of reps.
- Elements: 5 numeric fields.
- Events: onChange(index, value) per input.
- Validation: 1–60 for non-null; keep empty as null.
- Props: `{ values: (number|null)[], onChange }`.

### RunningTotal

- Purpose: Show total reps across sets.
- Elements: small text count.
- Props: `{ sets: (number|null)[] }`.

### RPEInput

- Purpose: RPE 1–10 when status is `completed` (optional; encouraged tooltip).
- Elements: slider or number input; tooltip text from PRD.
- Validation: when provided, 1–10.
- Props: `{ value, onChange }`.

### InlineAlert

- Purpose: Show non-blocking warnings from preflight or POST meta.
- Props: `{ warnings: ApiWarning[] }`.

### BlockingAlert

- Purpose: Show active-session blocking with quick action(s) (link to `/dashboard`).
- Props: `{ message: string, actions?: ReactNode }`.

## 5. Types

- Reuse from `src/types.ts`:
  - `CreateSessionCommand`, `CreateSessionResponse`, `SessionValidationResponse`, `SessionStatus`, `SessionSets`, `ApiWarning`.
- New view types:

```ts
export type CreateManualSessionFormValues = {
  sessionDateLocal: string;
  status: "planned" | "completed" | "failed";
  startNow: boolean;
  sets: [number | null, number | null, number | null, number | null, number | null];
  rpe?: number | null; // optional
};

export type ValidationState = {
  blocking: boolean;
  warnings: ApiWarning[];
  lastCompletedSession?: { id: string; hoursSince: number };
};
```

- Utilities:

```ts
export function localDateTimeToUtcIso(local: string): string {
  return new Date(local).toISOString();
}

export function computeTotal(sets: (number | null)[]): number {
  return sets.reduce((sum, v) => sum + (v ?? 0), 0);
}
```

## 6. State Management

- `react-hook-form` + zod resolver mirror backend rules from `createSession.schema.ts` (treat RPE as optional in the UI layer to align with API and types).
- TanStack Query:
  - `useSessionPreflight(sessionDateIso, status)` → `GET /sessions/validation` on relevant changes (400–600ms debounce), key: `["validation", sessionDateIso, status]`.
  - `useCreateSession()` → `POST /sessions`; on success, redirect to `/dashboard` and invalidate dashboard queries.
- Derived state: `isPast`, `allowStartNow`, `showStatusSelector`, `showRpe` (status===completed), `totalReps`.

## 7. API Integration

- Preflight `GET /sessions/validation`
  - Query: `sessionDate` (UTC ISO), `status`, `ignoreRestWarning=false`.
  - Response: `SessionValidationResponse` with `{ blocking, warnings, lastCompletedSession }`.
- Create `POST /sessions`
  - Body: `CreateSessionCommand` with fields per types.
  - Response: `CreateSessionResponse`, ETag in `updatedAt` header.
- Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`.

## 8. User Interactions

- Change date/time → recompute past/future, toggle controls, preflight.
- Toggle Start Now → force `planned`, hide status, clear RPE.
- Change status (past) → toggle RPE visibility.
- Enter sets → validate and update total.
- Submit → if `blocking`, prevent and show `BlockingAlert`; else POST, then redirect to `/dashboard` + toast.

## 9. Conditions and Validation

- Sets: 5 entries; each non-null 1–60.
- Past: status must be `completed`/`failed`.
- Future: max +30d; default `planned`.
- Completed: ≥1 set > 0; RPE optional (1–10 when provided).
- Failed: no RPE.
- Start Now: only today/future; cannot combine with explicit non-default status.
- Preflight warnings: `REST_PERIOD`, `MULTIPLE_SAME_DAY` (non-blocking).
- Preflight blocking: `ACTIVE_SESSION_EXISTS`.

## 10. Error Handling

- 400 invalid payload/query → map server issues to field errors; toast fallback.
- 401 unauthenticated → redirect to `/login`.
- 409 active session conflict → show `BlockingAlert` with CTA to `/dashboard`.
- 5xx → toast “Something went wrong. Try again.” retain form.
- Network failure → toast “Unable to connect...” + retry.
- Invalid datetime → field-level error; disallow submit.

## 11. Implementation Steps

1. Add route `src/pages/sessions/new.astro` and mount `SessionForm` React island.
2. Implement form schema in `src/lib/validation/ui/createManualSessionForm.schema.ts` mirroring backend (treat RPE optional in UI).
3. Implement hooks in `src/lib/services/sessions/hooks.ts`: `useSessionPreflight`, `useCreateSession`.
4. Build components in `src/components/sessions/`: `SessionForm.tsx` + subcomponents.
5. Wire preflight with debounce and render warnings/blocking.
6. Enforce dynamic validation (RPE optional for completed, Start Now rules).
7. Submit transform to `CreateSessionCommand` (UTC conversion, sets normalization), call POST, handle success/ETag.
8. Polish accessibility (labels, ARIA, focus, keyboard) and mobile sticky CTA.
9. Test flows: planned, start now → in_progress, completed/failed history, 409 conflict, warnings, time zones.
