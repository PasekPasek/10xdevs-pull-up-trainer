# E2E Testing - Setup and Missing Components

## ✅ What's Been Implemented

### Test Files (Complete)
1. **auth.spec.ts** - 8 authentication tests
2. **dashboard.spec.ts** - 12 dashboard and session management tests
3. **history.spec.ts** - 10 history and filtering tests
4. **middleware.spec.ts** - 17 middleware and route protection tests

**Total: 47 comprehensive E2E tests**

### Infrastructure (Complete)
- ✅ Playwright configuration with .env.test
- ✅ Page Object Models (LoginPage, DashboardPage, HistoryPage)
- ✅ Database cleanup helpers
- ✅ Authentication helpers
- ✅ NPM scripts for running tests

### Components Updated (Partial)
- ✅ LoginForm - All data-testid attributes added

## 🚧 What Needs to Be Done

### Add data-testid Attributes to Components

The tests are written and will work once you add the missing `data-testid` attributes to your components. Here's the complete list:

#### 1. Dashboard Components

**File: `src/components/dashboard/ActiveSessionCard.tsx`**
```tsx
// Add to the card container
data-testid="active-session-card"

// Add to action buttons
data-testid="start-session"      // Start button
data-testid="edit-session"       // Edit button
data-testid="delete-session"     // Delete button
data-testid="complete-session"   // Complete button
data-testid="fail-session"       // Fail button
```

**File: `src/components/dashboard/LastCompletedCard.tsx`**
```tsx
// Add to the card container
data-testid="last-completed-card"
```

**File: `src/components/dashboard/PrimaryCTAs.tsx`**
```tsx
// Add to buttons
data-testid="create-manual-session"   // Create manual button
data-testid="generate-ai-session"     // Generate AI button
```

**File: `src/components/dashboard/AIQuotaBadge.tsx`**
```tsx
// Add to the badge container
data-testid="ai-quota-badge"
```

**File: `src/components/dashboard/SessionCompleteDialog.tsx`**
```tsx
// Add to dialog
data-testid="complete-dialog"        // Dialog container

// Add to form fields
data-testid="rpe-input"              // RPE slider/input
data-testid="notes-input"            // Notes textarea

// Add to buttons
data-testid="confirm-complete"       // Confirm button
```

**File: `src/components/dashboard/ConfirmActionDialog.tsx`**
```tsx
// Add to dialog
data-testid="confirm-dialog"         // Dialog container

// Add to button
data-testid="confirm-action"         // Confirm button
```

**File: `src/components/dashboard/EditSessionDialog.tsx`**
```tsx
// Add to dialog
data-testid="edit-dialog"            // Dialog container

// Add to sets container
data-testid="sets-container"         // Sets input container

// Add to each set input (dynamically)
data-testid={`set-input-${index}`}   // Individual set inputs

// Add to notes field
data-testid="edit-notes-input"       // Notes textarea

// Add to button
data-testid="save-edit"              // Save button
```

**File: `src/components/dashboard/ETagConflictDialog.tsx`**
```tsx
// Add to dialog
data-testid="etag-conflict-dialog"   // Dialog container

// Add to refresh button
data-testid="refresh-etag"           // Refresh button
```

#### 2. History Components

**File: `src/components/history/HistoryView.tsx`**
```tsx
// Add to main container
data-testid="session-list"
```

**File: `src/components/history/FiltersPanel.tsx`**
```tsx
// Add to panel container
data-testid="filter-panel"

// Add to filter controls
data-testid="status-filter"          // Status dropdown/select
data-testid="date-from-input"        // Date from input
data-testid="date-to-input"          // Date to input

// Add to buttons
data-testid="apply-filters"          // Apply button
data-testid="clear-filters"          // Clear button
```

**File: `src/components/history/SessionList.tsx`**
```tsx
// Add to each session item (dynamically)
data-testid={`session-item-${index}`}

// Add to empty state
data-testid="empty-state"
```

**File: Status filter options (within FiltersPanel or Select component)**
```tsx
// Add to each status option
data-testid="status-option-planned"
data-testid="status-option-in_progress"
data-testid="status-option-completed"
data-testid="status-option-failed"
```

**File: `src/components/history/PaginationControl.tsx`**
```tsx
// Add to pagination buttons
data-testid="pagination-next"       // Next button
data-testid="pagination-prev"       // Previous button
```

#### 3. Layout/Navigation Components

**File: `src/components/layout/HeaderNav.tsx`**
```tsx
// Add to logout button
data-testid="logout-button"
```

#### 4. Toast Notifications

**File: `src/components/ui/sonner.tsx` or wherever toast is rendered**
```tsx
// Add to success toast
data-testid="toast-success"

// Add to error toast
data-testid="toast-error"
```

## Step-by-Step Setup

### 1. Verify .env.test File

Ensure your `.env.test` file has the correct values:

```env
SUPABASE_URL=https://oymbevwbntgimhlexhfx.supabase.co
SUPABASE_KEY=your_anon_key
OPENROUTER_API_KEY=your_key
E2E_USERNAME_ID=15f7389a-61dd-4f29-8944-61dce3266e8a
E2E_USERNAME=test@testowsky.com
E2E_PASSWORD=test1
```

### 2. Ensure Test User Exists

The test user (test@testowsky.com) must exist in your Supabase database.

### 3. Add data-testid Attributes

Go through each component listed above and add the `data-testid` attributes. Example:

```tsx
// Before
<Button onClick={handleStart}>Start Session</Button>

// After
<Button onClick={handleStart} data-testid="start-session">
  Start Session
</Button>
```

### 4. Run Tests

```bash
# Run all tests
npm run test:e2e

# Run specific test file
npm run test:e2e e2e/auth.spec.ts

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

### 5. View Results

```bash
# View test report
npm run test:e2e:report
```

## Expected Test Coverage

Once all `data-testid` attributes are added, you'll have:

- ✅ **Authentication**: Login, logout, validation, redirects, session persistence
- ✅ **Dashboard**: View sessions, CRUD operations, state transitions
- ✅ **History**: Listing, filtering by status/date, pagination
- ✅ **Middleware**: Route protection, auth guards, API security
- ✅ **Data Cleanup**: Automatic cleanup after each test

## Troubleshooting

### Tests Fail with "Locator not found"
- Missing `data-testid` attribute on component
- Check the component file and add the required attribute

### Tests Fail with "Timeout"
- Dev server not starting (check `npm run dev`)
- Slow API responses (increase timeout in test)
- Database connection issues

### Tests Fail with "401 Unauthorized"
- Auth token not being passed correctly
- Session cookies not set properly
- Check login flow in helper functions

### Tests Fail with Database Errors
- Test user doesn't exist
- RLS policies blocking test user
- Foreign key constraint violations (cleanup order issue)

## Quick Reference: Test Commands

```bash
# Install Playwright browsers (if needed)
npx playwright install chromium

# Run all tests
npm run test:e2e

# Run only auth tests
npx playwright test e2e/auth.spec.ts

# Run only dashboard tests
npx playwright test e2e/dashboard.spec.ts

# Run only history tests
npx playwright test e2e/history.spec.ts

# Run only middleware tests
npx playwright test e2e/middleware.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Generate code (record interactions)
npx playwright codegen http://localhost:4321
```

## Next Steps After Adding data-testid Attributes

1. Run `npm run test:e2e` to execute all tests
2. Fix any failing tests (likely due to minor UI differences)
3. Add tests to CI/CD pipeline
4. Consider adding visual regression tests
5. Add accessibility tests with axe-core (optional)

## Notes

- All tests use the same test user defined in `.env.test`
- Tests are isolated - each test cleans up its own data
- Tests run serially (one at a time) to avoid race conditions
- No AI generation tests (as per requirements)
- Playwright auto-waits for elements, reducing flakiness
