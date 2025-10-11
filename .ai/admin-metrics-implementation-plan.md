# API Endpoint Implementation Plan: GET /admin/metrics

## 1. Przegląd punktu końcowego
- Zwraca zagregowane KPI dla panelu administracyjnego: liczba użytkowników, sesji, wskaźniki aktywacji, adopcji AI itp.
- Dostępny tylko dla użytkowników z rolą admin (Supabase `app_metadata.role = 'admin'`).

## 2. Szczegóły żądania
- Metoda HTTP: GET
- Struktura URL: `/admin/metrics`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`
- Parametry: brak.
- Walidacje: autoryzacja, autoryzacja roli admin.

## 3. Szczegóły odpowiedzi
- Kod powodzenia: `200 OK`.
- Body (`AdminMetricsResponse`):
  - `data`: `AdminKpiSummaryDTO` (pola `totalUsers`, `totalSessions`, `activationRate`, `aiAdoptionRate`, `failureRate`, `restPeriodCorrelation`).
  - `meta`: standard.

## 4. Przepływ danych
1. Endpoint `src/pages/api/admin/metrics.ts` (prerender=false) implementuje `GET`.
2. Handler:
   - Autoryzuje użytkownika przez `supabase.auth.getUser`.
   - Sprawdza `user.app_metadata.role === 'admin'`; w przeciwnym razie `403 Forbidden`.
3. Serwis `adminMetricsService.getSummary()`:
   - Operuje z uprawnieniami service role (RLS?). Dla admin queries, można użyć supabase service role lub `rpc`s.
   - Wykonuje zapytania agregujące (może w Postgres function / view). Bazując na DB plan: prawdopodobnie korzysta z `sessions`, `generations`, `auth.users`. Ponieważ RLS może blokować, serwis musi korzystać ze specjalnego klienta (np. `supabaseAdminClient`).
   - Oblicza wskaźniki (np. `activationRate` = completed session / total users).
   - Zwraca DTO.
4. Handler zwraca `200`.

## 5. Względy bezpieczeństwa
- Tylko `admin` rola; brak dostępu dla zwykłych userów.
- Upewnić się, że używany klient ma uprawnienia do `auth.users`; w Supabase, pointer: trzeba użyć service role (secret). Ścieżka `src/db/supabase.client.ts` ma typ `SupabaseClient`? Sprawdzić.
- Zsanitize output (tylko metryki liczbowe).

## 6. Obsługa błędów
- `401 Unauthorized`: brak tokena.
- `403 Forbidden`: rola ≠ admin.
- `500 Internal Server Error`: błąd zapytań.
- Standard error format.

## 7. Rozważania dotyczące wydajności
- Agregacje mogą być kosztowne; rozważyć materialized views (plan). Można w implementacji skorzystać z view w DB.
- W razie braku: wykonuj 2-3 zapytania z agregacjami (COUNT, AVG) – acceptable dla MVP.

## 8. Kroki implementacji
1. Dodaj endpoint `src/pages/api/admin/metrics.ts` (GET) z weryfikacją roli admin.
2. Stwórz serwis `adminMetricsService.getSummary` w `src/lib/services/admin/getMetrics.ts`.
3. Użyj supabase admin client lub RPC (np. create Postgres function `fetch_admin_metrics()`).
4. Zaimplementuj logikę łączącą wyniki w DTO.
5. Testy: admin access (mock user admin), non-admin -> 403, success case.

