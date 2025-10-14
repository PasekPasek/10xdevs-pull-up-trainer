# API Endpoint Implementation Plan: GET /sessions/validation

## 1. Przegląd punktu końcowego

- Przeprowadza pre-flight walidację dla planowanej sesji: sprawdza konflikty odpoczynku, wielokrotne sesje tego samego dnia, imutowalne statusy, itp.
- Zwraca flagę blokującą (`blocking`) oraz listę ostrzeżeń dla UI.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/sessions/validation`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`
- Parametry query (wymagane):
  - `sessionDate` (ISO 8601)
  - `status` (`SessionStatus`)
  - `ignoreRestWarning?` (boolean, domyślnie false)
- Walidacje Zod:
  - `sessionDate` poprawny datetime; <= 30 dni w przyszłość? (preflight? definicja). Walidujemy te same zasady co create.
  - `status` w enum.
  - `ignoreRestWarning` boolean.

## 3. Szczegóły odpowiedzi

- Kod powodzenia: `200 OK`.
- Body (`SessionValidationResponse`):
  - `data`: `SessionValidationOutcomeDTO` (pola `blocking`, `warnings`, `lastCompletedSession?`).
  - `meta`: standard.
- Ostrzeżenia: `REST_PERIOD`, `MULTIPLE_SAME_DAY`, `HISTORICAL_STATUS_MISMATCH` etc.

## 4. Przepływ danych

1. Endpoint `src/pages/api/sessions/validation.ts` (prerender=false) implementuje `GET`.
2. Handler autoryzuje użytkownika.
3. Waliduje query (Zod).
4. Serwis `sessionsService.validateSession(userId, query)`:
   - Sprawdza, czy requested status/based on date jest dozwolone (`planned` nie w przeszłość, `completed/failed` tylko w przeszłość).
   - Pobiera ostatnią ukończoną/failed sesję (rest check) i oblicza `hoursSince`.
   - Sprawdza liczbę sesji w tym samym dniu (completed/failed) i generuje ostrzeżenia.
   - Określa `blocking`: logicznie `true` tylko gdy polityka wymusza (np. brak single active?). W spec: "Preflight checks for prospective session date/status combination"; w planie: `blocking` false unless policy blocks (np. rest conflict? w spec: 422 w create). Zdefiniować: rest warning -> `blocking=false`, ale UI może pytać.
   - `lastCompletedSession` w `data` (z `id`, `hoursSince`).
5. Handler zwraca `200` z envelope.

## 5. Względy bezpieczeństwa

- Supabase JWT.
- RLS; zapytania po `user_id`.
- Brak wrażliwych danych (tylko info użytkownika).

## 6. Obsługa błędów

- `400 Bad Request`: niepoprawne parametry.
- `401 Unauthorized`.
- `500 Internal Server Error`: błąd supabase.
- Format błędów standardowy.

## 7. Rozważania dotyczące wydajności

- Kilka zapytań do `sessions`: ostatnia completed, count same-day, active session? (można dodać). Wykorzystać indeksy.
- Ewentualnie agregacje w jednym zapytaniu? (np. query LIMIT 1 + count). Wystarczająco wydajne.

## 8. Kroki implementacji

1. Dodaj endpoint `src/pages/api/sessions/validation.ts` (GET).
2. Stwórz Zod schema `sessionValidationQuerySchema` w `validation/sessions/validation.schema.ts`.
3. Zaimplementuj serwis `validateSession` (zapytania rest period, same-day, status logic).
4. Dodaj helper `computeSessionWarnings`. Współdziel z create/start.
5. Testy: rest warning, multiple same day, historical status invalid.
