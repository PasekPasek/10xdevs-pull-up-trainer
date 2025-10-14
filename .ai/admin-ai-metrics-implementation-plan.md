# API Endpoint Implementation Plan: GET /admin/metrics/ai

## 1. Przegląd punktu końcowego

- Zwraca statystyki niezawodności generacji AI w zadanym oknie czasowym: success rate, średnie opóźnienie, rozkład błędów.
- Dostępny wyłącznie dla administratorów.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/admin/metrics/ai`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`
- Parametry query (opcjonalne):
  - `windowStart?`, `windowEnd?` (ISO 8601). Domyślnie ostatnie 7 dni.
- Walidacje Zod: daty, `windowStart <= windowEnd`.

## 3. Szczegóły odpowiedzi

- Kod powodzenia: `200 OK`.
- Body (`AdminAiMetricsResponse`):
  - `data`: `AdminAiMetricsDTO` (pola `windowStart`, `windowEnd`, `successRate`, `averageLatencyMs`, `failureBreakdown` map).
- `meta`: standard.

## 4. Przepływ danych

1. Endpoint `src/pages/api/admin/metrics/ai.ts` (prerender=false).
2. Handler autoryzuje i weryfikuje rolę admin.
3. Waliduje query.
4. Serwis `adminMetricsService.getAiMetrics(window)`:
   - Korzysta z service role (jak wyżej).
   - Zapytanie do `generations` ograniczone `created_at` w oknie.
   - Oblicza `successRate` = count success / total \* 100.
   - `averageLatencyMs` = avg `duration_ms`.
   - `failureBreakdown` = count per status (timeout/error) + może breakdown `error_type` z `generation_error_logs` (JOIN).
   - Zwraca DTO.
5. Handler zwraca `200`.

## 5. Względy bezpieczeństwa

- Rola admin.
- Dostęp do `generations` i `generation_error_logs` (z service role; RLS?).
- Walidacja dat.

## 6. Obsługa błędów

- `400 Bad Request`: invalid window.
- `401 Unauthorized`.
- `403 Forbidden`: nie-admin.
- `500 Internal Server Error`.
- Standard format.

## 7. Rozważania dotyczące wydajności

- Aggregations w `generations`/`generation_error_logs` – DB indexes `idx_generations_status`, `idx_generations_user_created`.
- W razie dużych danych rozważyć materialized view.

## 8. Kroki implementacji

1. Dodaj endpoint `src/pages/api/admin/metrics/ai.ts` z GET handlerem.
2. Walidacja Zod w `validation/admin/aiMetrics.schema.ts`.
3. Serwis `getAiMetrics` (zapytania + agregacje).
4. Testy: admin success, non-admin 403, brak danych -> success rate 0, failure breakdown map.
