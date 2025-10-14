# View Implementation Plan — Register

## 1. Overview

The Register view creates a new user via Supabase Auth (email/password), validates password strength, logs the user in automatically on success, and redirects to `/dashboard`.

## 2. View Routing

- Path: `/register`
- Access: public; authenticated users redirected to `/dashboard`.

## 3. Component Structure

- `RegisterPage` (Astro)
  - `RegisterForm` (React)
    - `EmailField`
    - `PasswordField` (show/hide)
    - `PasswordStrengthMeter`
    - `RememberMeCheckbox` (default true)
    - `AuthErrorNotice`
    - `SubmitButton`

## 4. Component Details

### RegisterPage

- Description: Page wrapper rendering `RegisterForm` island.
- Elements: heading, container, link to `/login`.
- Props: none.

### RegisterForm

- Description: Controlled form with zod validation and Supabase `signUp`.
- Events:
  - Input change → inline validation.
  - Submit → `supabase.auth.signUp` then auto-login behavior from Supabase (session returned) or immediate sign-in flow if needed.
- Validation conditions (PRD):
  - Email format.
  - Password: min 8 chars, at least one letter and one number.
  - Password strength indicator (weak/medium/strong) based on heuristics.
- Types:

```ts
export type RegisterFormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};
```

- Props: none.

### PasswordStrengthMeter

- Purpose: Visual meter mapping password complexity to weak/medium/strong.
- Inputs: password value; returns label and percentage.

## 5. Types

- View types:

```ts
export type RegisterFormValues = { email: string; password: string; rememberMe: boolean };
export type AuthError = { code?: string; message: string };
```

## 6. State Management

- `react-hook-form` + zod for form validation.
- Local loading state.
- Client redirect if already authenticated.

## 7. API Integration

- Supabase Auth JS:
  - `supabase.auth.signUp({ email, password })`.
  - On success, Supabase returns session or may require email confirmation depending on project settings (MVP assumes direct session).
- On success: redirect to `/dashboard`.
- On failure: display error; map to user-friendly copy.

## 8. User Interactions

- Inline feedback for email and password requirements.
- Toggle show/hide password.
- Submit triggers loading; success → redirect.

## 9. Conditions and Validation

- Enforce password policy per PRD.
- Disable submit while invalid or submitting.

## 10. Error Handling

- Handle duplicate email gracefully: "An account with this email already exists."
- Network errors: toast and preserve input.

## 11. Implementation Steps

1. Add route `src/pages/register.astro`; mount `RegisterForm`.
2. Implement zod schema in `src/lib/validation/ui/registerForm.schema.ts`.
3. Build `RegisterForm` in `src/components/auth/RegisterForm.tsx` with shadcn/ui.
4. Implement `PasswordStrengthMeter`.
5. Wire Supabase `signUp`; handle session/redirect.
6. A11y: labels, helper text, focus management.
7. Test: valid registration, duplicate email, network error, redirect when authenticated.
