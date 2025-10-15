<architecture_analysis>

1) Lista komponentów i elementów (wg PRD i auth-spec + kodu):
- Strony publiczne: `src/pages/index.astro`, `src/pages/login.astro`, `src/pages/register.astro`
- Strony chronione: `src/pages/dashboard.astro`, `src/pages/history.astro`, `src/pages/sessions/*.astro`, `src/pages/admin.astro`
- Layouty: `src/layouts/Layout.astro`, `src/layouts/AuthenticatedLayout.astro`
- Komponenty React (auth): `src/components/auth/LoginForm.tsx`, `src/components/auth/RegisterForm.tsx`, `src/components/auth/PasswordField.tsx`
- Komponent layoutu/nawigacji: `src/components/layout/HeaderNav.tsx`
- Walidacja UI (Zod): `src/lib/validation/ui/loginForm.schema.ts`, `src/lib/validation/ui/registerForm.schema.ts`
- Provider i UI pomocnicze: `src/lib/providers/QueryClientProvider.tsx`, `src/components/ui/sonner` (Toaster)
- Middleware: `src/middleware/index.ts`
- Supabase client: `src/db/supabase.client.ts`
- (Do utworzenia) API auth: `src/pages/api/auth/register.ts`, `src/pages/api/auth/login.ts`, `src/pages/api/auth/logout.ts`
- (Do utworzenia) Serwisy backend: `src/lib/services/auth/authService.ts`, `src/lib/services/auth/sessionManager.ts`
- (Do utworzenia) Walidacja API i helpery: `src/lib/validation/api/authSchemas.ts`, `src/lib/utils/apiResponse.ts`

2) Główne strony i powiązane komponenty:
- `/login` → `Layout.astro` + `LoginForm` + `Toaster` (+ `QueryClientProvider` jako wyspa)
- `/register` → `Layout.astro` + `RegisterForm` (z `PasswordField`, wskaźnik siły hasła) + `Toaster` (+ `QueryClientProvider`)
- `/dashboard` → `AuthenticatedLayout.astro` (z `HeaderNav`) + widok treści (np. `DashboardView`)
- `/history`, `/sessions/*`, `/admin` → `AuthenticatedLayout.astro` (z `HeaderNav`) + odpowiednie widoki

3) Przepływ danych (stan docelowy po wdrożeniu specyfikacji):
- Login/Rejestracja: `LoginForm`/`RegisterForm` → (POST) API Login/Register → `AuthService` (Supabase) → `SessionManager` ustawia `access_token` + `refresh_token` w httpOnly cookies → przeglądarka → `middleware` czyta cookies i weryfikuje → `Astro.locals.user` dostępny na stronach chronionych.
- Wylogowanie: `HeaderNav` → (POST) API Logout → `AuthService.signOut()` → `SessionManager.clearSession()` → redirect do `/login`.
- Ochrona tras i SSR: `middleware` przepuszcza `/`, `/login`, `/register`; zalogowanych z `/login|/register` przekierowuje do `/dashboard`; niezalogowanych z tras chronionych przekierowuje do `/login` (z `?redirect=`).
- Walidacja UI: `loginForm.schema.ts` i `registerForm.schema.ts` zapewniają inline validation; toasty błędów/sukcesu przez `sonner`.

4) Krótki opis kluczowych elementów:
- `LoginForm`: formularz logowania (email, password, rememberMe), docelowo wysyła do API Login.
- `RegisterForm`: rejestracja + auto-login, docelowo przez API Register; wskaźnik siły hasła.
- `PasswordField`: współdzielony input hasła (show/hide, ARIA).
- `HeaderNav`: nawigacja zalogowanego; wylogowanie przez API Logout.
- `AuthenticatedLayout`: layout stron chronionych, osadza `HeaderNav`.
- `middleware/index.ts`: weryfikuje sesję (cookies/Authorization), ustawia `locals.supabase` i `locals.user`, wykonuje redirecty.
- `AuthService` (backend): centralizuje wywołania `supabase.auth.*` (signUp/signIn/signOut).
- `SessionManager` (backend): zarządzanie httpOnly cookies (`access_token`, `refresh_token`, Max-Age wg `rememberMe`).
- `authSchemas` (API): Zod schematy requestów do API auth.
- `apiResponse` (API): spójne helpery odpowiedzi (success/error/validation).

Wyróżnienia (wymagają aktualizacji/utworzenia): `LoginForm`, `RegisterForm`, `HeaderNav`, `middleware/index.ts`, API auth, `AuthService`, `SessionManager`, `authSchemas`, `apiResponse`.

</architecture_analysis>

<mermaid_diagram>
```mermaid
flowchart TD

%% Klasy stylów
classDef needsUpdate fill:#FFF4D6,stroke:#D97706,stroke-width:2px;
classDef api fill:#E0F2FE,stroke:#0369A1,stroke-width:1px;
classDef middleware fill:#F1F5F9,stroke:#334155,stroke-width:1px;
classDef service fill:#DCFCE7,stroke:#16A34A,stroke-width:1px;
classDef shared fill:#F3E8FF,stroke:#6D28D9,stroke-width:1px;
classDef page fill:#FFFFFF,stroke:#64748B,stroke-width:1px;

%% Warstwa UI — Public
subgraph UI_Public["Warstwa UI — Public"]
  direction TB
  Page_Index["/ (index.astro)"]:::page
  Page_Login["/login (login.astro)"]:::page
  Comp_LoginForm["LoginForm (React)"]:::needsUpdate
  Page_Register["/register (register.astro)"]:::page
  Comp_RegisterForm["RegisterForm (React)"]:::needsUpdate
  Comp_PasswordField["PasswordField (współdzielony)"]:::shared
  UI_Sonner["Toaster (sonner)"]:::shared
  Provider_QueryClient["QueryClientProvider"]:::shared
end

%% Warstwa UI — Chronione
subgraph UI_Secured["Warstwa UI — Chronione"]
  direction TB
  Layout_Auth["AuthenticatedLayout.astro"]:::page
  Comp_HeaderNav["HeaderNav (React)"]:::needsUpdate
  Page_Dashboard["/dashboard (dashboard.astro)"]:::page
  Page_History["/history (history.astro)"]:::page
  Page_Sessions["/sessions/* (.astro)"]:::page
  Page_Admin["/admin (admin.astro)"]:::page
end

%% Walidacja/UI pomocnicze (frontend)
subgraph Frontend_State_Validation["Stan i Walidacja (Frontend)"]
  direction TB
  Valid_LoginSchema["loginForm.schema.ts"]:::shared
  Valid_RegisterSchema["registerForm.schema.ts"]:::shared
end

%% API — Auth (do utworzenia)
subgraph API_Auth["API — Autentykacja"]
  direction TB
  API_Login["API Login"]:::api
  API_Register["API Register"]:::api
  API_Logout["API Logout"]:::api
end

%% Serwisy backend (do utworzenia)
subgraph Backend_Services["Serwisy Backendowe"]
  direction TB
  Service_Auth["AuthService"]:::service
  Service_Session["SessionManager"]:::service
  Util_ApiResponse["apiResponse (helpers)"]:::service
  Val_ApiSchemas["authSchemas (Zod)"]:::service
end

%% Middleware/SSR
subgraph SSR_MW["Middleware i SSR"]
  direction TB
  MW_Main["middleware/index.ts"]:::middleware
  MW_Redirects["Redirecty/ochrona tras"]:::middleware
  Locals_User["Astro.locals.user"]:::middleware
end

%% Supabase i Cookies
Supabase["Supabase Auth"]:::service
Cookie_AT["Cookie access_token (httpOnly)"]:::shared
Cookie_RT["Cookie refresh_token (httpOnly)"]:::shared

%% Powiązania UI (public)
Comp_PasswordField --- Comp_LoginForm
Comp_PasswordField --- Comp_RegisterForm
Valid_LoginSchema -. "walidacja" .-> Comp_LoginForm
Valid_RegisterSchema -. "walidacja" .-> Comp_RegisterForm
UI_Sonner --- Comp_LoginForm
UI_Sonner --- Comp_RegisterForm
Provider_QueryClient --- Comp_LoginForm
Provider_QueryClient --- Comp_RegisterForm

%% Struktura UI chronionego
Page_Dashboard --> Layout_Auth --> Comp_HeaderNav
Page_History --> Layout_Auth
Page_Sessions --> Layout_Auth
Page_Admin --> Layout_Auth

%% Przepływ auth: UI -> API
Comp_LoginForm -- "POST {email, password, rememberMe}" --> API_Login
Comp_RegisterForm -- "POST {email, password, rememberMe}" --> API_Register
Comp_HeaderNav -- "POST (logout)" --> API_Logout

%% API -> Serwisy -> Supabase
API_Login ==> Service_Auth
API_Register ==> Service_Auth
API_Logout ==> Service_Auth
Service_Auth --> Supabase

%% Ustawianie i użycie cookies sesyjnych
API_Login --> Service_Session
API_Register --> Service_Session
Service_Session --> Cookie_AT
Service_Session --> Cookie_RT
Cookie_AT -. "wysyłane automatycznie" .-> MW_Main
Cookie_RT -. "odświeżanie sesji" .-> MW_Main

%% Middleware i SSR
MW_Main --> Locals_User
MW_Main --> MW_Redirects
MW_Redirects -- "/login|/register → zalogowany" --> Page_Dashboard
MW_Redirects -- "chronione bez sesji → /login" --> Page_Login

%% Wyróżnienia elementów do modyfikacji/utworzenia
class Comp_LoginForm,Comp_RegisterForm,Comp_HeaderNav,MW_Main needsUpdate
class API_Login,API_Register,API_Logout,Service_Auth,Service_Session,Util_ApiResponse,Val_ApiSchemas needsUpdate
```
</mermaid_diagram>
