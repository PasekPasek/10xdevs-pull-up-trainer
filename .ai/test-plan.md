## Plan testów dla projektu 10xdevs Pull-up Trainer

### 1. Wprowadzenie i cele testowania
- **Cel**: zapewnić wysoką jakość produktu w obszarach poprawności funkcjonalnej, bezpieczeństwa (autentykacja, RLS), integralności danych (ETag/optimistic locking, transakcje), niezawodności integracji AI (OpenRouter), wydajności oraz użyteczności UI.
- **Zakres**: UI (Astro/React), API (Astro API routes), warstwa pośrednia (`src/middleware/index.ts`), integracja z Supabase (DB, RLS) i OpenRouter, logika domenowa sesji (CRUD, zmiany statusów, generacje AI), zdarzenia/metryki.
- **Metryki jakości**: pokrycie testami, brak defektów P0/P1, budżety wydajności, brak wycieków PII, dostępność WCAG AA.

### 2. Zakres testów
- **Frontend (React 19 + Astro 5 + Tailwind 4 + shadcn/ui)**: widoki `dashboard`, `history`, `sessions`, `admin`; komponenty dialogów (`SessionCompleteDialog`, `ETagConflictDialog`, `ConfirmActionDialog`, kreator AI), integracja z React Query i toasty.
- **Backend/API (Astro pages api)**: `src/pages/api/auth/**`, `src/pages/api/sessions/**`, `src/pages/api/sessions/ai/**`; walidacje (Zod), kody statusów, nagłówki (`ETag`, `Cache-Control: no-store`), kontrakty DTO.
- **Middleware**: `src/middleware/index.ts` – ochrona tras SSR, redirecty, kontrola ról admin.
- **Supabase**: `src/db/supabase.server.ts`, `src/db/supabase.client.ts`, typy `src/db/database.types.ts`, zasady RLS, migracje `supabase/migrations/**`.
- **AI**: `src/lib/services/ai/generateSession.ts`, `src/lib/services/ai/openrouter.ts` – limity, scenariusze nowy/istniejący użytkownik, mapowanie błędów, clamp wartości serii.
- **Zdarzenia i logi**: tabele `events`, `generations`, `error_logs` – poprawność wpisów i spójność korelacji.

### 3. Typy testów do przeprowadzenia
- **Jednostkowe (Vitest)**: funkcje pomocnicze (`src/lib/utils/**`), normalizacja i mapowanie DTO, logika budowania promptów AI i clamp repów, selektory React Query, utilsy dat.
- **Integracyjne API (Vitest + fetch/request + MSW/Nock)**: pełne ścieżki `src/pages/api/**` z uruchomionym middleware (lub kontrolowany stub), walidacja wejścia/wyjścia, nagłówki, stany błędów, kontrakty DTO.
- **E2E (Playwright)**: przepływy użytkownika (rejestracja, logowanie, dashboard, generowanie AI, edycja z konfliktem ETag, historia, usuwanie), w macierzy przeglądarek i viewportów.
- **Bezpieczeństwo**: testy autoryzacji/redirectów, kontrola ról admin, RLS (dostęp do rekordów tylko właściciela), brak PII w błędach.
- **Wydajność**: Lighthouse (TTFB, LCP, CLS) dla SSR stron kluczowych; testy czasów odpowiedzi API (z mockiem OpenRouter) i percentyle.
- **Niezawodność/odporność**: time-outy, retry, błędy sieci, awarie OpenRouter, konflikty ETag (race conditions), wznawianie operacji.
- **Dostępność i wizualne**: axe-core dla komponentów dialogów i kluczowych widoków; regresja wizualna.
- **Testy migracji/DB**: stosowanie migracji, poprawność indeksów/triggerów, wymuszenie RLS.

### 4. Scenariusze testowe dla kluczowych funkcjonalności

#### 4.1 Autentykacja i middleware (`src/middleware/index.ts`, `src/pages/api/auth/**`)
- **Publiczne trasy**: `/`, `/login`, `/register` bez sesji – dostęp; z aktywną sesją – redirect do `/dashboard`.
- **Publiczne API**: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` – dostępne bez sesji.
- **Trasy chronione**:
  - Strony: brak sesji → redirect do `login?redirect=...`.
  - API: brak sesji → 401 JSON z `Cache-Control: no-store`.
- **Inicjalizacja SSR Supabase**: `createSupabaseServerInstance` osadza klienta i `locals.user`.
- **Rola admin**: `/admin` – wymaga `app_metadata.role=admin`; brak → 403 (API) lub redirect do `/dashboard` (strona).
- **Login/Register**:
  - Walidacja Zod błędnych danych → 400 `VALIDATION_ERROR`.
  - Poprawne dane → 200/201, ustawienie httpOnly cookies, odpowiedź `data.user`, `meta.requestId`.
  - Błędy auth (złe hasło, istniejący email) → właściwe mapowanie błędów bez PII.

#### 4.2 Sesje – API (`src/pages/api/sessions/**`)
- **GET `/api/sessions`**: paginacja, `pageSize ≤ 50`, filtry statusów (pojedyncze/wielokrotne), zakres dat, sort; błędne parametry → 400 `INVALID_QUERY`; wyniki tylko właściciela (RLS).
- **POST `/api/sessions`**: walidacja `createSessionSchema`; 201 z `ETag` (jeśli `updatedAt`) i `Cache-Control: no-store`.
- **GET `/api/sessions/:id`**: 200 + detail DTO + `ETag: "updatedAt"`; złe UUID → 400; brak sesji → 401; cudzy/nieistniejący rekord → 404 (RLS).
- **PATCH `/api/sessions/:id`**:
  - Brak `If-Match` → 428 `PRECONDITION_REQUIRED`.
  - Niezgodny `If-Match` → konflikt (412/409) i brak zapisu.
  - Zgodny → 200 i nowy `ETag`.
- **Akcje stanu**: `/start`, `/complete`, `/fail` – poprawne przejścia: `planned → in_progress → completed|failed`; błędne przejścia → 409 `INVALID_STATE_TRANSITION`.
- **DELETE `/api/sessions/:id`**: 204; cudzy rekord → 404 (RLS).
- **Nagłówki**: wszędzie `Cache-Control: no-store`.

#### 4.3 Generowanie AI (`/api/sessions/ai`, `src/lib/services/ai/generateSession.ts`, `src/lib/services/ai/openrouter.ts`)
- **Limity/kwoty**: `getQuota` – `remaining=0` → 403 `AI_LIMIT_REACHED` z danymi okna.
- **Nowy użytkownik**: brak historii → wymagany `maxPullups`; brak → 400 `MAX_PULLUPS_REQUIRED`.
- **Istniejący użytkownik**: przekazanie historii (DTO) do OpenRouter w poprawnym formacie.
- **Trwałość danych**: utworzenie `sessions` + `generations` transakcyjnie; rollback na błędach tworzenia `generations`.
- **Mapowanie błędów**: `OpenRouterError` → adekwatne kody (np. 429/502) z `meta`, bez PII; problemy sieci/time-out → 502 `AI_NETWORK_ERROR`.
- **Normalizacja**: clamp `sets` do zakresu (0–60), `total_reps` spójny z sumą; `sessionDate` zgodny (dziś lub z parametru).
- **Zdarzenia/logi**: zapis do `events` i `error_logs` (przy błędach) zgodnie ze schematem.

#### 4.4 Dashboard i UI (`src/components/dashboard/DashboardView.tsx` + zależności)
- **Snapshot**: render aktywnej sesji, ostatnio ukończonej, informacji o kwocie AI.
- **Akcje**: start/complete/fail/delete/edit – toasty, invalidacja (React Query), poprawna dezaktywacja CTA w trakcie requestów.
- **Konflikt ETag**: wywołanie aktualizacji z przestarzałym `ETag` → pojawia się `ETagConflictDialog`, możliwe odświeżenie i retry.
- **Kreator AI**: różnicowanie nowy/istniejący użytkownik (wymóg `maxPullups`), obsługa błędów AI/limitów, blokady przy braku kwoty.
- **Dostępność**: focus management w dialogach, role ARIA, kontrast; testy klawiatury.
- **RWD**: siatki/karty skalują się na kluczowych breakpointach Tailwind.

#### 4.5 Historia i filtrowanie (`src/components/history/**`, `GET /api/sessions`)
- Filtrowanie po statusach i datach, sort, paginacja, zachowanie linków strony.
- Skeletony/ładowanie, puste stany, komunikaty błędów.

#### 4.6 Panel admina (`src/pages/admin.astro`, `src/components/admin/**`)
- Dostęp tylko dla admin; bez uprawnień → redirect/403 zgodnie z typem żądania.
- Spójność metryk i list błędów/generacji z danymi DB (seed testowy).

### 5. Środowisko testowe
- **Narzędzia i wersje**: Node LTS, TS 5, Astro 5, React 19, Tailwind 4; zgodnie z `package.json`.
- **Zmienne środowiskowe**: `SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY` – w testach integracyjnych/E2E używać mocków dla OpenRouter.
- **Baza danych**: lokalny Supabase (CLI) lub dedykowany projekt testowy; stosowanie migracji z `supabase/migrations/**` przed testami.
- **Dane testowe**: seed użytkowników (zwykły/admin), scenariusze historii sesji w różnych stanach.
- **Serwowanie**: `astro dev` dla E2E lub `build` + `astro preview` w CI.
- **Mocki**: OpenRouter (MSW w E2E, Nock/MSW w API), kontrola zegara do testów dat i limitów.
- **Izolacja**: oddzielne bazy/schemata dla CI; czyszczenie danych po testach.

### 6. Narzędzia do testowania
- **Jednostkowe/Integracyjne**: Vitest, Testing Library (React), MSW/Nock do mocków HTTP.
- **E2E**: Playwright (Chromium/Firefox + mobilny WebKit), axe-core (dostępność).
- **Wydajność**: Lighthouse CI; opcjonalnie k6 dla wybranych endpointów API (z mockiem AI).
- **Analiza statyczna**: ESLint, TypeScript strict; wykonywane w CI.
- **Raportowanie**: raporty JUnit/HTML (Vitest/Playwright), artefakty (trace, screenshoty) w CI.

### 7. Harmonogram testów
- **Na każde PR (CI)**:
  - Lint + typecheck.
  - Testy jednostkowe/integracyjne (headless, szybkie).
  - Smoke E2E (logowanie, dashboard, generowanie AI z mockiem, konflikt ETag, historia).
  - Lighthouse na `dashboard`, `history` (budżety wydajności).
- **Cyklicznie (tydzień)**:
  - Pełna paczka E2E w macierzy przeglądarek/viewportów.
  - Testy wydajności API i niezawodności (retry, time-outy, sieć).
- **Przed releasem**:
  - Pełny regres automatyczny + manualne sanity na krytycznych ścieżkach.
  - Testy RLS i ról na świeżym środowisku.

### 8. Kryteria akceptacji testów
- **Pokrycie**:
  - Jednostkowe ≥ 80% linii kluczowych modułów (`src/lib/utils/**`, `src/lib/services/ai/**`).
  - Integracyjne API ≥ 70% (główne trasy i gałęzie błędów).
  - E2E: 100% krytycznych ścieżek (login, dashboard CRUD, AI generate, konflikt ETag).
- **Wydajność**:
  - Lighthouse: LCP ≤ 2.5s (prod-like), CLS ≤ 0.1.
  - API (bez AI): p95 listowania sesji ≤ 300 ms; endpoint AI z mockiem ≤ 700 ms.
- **Jakość**:
  - 0 defektów P0/P1 na release.
  - Brak PII w odpowiedziach błędów/logach.
  - Zgodność z WCAG AA na głównych ekranach.
- **Bezpieczeństwo**:
  - RLS izoluje dane użytkowników; brak nieautoryzowanych dostępów.
  - `/admin` zabezpieczone rolą.

### 9. Role i odpowiedzialności
- **QA Lead**: nadzór nad planem, metryki jakości, decyzje o releasie.
- **QA Engineer**: implementacja/utrzymanie testów, mocki, analiza awarii CI, retesty.
- **Dev Lead**: kontrakty API/DTO, szybkie poprawki P0/P1, przegląd testów.
- **DevOps**: CI/CD, sekrety środowiskowe, izolacja baz, artefakty.
- **Produkt/UX**: akceptacja kryteriów/scenariuszy, priorytety defektów.

### 10. Procedury raportowania błędów
- **Zgłoszenie**: narzędzie zespołowe (Jira/GitHub Issues) z krokami odtworzenia, oczekiwanym vs rzeczywistym rezultatem, logami (`requestId`, kody), screenshotami/trace (Playwright).
- **Klasyfikacja**: P0 (blokery), P1 (duże), P2 (średnie), P3 (drobne) – z SLA (P0 natychmiast, P1 24h, P2 sprint, P3 backlog).
- **Triaż**: dzienny przegląd; przypisania i priorytety.
- **Weryfikacja**: automaty + manual, dołączenie testu regresyjnego.
- **Raporty**: dashboard metryk (flaky, pokrycie, czasy, wydajność), trend jakości PR-ów.

### Załącznik A: Priorytety i ryzyka
- **Priorytet 1**: autentykacja/middleware, RLS, CRUD sesji, konflikt ETag, generowanie AI (limity i błędy).
- **Priorytet 2**: UX dashboard/kreator AI, historia (filtry/paginacja), dostępność.
- **Priorytet 3**: panel admina, regresja wizualna, długotrwała niezawodność.
- **Ryzyka**:
  - Zależność od OpenRouter (limity/niestabilność) → szerokie mockowanie, testy time-out/retry.
  - Race conditions (ETag, współbieżność) → dedykowane scenariusze konfliktu i jasne komunikaty.
  - Strefy czasowe (`sessionDate`) → kontrola zegara w testach.
  - SSR/cookies httpOnly, różnice przeglądarek → macierz E2E i testy redirectów.
  - Migracje/RLS → zestaw testów po zmianach schematu.

### Załącznik B: Minimalna matryca E2E
- **Przeglądarki**: Chromium, Firefox; mobilny WebKit (symulacja).
- **Widoki**: `login`, `register`, `dashboard`, `history`, `sessions/new`, `admin`.
- **Użytkownicy**: zwykły i admin; nowy (bez historii) oraz istniejący (z historią).
- **Warunki sieci**: normalna, slow 3G; scenariusze online/offline/retry (tam gdzie ma sens z React Query).


