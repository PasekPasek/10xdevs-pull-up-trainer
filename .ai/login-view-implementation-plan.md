# View Implementation Plan — Login

## 1. Overview

The Login view authenticates users via Supabase Auth (email/password), persists the session ("Remember me" default), and redirects to `/dashboard` on success. It provides accessible form validation and clear error messages without leaking sensitive details.

## 2. View Routing

- Path: `/login`
- Access: public; authenticated users get redirected to `/dashboard` (middleware + client check).

## 3. Component Structure

- `LoginPage` (Astro)
  - `LoginForm` (React)
    - `EmailField`
    - `PasswordField` (show/hide)
    - `RememberMeCheckbox`
    - `AuthErrorNotice`
    - `SubmitButton`

## 4. Component Details

### LoginPage

- Description: Page wrapper rendering app shell and `LoginForm` island.
- Elements: heading, container, link to `/register`.
- Events: none.
- Props: none.

### LoginForm

- Description: Controlled form using `react-hook-form` + zod for email/password validation and Supabase sign-in.
- Elements: inputs for email, password; remember me checkbox; submit.
- Events:
  - Input change → validation.
  - Submit → call Supabase `signInWithPassword`.
- Validation conditions:
  - Email: valid email format.
  - Password: min 8 chars (mirrors policy; no strength meter here).
- Types:

```ts
export type LoginFormValues = {
  email: string;
  password: string;
  rememberMe: boolean; // default true
};
```

- Props: none.

### EmailField / PasswordField / RememberMeCheckbox / AuthErrorNotice / SubmitButton

- Purpose: Basic field components with accessible labels, error text, and loading/disabled states.
- Validation: field-level; errors from zod mapped near fields.
- Props: typical controlled-field props.

## 5. Types

- No backend DTO beyond Supabase Auth.
- View types:

```ts
export type LoginFormValues = { email: string; password: string; rememberMe: boolean };
export type AuthError = { code?: string; message: string };
```

## 6. State Management

- `react-hook-form` with zod resolver for client validation.
- Local `isSubmitting` flag; disable inputs and button while in-flight.
- Client-side check for current session via Supabase client; redirect if already authenticated.

## 7. API Integration

- Supabase Auth JS:
  - `supabase.auth.signInWithPassword({ email, password, options: { shouldCreateUser: false } })`.
  - Persist session (remember me) using Supabase default; optionally set cookie persistence if configured.
- On success: redirect to `/dashboard`.
- On failure: map error to generic message: "Invalid email or password".

## 8. User Interactions

- Typing in fields validates inline.
- Toggle show/hide password.
- Submit triggers loading state; on success redirect; on failure show `AuthErrorNotice`.

## 9. Conditions and Validation

- Email regex validation.
- Password min length 8 (and at least one letter and number suggested, but enforced at register; here keep minimal to avoid user lockout for legacy accounts).
- Disable submit if invalid or submitting.

## 10. Error Handling

- Network errors: toast "Unable to connect. Please try again." and keep inputs.
- Rate limiting or unknown errors: generic error; do not expose internal codes.

## 11. Implementation Steps

1. Add route `src/pages/login.astro` and mount `LoginForm` island.
2. Build `LoginForm` in `src/components/auth/LoginForm.tsx` using shadcn/ui components.
3. Add zod schema for `LoginFormValues` in `src/lib/validation/ui/loginForm.schema.ts`.
4. Wire Supabase client sign-in; on success redirect to `/dashboard`.
5. Add client-side redirect if already authenticated.
6. A11y: labels, description text, focus management on error.
7. Test: valid login, invalid credentials, network error, already-authenticated redirect.
