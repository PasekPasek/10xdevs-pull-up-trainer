# API Endpoint Implementation Plan: GET /dashboard

## 1. Przegląd punktu końcowego
- Dostarcza agregowany snapshot dla ekranu głównego: aktywna sesja, ostatnia ukończona sesja, quota AI oraz CTA.
- Komponuje dane z wielu zapytań i formatuje w strukturę `DashboardSnapshotDTO`.

## 2. Szczegóły żądania
- Metoda HTTP: GET
- Struktura URL: `/dashboard`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`
- Parametry: brak
- Walidacje: tylko autoryzacja.

## 3. Szczegóły odpowiedzi
- Kod powodzenia: `200 OK`.
- Body (`DashboardSnapshotResponse`):
  - `data.activeSession?`: `SessionDetailDTO` (lub `undefined`).
  - `data.lastCompletedSession?`: `SessionDTO`.
  - `data.aiQuota`: `AiQuotaDTO`.
  - `data.cta`: `DashboardCallToAction`.
- `meta`: standard.

## 4. Przepływ danych
1. Endpoint `src/pages/api/dashboard.ts` (prerender=false) implementuje `GET`.
2. Handler autoryzuje użytkownika.
3. Serwis `dashboardService.getSnapshot(userId)`:
   - `fetchActiveSession`: zapytanie do `sessions` (status planned/in_progress) order by `created_at DESC LIMIT 1`.
   - `fetchLastCompleted`: `sessions` status completed order by `session_date DESC LIMIT 1`.
   - `fetchAiQuota`: reuse serwisu z `/sessions/ai/quota` (może wyodrębnić do wspólnej funkcji).
   - Zbudować CTA (np. z config) - w spec `cta.primary = "Create with AI"`, `secondary = "Create manually"` (stałe).
   - Dodatkowe ostrzeżenia? (np. rest). W spec: `meta` z ostrzeżeniami? W planie `cta` i `warnings`. Można w `meta.warnings` dodać rest warnings? (Spec: `data` w planie `cta` i `warnings` w meta). Realizujemy minimalny zestaw.
4. Handler mapuje sesje na DTO i składa odpowiedź.

## 5. Względy bezpieczeństwa
- Supabase JWT + RLS.
- Minimalne dane -> brak wrażliwych treści.

## 6. Obsługa błędów
- `401 Unauthorized`.
- `500 Internal Server Error`: w przypadku błędów zapytań.
- Format standardowy.

## 7. Rozważania dotyczące wydajności
- Trzy zapytania (dwa SELECT limit 1, jedno do `generations`). Można równolegle (Promise.all).
- Indeksy `idx_sessions_user_date`, `idx_generations_user_created`.
- Rozważyć caching? (np. w runtime) - na razie nie.

## 8. Kroki implementacji
1. Utwórz endpoint `src/pages/api/dashboard.ts` (GET handler).
2. Stwórz serwis `src/lib/services/dashboard/getSnapshot.ts` (wykorzystuje helpery `fetchActiveSession`, `fetchLastCompleted`, `getQuota`).
3. Zaimportuj mapery DTO dla sesji.
4. Handler: autoryzacja, `Promise.all`, budowa envelope.
5. Testy: brak aktywnej sesji, brak completed, limit AI 0, general success.

