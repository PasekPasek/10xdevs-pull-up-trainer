# API Endpoint Implementation Plan: POST /sessions

## 1. Przegląd punktu końcowego
- Endpoint tworzy nową sesję treningową użytkownika, z opcją natychmiastowego rozpoczęcia i wsparciem dla sesji historycznych.
- Wymusza reguły biznesowe: pojedyncza aktywna sesja, ostrzeżenia/ograniczenia czasu odpoczynku, walidacja liczby powtórzeń i statusów.
- Rejestruje zdarzenie audytowe w `events` oraz zwraca ostrzeżenia w envelope `meta.warnings`.

## 2. Szczegóły żądania
- Metoda HTTP: POST
- Struktura URL: `/sessions`
- Nagłówki:
  - `Authorization: Bearer <Supabase JWT>`
  - `Content-Type: application/json`
- Parametry:
  - Wymagane: `sessionDate`, `sets`
  - Opcjonalne: `status`, `rpe`, `notes`, `startNow`
- Request Body (`CreateSessionCommand` zgodny z `src/types.ts`):
  - `status`: domyślnie `planned`; dla historycznych tylko `completed` albo `failed`.
  - `sessionDate`: ISO 8601; maks. 30 dni w przyszłość; przeszłość tylko dla statusów historycznych.
  - `sets`: 5-elementowa tablica (`SessionSets`); każdy element `null` lub integer 1-60; co najmniej jedno >0 przy `status=completed`.
  - `rpe`: opcjonalne 1-10; wymagane przy `completed`.
  - `notes`: `string|null`, pole zarezerwowane na przyszłość (obecnie przechowywane wyłącznie w payloadzie zdarzeń, nie w tabeli `sessions`).
  - `startNow`: boolean; jeśli true → wymusza status przejściowy `in_progress` po utworzeniu.
- Walidacje Zod:
  - Schemat typów i zakresów; dodatkowe refine do sprawdzenia co najmniej jednego powtórzenia, ograniczeń daty, zależności `status/startNow/rpe`.
  - Walidacje biznesowe (single active, rest period, multiple same day) realizowane w serwisie na podstawie danych z bazy.

## 3. Szczegóły odpowiedzi
- Kod powodzenia: `201 Created`.
- Payload (`CreateSessionResponse`):
  - `data.session`: nowa sesja w formacie `SessionDTO`.
  - `meta`: `ApiMetaWithExtras` z opcjonalnym `warnings` oraz `requestId`.
- Potencjalne ostrzeżenia: `REST_PERIOD`, `MULTIPLE_SAME_DAY`.
- Nagłówki odpowiedzi: `Cache-Control: no-store`; opcjonalny `ETag` ustawiony na `updatedAt`.

## 4. Przepływ danych
1. Astro route `src/pages/api/sessions/index.ts` ustawia `export const prerender = false` i definiuje `POST`.
2. Handler:
   - Pobiera `supabase` z `context.locals` i weryfikuje dostępność użytkownika (`supabase.auth.getUser()` → `401` gdy brak).
   - Parsuje body schematem Zod; błędy mapuje na `400` z `error.code = "INVALID_PAYLOAD"`.
   - Tworzy `CreateSessionCommand` i przekazuje do serwisu.
3. Serwis `sessionsService.createSession(command, userId)` (np. `src/lib/services/sessions/createSession.ts`):
   - Pobiera aktywną sesję użytkownika (`status IN ('planned','in_progress')`) i rzuca błąd konfliktu (`409`) gdy istnieje i `command.startNow` lub `command.status` wprowadza nową aktywną sesję.
  - Pobiera ostatnią ukończoną/nieudaną sesję dla ostrzeżeń odpoczynku oraz liczy sesje w tym samym dniu; tworzy listę `warnings`.
  - Przygotowuje obiekt `SessionInsert` (mapowanie `sets` → `set_1..set_5`, `is_ai_generated=false`, `is_modified=false`, `ai_comment=null`).
  - Wstawia rekord `sessions` z `user_id`.
  - Jeżeli kliencki payload zawiera `notes`, zapisuje je w zdarzeniu `session_created` (pole `event_data.notes`), aby zachować historię bez potrzeby kolumny w tabeli `sessions`.
  - Jeśli `startNow` = true: aktualizuje status na `in_progress` (zachowując transakcyjność).
  - Wstawia wydarzenie `session_created` (a przy `startNow` dodatkowo `session_started`) do tabeli `events`, przekazując w payloadzie ewentualne `notes` i metadata ostrzeżeń.
   - Zwraca rekord sesji oraz ostrzeżenia.
4. Handler mapuje rekord poprzez helper (np. `mapSessionRowToDTO`, `mapWarnings`) i zwraca envelope `201`.
5. Logowanie/monitoring: w razie wyjątków serwis rzuca custom error (np. `ApplicationError`) z kodem; handler mapuje na odpowiedni status i rejestruje błąd (np. Sentry) bez ujawniania detali klientowi.

## 5. Względy bezpieczeństwa
- Wymagane uwierzytelnienie Supabase JWT; endpoint używa `supabase.auth.getUser` i odrzuca brak/wygaśnięty token (`401`).
- Nie przyjmuje `userId` z payloadu; korzysta z `auth` kontekstu.
- Wymusza RLS na tabeli `sessions` (already enabled); wszystkie operacje wykonuje service role w backendzie, ale filtruje po `user_id`.
- Waliduje dane wejściowe by zapobiec SQL injection (przez Supabase query builder) i oversize payloads (limit długości notatki).
- Maskuje komunikaty błędów (brak szczegółów DB w odpowiedzi).

## 6. Obsługa błędów
- `400 Bad Request`: błędy walidacji Zod, niedozwolone kombinacje statusów/dat/sets.
- `401 Unauthorized`: brak/głuchy token.
- `404 Not Found`: nieużywany dla tworzenia (brak zasobu), ale rezerwujemy na przyszłość (np. brak użytkownika).
- `409 Conflict`: istniejąca aktywna sesja; mapowana do JSON z `error.code = "ACTIVE_SESSION_CONFLICT"`.
- `422 Unprocessable Entity`: naruszenia polityk odpoczynku, gdy endpoint blokuje (jeśli spec wymaga); `error.code = "REST_PERIOD_BLOCKED"`.
- `500 Internal Server Error`: nieprzewidziane wyjątki z Supabase lub logiki; logowane (Sentry) i zwracane z generycznym komunikatem.
- Wszystkie odpowiedzi błędów stosują wspólny format:
  ```
  {
    "error": {
      "code": string,
      "message": string,
      "details": Record<string, unknown>
    }
  }
  ```

## 7. Wydajność
- Wstawienie jednej sesji oraz maks. dwóch zapytań kontrolnych; ograniczyć do pojedynczej transakcji, aby uniknąć niespójności.
- Wykorzystać istniejące indeksy (`idx_one_active_session`, `idx_sessions_user_date`) do sprawdzeń aktywnej sesji i ostrzeżeń.
- Paginate/limit zapytań ostrzegawczych (limit 1).
- Minimalizować payload (nie zwracamy nieużywanych pól).
- Monitorować czas odpowiedzi; dodać instrumentation (np. console debug w dev, Sentry performance w prod).

## 8. Kroki implementacji
1. **Routing:** Utwórz plik `src/pages/api/sessions/index.ts` z `export const prerender = false` oraz szkieletem `POST`.
2. **Schemat walidacji:** Dodaj `src/lib/validation/sessions/createSession.schema.ts` (Zod) odwzorowujący `CreateSessionCommand` + refiny; eksportuj typ inferowany.
3. **Obsługa błędów:** Wspólny helper `httpError`/`buildErrorResponse` w `src/lib/utils` (jeśli nie istnieje) do mapowania błędów serwisu na HTTP.
4. **Serwis biznesowy:** Stwórz `src/lib/services/sessions/createSession.ts` z funkcją przyjmującą `supabase`, `userId`, `command`; wydziel pomocnicze zapytania (`fetchActiveSession`, `fetchRestInfo`, `insertSession`, `insertEvents`).
5. **Mapowanie DTO:** Dodaj helper `mapSessionRowToDTO` w `src/lib/services/sessions/mappers.ts` (lub istniejącym pliku) wykorzystujący typy `SessionDTO` i `SessionSets`.
6. **Integracja:** W handlerze API użyj schematu, wywołaj serwis, obsłuż sukces/błędy zgodnie z planem; załącz ostrzeżenia do `meta`.
7. **Testy:** Przygotuj testy jednostkowe/integ. (Vitest) dla schematu walidacji oraz serwisu (wykorzystując Supabase test double lub lokalną bazę).
8. **Dokumentacja:** Zaktualizuj README/API docs (lub `.ai/api-plan.md` check) o implementację i wymagane nagłówki; upewnij się, że plan jest wdrożony w `.ai/view-implementation-plan.md`.

