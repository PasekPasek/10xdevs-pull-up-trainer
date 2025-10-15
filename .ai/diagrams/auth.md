<authentication_analysis>
- Przepływy autentykacji (wg PRD i spec):
  1) Rejestracja: Browser → API → Supabase (signUp → auto signIn) → API
     ustawia httpOnly cookies → redirect do `dashboard`.
  2) Logowanie: Browser → API → Supabase (signInWithPassword) → API ustawia
     httpOnly cookies → redirect do `dashboard`.
  3) Dostęp do stron chronionych: Browser → Middleware weryfikuje `access_token`
     (cookies lub Authorization), przy braku/wygaśnięciu → próba odświeżenia z
     `refresh_token`, inaczej redirect do `login?redirect=...`.
  4) Odświeżanie tokenu: Middleware używa `refresh_token` do
     `auth.refreshSession`, ustawia nowe cookies i kontynuuje żądanie.
  5) Wylogowanie: Browser → API → Supabase (signOut), API czyści cookies,
     Browser przechodzi do `login`.
  6) Sprawdzenie roli admin: Middleware po `getUser()` sprawdza `app_metadata`;
     brak uprawnień → redirect do `dashboard`.

- Główni aktorzy i interakcje:
  - Przeglądarka (Browser): wysyła żądania, trzyma cookies (httpOnly),
    wykonuje redirecty po sukcesie/błędzie.
  - Middleware: weryfikuje sesję na SSR, odświeża tokeny, egzekwuje dostęp
    do tras i ról.
  - Astro API (API): waliduje wejście (Zod), woła Supabase Auth, ustawia/usuwa
    cookies (SessionManager), zwraca odpowiedzi.
  - Supabase Auth (Auth): rejestracja, logowanie, wylogowanie, `getUser()`,
    `refreshSession()`.

- Weryfikacja i odświeżanie tokenów:
  - `access_token` (ok. 1h) + `refresh_token` (30 dni przy rememberMe=true,
    sesyjny przy rememberMe=false) przechowywane w httpOnly cookies:
    Secure (prod), SameSite=Strict, Path=/.
  - Middleware preferuje Authorization Bearer, w przeciwnym razie odczytuje
    `access_token` z cookies; gdy wygasł, używa `refresh_token`.

- Opis kroków (skrót):
  - Rejestracja/Logowanie: API po sukcesie ustawia cookies i zwraca 201/200;
    Browser przechodzi na `dashboard` → Middleware potwierdza sesję.
  - Dostęp: Middleware przepuszcza żądanie, jeśli `getUser()` OK; gdy nie, próba
    `refreshSession()`, albo redirect do `login` z param `redirect`.
  - Wylogowanie: API woła `signOut()`, czyści cookies, Browser ląduje na `login`.
</authentication_analysis>

<mermaid_diagram>
```mermaid
sequenceDiagram
autonumber
participant Browser as Przeglądarka
participant Middleware as Middleware
participant API as Astro API
participant Auth as Supabase Auth

Note over Browser,Middleware: Aplikacja: Astro + React + Supabase Auth
Note over Browser,API: Cookies httpOnly: access_token, refresh_token

alt Akcja: Rejestracja
  Browser->>API: POST register {email, password, rememberMe}
  activate API
  API->>Auth: signUp(email, password)
  activate Auth
  Auth-->>API: użytkownik utworzony
  deactivate Auth
  API->>Auth: signInWithPassword(email, password)
  activate Auth
  Auth-->>API: {access_token, refresh_token}
  deactivate Auth
  API->>API: Ustaw cookies (SessionManager)
  API-->>Browser: 201 Sukces
  deactivate API
  Browser->>Middleware: GET dashboard (z cookies)
  activate Middleware
  Middleware->>Auth: getUser(access_token)
  activate Auth
  Auth-->>Middleware: user OK
  deactivate Auth
  Middleware-->>Browser: Kontynuuj render
  deactivate Middleware
else Akcja: Logowanie
  Browser->>API: POST login {email, password, rememberMe}
  activate API
  API->>Auth: signInWithPassword(email, password)
  activate Auth
  Auth-->>API: {access_token, refresh_token}
  deactivate Auth
  API->>API: Ustaw cookies (SessionManager)
  API-->>Browser: 200 Sukces
  deactivate API
  Browser->>Middleware: GET dashboard (z cookies)
  activate Middleware
  Middleware->>Auth: getUser(access_token)
  activate Auth
  Auth-->>Middleware: user OK
  deactivate Auth
  Middleware-->>Browser: Kontynuuj render
  deactivate Middleware
end

Note over Browser,API: rememberMe=true → refresh 30 dni; false → sesyjny

Note over Browser,Middleware: Dostęp do strony chronionej
Browser->>Middleware: GET protected (z cookies)
activate Middleware
Middleware->>Auth: getUser(access_token)
activate Auth
Auth-->>Middleware: błąd: token wygasł
deactivate Auth
alt Access token wygasł i refresh dostępny
  Middleware->>Auth: refreshSession(refresh_token)
  activate Auth
  Auth-->>Middleware: nowe tokeny
  deactivate Auth
  Middleware->>Middleware: Ustaw nowe cookies
  Middleware-->>Browser: Kontynuuj
else Brak refresh lub odświeżanie nieudane
  Middleware-->>Browser: Redirect do login?redirect=...
end
deactivate Middleware

Note over Browser,Middleware: Dostęp do /admin z weryfikacją roli
Browser->>Middleware: GET admin (z cookies)
activate Middleware
Middleware->>Auth: getUser(access_token)
activate Auth
Auth-->>Middleware: user z app_metadata
deactivate Auth
alt Rola admin
  Middleware-->>Browser: Kontynuuj
else Brak uprawnień
  Middleware-->>Browser: Redirect do dashboard
end
deactivate Middleware

Note over Browser,API: Wylogowanie
Browser->>API: POST logout
activate API
API->>Auth: signOut()
activate Auth
Auth-->>API: ok
deactivate Auth
API->>API: Wyczyść cookies
API-->>Browser: 204 No Content
deactivate API
Browser->>Middleware: GET login
Middleware-->>Browser: Strona logowania
```
</mermaid_diagram>


