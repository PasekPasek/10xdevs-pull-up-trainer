# API Endpoint Implementation Plan: GET /events

## 1. Przegląd punktu końcowego

- Zwraca paginowaną listę zdarzeń audytowych użytkownika z możliwością filtrowania po typie.
- Wspiera przegląd działań w aplikacji, zgodnie z wymaganiami audytu.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/events`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`
- Parametry query (opcjonalne):
  - `eventType`: lista stringów (wartości z `event_type`)
  - `page`: >=1, domyślnie 1
  - `pageSize`: domyślne 10, max 50
- Walidacje Zod: wartości `eventType`, paginacja.

## 3. Szczegóły odpowiedzi

- Kod powodzenia: `200 OK`.
- Body (`EventsListResponse`):
  - `data.events`: lista `ApiEventDTO` (fields: `id`, `eventType`, `eventData`, `createdAt`, `userId`).
  - `data.pagination`: standard `PaginationMeta`.
  - `meta`: standard.

## 4. Przepływ danych

1. Endpoint `src/pages/api/events/index.ts` (prerender=false) implementuje `GET`.
2. Autoryzacja użytkownika.
3. Walidacja query.
4. Serwis `eventsService.listEvents(userId, query)`:
   - `from('events')` `select('id,event_type,event_data,created_at,user_id', { count: 'exact' })`.
   - `eq('user_id', userId)`.
   - Jeśli `eventType` -> `in` lub `eq` per element.
   - Sort `created_at DESC`.
   - `range` na paginację, `count` (exact).
   - Mapuj do DTO (camelCase).
5. Handler zwraca envelope `200`.

## 5. Względy bezpieczeństwa

- Supabase JWT; RLS w `events` table (tylko własne zdarzenia).
- `eventData` może zawierać JSON; UI powinien sanitizować. Backend nie modyfikuje.

## 6. Obsługa błędów

- `400 Bad Request`: złe parametry.
- `401 Unauthorized`.
- `500 Internal Server Error`.
- Standardowy format błędu.

## 7. Rozważania dotyczące wydajności

- `count: 'exact'` – obserwować; w razie potrzeby można zastąpić `head`.
- Indeks `idx_events_user_created` (user_id, created_at) wspiera zapytania.
- `eventData` to JSONB – limit stronicowania (max 50) zmniejsza transfer.

## 8. Kroki implementacji

1. Dodaj endpoint `src/pages/api/events/index.ts` (GET handler).
2. Walidacja Zod w `validation/events/listEvents.schema.ts`.
3. Serwis `listEvents` z zapytaniem i mapowaniem.
4. Testy: filtry eventType, paginacja, brak danych.
