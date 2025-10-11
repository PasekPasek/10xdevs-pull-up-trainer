# API Endpoint Implementation Plan: POST /sessions/ai/{generationId}/retry

## 1. Przegląd punktu końcowego
- Pozwala ponowić nieudaną/timeoutowaną generację AI bez zużycia dodatkowej kwoty aż do sukcesu.
- Korzysta z poprzedniego kontekstu, aktualizuje rekord `generations` i zwraca nową sesję (jeśli pomyślnie).

## 2. Szczegóły żądania
- Metoda HTTP: POST
- Struktura URL: `/sessions/ai/{generationId}/retry`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`, `Content-Type: application/json`
- Parametry: `generationId` (UUID)
- Body: brak lub ewentualnie parametry (spec nie wymienia; brak).
- Walidacje: `generationId` UUID.

## 3. Szczegóły odpowiedzi
- Kody powodzenia:
  - `200 OK`: retry zakończone sukcesem (nowa sesja/generation status success).
  - `202 Accepted`: retry rozpoczęte, ale w kolejce (jeśli implementujemy async). W MVP można zawsze zwracać `200`/`500` (zależnie od realnego flow). Spec sugeruje `202` dla queued.
- Body (`GenerateAiSessionResponse` analog do `POST /sessions/ai`).
- Jeśli success: `session` + `generation` (zaktualizowany).
- `meta.quota`: bez zmian (retry nie zużywa kwoty do sukcesu; ale po sukcesie - update?).

## 4. Przepływ danych
1. Endpoint `src/pages/api/sessions/ai/[generationId]/retry.ts` (prerender=false) implementuje `POST`.
2. Handler autoryzuje użytkownika i waliduje `generationId`.
3. Serwis `aiSessionsService.retryGeneration(userId, generationId)`:
   - Pobiera rekord `generations` (eq id, eq user_id) z join `sessions`? (potrzebne wcześniejsze parametry).
   - Jeśli `status = success` → `409 Conflict` (`ALREADY_SUCCEEDED`).
   - Sprawdza limit retry (np. 3? spec nie wspomina; eventual). Może zwracać `429` jeśli zbyt częste? (spec: `429 Too Many Requests (backoff enforcement)`).
   - Zbiera kontekst (poprzedni prompt, parametry). Jeśli brak (np. generacja nigdy nie miała prompt data) → `404` lub `500`.
   - Wywołuje AI analogicznie jak w `generateSession`, ale nie zwiększa licznika kwoty. Aktualizuje istniejący rekord `generations` (`status`, `duration_ms`, `session_id`).
   - Jeśli success: tworzy nową sesję lub aktualizuje istniejącą? (Spec: "reuses context"; prawdopodobnie tworzy nową sesję i łączy `session_id` nowo). Musimy zaktualizować `session_id` (poprzednie mogło być null). Zapis eventów: `ai_generation_succeeded` / `ai_generation_failed`.
   - Jeśli failure: update `generation_error_logs` (append?).
   - Po sukcesie, zwróć `session` i `generation`.
4. Handler mapuje i zwraca `200`/`202`.

## 5. Względy bezpieczeństwa
- Supabase JWT, RLS.
- Sprawdzenie, że `generation.user_id` = user.
- Ograniczyć liczbę równoległych retry (429) i logować nadużycia.

## 6. Obsługa błędów
- `400 Bad Request`: niepoprawny UUID.
- `401 Unauthorized`: brak tokena.
- `404 Not Found`: brak takiej generacji (lub nie należy do user).
- `409 Conflict`: generacja już udana.
- `429 Too Many Requests`: za dużo retry (logika backoff).
- `502/500`: błędy AI/dostawcy/serwera.
- `202 Accepted`: jeśli retry queue.
- Format błędu standardowy.

## 7. Rozważania dotyczące wydajności
- Podobnie jak `generate`: AI call jest najcięższe.
- Reuse helperów do budowy promptu i logowania błędów.
- Kontrola concurency (np. `SELECT FOR UPDATE` na `generations`).

## 8. Kroki implementacji
1. Utwórz `src/pages/api/sessions/ai/[generationId]/retry.ts` (POST handler).
2. Dodaj Zod schema `retryAiGenerationParams` (UUID validation).
3. Zaimplementuj serwis `retryGeneration` (pobranie generacji, sprawdzenie statusu, AI call, update, events, error logs).
4. Wykorzystaj helpery z `generateSession` (quota, prompt, etc.).
5. Rozważ wprowadzenie mechanizmu backoff (np. store count w `generation_error_logs` meta?).
6. Testy: success, already succeeded, missing generation, AI failure, repeated retries -> 429.

