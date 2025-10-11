# API Endpoint Implementation Plan: POST /sessions/{sessionId}/start

## 1. Przegląd punktu końcowego
- Rozpoczyna zaplanowaną sesję, zmienia status na `in_progress`, zapisuje czas startu i rejestruje zdarzenie audytowe.
- Wymusza brak innej aktywnej sesji oraz opcjonalnie ostrzega o zbyt krótkim odpoczynku.

## 2. Szczegóły żądania
- Metoda HTTP: POST
- Struktura URL: `/sessions/{sessionId}/start`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`, `Content-Type: application/json`
- Parametry: `sessionId` (UUID)
- Request Body (`StartSessionCommand`):
  - `startAt?`: ISO 8601; musi być ≤ teraz.
- Walidacje Zod:
  - `params.sessionId` (UUID)
  - `startAt` opcjonalne, jeśli podane to data ≤ now

## 3. Szczegóły odpowiedzi
- Kod powodzenia: `200 OK`.
- Body (`ApiEnvelope<{ session: SessionDTO }>`), `meta` może zawierać ostrzeżenia (`REST_PERIOD`).
- Nagłówki: `Cache-Control: no-store`, `ETag` z nowym `updatedAt`.

## 4. Przepływ danych
1. Trasa `src/pages/api/sessions/[sessionId]/start.ts` (osobny plik) z `export const prerender = false`.
2. Handler autoryzuje użytkownika i waliduje parametry.
3. Wywołuje serwis `sessionsService.startSession(userId, sessionId, command)`.
4. Serwis:
   - Pobiera sesję (status `planned`). Jeśli brak lub status ≠ planned → `422` (`error.code = "INVALID_STATUS"`).
   - Sprawdza brak innych aktywnych sesji (bia). Jeśli istnieje `in_progress` ≠ ta → `409` (`ACTIVE_SESSION_CONFLICT`).
   - Waliduje `startAt` ≤ now (w kontekście strefy). Jeśli brak → ustawia `startAt = now`.
   - Aktualizuje sesję: `status = 'in_progress'`, `session_date`? (start? optional) i `updated_at` (DB trigger).
   - Wstawia event `session_started` z `event_data.startAt`.
   - Zwraca nowy wiersz i listę ostrzeżeń (rest period).
5. Handler mapuje DTO, dołącza `warnings`.

## 5. Względy bezpieczeństwa
- Supabase JWT, filtr `user_id`.
- Walidacja daty zapobiega wprowadzaniu startu w przyszłości.
- RLS chroni dane innych użytkowników.

## 6. Obsługa błędów
- `400 Bad Request`: nieprawidłowy UUID lub `startAt` w przyszłości.
- `401 Unauthorized`: brak tokena.
- `403 Forbidden`: ewentualnie, jeśli polityka zabrania startu (nie w spec; preferuj `422`).
- `404 Not Found`: sesja nie istnieje.
- `409 Conflict`: istnieje inna aktywna sesja.
- `422 Unprocessable Entity`: status ≠ planned.
- `500 Internal Server Error`: niespodziewany błąd.
- Standardowy format błędów.

## 7. Rozważania dotyczące wydajności
- Kilka zapytań: select, check active session, update, insert event. Używać transakcji.
- Indeks `idx_one_active_session` wspiera sprawdzenie konfliktu.
- Można zrestrukturyzować w transakcję by uniknąć warunków wyścigu (sprawdzenie + update).

## 8. Kroki implementacji
1. Utwórz plik `src/pages/api/sessions/[sessionId]/start.ts` (Astro endpoint) z handlerem POST.
2. Dodaj Zod schema w `src/lib/validation/sessions/startSession.schema.ts` dla params i body.
3. Zaimplementuj serwis `startSession` w `src/lib/services/sessions/startSession.ts` (z transakcją, eventem, ostrzeżeniami).
4. Dodaj helper do generowania ostrzeżeń rest period (współdzielony z create?).
5. W handlerze mapuj DTO i ostrzeżenia.
6. Testy: sukces, status nie planned, inna aktywna sesja, rest warning, auth.

