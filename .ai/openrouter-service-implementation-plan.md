## OpenRouter Service Implementation Guide

### 1. Opis usługi

Usługa OpenRouter integruje aplikację z API OpenRouter w celu generowania sesji treningowych opartych na LLM. Dostarcza zunifikowany interfejs do:
- budowania komunikatów (system, user),
- konfiguracji modelu i parametrów inferencji,
- wymuszania ustrukturyzowanych odpowiedzi (response_format z JSON Schema),
- obsługi dwóch wariantów generowania: nowy użytkownik (tylko `maxPullups`) oraz istniejący użytkownik (analiza do 10 ostatnich sesji),
- obsługi błędów, limitów i timeoutu,
- zapisu wyników do tabel `sessions`, `generations` oraz rejestrowania zdarzeń w `events`.

Zgodnie z PRD i planami API, usługa musi zwracać: 5 serii powtórzeń, datę sesji oraz komentarz AI. Dla nowego użytkownika data jest ustawiana przez serwis na dzisiaj (LLM nie zwraca daty). Dla istniejącego użytkownika – datę proponuje AI na bazie historii, z zakazem dat z przeszłości względem dnia wywołania.

### 2. Opis konstruktora

Proponowana klasa: `OpenRouterService` (TS), zasilana przez konfigurację i zależności (DI):
- `fetchImpl`: funkcja fetch (domyślnie globalny fetch) z kontrolą timeoutu,
- `apiKey`: klucz do OpenRouter (`process.env.OPENROUTER_API_KEY`),
- `baseUrl`: `https://openrouter.ai/api/v1` (możliwa zmiana via config),
- `defaultModel`: np. `gpt-4o-mini`,
- `defaultParams`: domyślne parametry modelu (temperature, top_p, max_tokens),
- `logger`: interfejs logowania (opcjonalny),
- `now`: provider czasu (dla testów),
- `clockToleranceMs`: tolerancja zegara dla timeoutu.

Inicjalizacja (w `src/lib/services/ai/openrouter.ts`): wstrzykujemy poprzez funkcję fabrykującą, a w handlerach API przekazujemy przez dependency object, analogicznie do istniejących serwisów (`supabase`).

### 3. Publiczne metody i pola

- `generateForNewUser(input: { maxPullups: number; model?: string; params?: ModelParams; }): Promise<AiStructuredResponseNew>`
  - Tworzy prompt tylko z `maxPullups` i prosi o 5 setów oraz komentarz. Data sesji jest ustawiana w serwisie na `today` i nie jest częścią odpowiedzi LLM.
- `generateForExistingUser(input: { sessions: HistoricalSessionDTO[]; todayIso?: string; model?: string; params?: ModelParams; }): Promise<AiStructuredResponseExisting>`
  - Analizuje do 10 ostatnich sesji (data, 5 setów, status, totalReps, rpe opcj.). AI zwraca 5 setów, datę kolejnej sesji (nie wcześniejszą niż `todayIso`) oraz komentarz.
- `buildSystemPromptNewUser(maxPullups: number): string`
- `buildSystemPromptExistingUser(todayIso: string): string`
- `buildUserMessageNewUser(maxPullups: number): string`
- `buildUserMessageExistingUser(sessions: HistoricalSessionDTO[]): string`
- `callOpenRouter<T>(args: CallArgs<T>): Promise<T>`
  - Wysyła żądanie z `response_format` (JSON Schema) i parametrami modelu.
- `schemas` (readonly): obiekty JSON Schema dla obu wariantów.

Typy:
- `AiStructuredResponseNew`:
  - `{ sets: [number,number,number,number,number]; comment: string }`
- `AiStructuredResponseExisting`:
  - `{ sets: [number,number,number,number,number]; sessionDate: string; comment: string }`
- `ModelParams`:
  - `{ temperature?: number; top_p?: number; max_tokens?: number; frequency_penalty?: number; presence_penalty?: number }`
- `HistoricalSessionDTO`:
  - `{ sessionDate: string; sets: [number,number,number,number,number]; status: 'completed'|'failed'|'planned'|'in_progress'; totalReps?: number; rpe?: number }`
- `CallArgs<T>`:
  - `{ model: string; messages: {role: 'system'|'user'; content: string}[]; responseSchema: JsonSchema<T>; params?: ModelParams; timeoutMs?: number }`

### 4. Prywatne metody i pola

- `_request<T>(endpoint: string, body: unknown, timeoutMs: number): Promise<T>` – niskopoziomowe wywołanie HTTP z abort-controller,
- `_validateAndNormalizeNew(response: AiStructuredResponseNew): AiStructuredResponseNew` – walidacje (1–60 reps, 5 elementów), clip/naprawa i ostrzeżenia,
- `_validateAndNormalizeExisting(response: AiStructuredResponseExisting, todayIso: string): AiStructuredResponseExisting` – jw. + `sessionDate` ISO, `>= todayIso` (nie przeszłość),
- `_todayIso(): string` – dostarcza dzisiejszą datę ISO (UTC),
- `_schemaNew: JsonSchema<AiStructuredResponseNew>` – JSON Schema dla nowego użytkownika (bez `sessionDate`),
- `_schemaExisting: JsonSchema<AiStructuredResponseExisting>` – JSON Schema dla istniejącego użytkownika (z `sessionDate`),
- `_headers()` – nagłówki z `Authorization: Bearer sk-...`, `HTTP-Referer`, `X-Title`, `Content-Type: application/json`.

### 5. Obsługa błędów

Potencjalne scenariusze (kod – opis – strategia):
1. `401/403` – brak/nieprawidłowy klucz API – zwróć `PROVIDER_AUTH_FAILED`, zaloguj, przerzuć do warstwy API jako `502`.
2. `408` – timeout modelu (>15s) – `AI_TIMEOUT`, zapisz `generations` z `status=timeout`, udostępnij retry.
3. `5xx` dostawcy – `PROVIDER_UNAVAILABLE` – `502 Bad Gateway`, nie konsumuj limitu.
4. `4xx` walidacyjne z OpenRouter – `PROVIDER_BAD_REQUEST` – sprawdź payload, zwróć `500` jeśli nie z naszej winy lub `400` gdy nasze dane.
5. `INVALID_JSON` – odpowiedź modelu nie spełnia schematu – `AI_INVALID_OUTPUT`, log, retry możliwy.
6. `RATE_LIMITED` (z ich strony) – zmapuj na `429`, poinformuj o backoff.
7. `NETWORK_ERROR` – `AI_NETWORK_ERROR`, retry bez konsumpcji quota.
8. `SCHEMA_VIOLATION` – lokalna walidacja 1–60/5-elementowa – popraw/clip i oznacz ostrzeżenie; jeśli nie do naprawy, `AI_INVALID_OUTPUT`.

Każdy błąd: loguj (Sentry), wpis do `generation_error_logs` (status `error` lub `timeout`) z treścią i metadanymi żądania, bez wrażliwych sekretów.

### 6. Kwestie bezpieczeństwa

- Przechowywanie `OPENROUTER_API_KEY` tylko po stronie serwera; nigdy w kliencie.
- Ustal `Cache-Control: no-store` dla odpowiedzi zawierających wyniki AI.
- Limit czasu żądania (15s) i ograniczenie długości promptu.
- Sanitizacja danych wejściowych (np. komentarzy/notes) w promptach.
- Minimalne logowanie (bez promptów i danych osobowych); używaj identyfikatorów.
- Rate limiting na warstwie API (już przewidziane w projekcie) + licznik udanych generacji.

### 7. Plan wdrożenia krok po kroku

1) Konfiguracja i zależności
- Dodaj `OPENROUTER_API_KEY` do `.env` i `src/env.d.ts` (już zadeklarowane).
- Utwórz plik `src/lib/services/ai/openrouter.ts` z klasą `OpenRouterService` oraz fabryką `createOpenRouterService()` pobierającą API key z env.

2) JSON Schema (response_format)
- Zdefiniuj dwa schematy:
  ```ts
  export const AiResponseSchemaNew = {
    type: 'json_schema',
    json_schema: {
      name: 'pullup_session_new_v1',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['sets', 'comment'],
        properties: {
          sets: {
            type: 'array',
            items: { type: 'integer', minimum: 1, maximum: 60 },
            minItems: 5,
            maxItems: 5
          },
          comment: { type: 'string', minLength: 10, maxLength: 400 }
        }
      }
    }
  } as const;

  export const AiResponseSchemaExisting = {
    type: 'json_schema',
    json_schema: {
      name: 'pullup_session_existing_v1',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['sets', 'sessionDate', 'comment'],
        properties: {
          sets: {
            type: 'array',
            items: { type: 'integer', minimum: 1, maximum: 60 },
            minItems: 5,
            maxItems: 5
          },
          sessionDate: { type: 'string', format: 'date-time' },
          comment: { type: 'string', minLength: 10, maxLength: 400 }
        }
      }
    }
  } as const;
  ```

3) Komunikaty (system i user)
- Nowy użytkownik – system:
  ```
  Jesteś trenerem generującym plan podciągnięć. Zwracasz wyłącznie JSON zgodny ze schematem. Zaplanuj 5 serii (1–60) oraz krótki komentarz (2–3 zdania, 40–60 słów). Nie zwracaj daty. Data sesji zostanie ustawiona przez system na dzisiaj (UTC ISO).
  Użyj następujących przykładów jako punktu odniesienia (dopasuj wolumen do przedziału maksymalnych powtórzeń; nie kopiuj 1:1):
  - 21–25 max: [12, 16, 12, 12, 15] = 67 total reps
  - 26–30 max: [16, 18, 15, 15, 17] = 81 total reps
  ```
- Nowy użytkownik – user:
  ```
  Maksymalna liczba podciągnięć użytkownika: 22. Zaproponuj odpowiedni wolumen rozłożony na 5 serii.
  ```
- Istniejący użytkownik – system (przekazujemy `todayIso`):
  ```
  Jesteś trenerem analizującym historię (max 10 sesji). Zwracasz wyłącznie JSON zgodny ze schematem. Zaproponuj 5 serii (1–60), datę następnej sesji oraz komentarz. Data nie może być wcześniejsza niż {todayIso}. Unikaj przeszłości względem dnia dzisiejszego.
  ```
- Istniejący użytkownik – user (przykład):
  ```
  Ostatnie sesje (ISO UTC):
  2025-02-01T09:00:00Z: [12,15,13,11,14], status=completed, rpe=7
  2025-01-29T09:00:00Z: [12,14,12,10,13], status=completed, rpe=7
  2025-01-26T09:00:00Z: [11,13,12,10,12], status=completed, rpe=6
  Dzisiejsza data: 2025-02-02T09:00:00Z. Zaproponuj następny trening nie wcześniej niż dzisiaj.
  ```

4) Wywołanie OpenRouter (model i parametry)
- Przykładowe `callOpenRouter` (warianty różnią się `response_format`):
  ```ts
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://your-app.example',
      'X-Title': '10xdevs Pull-Up Trainer'
    },
    body: JSON.stringify({
      model: modelName ?? defaultModel,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      response_format: isNewUser ? AiResponseSchemaNew : AiResponseSchemaExisting,
      temperature: params?.temperature ?? 0.7,
      top_p: params?.top_p ?? 1,
      max_tokens: params?.max_tokens ?? 300
    })
  });
  ```

5) Walidacja i normalizacja wyniku
- Nowy użytkownik: zparsuj `{ sets, comment }`, zweryfikuj zakresy, ustaw `sessionDate = _todayIso()` już w serwisie.
- Istniejący użytkownik: zparsuj `{ sets, sessionDate, comment }`, zweryfikuj, że `sessionDate >= todayIso` (jeśli nie – podnieś `AI_INVALID_OUTPUT`).
- Clip do [1,60], w razie potrzeby loguj ostrzeżenia `schema_adjustment`.

6) Integracja z aktualnym serwisem generowania
- W `src/lib/services/ai/generateSession.ts`:
  - Zastąp obecny mock wywołaniem `OpenRouterService`.
  - Gałąź nowego użytkownika: nie pobieraj historii; wywołaj `generateForNewUser`; ustaw `sessionDate = today` w payloadzie sesji; zapisz `response_data: { sets, comment }` (bez daty od modelu).
  - Gałąź istniejącego: pobierz do 10 ostatnich sesji; wywołaj `generateForExistingUser({ sessions, todayIso })`; użyj zwróconego `sessionDate` w payloadzie sesji; zapisz `response_data: { sets, comment, sessionDate }`.
  - Pozostałe kroki (quota, events, transakcje) bez zmian.

7) Przykłady parametryzacji
1. Komunikat systemowy – patrz 3 (oddzielne instrukcje dla nowego/istniejącego użytkownika).
2. Komunikat użytkownika – patrz 3 (user message z `maxPullups` lub historią i `todayIso`).
3. Ustrukturyzowane odpowiedzi – użyj dokładnie:
   ```ts
   { type: 'json_schema', json_schema: { name: 'pullup_session_new_v1' | 'pullup_session_existing_v1', strict: true, schema: {/* jw. */} } }
   ```
4. Nazwa modelu – przekaż z parametru API (`body.model`) lub domyślnie `gpt-4o-mini`.
5. Parametry modelu – `temperature`, `top_p`, `max_tokens` w ciele POST; domyślnie 0.7/1/300.

8) Timeout i retry
- Użyj `AbortController` z 15s.
- W przypadku `timeout` zapisz `generations.status='timeout'`, zwróć `408` w endpoint i nie konsumuj limitu. Zapewnij `/sessions/ai/{generationId}/retry`.

9) Testy
- Jednostkowe: walidacja schematu (osobno new/existing), clipping, budowa promptów, kontrola daty >= today dla existing.
- Integracyjne: `403` quota, `408` timeout, `502` provider error, `AI_INVALID_OUTPUT` (data w przeszłości), brak `sessionDate` dla existing.

10) Zmiany w UI (informacyjne)
- Brak zmian w kontrakcie API: odpowiedź już zawiera `session` i `generation`. Komentarz AI i data są mapowane do sesji (data: today dla new, z AI dla existing).

— koniec —
