# E2E Tests

This directory contains end-to-end tests for the Pull-Up Trainer application using Playwright.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure test environment:**
   
   Create/update `.env.test` file in the project root with your test credentials:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   OPENROUTER_API_KEY=###
   
   E2E_USERNAME_ID=your-test-user-id
   E2E_USERNAME=test@example.com
   E2E_PASSWORD=your-test-password
   ```

   **Important:** The test user must exist in your remote Supabase database with the specified credentials.

3. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

## Running Tests

### Option 1: Manual Dev Server (Recommended)

1. Start the dev server with test environment:
   ```bash
   npm run dev:e2e
   ```

2. In another terminal, run the tests:
   ```bash
   npm run test:e2e
   ```

### Option 2: Automatic Dev Server

Playwright can start the dev server automatically (configured in `playwright.config.ts`), but it's slower:
```bash
npm run test:e2e
```

### Other Test Commands

- **Run specific test file:**
  ```bash
  npm run test:e2e -- e2e/auth.spec.ts
  ```

- **Run specific test:**
  ```bash
  npm run test:e2e -- e2e/auth.spec.ts:8
  ```

- **Run with UI:**
  ```bash
  npm run test:e2e:ui
  ```

- **Run in debug mode:**
  ```bash
  npm run test:e2e:debug
  ```

- **Run with different reporter:**
  ```bash
  npm run test:e2e -- --reporter=list
  ```

## Test Structure

### Test Files

- **`e2e/auth.spec.ts`** - Authentication tests (login, logout, redirects)
- **`e2e/dashboard.spec.ts`** - Dashboard functionality tests
- **`e2e/manual-session.spec.ts`** - Manual session creation and management tests

### Page Object Models

- **`e2e/pages/LoginPage.ts`** - Login page interactions
- **`e2e/pages/DashboardPage.ts`** - Dashboard interactions
- **`e2e/pages/ManualSessionPage.ts`** - Manual session form interactions

### Helpers

- **`e2e/helpers/auth.ts`** - Authentication helper functions
- **`e2e/helpers/db-cleanup.ts`** - Database cleanup utilities
- **`e2e/helpers/test-data.ts`** - Test data and user credentials

## Test Cleanup

Tests automatically clean up created sessions before and after each test using the `cleanupUserSessions()` helper. The cleanup:

1. Authenticates as the test user
2. Finds all sessions for the test user
3. Deletes all found sessions
4. Signs out

This ensures tests run in isolation without interfering with each other.

## Current Test Status

✅ **All 16 tests passing!**:
- ✓ 5 authentication tests
- ✓ 5 dashboard tests  
- ✓ 6 manual session creation tests

The tests cover:
- User authentication (login, logout, protected routes)
- Dashboard functionality (display, navigation, session cards)
- Manual session creation (validation, submission, deletion)

## Important Notes

1. **Remote Database**: Tests use the remote Supabase instance specified in `.env.test`, NOT local Supabase
2. **Serial Execution**: All tests run serially (one worker, `fullyParallel: false`) to avoid race conditions and ensure clean state
3. **Cleanup**: Automatically runs before and after each test to delete all test user sessions
4. **React Hydration**: Tests include appropriate waits for React to hydrate and form validation to complete
5. **Test Isolation**: Each test is independent and doesn't rely on other tests
6. **Auth Persistence**: Login helper ensures session cookies are fully propagated before proceeding

## Troubleshooting

### Tests failing with "Invalid credentials"
- Verify the test user exists in your remote Supabase database
- Check that `E2E_USERNAME` and `E2E_PASSWORD` in `.env.test` are correct
- Ensure the dev server is using `.env.test` (use `npm run dev:e2e`)

### Tests failing with "element is not enabled"
- This usually means there's an active session blocking creation
- Check that cleanup is working properly
- Verify RLS policies allow the test user to delete their own sessions

### Tests timing out
- Increase timeout in `playwright.config.ts` if needed
- Check that the dev server is running and accessible
- Verify network conditions

## Next Steps

- Fix remaining timing issues in manual session tests
- Add more test coverage for history page
- Add visual regression tests
- Add performance benchmarks

