# API Endpoint Implementation Plan: GET /sessions/ai/history

## 1. Przegląd punktu końcowego

- Zwraca historię prób generacji AI użytkownika (udane i nieudane) wraz z powiązanymi sesjami i statusem.
- Daje wgląd w statusy generacji, umożliwia debugowanie i UX.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/sessions/ai/history`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`
- Parametry query (opcjonalne):
  - `page` (>=1, domyślnie 1)
  - `pageSize` (domyślnie 10, max 50)
  - `status` (lista `GenerationStatus`: `success`, `timeout`, `error`)
- Walidacje Zod: paginacja, status values, defaulty.

## 3. Szczegóły odpowiedzi

- Kod powodzenia: `200 OK`.
- Body (`ListAiGenerationsResponse`):
  - `data.generations`: lista `AiGenerationHistoryItemDTO` (zawiera `generation` + opcjonalną `session`).
  - `data.pagination`: `PaginationMeta`.
  - `meta`: standard.
- `AiGenerationHistoryItemDTO` zawiera `createdAt`, `durationMs`, `status`, `model`, `session` (mapowany `SessionDTO`).

## 4. Przepływ danych

1. Endpoint `src/pages/api/sessions/ai/history.ts` (prerender=false) implementuje `GET`.
2. Handler autoryzuje użytkownika i waliduje query.
3. Serwis `aiSessionsService.listGenerations(userId, query)`:
   - Zapytanie do `generations` z `eq user_id` + filtry statusu.
   - `order` wg `created_at DESC`.
   - Paginacja `range`.
   - Pobiera `session_id` i ewentualnie join (Supabase `select('..., sessions(*)')`). Upewnić się, że RLS pozwala? (Sessions RLS by user; with service role powinniśmy móc).
   - `count` total.
   - Mapuje `session` (jeśli nie null) na `SessionDTO` (niestety to nested). Można zrobić dwa zapytania: generacje + `session_id` list -> query sessions separately.
4. Handler mapuje i zwraca envelope.

## 5. Względy bezpieczeństwa

- Supabase JWT.
- RLS ensures user sees only their generations/sessions.
- Paginate to avoid large data dumps.

## 6. Obsługa błędów

- `400 Bad Request`: invalid query params.
- `401 Unauthorized`: brak tokena.
- `500 Internal Server Error`: supabase errors.
- Standard error format.

## 7. Rozważania dotyczące wydajności

- `count: 'exact'` + join; monitor performance.
- Można prefetch sessions in `IN (...)` to reduce join complexity.
- Indeks `idx_generations_user_created` (user_id + created_at) pomaga.

## 8. Kroki implementacji

1. Stwórz endpoint `src/pages/api/sessions/ai/history.ts` (GET).
2. Dodaj walidację w `validation/sessions/ai/listGenerations.schema.ts`.
3. Zaimplementuj serwis `listGenerations` (z joinem lub oddzielnym pobraniem sesji).
4. Dodaj mapery (`mapGenerationRowToDTO`, `mapSessionRowToDTO`).
5. Testy: filtr statusu, paginacja, brak danych.
