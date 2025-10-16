# Specyfikacja Techniczna Systemu Autentykacji

## Pull-Up Training Tracker MVP

---

## UWAGA: Zakres MVP

**W ZAKRESIE MVP:**

- ✅ Rejestracja użytkownika (email + hasło)
- ✅ Logowanie użytkownika (email + hasło + "Remember me")
- ✅ Wylogowanie użytkownika
- ✅ Ochrona tras (middleware)
- ✅ Zarządzanie sesjami (cookies)

**POZA ZAKRESEM MVP (Future Considerations):**

- ❌ Forgot Password / Reset Password
- ❌ Password Change w ustawieniach
- ❌ Email Verification
- ❌ OAuth Providers (Google, Apple)
- ❌ 2FA
- ❌ Account Deletion

---

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1 Struktura Stron i Routing

#### 1.1.1 Strony Publiczne (Bez Autentykacji)

##### A. Strona Główna `/`

- **Plik**: `src/pages/index.astro`
- **Layout**: `src/layouts/Layout.astro` (podstawowy, bez nawigacji zalogowanego użytkownika)
- **Status**: ✅ Zaimplementowana
- **Funkcjonalność**:
  - Landing page z prezentacją aplikacji
  - Przyciski CTA: "Get Started" → `/register`, "Sign In" → `/login`
  - Grid z 3 feature cards (Track Progress, AI-Powered Plans, Analyze Performance)
  - Automatyczne przekierowanie do `/dashboard` dla zalogowanych użytkowników (client-side check)
- **Modyfikacje wymagane**:
  - Opcjonalnie: dodać server-side redirect w Astro zamiast client-side sprawdzania

##### B. Strona Logowania `/login`

- **Plik**: `src/pages/login.astro`
- **Layout**: `src/layouts/Layout.astro` (podstawowy)
- **Komponenty React**: `LoginForm` (client:load)
- **Status**: ✅ Zaimplementowana
- **Funkcjonalność**:
  - Nagłówek: "Welcome back" + opis
  - Formularz logowania w komponencie React
  - Link do rejestracji: "Create one now" → `/register`
  - Toast notifications (Sonner)
  - Automatyczne przekierowanie zalogowanych użytkowników do `/dashboard`
- **Modyfikacje wymagane**:
  - Dodać server-side redirect w middleware dla zalogowanych użytkowników
  - Zmienić logikę logowania na wywołanie API endpoint zamiast bezpośredniego użycia Supabase

##### C. Strona Rejestracji `/register`

- **Plik**: `src/pages/register.astro`
- **Layout**: `src/layouts/Layout.astro` (podstawowy)
- **Komponenty React**: `RegisterForm` (client:load)
- **Status**: ✅ Zaimplementowana
- **Funkcjonalność**:
  - Nagłówek: "Create your account" + opis
  - Formularz rejestracji w komponencie React
  - Link do logowania: "Sign in" → `/login`
  - Toast notifications (Sonner)
  - Automatyczne przekierowanie zalogowanych użytkowników do `/dashboard`
- **Modyfikacje wymagane**:
  - Dodać server-side redirect w middleware dla zalogowanych użytkowników
  - Zmienić logikę rejestracji na wywołanie API endpoint zamiast bezpośredniego użycia Supabase

#### 1.1.2 Strony Chronione (Wymagają Autentykacji)

##### A. Dashboard `/dashboard`

- **Plik**: `src/pages/dashboard.astro`
- **Layout**: `src/layouts/AuthenticatedLayout.astro`
- **Status**: ✅ Zaimplementowana
- **Ochrona**: Wymaga middleware auth check
- **Modyfikacje wymagane**:
  - Middleware musi weryfikować sesję i przekierowywać do `/login` jeśli brak autentykacji

##### B. Historia `/history`

- **Plik**: `src/pages/history.astro`
- **Layout**: `src/layouts/AuthenticatedLayout.astro`
- **Status**: ✅ Zaimplementowana
- **Ochrona**: Wymaga middleware auth check

##### C. Sesje `/sessions/*`

- **Pliki**: `src/pages/sessions/*.astro`
- **Layout**: `src/layouts/AuthenticatedLayout.astro`
- **Status**: ✅ Zaimplementowane
- **Ochrona**: Wymaga middleware auth check

##### D. Admin `/admin`

- **Plik**: `src/pages/admin.astro`
- **Layout**: `src/layouts/AuthenticatedLayout.astro`
- **Status**: ✅ Zaimplementowana
- **Ochrona**: Wymaga middleware auth check + admin role check

### 1.2 Komponenty React

#### 1.2.1 Istniejące Komponenty Auth (Do Modyfikacji)

##### A. LoginForm

- **Plik**: `src/components/auth/LoginForm.tsx`
- **Status**: ✅ Zaimplementowany, wymaga modyfikacji
- **Obecna implementacja**:
  - Używa `react-hook-form` z `zodResolver`
  - Walidacja przez `loginFormSchema`
  - Bezpośrednie wywołanie `supabaseClient.auth.signInWithPassword()`
  - Client-side sprawdzanie autentykacji w `useEffect`
  - Checkbox "Remember me" (domyślnie zaznaczony)
- **Wymagane modyfikacje**:

  ```typescript
  // PRZED (obecnie):
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  // PO (docelowo):
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
    }),
  });
  ```

- **Struktura komponentu**:
  - Pola: email (autofocus), password (z PasswordField), rememberMe
  - Loading state podczas logowania (disable form + spinner na przycisku)
  - Error handling z toast notifications
  - Inline validation errors pod polami
  - Link do rejestracji w CardFooter

##### B. RegisterForm

- **Plik**: `src/components/auth/RegisterForm.tsx`
- **Status**: ✅ Zaimplementowany, wymaga modyfikacji
- **Obecna implementacja**:
  - Używa `react-hook-form` z `zodResolver`
  - Walidacja przez `registerFormSchema`
  - Bezpośrednie wywołanie `supabaseClient.auth.signUp()`
  - Auto-login po rejestracji przez `signInWithPassword()`
  - Password strength indicator (Progress bar + tekst)
  - Client-side sprawdzanie autentykacji w `useEffect`
- **Wymagane modyfikacje**:

  ```typescript
  // PRZED (obecnie):
  const { data, error } = await supabaseClient.auth.signUp({
    email: values.email,
    password: values.password,
  });
  // następnie auto-login...

  // PO (docelowo):
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
    }),
  });
  // Backend wykona rejestrację + auto-login
  ```

- **Struktura komponentu**:
  - Pola: email (autofocus), password (z PasswordField + strength indicator), rememberMe
  - Password requirements list (widoczny stale)
  - Loading state podczas rejestracji
  - Error handling z toast notifications
  - Link do logowania w CardFooter

##### C. PasswordField

- **Plik**: `src/components/auth/PasswordField.tsx`
- **Status**: ✅ Zaimplementowany, nie wymaga zmian
- **Funkcjonalność**:
  - Input type="password" z przyciskiem show/hide
  - Ikony Eye/EyeOff z lucide-react
  - Proper ARIA labels dla accessibility
  - Forward ref dla integracji z react-hook-form

#### 1.2.2 Wspólne Komponenty Layout

##### A. HeaderNav

- **Plik**: `src/components/layout/HeaderNav.tsx`
- **Status**: ✅ Zaimplementowany
- **Odpowiedzialność**: Główna nawigacja dla zalogowanych użytkowników
- **Funkcjonalność**:
  - Pobiera dane użytkownika z `supabaseClient.auth.getUser()`
  - Wyświetla nawigację: Dashboard, History, Admin (conditional)
  - Wyświetla email użytkownika
  - Przycisk Sign Out
- **Modyfikacje wymagane**:
  - Zmienić logout na wywołanie `/api/auth/logout` endpoint
  - Dodać error handling dla nieudanego wylogowania

### 1.3 Walidacja i Obsługa Błędów

#### 1.3.1 Schematy Walidacji (Zod)

##### A. loginFormSchema

- **Plik**: `src/lib/validation/ui/loginForm.schema.ts`
- **Status**: ✅ Zaimplementowany
- **Pola**:
  ```typescript
  {
    email: string (email format),
    password: string (min 8 chars),
    rememberMe: boolean (default true)
  }
  ```

##### B. registerFormSchema

- **Plik**: `src/lib/validation/ui/registerForm.schema.ts`
- **Status**: ✅ Zaimplementowany
- **Pola**:
  ```typescript
  {
    email: string (email format),
    password: string (min 8 + regex letter + regex number),
    rememberMe: boolean (default true)
  }
  ```
- **Funkcja pomocnicza**: `calculatePasswordStrength(password)` → zwraca { strength, percentage }

#### 1.3.2 Komunikaty Błędów

##### A. Błędy Walidacji (Inline)

Wyświetlane pod polem formularza z rolą `alert`:

- **Email**:
  - "Please enter a valid email address" (format email nieprawidłowy)
- **Password (Login)**:
  - "Password must be at least 8 characters"
- **Password (Register)**:
  - "Password must be at least 8 characters"
  - "Password must contain at least one letter"
  - "Password must contain at least one number"

##### B. Błędy Systemowe (Toast)

Wyświetlane przez `toast.error()`:

- **Login**:
  - "Invalid email or password" (401 z backend lub auth error)
  - "An error occurred during login. Please try again." (catch block)
- **Register**:
  - "An account with this email already exists" (409 lub Supabase error)
  - "Failed to create account. Please try again." (inne błędy)
  - "Account created, but failed to sign in. Please try signing in manually." (auto-login failed)
  - "An error occurred during registration. Please try again." (catch block)
- **Logout**:
  - "Failed to sign out. Please try again." (error w HeaderNav)

##### C. Komunikaty Sukcesu (Toast)

- **Register**: "Account created successfully!" (przed redirect)

### 1.4 Kluczowe Scenariusze UX

#### 1.4.1 Scenariusz: Nowy Użytkownik - Rejestracja

**Krok 1**: Użytkownik wchodzi na `/` (landing page)

- Widzi przycisk "Get Started"
- Klika → przekierowanie `/register`

**Krok 2**: Strona rejestracji `/register`

- Formularz z polami: email, password, rememberMe (checked)
- Podczas wpisywania hasła: password strength indicator aktualizuje się
- Password requirements list widoczna cały czas
- Walidacja inline po blur/change

**Krok 3**: Submit formularza

- Przycisk zmienia się na "Creating account..." (disabled)
- Formularz disabled
- Wywołanie `POST /api/auth/register`

**Krok 4a**: Sukces

- Toast: "Account created successfully!"
- Automatyczne ustawienie sesji (backend zwraca tokens)
- Redirect `window.location.href = "/dashboard"`

**Krok 4b**: Błąd (email już istnieje)

- Toast: "An account with this email already exists"
- Formularz enabled
- Focus na pole email

**Krok 4c**: Błąd (network/server)

- Toast: "An error occurred during registration. Please try again."
- Formularz enabled

#### 1.4.2 Scenariusz: Powracający Użytkownik - Logowanie

**Krok 1**: Użytkownik wchodzi na `/login`

- Jeśli zalogowany: automatyczny redirect `/dashboard` (server-side w middleware)
- Jeśli niezalogowany: formularz logowania

**Krok 2**: Wypełnienie formularza

- Email (autofocus), password
- Remember me zaznaczone domyślnie
- Inline validation

**Krok 3**: Submit

- Przycisk: "Signing in..." (disabled)
- Wywołanie `POST /api/auth/login`

**Krok 4a**: Sukces

- Sesja ustawiona (cookies/localStorage zależnie od rememberMe)
- Redirect `/dashboard`

**Krok 4b**: Błąd (nieprawidłowe dane)

- Toast: "Invalid email or password"
- Formularz enabled
- Focus na pole email

#### 1.4.3 Scenariusz: Wylogowanie

**Krok 1**: Użytkownik w aplikacji klika "Sign Out" w HeaderNav

- Przycisk disabled, loading state

**Krok 2**: Wywołanie endpoint

- `POST /api/auth/logout`
- Sukcesywne usunięcie sesji

**Krok 3**: Redirect

- `window.location.href = "/login"`

#### 1.4.4 Scenariusz: Próba Dostępu do Chronionej Strony

**Krok 1**: Niezalogowany użytkownik próbuje wejść na `/dashboard`

**Krok 2**: Middleware wykrywa brak sesji

- Redirect: `return Astro.redirect("/login")`
- Opcjonalnie: query param `?redirect=/dashboard`

**Krok 3**: Po zalogowaniu

- Jeśli był redirect param: redirect tam
- Jeśli nie: redirect `/dashboard` (default)

---

## 2. ARCHITEKTURA BACKENDU

### 2.1 API Endpoints

#### 2.1.1 POST /api/auth/register

**Plik**: `src/pages/api/auth/register.ts` ❌ DO UTWORZENIA

**Odpowiedzialność**: Rejestracja nowego użytkownika + auto-login

**Request**:

```typescript
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "rememberMe": true
}
```

**Walidacja Input (Zod)**:

```typescript
const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/),
  rememberMe: z.boolean().default(true),
});
```

**Logika**:

1. Walidacja input przez Zod schema
2. Sprawdzenie czy email już istnieje (opcjonalne, Supabase to zrobi)
3. Wywołanie `supabase.auth.signUp({ email, password })`
4. Jeśli sukces: automatyczne logowanie `supabase.auth.signInWithPassword()`
5. Pobranie user data: `supabase.auth.getUser()`
6. Ustawienie sesji wyłącznie w httpOnly cookies (bez ekspozycji tokenów do JS):
   - Jeśli `rememberMe = true`: długotrwała sesja (refresh token w httpOnly cookie z Max-Age)
   - Jeśli `rememberMe = false`: sesyjny refresh token (usuwa się po zamknięciu przeglądarki)
7. Zapisanie zdarzenia w tabeli `events`: `user_registered`
8. Zwrócenie response z user data

**Response Success (201)**:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2025-02-01T10:00:00Z"
    },
    "session": {
      "access_token": "...",
      "refresh_token": "...",
      "expires_in": 3600
    }
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

**Response Errors**:

- `400 Bad Request`: Walidacja failed
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input data",
      "details": { "password": ["Password must contain at least one number"] }
    }
  }
  ```
- `409 Conflict`: Email już istnieje
  ```json
  {
    "error": {
      "code": "EMAIL_EXISTS",
      "message": "An account with this email already exists"
    }
  }
  ```
- `500 Internal Server Error`: Supabase error lub inny błąd serwera

**Headers Response**:

- Jeśli `rememberMe = true`: `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=...`
- Tokeny (access_token i refresh_token) ustawiane wyłącznie jako httpOnly cookies (nie zwracamy w body)

**Logging**:

- Info: "User registered successfully: {email}"
- Error: "Registration failed: {error}"

---

#### 2.1.2 POST /api/auth/login

**Plik**: `src/pages/api/auth/login.ts` ❌ DO UTWORZENIA

**Odpowiedzialność**: Logowanie użytkownika

**Request**:

```typescript
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "rememberMe": true
}
```

**Walidacja Input**:

```typescript
const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1), // nie sprawdzamy szczegółów, Supabase to zweryfikuje
  rememberMe: z.boolean().default(true),
});
```

**Logika**:

1. Walidacja input
2. Wywołanie `supabase.auth.signInWithPassword({ email, password })`
3. Jeśli błąd: zwróć 401 (nie ujawniaj szczegółów czy email/password nieprawidłowy)
4. Jeśli sukces: pobierz user `supabase.auth.getUser()`
5. Ustawienie sesji (jak w register, zależnie od `rememberMe`)
6. Zwrócenie response z user data

**Response Success (200)**:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "app_metadata": { "role": "user" }
    },
    "session": {
      "access_token": "...",
      "refresh_token": "...",
      "expires_in": 3600
    }
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

**Response Errors**:

- `400 Bad Request`: Walidacja failed
- `401 Unauthorized`: Nieprawidłowy email lub hasło
  ```json
  {
    "error": {
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid email or password"
    }
  }
  ```
- `500 Internal Server Error`

**Headers Response**:

- Set-Cookie dla refresh token (jeśli rememberMe)

**Logging**:

- Info: "User logged in: {email}"
- Error: "Login failed for: {email}"

---

#### 2.1.3 POST /api/auth/logout

**Plik**: `src/pages/api/auth/logout.ts` ❌ DO UTWORZENIA

**Odpowiedzialność**: Wylogowanie użytkownika

**Request**:

```typescript
POST /api/auth/logout
Authorization: Bearer {access_token}
```

Lub token z cookie jeśli używamy cookie-based sessions.

**Logika**:

1. Pobranie tokenu z header lub cookie
2. Wywołanie `supabase.auth.signOut()`
3. Usunięcie cookie z refresh token (jeśli używamy)
4. Zwrócenie sukcesu

**Response Success (204)**:

```
204 No Content
```

**Response Errors**:

- `401 Unauthorized`: Brak tokenu lub nieprawidłowy token
- `500 Internal Server Error`

**Headers Response**:

- `Set-Cookie: refresh_token=; Max-Age=0; HttpOnly; Secure` (usunięcie cookie)

**Logging**:

- Info: "User logged out: {userId}"

---

// 2.1.4 DELETE /api/account – poza zakresem MVP

### 2.2 Middleware i Ochrona Tras

#### 2.2.1 Middleware: src/middleware/index.ts

**Status**: ⚠️ Wymaga rozszerzenia

**Obecna implementacja**:

- Tworzy Supabase client z tokenem z Authorization header
- Dodaje `context.locals.supabase`

**Wymagane rozszerzenie**:

```typescript
// src/middleware/index.ts

import { createClient } from "@supabase/supabase-js";
import { defineMiddleware } from "astro:middleware";
import type { Database } from "../db/database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

// Publiczne trasy (nie wymagają autentykacji)
const PUBLIC_ROUTES = ["/", "/login", "/register"];

// Trasy API auth (nie wymagają autentykacji)
const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout", // pozwól zawsze wyczyścić cookies
];

// Trasy wymagające roli admin
const ADMIN_ROUTES = ["/admin"];

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  // Pobierz token z header lub cookie
  const authHeader = context.request.headers.get("authorization");
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

  // Jeśli brak w header, sprawdź cookie (dla session-based auth)
  if (!token) {
    const cookies = context.cookies;
    token = cookies.get("access_token")?.value;
  }

  // Utwórz Supabase client
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });

  context.locals.supabase = supabase;

  // Sprawdź czy trasa jest publiczna
  const isPublicRoute = PUBLIC_ROUTES.some((route) => (route === "/" ? pathname === "/" : pathname === route));
  const isPublicApiRoute = PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));

  if (isPublicRoute || isPublicApiRoute) {
    // Dla publicznych tras: jeśli użytkownik JEST zalogowany i próbuje wejść na /login lub /register,
    // przekieruj do /dashboard
    if ((pathname === "/login" || pathname === "/register") && token) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        return context.redirect("/dashboard");
      }
    }
    return next();
  }

  // Trasy chronione: wymaga autentykacji
  if (!token) {
    // Zapisz oryginalną ścieżkę w query param dla redirect po loginie
    return context.redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  // Weryfikuj token i pobierz użytkownika
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    // Token nieprawidłowy lub wygasły
    return context.redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  }

  // Sprawdź czy trasa wymaga admin
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  if (isAdminRoute) {
    const isAdmin = user.app_metadata?.role === "admin";
    if (!isAdmin) {
      // Użytkownik nie jest adminem
      return context.redirect("/dashboard"); // lub 403 page
    }
  }

  // Dodaj user do locals dla dostępu w Astro pages
  context.locals.user = user;

  return next();
});
```

**Typy Astro (src/env.d.ts)**:

```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    supabase: import("@supabase/supabase-js").SupabaseClient<import("./db/database.types").Database>;
    user?: import("@supabase/supabase-js").User;
  }
}
```

#### 2.2.2 Server-side Rendering w Stronach Astro

**Przykład: /dashboard**

```astro
---
// src/pages/dashboard.astro
import AuthenticatedLayout from "../layouts/AuthenticatedLayout.astro";
import DashboardView from "../components/dashboard/DashboardView";

// User jest dostępny z middleware
const user = Astro.locals.user;

// Opcjonalnie: dodatkowe server-side fetching
// const supabase = Astro.locals.supabase;
// const { data } = await supabase.from("sessions").select("*");
---

<AuthenticatedLayout title="Dashboard - Pull-Up Trainer">
  <DashboardView client:load user={user} />
</AuthenticatedLayout>
```

### 2.3 Serwisy Backendowe

#### 2.3.1 Auth Service

**Plik**: `src/lib/services/auth/authService.ts` ❌ DO UTWORZENIA

**Odpowiedzialność**: Centralizacja logiki autentykacji dla API endpoints

```typescript
// src/lib/services/auth/authService.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

export interface RegisterParams {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginParams {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    created_at: string;
    app_metadata?: Record<string, any>;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export class AuthService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async register(params: RegisterParams): Promise<AuthResponse> {
    // 1. Sign up
    const { data: signUpData, error: signUpError } = await this.supabase.auth.signUp({
      email: params.email,
      password: params.password,
    });

    if (signUpError) {
      throw new Error(signUpError.message);
    }

    // 2. Auto sign in
    const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (signInError) {
      throw new Error("Registration successful but auto-login failed");
    }

    if (!signInData.user || !signInData.session) {
      throw new Error("Failed to retrieve user data");
    }

    // 3. Log event (wywołanie insertEvent service)
    // await this.logEvent("user_registered", { userId: signInData.user.id });

    return {
      user: {
        id: signInData.user.id,
        email: signInData.user.email!,
        created_at: signInData.user.created_at,
        app_metadata: signInData.user.app_metadata,
      },
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_in: signInData.session.expires_in,
      },
    };
  }

  async login(params: LoginParams): Promise<AuthResponse> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error) {
      throw new Error("Invalid credentials");
    }

    if (!data.user || !data.session) {
      throw new Error("Failed to retrieve user data");
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        created_at: data.user.created_at,
        app_metadata: data.user.app_metadata,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
      },
    };
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw new Error("Logout failed");
    }
  }
}

// Factory function
export function createAuthService(supabase: SupabaseClient<Database>): AuthService {
  return new AuthService(supabase);
}
```

#### 2.3.2 Session Manager (Cookie Helper)

**Plik**: `src/lib/services/auth/sessionManager.ts` ❌ DO UTWORZENIA

**Odpowiedzialność**: Zarządzanie cookies dla sesji

```typescript
// src/lib/services/auth/sessionManager.ts

import type { AstroCookies } from "astro";

export interface SessionOptions {
  rememberMe: boolean;
}

export class SessionManager {
  constructor(private cookies: AstroCookies) {}

  setSession(accessToken: string, refreshToken: string, options: SessionOptions): void {
    // Access token (krócej ważny, można w cookie lub tylko w response)
    this.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: "strict",
      maxAge: 3600, // 1 godzina
      path: "/",
    });

    // Refresh token (dłużej ważny)
    if (options.rememberMe) {
      this.cookies.set("refresh_token", refreshToken, {
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60, // 30 dni
        path: "/",
      });
    } else {
      // Session cookie (usuwa się po zamknięciu przeglądarki)
      this.cookies.set("refresh_token", refreshToken, {
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "strict",
        path: "/",
      });
    }
  }

  clearSession(): void {
    this.cookies.delete("access_token", { path: "/" });
    this.cookies.delete("refresh_token", { path: "/" });
  }

  getAccessToken(): string | undefined {
    return this.cookies.get("access_token")?.value;
  }

  getRefreshToken(): string | undefined {
    return this.cookies.get("refresh_token")?.value;
  }
}

// Factory
export function createSessionManager(cookies: AstroCookies): SessionManager {
  return new SessionManager(cookies);
}
```

### 2.4 Walidacja i Obsługa Błędów Backend

#### 2.4.1 Request Validation Schemas

**Plik**: `src/lib/validation/api/authSchemas.ts` ❌ DO UTWORZENIA

```typescript
// src/lib/validation/api/authSchemas.ts

import { z } from "zod";

export const registerRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  rememberMe: z.boolean().default(true),
});

export const loginRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(true),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
```

#### 2.4.2 Error Response Helper

**Plik**: `src/lib/utils/apiResponse.ts` ❌ DO UTWORZENIA

```typescript
// src/lib/utils/apiResponse.ts

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface ApiSuccessResponse<T = any> {
  data: T;
  meta?: {
    requestId?: string;
    warnings?: Array<{ code: string; message: string }>;
  };
}

export function errorResponse(code: string, message: string, details?: Record<string, any>): Response {
  const statusCodes: Record<string, number> = {
    VALIDATION_ERROR: 400,
    INVALID_CREDENTIALS: 401,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    EMAIL_EXISTS: 409,
    INVALID_TOKEN: 400,
    INTERNAL_ERROR: 500,
  };

  const status = statusCodes[code] || 500;

  return new Response(
    JSON.stringify({
      error: { code, message, details },
    } as ApiErrorResponse),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function successResponse<T>(data: T, status: number = 200): Response {
  return new Response(
    JSON.stringify({
      data,
      meta: {
        requestId: crypto.randomUUID(),
      },
    } as ApiSuccessResponse<T>),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function validationErrorResponse(errors: Record<string, string[]>): Response {
  return errorResponse("VALIDATION_ERROR", "Invalid input data", errors);
}
```

#### 2.4.3 Error Handling w Endpoints

**Przykład implementacji endpoint**:

```typescript
// src/pages/api/auth/register.ts

import type { APIRoute } from "astro";
import { registerRequestSchema } from "@/lib/validation/api/authSchemas";
import { createAuthService } from "@/lib/services/auth/authService";
import { createSessionManager } from "@/lib/services/auth/sessionManager";
import { errorResponse, successResponse, validationErrorResponse } from "@/lib/utils/apiResponse";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    // 1. Parse request body
    const body = await request.json();

    // 2. Validate
    const validation = registerRequestSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      return validationErrorResponse(errors);
    }

    const { email, password, rememberMe } = validation.data;

    // 3. Call auth service
    const authService = createAuthService(locals.supabase);
    const result = await authService.register({ email, password, rememberMe });

    // 4. Set session cookies
    const sessionManager = createSessionManager(cookies);
    sessionManager.setSession(result.session.access_token, result.session.refresh_token, {
      rememberMe,
    });

    // 5. Return success
    return successResponse(result, 201);
  } catch (error: any) {
    console.error("Register error:", error);

    // Check for specific errors
    if (error.message.includes("already registered") || error.message.includes("already exists")) {
      return errorResponse("EMAIL_EXISTS", "An account with this email already exists");
    }

    return errorResponse("INTERNAL_ERROR", "An error occurred during registration");
  }
};
```

### 2.5 Konfiguracja Supabase Auth

#### 2.5.1 Auth Settings

**W Supabase Dashboard → Authentication → Settings**:

- Enable email confirmations: NO (dla MVP)
- Minimum password length: 8
- Password requirements: Enforce (letter + number checked in app)
- JWT expiry: 3600s (1 hour)
- Refresh token rotation: Enabled
- Session timeout: Configured via client

---

## 3. SYSTEM AUTENTYKACJI

### 3.1 Flow Autentykacji

#### 3.1.1 Rejestracja (Registration Flow)

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. User fills form
       │    POST /api/auth/register
       │    { email, password, rememberMe }
       ▼
┌─────────────────────────────────────────────────┐
│           API Endpoint (Astro)                  │
│  - Validate request (Zod)                       │
│  - Call AuthService.register()                  │
└──────────────────┬──────────────────────────────┘
                   │
                   │ 2. Service calls Supabase
                   ▼
┌─────────────────────────────────────────────────┐
│           AuthService                           │
│  - supabase.auth.signUp(email, password)        │
│  - supabase.auth.signInWithPassword()           │
│  - Return user + session                        │
└──────────────────┬──────────────────────────────┘
                   │
                   │ 3. Supabase creates user
                   ▼
┌─────────────────────────────────────────────────┐
│           Supabase Auth                         │
│  - Hash password (bcrypt)                       │
│  - Create user in auth.users                    │
│  - Generate JWT tokens                          │
│  - Return session                               │
└──────────────────┬──────────────────────────────┘
                   │
                   │ 4. Return to endpoint
                   ▼
┌─────────────────────────────────────────────────┐
│           API Endpoint                          │
│  - Set cookies (access_token, refresh_token)    │
│  - Return success response                      │
└──────────────────┬──────────────────────────────┘
                   │
                   │ 5. Response to browser
                   ▼
┌─────────────┐
│   Browser   │
│  - Save session                                 │
│  - Redirect to /dashboard                       │
└─────────────┘
```

#### 3.1.2 Logowanie (Login Flow)

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. POST /api/auth/login
       │    { email, password, rememberMe }
       ▼
┌─────────────────────────────────────────────────┐
│           API Endpoint                          │
│  - Validate request                             │
│  - Call AuthService.login()                     │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│           AuthService                           │
│  - supabase.auth.signInWithPassword()           │
│  - Verify credentials                           │
│  - Return user + session                        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│           Supabase Auth                         │
│  - Verify email + password hash                 │
│  - Generate new JWT tokens                      │
│  - Return session                               │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│           API Endpoint                          │
│  - Set cookies (zależnie od rememberMe)         │
│  - Return success                               │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────┐
│   Browser   │
│  - Redirect to /dashboard (or redirect param)   │
└─────────────┘
```

### 3.2 Zarządzanie Sesjami

#### 3.2.1 Token Storage Strategy

**Access Token** (krótkoterminowy, 1h):

- Przechowywany w httpOnly cookie: `access_token`
- Używany do autoryzacji żądań API
- Przesyłany automatycznie przez przeglądarkę
- Nie dostępny dla JavaScript (bezpieczeństwo)

**Refresh Token** (długoterminowy):

- Przechowywany w httpOnly cookie: `refresh_token`
- Lifetime zależny od `rememberMe`:
  - `true`: 30 dni (Max-Age: 2592000)
  - `false`: Session cookie (usuwa się po zamknięciu przeglądarki)
- Używany do odświeżania access token

**Cookie Attributes**:

```
HttpOnly: true        // Nie dostępny dla JS
Secure: true (prod)   // Tylko HTTPS
SameSite: Strict      // CSRF protection
Path: /               // Dostępny dla całej aplikacji
```

#### 3.2.2 Token Refresh Mechanism

**W Middleware** (opcjonalnie):

```typescript
// Jeśli access_token wygasł, ale refresh_token valid:
if (accessTokenExpired && refreshToken) {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (!error && data.session) {
    // Ustaw nowe tokeny w cookies
    sessionManager.setSession(data.session.access_token, data.session.refresh_token, { rememberMe: true });
  }
}
```

**Client-side**:

- UI nie zarządza tokenami – wyłącznie cookies httpOnly ustawiane przez backend

#### 3.2.3 Session Persistence

**Remember Me = true**:

- Refresh token ważny 30 dni
- Użytkownik pozostaje zalogowany przez 30 dni (lub do ręcznego wylogowania)
- Idealne dla użytkowników na prywatnych urządzeniach

**Remember Me = false**:

- Refresh token ważny tylko w sesji przeglądarki
- Wylogowanie po zamknięciu przeglądarki
- Idealne dla współdzielonych urządzeń

### 3.3 Bezpieczeństwo

#### 3.3.1 Password Hashing

- **Algorytm**: bcrypt (Supabase default)
- **Salt rounds**: Configured by Supabase (typically 10)
- **Hashing wykonywane przez**: Supabase Auth (server-side)
- **Hasła nigdy nie są przechowywane w plain text**

#### 3.3.2 Token Security

**JWT Tokens**:

- Podpisane przez Supabase Secret Key
- Zawierają: user_id, email, role, exp (expiry)
- Weryfikowane przy każdym żądaniu do API
- Nie można ich podrobić bez dostępu do secret key

**Ochrona przed atakami**:

- **XSS**: Tokeny w httpOnly cookies (nie dostępne dla JS)
- **CSRF**: SameSite=Strict + można dodać CSRF tokens
- **Session Hijacking**: Secure cookies (HTTPS only)
- **Brute Force**: Rate limiting (można dodać na poziomie API)

#### 3.3.3 Rate Limiting (Opcjonalne, do rozważenia)

**Na poziomie API Endpoints**:

```typescript
// Można użyć biblioteki np. @upstash/ratelimit lub własna implementacja

// Przykład:
// - Login: 5 prób na 15 minut per IP
// - Register: 3 próby na godzinę per IP
```

### 3.4 Environment Variables

**Wymagane zmienne w `.env`**:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NODE_ENV=development  # lub production
```

**Użycie**:

- `SUPABASE_URL` i `SUPABASE_KEY`: Do tworzenia client
- `SUPABASE_SERVICE_ROLE_KEY`: (rezerwa na operacje admin; usuwanie konta poza MVP)

### 3.5 Integracja z Istniejącą Aplikacją

#### 3.5.1 Modyfikacje w Istniejących Komponentach

**HeaderNav.tsx**:

```typescript
// ZMIANA: logout przez API endpoint
const handleSignOut = async () => {
  setIsLoading(true);
  try {
    // PRZED: await supabaseClient.auth.signOut();
    // PO:
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  } catch (error) {
    toast.error("Failed to sign out. Please try again.");
    setIsLoading(false);
  }
};
```

**LoginForm.tsx**:

```typescript
// ZMIANA: login przez API endpoint zamiast bezpośrednio Supabase
const onSubmit = async (values: LoginFormValues) => {
  setIsLoading(true);
  try {
    // PRZED: const { data, error } = await supabaseClient.auth.signInWithPassword(...)
    // PO:
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const error = await response.json();
      toast.error(error.error.message || "Invalid email or password");
      return;
    }

    // Sukces: cookies są ustawione automatycznie przez backend
    window.location.href = "/dashboard";
  } catch (error) {
    toast.error("An error occurred during login. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
```

**RegisterForm.tsx**:

```typescript
// ZMIANA: rejestracja przez API endpoint
const onSubmit = async (values: RegisterFormValues) => {
  setIsLoading(true);
  try {
    // PRZED: await supabaseClient.auth.signUp(...) + auto-login
    // PO:
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const error = await response.json();
      toast.error(error.error.message || "Failed to create account");
      return;
    }

    toast.success("Account created successfully!");
    window.location.href = "/dashboard";
  } catch (error) {
    toast.error("An error occurred during registration. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
```

// Ustawienia (Usunięcie konta) – poza MVP

#### 3.5.2 Nowe API Endpoints do Utworzenia

1. `src/pages/api/auth/register.ts`
2. `src/pages/api/auth/login.ts`
3. `src/pages/api/auth/logout.ts`
   // DELETE /api/account – poza MVP

#### 3.5.3 Nowe Serwisy do Utworzenia

1. `src/lib/services/auth/authService.ts`
2. `src/lib/services/auth/sessionManager.ts`

#### 3.5.4 Nowe Utility do Utworzenia

1. `src/lib/utils/apiResponse.ts`
2. `src/lib/validation/api/authSchemas.ts`

### 3.6 Testing Checklist

#### 3.6.1 Funkcjonalność

- [ ] Rejestracja nowego użytkownika (sukces)
- [ ] Rejestracja z istniejącym emailem (błąd)
- [ ] Logowanie z poprawnymi danymi (sukces)
- [ ] Logowanie z błędnym hasłem (błąd)
- [ ] Logowanie z nieistniejącym emailem (błąd)
- [ ] Wylogowanie (sukces)
- [ ] Redirect zalogowanego użytkownika z /login do /dashboard
- [ ] Redirect niezalogowanego z /dashboard do /login
- [ ] Remember me = true (sesja zachowana po zamknięciu przeglądarki)
- [ ] Remember me = false (sesja usunięta po zamknięciu)
- [ ] Admin access do /admin (user bez roli admin → redirect)

#### 3.6.2 Bezpieczeństwo

- [ ] Hasła są hashowane (nie widoczne w DB)
- [ ] Tokeny w httpOnly cookies (niedostępne dla JS)
- [ ] HTTPS tylko w production (Secure flag)
- [ ] SameSite=Strict dla cookies
- [ ] Password requirements enforced (8 chars, letter, number)
- [ ] Invalid credentials nie ujawnia czy email/password nieprawidłowy

#### 3.6.3 UX

- [ ] Password strength indicator działa
- [ ] Inline validation dla pól formularza
- [ ] Toast notifications dla błędów systemowych
- [ ] Loading states podczas operacji
- [ ] Disabled buttons podczas submit
- [ ] Auto-focus na pierwszym polu formularza
- [ ] Keyboard navigation (Tab order)
- [ ] Screen reader compatibility (ARIA labels)

---

## 4. PODSUMOWANIE I NASTĘPNE KROKI

### 4.1 Komponenty do Zaimplementowania

#### 4.1.1 Frontend (React Components)

1. ✅ LoginForm - zmodyfikować (API endpoint zamiast Supabase direct)
2. ✅ RegisterForm - zmodyfikować (API endpoint zamiast Supabase direct)
3. ✅ PasswordField - bez zmian

#### 4.1.2 Frontend (Astro Pages)

1. ✅ `/` - landing page - bez zmian (opcjonalnie server-side redirect)
2. ✅ `/login` - bez zmian
3. ✅ `/register` - bez zmian

#### 4.1.3 Backend (API Endpoints)

1. ❌ `POST /api/auth/register` - utworzyć
2. ❌ `POST /api/auth/login` - utworzyć
3. ❌ `POST /api/auth/logout` - utworzyć

#### 4.1.4 Backend (Services)

1. ❌ `AuthService` - utworzyć
2. ❌ `SessionManager` - utworzyć

#### 4.1.5 Backend (Validation)

1. ❌ API schemas - utworzyć

#### 4.1.6 Backend (Utils)

1. ❌ `apiResponse` helpers - utworzyć

#### 4.1.7 Middleware

1. ⚠️ `src/middleware/index.ts` - rozszerzyć (route protection, redirect logic)

### 4.2 Kolejność Implementacji (Rekomendowana)

**Faza 1: Backend Foundation**

1. Utworzyć `apiResponse.ts` helpers
2. Utworzyć API validation schemas (`authSchemas.ts`)
3. Utworzyć `SessionManager`
4. Utworzyć `AuthService`

**Faza 2: API Endpoints**

1. `POST /api/auth/register` (z testowaniem)
2. `POST /api/auth/login` (z testowaniem)
3. `POST /api/auth/logout` (z testowaniem)

**Faza 3: Middleware Enhancement**

1. Rozszerzyć middleware o route protection
2. Dodać redirect logic dla zalogowanych/niezalogowanych
3. Dodać admin role check

**Faza 4: Frontend Updates**

1. Zmodyfikować `LoginForm` (użycie API endpoint)
2. Zmodyfikować `RegisterForm` (użycie API endpoint)
3. Zmodyfikować `HeaderNav` (logout przez API)

**Faza 5: Testing & Polish**

1. Manual testing całego flow
2. Security testing (cookies, tokens, etc.)
3. Accessibility testing (keyboard, screen reader)
4. Edge cases (network errors, etc.)

### 4.3 Konfiguracja External Services

**Supabase Dashboard**:

1. Skonfigurować Auth settings (JWT expiry, password requirements)
2. Opcjonalnie: Rate limiting policies

**Environment Variables**:

1. Sprawdzić `SUPABASE_URL` i `SUPABASE_KEY`

### 4.4 Dokumentacja

**Do zaktualizowania**:

1. README.md - dodać sekcję "Authentication"
2. API documentation - dodać auth endpoints
3. Environment variables example (.env.example)

### 4.5 Potencjalne Ulepszenia (Post-MVP)

1. **Forgot Password / Reset Password**: Pełny flow resetowania hasła z emailem i tokenem
2. **Email Verification**: Opcjonalnie wymagać weryfikacji emaila po rejestracji
3. **OAuth Providers**: Dodać Google/Apple sign-in
4. **2FA**: Two-factor authentication
5. **Rate Limiting**: Implementacja na poziomie aplikacji
6. **Session Management UI**: Strona z aktywnymi sesjami + możliwość wylogowania z innych urządzeń
7. **Password Change**: Zmiana hasła w ustawieniach (bez resetu)
8. **Account Deletion**: Usunięcie konta w ustawieniach
9. **Audit Log**: Historia logowań użytkownika

---

## Koniec Specyfikacji

Specyfikacja zawiera wszystkie niezbędne informacje do implementacji pełnego systemu autentykacji zgodnego z wymaganiami PRD, API Plan i UI Plan, przy użyciu stack'u technologicznego (Astro 5, React 19, TypeScript 5, Supabase Auth).

Główne założenia MVP:

- **UI nie łączy się bezpośrednio z Supabase** - wszystkie operacje autentykacji przez API endpoints
- **Server-side route protection** - middleware sprawdza autentykację przed renderowaniem stron
- **Secure session management** - httpOnly cookies, proper token handling
- **Remember me functionality** - długotrwałe sesje dla zaufanych urządzeń
- **Accessibility & UX first** - inline validation, toast notifications, loading states, keyboard navigation
