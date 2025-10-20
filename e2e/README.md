# E2E Testing Setup

This directory contains end-to-end tests for the Pull-Up Trainer application using Playwright.

## Quick Start

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

⚠️ **Important**: Before running tests, add the missing `data-testid` attributes to components. See [SETUP.md](./SETUP.md) for the complete list.

## Configuration

- **Test Framework**: Playwright
- **Browser**: Chromium (Desktop Chrome) only, as per project guidelines
- **Environment**: `.env.test` file for test-specific configuration
- **Test User**: Defined in `.env.test` (E2E_USERNAME, E2E_PASSWORD, E2E_USERNAME_ID)

## Project Structure

```
e2e/
├── helpers/
│   ├── auth.ts          # Authentication helper functions
│   └── db-cleanup.ts    # Database cleanup utilities
├── pages/
│   ├── LoginPage.ts     # Login page object model
│   ├── DashboardPage.ts # Dashboard page object model
│   └── HistoryPage.ts   # History page object model
├── auth.spec.ts         # Authentication tests (8 tests)
├── dashboard.spec.ts    # Dashboard and session CRUD tests (12 tests)
├── history.spec.ts      # History and filtering tests (10 tests)
├── middleware.spec.ts   # Middleware and route protection tests (17 tests)
├── SETUP.md            # Setup guide and missing data-testid list
└── README.md           # This file

**Total: 47 comprehensive E2E tests**
```

## Test Scenarios

### ✅ All Tests Implemented

#### Authentication (`auth.spec.ts`) - 8 tests
- Login with valid credentials
- Login with invalid credentials
- Validation errors for empty fields
- Logout functionality
- Protected route access without auth
- Redirect to intended page after login
- Remember me functionality
- Redirect to dashboard if already logged in

#### Dashboard and Session CRUD (`dashboard.spec.ts`) - 12 tests
- Display empty dashboard when no sessions exist
- Display active planned session
- Start a planned session
- Complete an in-progress session (with RPE and notes)
- Fail an in-progress session
- Delete a session
- Edit a session
- Display AI quota badge
- Prevent invalid state transitions
- Display last completed session
- Handle session creation from manual button

#### History and Filtering (`history.spec.ts`) - 10 tests
- Display empty state when no sessions exist
- Display list of sessions
- Filter by status (completed, planned, failed, in_progress)
- Filter by date range
- Clear filters
- Paginate through sessions
- Display session details when clicked
- Handle empty results after filtering

#### Middleware and Route Protection (`middleware.spec.ts`) - 17 tests
- Public routes accessible without auth (home, login, register)
- Redirect to dashboard when accessing login/register while authenticated
- Protected pages redirect to login without auth
- Protected API endpoints return 401 without auth
- Cache-Control: no-store headers on all API responses
- Session persistence across navigation and reload
- Redirect flow preservation
- Admin route protection

## Data Cleanup

All tests use the `cleanupAllTestData()` function to ensure test data is removed after each test run. This function:

1. Deletes test user's generations
2. Deletes test user's events
3. Deletes test user's sessions

The cleanup respects foreign key constraints and deletes in the correct order.

## Required data-testid Attributes

### ✅ Added to Components

#### LoginForm
- `login-form` - Form element
- `email-input` - Email input field
- `password-input` - Password input field
- `remember-me-checkbox` - Remember me checkbox
- `login-submit` - Submit button
- `register-link` - Link to register page

### 🚧 Still Need to Add

#### DashboardView Components
- `active-session-card` - Active session card
- `last-completed-card` - Last completed session card
- `create-manual-session` - Button to create manual session
- `generate-ai-session` - Button to generate AI session
- `start-session` - Button to start planned session
- `complete-session` - Button to complete session
- `fail-session` - Button to fail session
- `edit-session` - Button to edit session
- `delete-session` - Button to delete session
- `ai-quota-badge` - AI quota display
- `logout-button` - Logout button
- `complete-dialog` - Session complete dialog
- `rpe-input` - RPE input in complete dialog
- `notes-input` - Notes textarea in complete dialog
- `confirm-complete` - Confirm button in complete dialog
- `confirm-dialog` - Generic confirm dialog
- `confirm-action` - Confirm button in confirm dialog
- `edit-dialog` - Edit session dialog
- `sets-container` - Container for sets inputs
- `set-input-{index}` - Individual set input fields
- `edit-notes-input` - Notes input in edit dialog
- `save-edit` - Save button in edit dialog
- `etag-conflict-dialog` - ETag conflict dialog
- `refresh-etag` - Refresh button in ETag dialog
- `toast-success` - Success toast notification
- `toast-error` - Error toast notification

#### HistoryView Components
- `session-list` - Session list container
- `filter-panel` - Filter panel
- `status-filter` - Status filter dropdown
- `status-option-{status}` - Status filter options
- `date-from-input` - Date from input
- `date-to-input` - Date to input
- `apply-filters` - Apply filters button
- `clear-filters` - Clear filters button
- `pagination-next` - Next page button
- `pagination-prev` - Previous page button
- `session-item-{index}` - Individual session items
- `empty-state` - Empty state message

#### HeaderNav
- `logout-button` - Logout button in navigation

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test e2e/auth.spec.ts
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run tests in debug mode
```bash
npx playwright test --debug
```

### View test report
```bash
npx playwright show-report
```

## Test Configuration

The `playwright.config.ts` file is configured to:
- Load environment variables from `.env.test`
- Use only Chromium browser (as per guidelines)
- Run tests serially (workers: 1)
- Start dev server automatically before tests
- Generate HTML and JSON reports
- Capture screenshots on failure
- Record video on failure
- Enable trace viewer on retry

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always cleanup test data after each test
3. **Page Objects**: Use Page Object Model for maintainable tests
4. **Locators**: Use data-testid for resilient element selection
5. **Assertions**: Use explicit waits and Playwright's auto-waiting assertions
6. **Test User**: Only use the test user defined in `.env.test`
7. **No AI Tests**: Do not test AI generation in E2E (as per requirements)

## Next Steps

1. Add remaining data-testid attributes to dashboard components
2. Add remaining data-testid attributes to history components
3. Implement dashboard.spec.ts tests
4. Implement history.spec.ts tests
5. Run all tests and fix any issues
6. Add tests to CI/CD pipeline
