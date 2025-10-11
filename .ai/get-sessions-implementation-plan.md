# API Endpoint Implementation Plan: GET /sessions

## 1. Przegląd punktu końcowego
- Zwraca historię sesji użytkownika z paginacją, filtrami statusu i daty oraz sortowaniem.
- Zapewnia metadane filtrów dla klienta (rehydratacja ustawień) i agreguje ostrzeżenia w `meta`.
- Wspiera wydajną nawigację w historii treningów oraz przygotowuje dane do wizualizacji.

## 2. Szczegóły żądania
- Metoda HTTP: GET
- Struktura URL: `/sessions`
- Nagłówki: `Authorization: Bearer <Supabase JWT>`
- Parametry zapytania:
  - Wymagane: brak
  - Opcjonalne:
    - `page` (domyślnie 1, >=1)
    - `pageSize` (domyślnie 10, max 50)
    - `status` (lista `SessionStatus`)
    - `dateFrom`, `dateTo` (ISO 8601; `dateFrom <= dateTo`)
    - `sort` (`sessionDate_desc` domyślnie, alternatywnie `_asc`)
    - `persistedFilterId` (string na potrzeby UX)
- Walidacje danych wejściowych:
  - Schemat Zod dla query (użycie `z.object().transform()` dla domyślnych wartości).
  - Sprawdzenie limitów paginacji, poprawności dat oraz statusów.
  - Obsługa wielokrotnego parametru `status` (np. `URLSearchParams.getAll`).

## 3. Szczegóły odpowiedzi
- Kod powodzenia: `200 OK`.
- Struktura (`ListSessionsResponse`):
  - `data.sessions`: lista `SessionDTO` (mapowanie `sessions` -> `SessionSets`).
  - `data.pagination`: `PaginationMeta` z `page`, `pageSize`, `totalPages`, `totalItems`.
  - `meta.filters`: odzwierciedlenie zastosowanych filtrów (opcjonalne `status`, `dateFrom`, `dateTo`).
- Nagłówki: `Cache-Control: no-store`.

## 4. Przepływ danych
1. Plik `src/pages/api/sessions/index.ts` implementuje także handler `GET` obok `POST` (wspólne `prerender = false`).
2. Handler pobiera `supabase` i autoryzuje użytkownika (`401` przy braku).
3. Parsuje query (np. helper `parseSessionListQuery`) z wykorzystaniem Zod i mapuje błędy na `400`.
4. Wywołuje serwis `sessionsService.listSessions(userId, query)` (np. `src/lib/services/sessions/listSessions.ts`).
5. Serwis:
   - Buduje bazowe zapytanie Supabase (`from('sessions').select('*', { count: 'exact' })`).
   - Dodaje filtry: `status` (użycie `in` lub `or`), zakres dat (`gte/lte` na `session_date`).
   - Ustala sortowanie (`session_date` ASC/DESC) i paginację (`range`).
   - Upewnia się, że `user_id = authenticatedUser` (RLS + jawne `eq`).
   - Opcjonalnie dołącza metadane filtrów (np. w prostym obiekcie). Nie mutuje oryginalnych parametrów.
   - Zwraca rekordy + `count` do obliczenia `totalPages` (ceil).
6. Handler mapuje wiersze na `SessionDTO` (helper `mapSessionRowToDTO`).
7. Odpowiedź `200` z envelope i metadanymi.

## 5. Względy bezpieczeństwa
- Wymagane uwierzytelnienie Supabase JWT.
- Żadne parametry nie kontrolują `userId`; filtr `eq('user_id', userId)` i RLS blokują wycieki danych.
- Walidacja limitów paginacji chroni przed nadmiernym obciążeniem.
- Sanitizacja `persistedFilterId` jako zwykłego stringa (opcjonalnie limit długości, np. 100 znaków).

## 6. Obsługa błędów
- `400 Bad Request`: błędna paginacja, zakres dat, wartości `status` spoza enum.
- `401 Unauthorized`: brak ważnego tokena.
- `500 Internal Server Error`: błędy Supabase lub nieoczekiwane wyjątki; logowane i zwracane w standardowym formacie.
- Format błędu zgodny z `ApiEnvelope` (`error.code`, `message`, `details`).

## 7. Rozważania dotyczące wydajności
- Wykorzystać indeks `idx_sessions_user_date` i `idx_sessions_user_status` dla filtrów.
- Używać limitowanej selekcji (tylko kolumny potrzebne do DTO). Jeżeli Supabase `select` domyślnie pobiera wszystkie pola, można specyfikować kolumny jawnie.
- `count: 'exact'` ma koszt; opcjonalnie można użyć `head: true` z `range`. Dla MVP wystarczy `exact`, ale obserwować metryki.
- Paginate do 50 rekordów; unikamy over-fetching.

## 8. Kroki implementacji
1. Dodaj parser Zod dla query w `src/lib/validation/sessions/listSessions.schema.ts` (lub podobnie); eksportuj typ `ListSessionsQuery` (już w `types.ts`).
2. Utwórz serwis `src/lib/services/sessions/listSessions.ts` z logiką Supabase (paginacja, filtry, sortowanie, count).
3. Dodaj helper mapujący `SessionRow` → `SessionDTO` (współdzielony z innymi endpointami) jeśli jeszcze nie istnieje.
4. Zaimplementuj `GET` w `src/pages/api/sessions/index.ts`: autoryzacja, walidacja query, wywołanie serwisu, budowa odpowiedzi.
5. Zapewnij spójny handler błędów (shared utility) i testy jednostkowe dla walidacji + serwisu (mock Supabase).
6. (Opcjonalnie) Dodaj logowanie zapytań/ostrzeżeń w dev dla monitorowania kosztów `count`.

