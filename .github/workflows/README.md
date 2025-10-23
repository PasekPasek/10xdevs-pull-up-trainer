# GitHub Actions Workflows

## Pull Request Workflow (`pull-request.yml`)

### Opis

Workflow CI dla pull requestów, który automatycznie wykonuje:
1. **Lint** - lintowanie kodu
2. **Unit Tests** - testy jednostkowe z coverage
3. **E2E Tests** - testy end-to-end z Playwright
4. **Status Comment** - komentarz do PR z podsumowaniem

### Struktura

```
lint → unit-test (parallel)
    → e2e-test (parallel)
        → status-comment
```

### Użyte akcje GitHub

| Akcja | Wersja | Status | Opis |
|-------|--------|--------|------|
| `actions/checkout` | v5 | ✅ Active | Checkout kodu repozytorium |
| `actions/setup-node` | v6 | ✅ Active | Setup Node.js z cache npm |
| `actions/upload-artifact` | v4 | ✅ Active | Upload artifacts (coverage, reports) |
| `actions/download-artifact` | v5 | ✅ Active | Download artifacts do status comment |
| `marocchino/sticky-pull-request-comment` | v2 | ✅ Active | Sticky PR comments |

### Secrets wymagane w środowisku `integration`

- `SUPABASE_URL` - URL projektu Supabase
- `SUPABASE_KEY` - Klucz anon Supabase

### Artifacts

1. **unit-test-coverage** (retention: 7 dni)
   - Ścieżka: `coverage/`
   - Zawiera: HTML report, JSON summary, text output

2. **e2e-test-report** (retention: 7 dni)
   - Ścieżka: `playwright-report/`
   - Zawiera: Playwright HTML report ze screenshotami i traces

### Wymagania

1. **Node.js**: Wersja określona w `.nvmrc` (obecnie 22.14.0)
2. **Pakiety**:
   - `@vitest/coverage-v8` - coverage dla testów jednostkowych
   - `@playwright/test` - E2E testy
3. **Playwright browsers**: Instalowany automatycznie (chromium)

### Status Comment

Komentarz do PR zawiera:
- Tabelę ze statusem wszystkich jobów
- Metryki coverage (lines, statements, functions, branches)
- Informację o dostępności Playwright report
- Ogólny status (✨ success lub ⚠️ failure)

### Uruchamianie lokalnie

```bash
# Lint
npm run lint

# Unit tests z coverage
npm run test -- --coverage

# E2E tests
npm run test:e2e
```

### Uwagi

- Workflow używa `npm ci` dla deterministycznej instalacji
- E2E testy uruchamiają się w środowisku `integration`
- Status comment jest "sticky" (aktualizuje istniejący komentarz zamiast tworzyć nowy)
- Wszystkie joby po lincie działają równolegle dla szybszego wykonania
- Status comment uruchamia się nawet przy failure innych jobów (`if: always()`)

