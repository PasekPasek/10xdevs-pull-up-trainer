# API Endpoint Implementation Plan: GET /admin/generation-errors

## 1. Przegląd punktu końcowego

- Udostępnia administratorom listę zarejestrowanych błędów generacji AI z możliwością filtrowania po typie i zakresie dat.
- Pomaga w diagnozie problemów i monitoringu niezawodności.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/admin/generation-errors`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`
- Parametry query (opcjonalne):
  - `page` (>=1, domyślnie 1)
  - `pageSize` (domyślnie 10, max 50)
  - `errorType` (lista stringów)
  - `dateFrom?`, `dateTo?` (ISO 8601)
- Walidacje Zod: paginacja, listy, daty.

## 3. Szczegóły odpowiedzi

- Kod powodzenia: `200 OK`.
- Body (`AdminGenerationErrorsResponse`):
  - `data.errors`: lista `GenerationErrorLogDTO` (`id`, `userId`, `generationId`, `errorType`, `errorMessage`, `errorStack`, `createdAt`).
  - `data.pagination`: `PaginationMeta`.
- `meta`: standard.

## 4. Przepływ danych

1. Endpoint `src/pages/api/admin/generation-errors.ts` (prerender=false) implementuje `GET`.
2. Handler autoryzuje usera i weryfikuje rolę admin.
3. Waliduje query.
4. Serwis `adminMetricsService.listGenerationErrors(filters)`:
   - Operuje z service role (RLS restrict?). `generation_error_logs` ma RLS; admin view - service role bypass.
   - `from('generation_error_logs')` `select` (count exact) + filtry (errorType `in`, date range).
   - Sort `created_at DESC`.
   - `range` paginacja.
   - Opcjonalnie dołącza `generations` info (model, status).
   - Mapuje do DTO.
5. Handler zwraca `200`.

## 5. Względy bezpieczeństwa

- Rola admin.
- Logi mogą zawierać stack traces; należy maskować, ewentualnie limit length, ewentualnie base64? W spec: error_message/stack stored. Będą udostępniane admin -> ok.
- Dbać o leak minimalny (tylko admini).

## 6. Obsługa błędów

- `400 Bad Request`: invalid filters.
- `401 Unauthorized`.
- `403 Forbidden`: non-admin.
- `500 Internal Server Error`.
- Standard format.

## 7. Rozważania dotyczące wydajności

- Baza logów może być duża; paginacja i indeksy (np. `created_at`, `error_type`).
- W razie potrzeby wprowadzić limit 90 dni.

## 8. Kroki implementacji

1. Dodaj endpoint `src/pages/api/admin/generation-errors.ts` (GET) z autoryzacją roli.
2. Zod schema `adminGenerationErrorsQuerySchema` w `validation/admin/generationErrors.schema.ts`.
3. Serwis `listGenerationErrors` (zapytanie, mapowanie).
4. Testy: admin success z filtrami, non-admin -> 403, brak danych.
