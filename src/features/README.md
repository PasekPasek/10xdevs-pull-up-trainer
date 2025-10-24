# Feature Flag System

This module provides a universal TypeScript feature flag system to separate deployments from releases. It enables controlled rollout of features across different environments without requiring code changes.

## Overview

Feature flags allow you to:

- Deploy code to production with features disabled
- Enable features per environment (local, integration, prod)
- Test features in integration before production rollout
- Quickly disable problematic features without rollbacks

## Environment Configuration

Set the `PUBLIC_ENV_NAME` environment variable to control which feature flags are active:

```bash
# Local development (all features enabled by default)
PUBLIC_ENV_NAME=local npm run dev

# Integration/staging environment
PUBLIC_ENV_NAME=integration npm run build && npm run preview

# Production environment
PUBLIC_ENV_NAME=prod npm run build && npm start
```

**Important:** The `PUBLIC_` prefix is required for Astro/Vite to expose the variable to client-side code (React components).

**Default Behavior:** If `PUBLIC_ENV_NAME` is not set or has an invalid value, all flags default to **OFF** (prod mode) for safety.

### Using `.env` File

You can also set it in your `.env` file:

```bash
PUBLIC_ENV_NAME=local
```

Remember to restart your dev server after changing `.env` files!

## Available Feature Flags

### `ENABLE_GENERATING_AI_SESSIONS`

Controls the AI session generation feature.

**Current Configuration:**

- `local`: ✅ Enabled
- `integration`: ✅ Enabled
- `prod`: ❌ Disabled

**What it controls:**

- **API Endpoints** (returns 403 when disabled):
  - `POST /api/sessions/ai` - Generate AI session
  - `GET /api/sessions/ai/quota` - Get AI quota
  - `GET /api/sessions/ai/history` - List AI generations
  - `POST /api/sessions/ai/:id/retry` - Retry failed generation

- **UI Components** (hidden when disabled):
  - "Create with AI" button on dashboard
  - AI quota badge in header
  - AI wizard modal
  - Depleted quota alerts
  - AI Adoption Rate KPI in admin panel

## Usage

### Backend (API Routes)

Use `requireFeature()` to protect API endpoints:

```typescript
import { requireFeature } from "@/features";
import type { APIRoute } from "astro";

export const POST: APIRoute = async (context) => {
  // ... authentication checks ...
  
  // This will throw a 403 error if the feature is disabled
  requireFeature("ENABLE_GENERATING_AI_SESSIONS");
  
  // ... proceed with feature logic ...
};
```

The `requireFeature()` function throws a `FeatureDisabledError` which is automatically handled by the error response builder to return:

```json
{
  "error": {
    "code": "FEATUREDISABLEDERROR",
    "message": "Feature 'ENABLE_GENERATING_AI_SESSIONS' is not enabled in the current environment",
    "details": {
      "flag": "ENABLE_GENERATING_AI_SESSIONS"
    }
  }
}
```

### Frontend (React/Astro Components)

Use `isFeatureEnabled()` to conditionally render UI:

```typescript
import { isFeatureEnabled } from "@/features";

export function MyComponent() {
  const aiEnabled = isFeatureEnabled("ENABLE_GENERATING_AI_SESSIONS");
  
  return (
    <div>
      {aiEnabled ? (
        <button onClick={handleGenerateAI}>
          Generate with AI
        </button>
      ) : null}
      
      {/* This button is always visible */}
      <button onClick={handleManualCreate}>
        Create manually
      </button>
    </div>
  );
}
```

### Checking Current Environment

```typescript
import { getEnvironment } from "@/features";

const env = getEnvironment(); // "local" | "integration" | "prod"
console.log(`Running in ${env} environment`);
```

## Adding New Feature Flags

1. **Add the flag type** in `src/features/types.ts`:

```typescript
export type FeatureFlag = 
  | "ENABLE_GENERATING_AI_SESSIONS"
  | "ENABLE_NEW_FEATURE"; // Add your new flag
```

2. **Configure per environment** in `src/features/flags.ts`:

```typescript
const FLAGS: FeatureFlagConfig = {
  local: {
    ENABLE_GENERATING_AI_SESSIONS: true,
    ENABLE_NEW_FEATURE: true, // Enable in local by default
  },
  integration: {
    ENABLE_GENERATING_AI_SESSIONS: true,
    ENABLE_NEW_FEATURE: true, // Test in integration
  },
  prod: {
    ENABLE_GENERATING_AI_SESSIONS: false,
    ENABLE_NEW_FEATURE: false, // Disabled in prod initially
  },
};
```

3. **Use in your code** as shown in the usage examples above.

## Architecture

### Module Structure

```
src/features/
├── index.ts          # Public API exports
├── types.ts          # TypeScript type definitions
├── flags.ts          # Core flag logic and configuration
└── README.md         # This file
```

### Type Safety

All flags are typed, providing autocomplete and compile-time checks:

```typescript
// ✅ Valid - TypeScript knows about this flag
isFeatureEnabled("ENABLE_GENERATING_AI_SESSIONS")

// ❌ TypeScript error - unknown flag
isFeatureEnabled("ENABLE_UNKNOWN_FEATURE")
```

## Testing Considerations

### Unit Tests

Mock the feature flag functions in your tests:

```typescript
import { vi } from "vitest";
import * as features from "@/features";

vi.spyOn(features, "isFeatureEnabled").mockReturnValue(true);
```

### E2E Tests

Set the `ENV_NAME` environment variable before running tests:

```bash
ENV_NAME=local npm run test:e2e
```

Or use a `.env.test` file with the appropriate environment value.

## Best Practices

1. **Default to OFF**: New features should be disabled in production initially
2. **Test in Integration**: Always test features in integration before enabling in production
3. **Gradual Rollout**: Enable in local → integration → prod
4. **Clean Up**: Remove feature flags once features are stable in production
5. **Document Changes**: Update this README when adding new flags

## Troubleshooting

### Feature works locally but not in production

Check that:
1. `ENV_NAME` is set correctly in production environment
2. The flag is enabled for the `prod` environment in `flags.ts`
3. Environment variable is being read correctly (check build logs)

### Getting 403 errors on API calls

The feature flag for that endpoint is disabled. Either:
1. Enable it in the environment configuration
2. Set `ENV_NAME` to an environment where it's enabled
3. Update the flag configuration if needed

### UI component not showing

Check that:
1. `isFeatureEnabled()` is being called correctly
2. The component is wrapped in a conditional render
3. The flag is enabled for your current environment

## Future Enhancements

Potential additions to consider:

- **Runtime Overrides**: Query parameter or admin panel toggle
- **User-based Flags**: Enable for specific users or roles
- **Percentage Rollouts**: Enable for X% of users
- **A/B Testing**: Multiple variants per flag
- **Analytics Integration**: Track feature usage
- **Remote Configuration**: Load flags from external service

## Related Files

- `src/env.d.ts` - Environment variable types
- `src/lib/utils/httpError.ts` - Error handling for disabled features
- `src/pages/api/sessions/ai/**` - Protected AI endpoints
- `src/components/dashboard/DashboardView.tsx` - Feature-flagged UI

