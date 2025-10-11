# API Endpoint Implementation Plan: GET /sessions/ai/quota

## 1. Przegląd punktu końcowego
- Zwraca informację o dostępnych generacjach AI dla użytkownika w oknie 24h, limit, czas resetu i egzakt countdown.
- Służy do informowania UI o pozostałych próbach AI.

## 2. Szczegóły żądania
- Metoda HTTP: GET
- Struktura URL: `/sessions/ai/quota`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`
- Parametry: brak
- Walidacje: tylko autoryzacja.

## 3. Szczegóły odpowiedzi
- Kod powodzenia: `200 OK`.
- Body (`AiQuotaResponse`, czyli `ApiEnvelope<AiQuotaDTO, ApiMetaBase>`), w którym pola limitu znajdują się bezpośrednio w `data`.
- `meta` zwykłe.

## 4. Przepływ danych
1. Endpoint `src/pages/api/sessions/ai/quota.ts` (prerender=false) implementuje `GET`.
2. Handler autoryzuje użytkownika.
3. Wywołuje serwis `aiSessionsService.getQuota(userId)`.
4. Serwis:
   - Zapytanie do `generations` z warunkiem `created_at > now - interval 24h` i `status='success'` (tylko udane generacje konsumują limit).
   - Liczy `count` → `remaining = limit - count` (limit = 5 z konfiguracji).
   - Oblicza `resetsAt` (pierwszy udany w oknie + 24h) lub `null` gdy brak generacji.
   - Wylicza `nextWindowSeconds` (max(0, resetsAt - now)).
   - Zwraca DTO.
5. Handler zwraca `200` z envelope (`AiQuotaResponse`).

## 5. Względy bezpieczeństwa
- Supabase JWT.
- RLS na `generations` (select) + `eq user_id`.
- Brak dodatkowych danych wrażliwych.

## 6. Obsługa błędów
- `401 Unauthorized`: brak tokena.
- `500 Internal Server Error`: problemy z bazą.
- Format błędu standardowy.

## 7. Rozważania dotyczące wydajności
- Jedno zapytanie z agregacją; użycie indeksu `idx_generations_user_created`.
- Można ograniczyć do minimum: `select('created_at').eq('status','success')` i obliczenia w kodzie.
- Potencjalnie caching? (per user). Na razie nie.

## 8. Kroki implementacji
1. Stwórz `src/pages/api/sessions/ai/quota.ts` z handlerem GET i autoryzacją.
2. Dodaj serwis `src/lib/services/ai/getQuota.ts` (lub w `sessions/ai`).
3. Zaimplementuj logikę liczenia generacji i limitu.
4. Dodaj helper `calculateResetWindow(generationTimestamps)`.
5. Testy: brak generacji → full limit; 5 generacji → remaining 0; mieszane czasy.

