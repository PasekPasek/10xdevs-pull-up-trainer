# API Endpoint Implementation Plan: POST /sessions/ai

## 1. Przegląd punktu końcowego

- Inicjuje generowanie sesji przez AI: weryfikuje limit, zbiera dane wejściowe, wywołuje dostawcę (OpenRouter), zapisuje wynik w `sessions` + `generations`, loguje błędy.
- Obsługuje nowych użytkowników (wymaga `maxPullups`) i zwraca zarówno utworzoną sesję, jak i metadane generacji.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/sessions/ai`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`, `Content-Type: application/json`
- Request Body (`GenerateAiSessionCommand`):
  - `startNow?`: boolean.
  - `maxPullups?`: number (1-60), wymagane jeśli użytkownik nie ma historii completed/failed.
  - `model`: string (np. `gpt-4o-mini`).
- Walidacje Zod:
  - `model` dozwolona lista? (konfigurowalna; walidacja w config lub allowlist).
  - `maxPullups` 1-60; `startNow` boolean.
  - Walidacja kontekstowa: jeśli user lacks history (sprawdzony w serwisie) i `maxPullups` brak → `400`.

## 3. Szczegóły odpowiedzi

- Kod powodzenia: `201 Created`.
- Body (`GenerateAiSessionResponse`):
  - `data.session`: `SessionDTO` (status `planned` lub `in_progress` jeśli `startNow`).
  - `data.generation`: `GenerationDTO`.
  - `meta.quota`: `AiQuotaDTO` (updated values post-generation).
- Ostrzeżenia ewentualnie w `meta.warnings` (np. rest).

## 4. Przepływ danych

1. Endpoint `src/pages/api/sessions/ai/index.ts` (prerender=false) implementuje `POST`.
2. Handler autoryzuje użytkownika, waliduje body (Zod).
3. Wywołuje serwis `aiSessionsService.generateSession(userId, command)`.
4. Serwis (może w `src/lib/services/ai/generateSession.ts`):
   - Sprawdza quota (liczba udanych generacji w 24h). Jeśli limit osiągnięty → `403` (`AI_LIMIT_REACHED`).
   - Pobiera ostatnie sesje użytkownika (np. 10) dla kontekstu AI.
   - Ustala, czy `maxPullups` wymagane (brak history completed/failed). Jeśli wymagana, a brak → `400` (`MISSING_MAX_PULLUPS`).
   - Buduje prompt i request do dostawcy AI (via `OpenRouter` API). Ustala timeout 15s.

- Tworzy rekord `generations` (status `timeout`/`error`/`success`) w transakcji?
  - Możliwe podejście: start transakcji.
  - W przypadku sukcesu: wstaw `sessions` (AI-generated flag true, sets z AI, ustaw `ai_comment`), `generations` (status success, `session_id`), event `ai_generation_succeeded`, ewentualne ostrzeżenia (rest).
  - W przypadku błędu/timeout: wstaw `generations` z `status=error/timeout`, `generation_error_logs` z detalami, event `ai_generation_failed`.
- Jeśli `startNow`, update status na `in_progress` (jak w create/start).
- Zwracając sesję, zachowuje `aiComment` wygenerowany przez model.
- Zwraca `session`, `generation`, `quota` (pozostały limit = limit - udane w oknie).

5. Handler mapuje i zwraca `201`.

## 5. Względy bezpieczeństwa

- Supabase JWT.
- Działanie w kontekście serwerowym; service role ma dostęp.
- Sanity check prompt inputs (escape user data, limit length `notes`).
- Chronić przed nadużyciami: limit 5 generacji/24h + 15s timeout.
- Nie logować wrażliwych danych (np. prompt) w plain logach.

## 6. Obsługa błędów

- `400 Bad Request`: brak `maxPullups` gdy wymagane, niewłaściwe wartości.
- `401 Unauthorized`: brak tokena.
- `403 Forbidden`: limit AI przekroczony.
- `408 Request Timeout`: jeśli AI nie odpowie w 15s (zwrócić `status=timeout`, log w `generation_error_logs`).
- `502 Bad Gateway`: błąd dostawcy (np. 5xx) – mapować do unify `error`. W planie: `502` i `500`.
- `500 Internal Server Error`: inne błędy.
- W każdej sytuacji log (Sentry) i wpis w `generation_error_logs` (z wyjątkiem pełnego sukcesu).

## 7. Rozważania dotyczące wydajności

- Ograniczyć liczbę kontekstowych sesji (np. limit 10).
- Stosować streaming? (na razie simple).
- Pamiętać o asynchronicznym `fetch` do AI (z timeout controllerem).
- Monitorować latencję; ewentualnie `queue` fallback.

## 8. Kroki implementacji

1. Dodaj endpoint `src/pages/api/sessions/ai/index.ts` (prerender=false, handler POST).
2. Utwórz Zod schema w `validation/sessions/ai/generate.schema.ts`.
3. Zaimplementuj serwis `generateSession` (quota check, context fetch, AI call, DB writes, events, error logging).
4. Wprowadź helpery: `buildAiPrompt`, `callOpenRouter`, `parseAiResponse`, `mapAiSets`.
5. Dodaj integrację z `generation_error_logs` (utilities `logGenerationError`).
6. W handlerze API, w razie sukcesu/błędu, zwracaj odpowiednie statusy.
7. Testy: quota reached, missing maxPullups, AI success, AI timeout, AI invalid output.
