# API Endpoint Implementation Plan: POST /sessions/{sessionId}/fail

## 1. Przegląd punktu końcowego

- Zmienia status sesji `in_progress` na `failed`, zapisuje opcjonalny powód i rejestruje zdarzenie.
- Wspiera scenariusz przerwania treningu.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/sessions/{sessionId}/fail`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`, `Content-Type: application/json`
- Parametry: `sessionId` (UUID)
- Request Body (`FailSessionCommand`):
  - `reason?`: string (opcjonalny, limit np. 500 znaków).
- Walidacje:
  - `sessionId` (UUID) poprzez Zod.
  - `reason` długość/znaki.

## 3. Szczegóły odpowiedzi

- Kod powodzenia: `200 OK`.
- Body: `ApiEnvelope<{ session: SessionDTO }>`.
- `meta` może być puste.
- Nagłówki: `Cache-Control: no-store`, `ETag`.

## 4. Przepływ danych

1. Endpoint `src/pages/api/sessions/[sessionId]/fail.ts` (`prerender=false`) obsługuje `POST`.
2. Handler autoryzuje użytkownika i waliduje dane.
3. Serwis `sessionsService.failSession(userId, sessionId, command)`:
   - Pobiera sesję (status `in_progress`). Jeśli brak/ status ≠ `in_progress` → `422` (`INVALID_STATUS`).
   - Aktualizuje `status='failed'`, zachowuje `sets`, `rpe` bez zmian; opcjonalnie zapisuje `reason` w `events` (nie w tabeli `sessions`).
   - Wstawia event `session_failed` z `event_data.reason`.
   - Zwraca zaktualizowany wiersz.
4. Handler mapuje DTO i zwraca `200`.

## 5. Względy bezpieczeństwa

- Supabase JWT + RLS.
- Limit długości `reason`.
- Nie zdradza szczegółów w błędach.

## 6. Obsługa błędów

- `400 Bad Request`: niepoprawny UUID lub za długa `reason`.
- `401 Unauthorized`: brak tokena.
- `404 Not Found`: sesja nie istnieje.
- `409 Conflict`: status ≠ in_progress (zgodnie ze specyfikacją).
- `422 Unprocessable Entity`: inne walidacje domenowe (np. reason za długi).
- `500 Internal Server Error`: inne problemy.
- Standardowy format błędu.

## 7. Rozważania dotyczące wydajności

- SELECT + UPDATE + INSERT event; transakcja.
- Minimalne dane → brak problemów z wydajnością.

## 8. Kroki implementacji

1. Dodaj plik `src/pages/api/sessions/[sessionId]/fail.ts` z handlerem POST.
2. Stwórz Zod schema w `validation/sessions/failSession.schema.ts` (params + body).
3. Zaimplementuj serwis `failSession` (pobranie, walidacja statusu, update, event).
4. Użyj mapera DTO.
5. Testy: sukces z reason, status planned -> 422, brak sesji -> 404, auth.
