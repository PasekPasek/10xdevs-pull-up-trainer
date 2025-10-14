# API Endpoint Implementation Plan: POST /sessions/{sessionId}/complete

## 1. Przegląd punktu końcowego

- Oznacza trwającą sesję jako ukończoną (`status = completed`), zapisuje finalne sety, `rpe`, `completedAt` oraz rejestruje wydarzenie.
- Waliduje, że przynajmniej jedna seria ma >0 powtórzeń i że `rpe` mieści się w dopuszczalnym zakresie.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/sessions/{sessionId}/complete`
- Nagłówki: `Authorization` (Bearer), `Content-Type: application/json`
- Parametry: `sessionId` (UUID)
- Request Body (`CompleteSessionCommand`):
  - `sets?`: `SessionSets` (opcjonalne nadpisanie; brak → użyj istniejących wartości).
  - `rpe?`: 1-10 (w spec `rpe` jest opcjonalne, ale zwykle wymagane dla completed? W planie: dowolne, ale jeśli przesłane to w zakresie. Możemy wymagać? W spec: "opcjonalnie RPE" → walidacja: jeśli brak, dozwolone).
  - `completedAt?`: ISO 8601; musi być ≤ now; domyślnie `now`.
- Walidacje:
  - `sessionId` (UUID).
  - `sets`: indeksy 1-5, int 1-60 lub null; co najmniej jeden >0 (po scaleniu z istniejącymi).
  - `rpe`: 1-10 jeśli podane.
  - `completedAt`: ≤ now, ≥ session start? (dodatkowa kontrola: >= session `updated_at`?)

## 3. Szczegóły odpowiedzi

- Kod powodzenia: `200 OK`.
- Body: `ApiEnvelope<{ session: SessionDTO }>`.
- `meta` może być puste lub zawierać ostrzeżenia.
- Nagłówki: `Cache-Control: no-store`, `ETag` z nowym `updatedAt`.

## 4. Przepływ danych

1. Endpoint `src/pages/api/sessions/[sessionId]/complete.ts` (prerender=false) definiuje `POST`.
2. Handler autoryzuje użytkownika, waliduje wejście (Zod schema w `validation/sessions/completeSession.schema.ts`).
3. Wywołuje serwis `sessionsService.completeSession(userId, sessionId, command)`.
4. Serwis:
   - Pobiera sesję (status `in_progress`). Jeśli brak lub status ≠ `in_progress` → `422` (`INVALID_STATUS`).
   - Scali `sets`: jeśli `command.sets` dostarczone → użyj, w przeciwnym razie obecne dane. Waliduj co najmniej jedno >0.
   - Waliduj `rpe` jeśli wymagane (np. narzuć, że musi być podane? W spec: optional; jeżeli chcemy wymusić, rozważyć). W planie: optional, ale preferujemy walidację >=1 <=10.
   - Waliduj `completedAt` (nie w przyszłości, nie przed `session_date`).
   - Aktualizuje sesję: `status='completed'`, `set_1..set_5`, `total_reps` auto (trigger), `rpe`, `updated_at`, `session_date`? (zostaje), `notes` bez zmian.
   - Wstawia event `session_completed` z `total_reps`, `rpe`, `completedAt`.
   - Zwraca zaktualizowany wiersz.
5. Handler mapuje na `SessionDTO`, zwraca `200` z envelope.

## 5. Względy bezpieczeństwa

- Supabase JWT i RLS.
- Walidacja `sets` i `rpe` zapobiega niepoprawnym danym.
- Zastanowić się nad rate limiting? (global middleware 60 req/min).

## 6. Obsługa błędów

- `400 Bad Request`: invalid `sets`, `rpe`, `completedAt`.
- `401 Unauthorized`: brak tokena.
- `404 Not Found`: brak sesji.
- `409 Conflict`: status ≠ `in_progress` (zgodnie ze spec) lub ewentualny konflikt równoległy.
- `422 Unprocessable Entity`: brak powtórzeń >0, nieprawidłowe `completedAt`, inne walidacje domenowe.
- `500 Internal Server Error`: błędy supabase.
- Standardowy format błędu.

## 7. Rozważania dotyczące wydajności

- SELECT + UPDATE + INSERT event.
- Użyć transakcji, aby uniknąć częściowych zapisów.
- Stosować helper mapujący `SessionRow` → DTO.

## 8. Kroki implementacji

1. Stwórz plik `src/pages/api/sessions/[sessionId]/complete.ts` (POST handler, `prerender=false`).
2. Dodaj Zod schemat walidujący body (`completeSession.schema.ts`).
3. Zaimplementuj serwis `completeSession` (pobranie, walidacje, update, event) w `src/lib/services/sessions/completeSession.ts`.
4. Dodaj helpera `mergeSets(existing, incoming)` i `hasPositiveReps(sets)`.
5. W handlerze obsłuż ostrzeżenia i zwróć envelope.
6. Testy: sukces z custom sets/rpe, brak sets>0 → 422, status ≠ in_progress, invalid completedAt.
