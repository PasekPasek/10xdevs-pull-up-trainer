# API Endpoint Implementation Plan: GET /sessions/{sessionId}

## 1. Przegląd punktu końcowego

- Udostępnia szczegóły pojedynczej sesji treningowej użytkownika wraz z dozwolonymi akcjami (`actions`), flagami `canEdit`/`canDelete` i kontekstem AI.
- Wspiera ekran widoku szczegółowego oraz przygotowuje dane do edycji/akcji stanu.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/sessions/{sessionId}`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`
- Parametry:
  - Wymagane: `sessionId` (UUID)
  - Opcjonalne: brak
- Walidacje danych wejściowych:
  - Zod schema dla `params` w Astro route (sprawdzenie UUID, np. `z.string().uuid()`).
  - Upewnienie się, że `sessionId` nie jest pusty/niepoprawny → `400`.

## 3. Szczegóły odpowiedzi

- Kod powodzenia: `200 OK`.
- Payload (`ApiEnvelope<{ session: SessionDetailDTO }>`):
  - `data.session`: `SessionDetailDTO` (zawiera `SessionDTO`, `canEdit`, `canDelete`, `actions`).
  - `meta`: `ApiMetaBase` (opcjonalny `requestId`).
- Kod `404` gdy sesja nie istnieje dla użytkownika.

## 4. Przepływ danych

1. Plik `src/pages/api/sessions/[sessionId].ts` (Astro dynamic route) lub `/sessions/[sessionId]/index.ts` definiuje `export const prerender = false` i handler `GET`.
2. Handler autoryzuje użytkownika przez `supabase.auth.getUser()`; `401` przy braku.
3. Waliduje `params.sessionId` schematem Zod → `400` dla błędów.
4. Wywołuje serwis `sessionsService.getSessionById(userId, sessionId)`.
5. Serwis:
   - Zapytanie Supabase `from('sessions')` z `eq('id', sessionId)` i `eq('user_id', userId)` (przez RLS + jawne eq).
   - Jeżeli brak rekordu → `notFound` error.
   - Oblicza flagi: `canEdit`/`canDelete` (tylko dla `planned`/`in_progress`).
   - Określa dozwolone akcje (`SessionAction[]`), np. `start` dla planned, `complete/fail` dla in_progress, `edit/delete` dla active statuses.
   - Mapuje wiersz `SessionRow` na `SessionDetailDTO` (helper `mapSessionRowToDetailDTO`).
6. Handler zwraca `200` z envelope i ewentualnym nagłówkiem `ETag` (`session.updatedAt`).

## 5. Względy bezpieczeństwa

- Dostęp wymaga Supabase JWT; brak wrażliwych danych innych użytkowników (RLS + `user_id` filter).
- Walidacja UUID zapobiega injection.
- Brak modyfikacji stanu (tylko odczyt) → brak dodatkowych polis, ale logi mogą uwzględniać próby podejrzenia obcych zasobów (zwracają `404`).

## 6. Obsługa błędów

- `400 Bad Request`: nieprawidłowy UUID.
- `401 Unauthorized`: brak autoryzacji.
- `404 Not Found`: brak sesji dla użytkownika.
- `500 Internal Server Error`: nieoczekiwany błąd Supabase/serwisu.
- Format błędu: standardowa struktura `error` z `code`, `message`, `details`.

## 7. Rozważania dotyczące wydajności

- Jedno zapytanie do `sessions`; mapowanie w pamięci.
- Można ograniczyć kolumny do potrzeb DTO (np. `select('id,status,session_date,...')`).
- Indeks `idx_sessions_user_date` i klucz główny zapewniają szybkie wyszukiwanie.

## 8. Kroki implementacji

1. Dodaj plik trasy `src/pages/api/sessions/[sessionId].ts` (prerender=false).
2. Utwórz walidację `sessionId` w `src/lib/validation/sessions/getSession.schema.ts` (opcjonalnie wspólna util `validateUuid`).
3. Zaimplementuj serwis `src/lib/services/sessions/getSession.ts` z logiką pobrania i mapowania.
4. Dodaj helper `buildSessionActions(session)` do określania dozwolonych akcji.
5. W handlerze API obsłuż autoryzację, walidację, serwis, mapowanie i zwrot envelope.
6. Dodaj testy jednostkowe/integ. dla serwisu (scenariusze statusów) oraz walidacji params.
