# API Endpoint Implementation Plan: DELETE /sessions/{sessionId}

## 1. Przegląd punktu końcowego

- Usuwa aktywną (planned lub in_progress) sesję treningową użytkownika po potwierdzeniu.
- Zabezpiecza przed usunięciem ukończonych/nieudanych sesji, loguje zdarzenie audytowe.

## 2. Szczegóły żądania

- Metoda HTTP: DELETE
- Struktura URL: `/sessions/{sessionId}`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`
- Parametry:
  - Wymagane: `sessionId` (UUID)
- Body: brak
- Walidacje:
  - Zod dla `params.sessionId` (UUID)

## 3. Szczegóły odpowiedzi

- Kod powodzenia: `204 No Content` (brak body).
- Brak `data` w odpowiedzi; opcjonalnie `meta` puste.

## 4. Przepływ danych

1. Ten sam dynamiczny route `src/pages/api/sessions/[sessionId].ts` obsługuje metodę `DELETE`.
2. Handler autoryzuje użytkownika (`supabase.auth.getUser`).
3. Waliduje `sessionId`.
4. Wywołuje serwis `sessionsService.deleteSession(userId, sessionId)`.
5. Serwis:
   - Pobiera sesję użytkownika (`eq id`, `eq user_id`).
   - Jeśli brak → `404`.
   - Jeśli status w `{'completed','failed'}` → `403 Forbidden` z kodem `SESSION_IMMUTABLE`.
   - Usuwa wiersz `sessions` (`delete()`).
   - Wstawia event `session_deleted` (`events` table).
6. Handler zwraca `204` (nie wysyła body) i `Cache-Control: no-store`.

## 5. Względy bezpieczeństwa

- Wymaga Supabase JWT; RLS + filtr `user_id`.
- Brak body → brak dodatkowej sanitacji; walidacja UUID.
- Zapewnić idempotencję: wielokrotny DELETE → jeśli brak sesji → `404` (opcjonalnie `204`, ale spec preferuje `404`).

## 6. Obsługa błędów

- `400 Bad Request`: niepoprawny UUID.
- `401 Unauthorized`: brak autoryzacji.
- `403 Forbidden`: próba usunięcia ukończonej/nieudanej sesji.
- `404 Not Found`: sesja nie istnieje dla użytkownika.
- `500 Internal Server Error`: nieoczekiwane błędy.
- Standardowy format błędu JSON.

## 7. Rozważania dotyczące wydajności

- Pojedyncze `select` + `delete` + `insert event`. Użyć transakcji by uniknąć pół-usuniętych danych.
- Indeksy: `idx_sessions_user_status`, PK.

## 8. Kroki implementacji

1. Dodaj handler `DELETE` w `src/pages/api/sessions/[sessionId].ts`.
2. W `src/lib/services/sessions/deleteSession.ts` zaimplementuj logikę walidacji statusu i usuwania.
3. Dodaj util `assertUserOwnsSession` (opcjonalnie) współdzielony z innymi serwisami.
4. Zaimplementuj wstawianie eventów w serwisie za pomocą helpera.
5. Dodaj testy: sukces planned/in_progress, `403` dla completed, `404` dla braku, auth.
