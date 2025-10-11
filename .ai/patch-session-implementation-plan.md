# API Endpoint Implementation Plan: PATCH /sessions/{sessionId}

## 1. Przegląd punktu końcowego
- Aktualizuje sesję treningową użytkownika (data, serie, notatki, oznaczenie modyfikacji AI) z zachowaniem blokad dla ukończonych/nieudanych sesji.
- Wymaga nagłówka `If-Match` zawierającego ostatnią wartość `updatedAt` (ETag) w celu obsługi optymistycznego blokowania.
- Zwraca zaktualizowaną sesję w standardowym envelope.

## 2. Szczegóły żądania
- Metoda HTTP: PATCH
- Struktura URL: `/sessions/{sessionId}`
- Nagłówki:
  - `Authorization: Bearer <Supabase JWT>`
  - `Content-Type: application/json`
  - `If-Match: <RFC7232 ETag>` (wymagany; reprezentuje `updatedAt` sprzed edycji)
- Parametry:
  - Wymagane: `sessionId` (UUID)
- Request Body (`UpdateSessionCommand`):
  - `sessionDate?`: ISO 8601; te same ograniczenia co przy tworzeniu (<=30 dni w przyszłość; brak historii dla `planned`).
  - `sets?`: `SessionSets`; walidacja 1-60 lub null.
  - `notes?`: `string|null` (limit długości, np. 1k) – nadal przechowywane w zdarzeniach, nie w tabeli `sessions`.
  - `aiComment?`: string – pozwala użytkownikowi aktualizować komentarz AI, jeżeli sesja została wygenerowana przez model.
  - `markAsModified?`: boolean (dla AI sesji, wymusza `is_modified` = true).
- Walidacje Zod:
  - `params.sessionId` (UUID), `body` (partial schema), `If-Match` nagłówek (ISO `updatedAt`).
  - `body` musi zawierać przynajmniej jedno pole do aktualizacji.
  - Jeśli `sets` zmieniają się w sesji AI → automatycznie ustaw `is_modified`.

## 3. Szczegóły odpowiedzi
- Kod powodzenia: `200 OK`.
- `ApiEnvelope<{ session: SessionDTO }>`.
- `meta` może zawierać ostrzeżenia (np. rest period jeśli zmiana dotyczy daty?).
- Nagłówki: nowy `ETag` = aktualne `updatedAt`, `Cache-Control: no-store`.

## 4. Przepływ danych
1. Dynamiczny plik `src/pages/api/sessions/[sessionId].ts` obsługuje metodę `PATCH`.
2. Handler:
   - Autoryzuje użytkownika.
   - Waliduje `sessionId`, `If-Match`, body (Zod).
   - Przekazuje `UpdateSessionCommand`, `expectedUpdatedAt` do serwisu `sessionsService.updateSession`.
3. Serwis (`src/lib/services/sessions/updateSession.ts`):
   - Pobiera sesję użytkownika; jeśli brak → `404`.
   - Sprawdza status (tylko `planned`/`in_progress` dozwolone). Jeśli inny → `403` lub `422` (spec Z: `403 Forbidden`, ale API plan wspomina `422` lub `403`). W spec jest `422`/`403`? W planie: `422 Unprocessable Entity` (status disallows edit). Zwrócić `422` z kodem `SESSION_IMMUTABLE`.
   - Porównuje `updatedAt` z `If-Match`. Niezgodność → `409 Conflict` (`error.code = "ETAG_MISMATCH"`).
  - Waliduje `sessionDate` reguły (np. rest period? ; zmiana daty powinna unikać wstecznych `planned`).
   - Aktualizuje pola: mapuje `sets` na `set_1..set_5`, `ai_comment` z `aiComment` (jeśli podane), zapisuje `notes` w zdarzeniu edycji. Jeśli `markAsModified` lub zmienione `sets` przy AI → `is_modified = true`.
  - Używa transakcji: update `sessions` (w tym `ai_comment`), wstaw event `session_edited` (w `events`, z `notes` oraz diffami), i w razie potrzeby ostrzeżenia z rest period (zwracane w `meta`).
4. Serwis zwraca zaktualizowany wiersz; handler mapuje na DTO, dołącza ostrzeżenia.

## 5. Względy bezpieczeństwa
- Wymagane Supabase JWT.
- RLS + filtr `user_id` chronią dane innych użytkowników.
- Zabezpieczenie przed `If-Match` pominięciem (nagłówek wymagany, w przeciwnym wypadku `412 Precondition Required`? Spec nie wspomina, więc możemy użyć `409`?). Lepiej `400` lub `428 Precondition Required` (HTTP). W spec brak `428`, ale w planie jest `409 Conflict (ETag mismatch)`. Dla braku `If-Match` można zrobić `400` (`error.code = "MISSING_IF_MATCH"`).
- Walidacja `notes` (limit) i `sets` zapobiega nadużyciom.

## 6. Obsługa błędów
- `400 Bad Request`: brak pól w `body`, złe formaty dat/sets, brak `If-Match`.
- `401 Unauthorized`: brak tokena.
- `404 Not Found`: brak sesji użytkownika.
- `409 Conflict`: `If-Match` nie zgadza się z `updatedAt`.
- `422 Unprocessable Entity`: naruszenia reguł dat (np. historyczna planned) lub brak uprawnień edycji (status nieaktywny); kod błędu `SESSION_IMMUTABLE`.
- `500 Internal Server Error`: błędy Supabase.
- JSON błędu w standardowym formacie.

## 7. Rozważania dotyczące wydajności
- Jedno zapytanie SELECT + UPDATE + INSERT event (transakcja). Korzystać z `supabase.transaction` (jeśli dostępne) lub sekwencji z obsługą błędów.
- Wybierać tylko potrzebne kolumny przy SELECT.
- Pamiętać o `idx_sessions_user_status` i `idx_sessions_user_date`.

## 8. Kroki implementacji
1. Rozszerz dynamiczny route `src/pages/api/sessions/[sessionId].ts` o handler `PATCH`.
2. Stwórz walidację Zod: `updateSessionBodySchema`, `ifMatchHeaderSchema` w `src/lib/validation/sessions/updateSession.schema.ts`.
3. Zaimplementuj serwis `updateSession` w `src/lib/services/sessions/updateSession.ts` (pobranie, walidacja statusu, ETag, update, event).
4. Dodaj helper do wykrywania zmiany setów (`haveSetsChanged(existing, incoming)`).
5. Rozszerz mapery/DTO (jeśli potrzebne) o notatki.
6. Dodaj testy: sukces, brak If-Match, ETag mismatch, immutable status, invalid data, rest warnings.

