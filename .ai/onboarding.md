# Project Onboarding: Pull-Up Training Tracker

**Last Updated:** October 27, 2025  
**Based On:** Comprehensive git history and codebase analysis (Oct 11-24, 2024)

---

## Document Enhancements

**This onboarding document has been enhanced with:**
- ✅ Detailed module analysis with architecture patterns and relationships
- ✅ Git commit history insights and recent focus areas
- ✅ Identification of high-complexity areas with learning paths
- ✅ Specific questions about implementation gaps
- ✅ Prioritized 3-week onboarding roadmap
- ✅ Configuration file documentation (package.json, astro.config.mjs, env.d.ts)
- ✅ High-change-rate file analysis and maintenance hotspots
- ✅ Technical pattern documentation (forms, API, testing, multi-runtime)

**Original content preserved where accurate; new insights marked with "*Added from analysis*" or section notes.**

---

## Welcome

Welcome to the Pull-Up Training Tracker project! This is a mobile-responsive web application designed to help advanced fitness enthusiasts systematically track their pull-up training progress and receive AI-powered training session recommendations.

**Current Status:** Production readiness phase with Cloudflare Workers deployment preparation underway.

## Project Overview & Structure

The core functionality revolves around tracking pull-up training sessions and providing AI-based recommendations for progression. The project is a single-page application built with Astro, React, and Supabase.

The project structure is as follows:
- `src/pages`: Astro pages and API endpoints.
- `src/components`: React components for the UI.
- `src/lib/services`: Business logic and communication with external services.
- `src/db`: Supabase client and database types.
- `e2e`: End-to-end tests with Playwright.

## Core Modules

### `src/components/dashboard`

- **Role:** Serves as the primary user interface hub for the application, orchestrating the display of active training sessions, AI generation quotas, and primary user actions. This module acts as the central control panel where users interact with their training data, trigger AI-powered session generation through the wizard modal, and manage session lifecycles through various dialogs. It implements sophisticated state management via context and hooks to coordinate complex interactions between multiple UI components.
- **Key Files/Areas:**
  - Views: `DashboardView.tsx` (main orchestrator), `ActiveSessionCard.tsx`, `LastCompletedCard.tsx`
  - Modals/Dialogs: `AIWizardModal.tsx`, `EditSessionDialog.tsx`, `SessionCompleteDialog.tsx`, `ETagConflictDialog.tsx` (for optimistic concurrency control)
  - State Management: `DashboardContext.tsx`, `useDashboardWizard.ts`
  - Supporting Components: `AIQuotaBadge.tsx`, `PrimaryCTAs.tsx`, `ConfirmActionDialog.tsx`
- **Architecture Patterns:** React Context API for shared state, custom hooks for wizard logic, React Query for server state management
- **Recent Focus (Oct 22-24):** Heavy investment in feature flag integration to control AI session generation, React Query migration for improved data fetching and mutation patterns, comprehensive error handling refinements, and end-to-end testing implementation. Recent commits show attention to UI consistency, form validation improvements, and robust user feedback mechanisms.
- **Relationships:** Consumes services from `src/lib/services/sessions` and `src/lib/services/ai`, renders session components from `src/components/sessions`, integrates with feature flag system from `src/features`

### `src/components/auth`

- **Role:** Provides a complete authentication interface layer handling user registration and login flows with a strong emphasis on user experience and security. This module bridges the frontend forms with backend authentication APIs, implementing real-time validation, password strength indicators, and comprehensive error feedback to guide users through authentication processes smoothly while maintaining security best practices.
- **Key Files/Areas:**
  - Forms: `LoginForm.tsx` (10 changes), `RegisterForm.tsx` (7 changes) - high-touch files
  - Form Providers: `LoginFormWithProvider.tsx`, `RegisterFormWithProvider.tsx` (React Query wrappers)
  - Shared Components: `PasswordField.tsx` (reusable password input with visibility toggle)
- **Architecture Patterns:** React Hook Form with Controller pattern, zod schema validation, React Query mutations, custom hooks for password strength and auth mutations
- **Recent Focus (Oct 23-24):** Major refactoring to integrate React Query for mutation handling, enhanced registration flow with improved multi-step validation and error messaging (including 202 email confirmation, 409 conflict detection, 400 field-level validation), simplified error handling patterns with user-friendly messages, and comprehensive E2E test coverage. Password strength indicator with real-time visual feedback added to registration.
- **Relationships:** Imports validation schemas from `src/lib/validation/ui`, uses custom hooks from `src/hooks` (useAuthMutations, usePasswordStrength), connects to API endpoints in `src/pages/api/auth`, wrapped and rendered in Astro pages (`login.astro`, `register.astro`)

### `src/components/sessions`

- **Role:** Delivers the complete user interface for session management, enabling users to create new training sessions manually, edit existing sessions, and view detailed session information with comprehensive validation and real-time feedback. This module handles the complex form logic required for multi-set session data entry, RPE (Rate of Perceived Exertion) tracking, and workout note management while ensuring data integrity through client-side validation.
- **Key Files/Areas:**
  - Forms: `SessionForm.tsx` (7 changes - 368-line complex form), `SessionFormWrapper.tsx` (handles edit/create modes)
  - Views: `SessionDetailsView.tsx` (read-only display)
  - Specialized Inputs: `SetsInput.tsx`, `RpeSlider.tsx` (custom form controls)
  - User Guidance: `ActionBar.tsx`, `BlockingAlert.tsx`, `InlineAlert.tsx`
- **Architecture Patterns:** React Hook Form with useWatch for reactive state, useMemo for computed values, custom hooks for preflight validation, conditional rendering based on session type (planned/start-now/historical)
- **Recent Focus (Oct 16-23):** UI consistency improvements with standardized error messaging patterns, React Query integration for optimistic updates and cache management, enhanced form validation with real-time feedback, comprehensive E2E testing for manual session creation workflows, and preflight conflict detection.
- **Relationships:** Imports validation schemas from `src/lib/validation/ui`, utilities from `src/lib/utils` (date, session computations), custom hooks from `src/hooks` (useSessionPreflightValidation, useSessionActions), connects to session services and API endpoints

### `src/pages`

- **Role:** Defines the complete application routing architecture and API layer, serving both Astro-rendered pages for SSR and REST API endpoints for client-server communication. This module acts as the application's backbone, handling authentication middleware, session management endpoints, AI generation APIs, and coordinating data flow between the database layer (Supabase) and the frontend components. It implements proper HTTP semantics, error handling, and security controls across all routes.
- **Key Files/Areas:**
  - Astro Pages: `dashboard.astro`, `history.astro`, `login.astro` (6 changes), `register.astro`, `sessions/[id].astro`, `sessions/new.astro`
  - Authentication API: `api/auth/login.ts`, `api/auth/register.ts`, `api/auth/logout.ts`
  - Session API: `api/sessions/index.ts`, `api/sessions/[sessionId].ts`, `api/sessions/[sessionId]/complete.ts`, `api/sessions/[sessionId]/start.ts`, `api/sessions/[sessionId]/fail.ts`
  - AI API: `api/sessions/ai/index.ts` (7 changes - critical gateway), `api/sessions/ai/quota.ts`, `api/sessions/ai/history.ts`, `api/sessions/ai/[generationId]/retry.ts`
  - Supporting API: `api/dashboard.ts`, `api/events.ts`, `api/sessions/validation.ts`
- **Architecture Patterns:** Astro APIRoute with POST/GET methods, zod validation, typed error responses, service layer abstraction, DTO mapping pattern, prerender=false for dynamic routes
- **Recent Focus (Oct 15-24):** Significant evolution in feature flag implementation for controlled AI feature rollout, runtime environment handling for Cloudflare Workers compatibility, enhanced registration and logout flows with proper session cleanup, improved error handling and logging across all endpoints, and comprehensive E2E testing infrastructure. Recent commits indicate preparation for production deployment with focus on reliability and observability.
- **Relationships:** Orchestrates services from `src/lib/services`, uses validation schemas from `src/lib/validation`, integrates with middleware from `src/middleware`, renders React components from `src/components`

### `src/lib/services/sessions`

- **Role:** Encapsulates all business logic for training session management, providing a clean service layer that abstracts database operations and implements domain rules for session lifecycle management. This module enforces the state machine for sessions (planned → in-progress → completed/failed), handles validation, manages optimistic concurrency through ETags, and provides type-safe interfaces for all session operations. It serves as the single source of truth for session-related business rules.
- **Key Files/Areas:**
  - CRUD Operations: `createSession.ts`, `getSession.ts`, `updateSession.ts`, `deleteSession.ts`, `listSessions.ts`
  - Lifecycle Transitions: `startSession.ts`, `completeSession.ts`, `failSession.ts`
  - Supporting Utilities: `mappers.ts` (DB-to-domain transformations), `validateSession.ts`, `hooks.ts` (React Query integration)
  - Comprehensive Tests: Each service has corresponding `.test.ts` file (18 files total)
- **Architecture Patterns:** Service layer pattern, DTO mapping, comprehensive error handling, test-driven development, React Query hooks for frontend integration
- **Recent Focus (Oct 11-16):** Early implementation of core CRUD operations with rigorous testing, integration with AI quota management system, session lifecycle state machine implementation, and optimization for E2E testing scenarios. The module demonstrates mature test coverage and stable API patterns that other modules depend on.
- **Relationships:** Called by API endpoints in `src/pages/api/sessions`, provides hooks for React components, interacts with Supabase client from `src/db`, uses validation schemas from `src/lib/validation`

### `src/lib/services/ai`

- **Role:** Manages all interactions with the OpenRouter AI service, abstracting the complexity of LLM-based training session generation, quota tracking, and generation history management. This module implements sophisticated prompt engineering to generate personalized pull-up training sessions based on user history and fitness level, handles streaming responses for better UX, manages API credentials securely, and tracks usage quotas to prevent abuse. It bridges the gap between the application's domain model and external AI capabilities.
- **Key Files/Areas:**
  - Core Client: `openrouter.ts` (API client), `openrouterSingleton.ts` (Cloudflare-compatible instance management)
  - Generation Logic: `generateSession.ts` (main orchestrator with prompt engineering)
  - Quota & History: `getQuota.ts`, `listGenerations.ts`
  - Comprehensive Tests: `.test.ts` files for deterministic behavior
- **Architecture Patterns:** Singleton pattern for Cloudflare Workers, structured output with JSON schema validation, comprehensive error handling, test mocks for AI responses
- **Recent Focus (Oct 11-24):** OpenRouter integration with structured output handling using JSON schema validation, sophisticated error management for AI failures and rate limiting, extensive unit testing with mocked responses for reliability, Cloudflare Workers runtime compatibility through singleton pattern, and integration with the feature flag system for controlled rollout. Recent work emphasizes production-readiness with focus on error recovery and observability.
- **Relationships:** Called by AI API endpoints in `src/pages/api/sessions/ai`, integrates with session services for persisting generated sessions, controlled by feature flags from `src/features`, uses Supabase for quota and generation tracking

### `src/components/layout` *(Added from analysis)*

- **Role:** Provides consistent site-wide navigation and layout components for authenticated pages. The HeaderNav component manages navigation state, user context display, logout functionality, and responsive layout adaptation.
- **Key Files/Areas:**
  - `HeaderNav.tsx` (6 changes - persistent navigation hub)
- **Architecture Patterns:** Responsive design with conditional rendering, ARIA landmarks, async logout handling
- **Recent Focus (Oct 14-23):** UI/navigation refinement for consistency, E2E testing support, session management integration
- **Relationships:** Used in `AuthenticatedLayout.astro`, connects to logout API endpoint, displays user information from Astro context

### `src/hooks` *(Added from analysis)*

- **Role:** Custom React hooks that encapsulate reusable logic for authentication mutations, session actions, form validation, and UI state management.
- **Key Files/Areas:**
  - `useAuthMutations.ts` (React Query mutations for auth)
  - `useSessionActions.ts` (session CRUD mutations)
  - `useSessionPreflightValidation.ts` (conflict detection)
  - `usePasswordStrength.ts` (real-time password validation)
  - `useDebouncedValue.ts`, `useDialogState.ts`, `useUrlFilters.ts`
- **Architecture Patterns:** Custom hooks pattern, React Query integration, debouncing, state encapsulation
- **Relationships:** Used across authentication and session components, wraps service layer calls

### Configuration Files *(Added from analysis)*

#### `package.json` (14 changes)
- Central dependency and tooling orchestrator defining the entire technology stack
- 40+ production dependencies (Astro 5, React 19, Tailwind 4, Supabase, TanStack Query, Radix UI)
- Comprehensive scripts for multi-environment dev, testing (Vitest, Playwright), linting, formatting
- Recent additions: Cloudflare adapter, GitHub Actions integration, E2E testing framework

#### `astro.config.mjs` (6 changes)
- Build pipeline orchestrator with SSR mode, React/sitemap integrations
- Conditional react-dom aliasing for Cloudflare Workers compatibility
- Recent focus: Cloudflare deployment preparation, runtime environment handling

#### `src/env.d.ts` (6 changes)
- TypeScript declarations for Astro runtime context, Supabase integration, Cloudflare environment
- Ensures type safety across middleware, API routes, and service layers
- Recent additions: Cloudflare runtime types, feature flag types

## Key Contributors

**Note:** *Based on comprehensive git history analysis across all modules and key files (Oct 11-24, 2024)*

### Paweł Pasek (ppasek@future-processing.com)

**Role:** Sole contributor and architect across the entire codebase

**Areas of Expertise & Focus:**
- **Full-Stack Development:** Demonstrates proficiency across frontend (React, Astro), backend (API design, services), and infrastructure (Cloudflare, CI/CD)
- **Modern React Patterns:** Expert implementation of React 19, React Query (TanStack Query 5.90), React Hook Form, custom hooks
- **Testing & Quality:** Comprehensive test coverage with Vitest (unit/integration) and Playwright (E2E), implements E2E testing framework from scratch
- **Cloud Infrastructure:** Cloudflare Workers deployment, runtime environment handling, edge computing adaptations
- **AI Integration:** OpenRouter API integration, prompt engineering, quota management, structured output handling
- **Authentication & Security:** Supabase SSR authentication, password strength validation, email confirmation flows, session management
- **Accessibility:** ARIA best practices, semantic HTML, keyboard navigation, screen reader support

**Recent Activity Patterns (Oct 2024):**
- **Week of Oct 24:** Cloudflare deployment preparation (5+ commits on adapter configuration, runtime handling, react-dom aliasing)
- **Week of Oct 23:** React Query migration across authentication and session forms, UI consistency refactoring, GitHub Actions CI/CD setup
- **Week of Oct 22:** Playwright E2E testing framework implementation (authentication, dashboard, manual session flows)
- **Mid-October:** Feature flag system implementation, authentication enhancements, session management improvements
- **Early October:** Foundation work on AI generation, OpenRouter integration, core CRUD operations

**Development Philosophy:** 
- Commits demonstrate iterative refinement approach with focus on production-readiness
- Strong emphasis on error handling, user feedback, and edge cases
- Consistent code style and comprehensive testing before feature completion
- Progressive enhancement with backwards compatibility considerations

## Overall Takeaways & Recent Focus

**Note:** *Based on git history analysis across 10 key files and 6 core modules (Oct 11-24, 2024)*

### Current Development Phase: **Production Readiness & Deployment Preparation**

The project has evolved from foundational feature development (early-mid October) to production hardening and deployment preparation (late October). Analysis reveals three distinct phases:

#### Phase 1: Foundation (Oct 11-15)
- Core CRUD operations for sessions with comprehensive unit tests
- OpenRouter AI integration with structured output handling
- Supabase SSR authentication implementation
- Basic form components and validation schemas

#### Phase 2: Feature Maturation (Oct 16-22)
- Enhanced authentication flows with multi-tier error handling
- Session lifecycle management (planned → in-progress → completed/failed)
- AI quota management and generation history
- Complex form logic (SessionForm: 368 lines with conditional rendering)
- Playwright E2E testing framework implementation

#### Phase 3: Production Hardening (Oct 23-24) **← Current Phase**
- **React Query Migration:** Systematic adoption across auth and session forms for optimistic updates, cache management, and improved state handling
- **Cloudflare Deployment:** 5+ commits focused on Workers adapter, runtime environment handling, react-dom server.edge aliasing
- **Feature Flags:** Implementation of controlled rollout system for AI generation (`requireFeature()` in API endpoints)
- **CI/CD Infrastructure:** GitHub Actions workflow for PR validation and coverage reporting
- **Error Handling Standardization:** Unified error messaging patterns, typed HTTP errors, comprehensive logging
- **UI/UX Consistency:** Standardized form validation feedback, accessible error alerts, loading states

### Key Technical Patterns Emerged

1. **Form Architecture Standard:**
   - React Hook Form + Controller pattern for all forms (LoginForm, RegisterForm, SessionForm)
   - Zod schemas for validation with comprehensive error messages
   - React Query mutations for server state
   - Custom hooks for business logic (useAuthMutations, useSessionPreflightValidation)
   - Shadcn/ui components for consistent UI

2. **API Layer Pattern:**
   - Astro APIRoute with prerender=false for dynamic endpoints
   - Zod validation at API boundary
   - Typed error responses with request IDs for traceability
   - Service layer abstraction (never direct DB access from endpoints)
   - DTO mapping between DB and API responses

3. **Testing Strategy:**
   - Unit tests: Vitest for services with mocked dependencies
   - E2E tests: Playwright for complete user flows (auth, session creation, dashboard interactions)
   - Test data helpers and cleanup utilities in `e2e/helpers/`
   - Page Object Model pattern in `e2e/pages/`

4. **Multi-Runtime Support:**
   - Development: Node.js with standard react-dom/server
   - Production: Cloudflare Workers with react-dom/server.edge
   - Environment abstraction through context.locals.runtime
   - Conditional configuration in astro.config.mjs

5. **Accessibility-First Design:**
   - ARIA attributes throughout (aria-invalid, aria-describedby, aria-live)
   - Semantic HTML with proper landmarks
   - Keyboard navigation support
   - Screen reader-friendly error messages
   - Focus management with refs

### Recent Commit Patterns

**High-Touch Files (7-14 changes):**
- `package.json` (14) - Infrastructure evolution
- `package-lock.json` (11) - Dependency management
- `LoginForm.tsx` (10) - Iterative UX refinement
- `src/pages/api/sessions/ai/index.ts` (7) - AI gateway hardening
- `SessionForm.tsx` (7) - Complex form polish
- `RegisterForm.tsx` (7) - Registration flow enhancement

**Common Commit Themes:**
- "feat:" for new features and enhancements (60% of commits)
- "refactor:" for code improvements and consistency (30% of commits)
- "chore:" for dependency updates and configuration (10% of commits)
- Detailed commit messages explaining the "why" not just "what"

### Technology Stack Maturity

**Production-Grade:**
- Astro 5.13 (SSR + islands architecture)
- React 19.1 (latest features, React Compiler support)
- Tailwind CSS 4.1 (modern styling)
- TanStack Query 5.90 (mature state management)
- Supabase SSR (authentication & database)
- Playwright 1.48 (comprehensive E2E testing)

**Deployment Ready:**
- Cloudflare adapter configured
- Wrangler integration
- GitHub Actions CI/CD
- Environment variable handling
- Error logging and observability hooks

## Potential Complexity/Areas to Note

**Note:** *Based on analysis of change patterns, file sizes, and architectural patterns*

### High-Complexity Areas Requiring Deep Understanding

#### 1. **SessionForm.tsx - Multi-Workflow Form Logic**
- **Complexity Score: High** (368 lines, 7 changes)
- **Why Complex:** Handles three distinct session creation workflows (planned, start-now, historical)
- **Key Challenges:**
  - Conditional rendering based on date selection (past vs. today/future)
  - Reactive validation with useWatch for granular reactivity
  - Computed derived state (date validation, total reps calculation)
  - Preflight validation with conflict detection (useSessionPreflightValidation)
  - State interdependencies (status affects RPE visibility, startNow affects status)
- **Learning Path:** Study in this order:
  1. Form schema in `src/lib/validation/ui/createManualSessionForm.schema`
  2. useWatch and useMemo patterns
  3. Custom hook `useSessionPreflightValidation`
  4. Conditional UI rendering logic

#### 2. **AI Generation Pipeline - End-to-End Flow**
- **Complexity Score: High** (spans multiple modules)
- **Why Complex:** Multi-layer orchestration with external API, quota management, error handling
- **Flow Architecture:**
  1. Frontend: `AIWizardModal.tsx` → triggers generation
  2. API Gateway: `src/pages/api/sessions/ai/index.ts` (7 changes) - feature flags, validation
  3. Service Layer: `src/lib/services/ai/generateSession.ts` - prompt engineering, OpenRouter call
  4. Quota Check: `src/lib/services/ai/getQuota.ts` - concurrent request validation
  5. Session Persistence: `src/lib/services/sessions/createSession.ts` - database write
  6. Event Logging: Generation tracking in Supabase
- **Key Challenges:**
  - Cloudflare runtime environment variable access (context.locals.runtime)
  - Singleton pattern for OpenRouter client (Workers compatibility)
  - Structured output validation with JSON schema
  - Error recovery and retry logic
  - Quota enforcement and race condition handling
- **Watch Out For:** Feature flag checks (`requireFeature()`) can silently fail if not configured

#### 3. **React Query State Management - Cache Invalidation**
- **Complexity Score: Medium-High** (recent migration, Oct 23)
- **Why Complex:** Optimistic updates, cache synchronization, mutation error handling
- **Critical Hooks:**
  - `useAuthMutations` - login/register with automatic redirect
  - `useSessionActions` - CRUD operations with cache updates
  - `useDashboardWizard` - wizard state with multi-step validation
- **Key Challenges:**
  - Understanding query keys and invalidation patterns
  - Optimistic updates for session mutations
  - Error boundary integration
  - Stale-while-revalidate semantics
- **Common Pitfall:** Cache not invalidating after mutation (check `onSuccess` callbacks)

#### 4. **Multi-Runtime Environment Handling**
- **Complexity Score: Medium** (Cloudflare vs. Node.js)
- **Why Complex:** Different runtime APIs and environment variable access patterns
- **Key Differences:**
  - Development: `import.meta.env.VARIABLE_NAME`
  - Production (Cloudflare): `context.locals.runtime.env.VARIABLE_NAME`
  - React DOM: Standard vs. server.edge (conditional in astro.config.mjs)
- **Files to Study:**
  - `astro.config.mjs` - conditional react-dom aliasing
  - `src/env.d.ts` - type definitions for runtime
  - `src/pages/api/sessions/ai/index.ts` - runtime.env access pattern
- **Watch Out For:** Environment variables work locally but fail in Cloudflare if not properly accessed

#### 5. **Authentication Flow - Multi-Stage Validation**
- **Complexity Score: Medium** (spans frontend, API, Supabase)
- **Why Complex:** Multiple error states, email confirmation, session management
- **Error States to Handle:**
  - 202: Account created, email confirmation required
  - 400: Field-level validation errors
  - 409: Email conflict (account already exists)
  - 401: Invalid credentials
  - 500: Server errors
- **Key Files:**
  - `RegisterForm.tsx` - sophisticated error discrimination
  - `src/pages/api/auth/register.ts` - Supabase integration
  - `src/middleware/index.ts` - session verification
- **Common Issues:** Understanding when to show toast vs. form error vs. redirect

#### 6. **Session State Machine - Lifecycle Transitions**
- **Complexity Score: Medium**
- **Valid Transitions:**
  - `planned` → `in-progress` (via startSession)
  - `in-progress` → `completed` (via completeSession)
  - `in-progress` → `failed` (via failSession)
  - Historical sessions created directly as `completed` or `failed`
- **Business Rules:**
  - Only one active session allowed at a time (enforced in createSession)
  - Cannot have multiple planned sessions for same date
  - RPE required for completed sessions
  - ETag-based optimistic concurrency control
- **Key Services:**
  - `src/lib/services/sessions/` - individual transition handlers
  - Validation logic distributed across services
- **Watch Out For:** Preflight validation in SessionForm checks for conflicts

### High-Change-Rate Files (Maintenance Hotspots)

**Files requiring frequent updates suggest either:**
- Core feature under active development
- Complex business logic requiring iteration
- User-facing component needing UX refinement

| File | Changes | Implication |
|------|---------|-------------|
| `package.json` | 14 | Infrastructure evolution - expect dependency updates |
| `LoginForm.tsx` | 10 | Mature but still refining UX - reference implementation |
| `src/pages/api/sessions/ai/index.ts` | 7 | Critical path - production hardening ongoing |
| `SessionForm.tsx` | 7 | Complex form - likely to need modifications for new features |
| `RegisterForm.tsx` | 7 | Authentication edge cases - ongoing refinement |

### Architectural Gotchas

1. **Astro Islands Hydration:**
   - Components with `client:load` are hydrated on page load
   - State doesn't persist across navigation (full page reloads)
   - Use React Query for server state persistence

2. **Form Validation Timing:**
   - Client-side: Zod schemas with react-hook-form (immediate feedback)
   - Server-side: Zod schemas in API endpoints (security boundary)
   - Both must stay synchronized

3. **Type Safety Gap:**
   - Database types generated from Supabase (`database.types.ts`)
   - DTOs defined in `src/types.ts`
   - Mappers bridge the gap (`mappers.ts` in services)
   - **Risk:** Schema drift if migrations aren't reflected in types

4. **Feature Flags:**
   - Implemented but not comprehensively documented
   - Check `src/features/` for flag definitions
   - `requireFeature()` throws if flag disabled - handle in try/catch

## Questions for the Team

**Note:** *Questions formulated based on gaps discovered during codebase analysis*

### Feature Flags & Deployment Strategy

1. **Feature Flag Configuration:** The `requireFeature()` system is implemented in `src/features/` but documentation is sparse. Where is the feature flag configuration stored (environment variables, database, config file)? How do we toggle features between environments (local, integration, prod)?

2. **Cloudflare Deployment Process:** With recent Cloudflare Workers preparation (Oct 24), what's the deployment workflow? Are we using Wrangler CLI directly, or is there a CI/CD pipeline? How do we handle database migrations in coordination with deployments?

3. **Multi-Environment Testing:** The codebase has `PUBLIC_ENV_NAME` support (local/integration/prod), but E2E tests seem to target a single environment. How do we test against integration environment before production deployments?

### AI Generation & Quota Management

4. **AI Quota Enforcement Reliability:** The `getQuota()` check in the AI endpoint is async and precedes generation. Are there race conditions where multiple concurrent requests could exceed quota limits? Is there database-level constraint enforcement?

5. **OpenRouter Model Strategy:** The AI endpoint accepts a `model` parameter with default "gpt-4o-mini". What's the long-term strategy for model selection? Will users choose, or is it algorithmic? Are different models tested for quality/cost trade-offs?

6. **Prompt Engineering Evolution:** The `generateSession.ts` service contains prompt templates. Is prompt versioning tracked? How do we evaluate prompt quality and iterate on session generation logic?

### React Query Migration & State Management

7. **Cache Invalidation Strategy:** React Query was recently integrated (Oct 23). What's the invalidation strategy for related queries? For example, when a session is completed, which queries should be invalidated (dashboard, history, quota)?

8. **Optimistic Update Rollback:** For session mutations with optimistic updates, how are rollbacks handled on server errors? Is there documented guidance for implementing new mutations consistently?

### Testing & Quality Assurance

9. **E2E Test Coverage Targets:** Playwright tests were implemented Oct 22. What's the target coverage for E2E vs. unit tests? Which user flows are considered critical and must have E2E coverage?

10. **Test Data Management:** E2E helpers include DB cleanup utilities. In CI/CD, does each test run use a fresh database, or do we clean between tests? How do we prevent test data pollution?

### Authentication & Session Management

11. **Email Confirmation Flow:** RegisterForm handles 202 (email confirmation required) responses. Is email confirmation mandatory for all new accounts, or environment-dependent? What's the user experience if they try to log in before confirming?

12. **Session State Transition Edge Cases:** The session state machine is well-defined, but what happens to an `in-progress` session that's never completed or failed? Is there a timeout/cleanup mechanism?

### Architecture & Code Patterns

13. **DTO Mapping Maintenance:** Type mapping between database schemas (`database.types.ts`) and application DTOs (`types.ts`) is manual via `mappers.ts`. How do we ensure these stay synchronized when database schema changes? Is there tooling or process?

14. **Custom Hooks Convention:** The codebase has rich custom hooks (`src/hooks/`). Is there a documented pattern for when logic should be extracted to a hook vs. kept in component vs. moved to service layer?

15. **Error Logging & Observability:** Code includes `globalThis.reportError?.()` calls. What's the actual error reporting implementation in production? Are we using Sentry, Cloudflare Analytics, custom logging?

### Performance & Scalability

16. **OpenRouter Singleton Pattern:** The `openrouterSingleton.ts` was added for Cloudflare compatibility. Does this create a bottleneck for concurrent AI generation requests? Are there rate limiting considerations?

17. **Supabase Connection Pooling:** API routes access Supabase via `context.locals.supabase`. In Cloudflare Workers environment, how is connection pooling handled? Are there connection limits we need to monitor?

## Next Steps

**Note:** *Prioritized learning path based on codebase architecture and complexity analysis*

### Week 1: Environment Setup & Core Patterns

#### Day 1-2: Local Development Environment
1. **Environment Setup:**
   ```bash
   git clone <repository>
   npm install
   cp .env.example .env  # Configure Supabase and OpenRouter credentials
   npm run dev
   ```
2. **Verify Core Functionality:**
   - Create an account at `/register` (observe email confirmation flow)
   - Log in at `/login`
   - Create a manual training session at `/sessions/new`
   - View dashboard at `/dashboard`

3. **Run Test Suites:**
   ```bash
   npm run test              # Unit tests with Vitest
   npm run test:e2e          # E2E tests with Playwright
   npm run test:e2e:ui       # Interactive Playwright UI
   ```

#### Day 3-4: Form Architecture Deep Dive
**Goal:** Understand the standard form pattern used throughout the app

**Study Path:**
1. **Start with LoginForm** (simpler, 163 lines):
   - Read `src/components/auth/LoginForm.tsx`
   - Trace validation: `src/lib/validation/ui/loginForm.schema.ts`
   - Study mutation hook: `src/hooks/useAuthMutations.ts`
   - Follow API call: `src/pages/api/auth/login.ts`

2. **Progress to SessionForm** (complex, 368 lines):
   - Read `src/components/sessions/SessionForm.tsx`
   - Study useWatch pattern for reactive state
   - Understand conditional rendering logic
   - Examine custom hook: `src/hooks/useSessionPreflightValidation.ts`

3. **Hands-On Exercise:**
   - Add a new field to SessionForm (e.g., "difficulty rating")
   - Update schema, form UI, and API endpoint
   - Write unit test for validation
   - Add E2E test assertion

#### Day 5: Service Layer & React Query
**Goal:** Understand business logic separation and state management

**Study Path:**
1. **Session Services:**
   - Read `src/lib/services/sessions/createSession.ts` (start here - core CRUD)
   - Review corresponding test: `createSession.test.ts`
   - Study DTO mapping: `mappers.ts`
   - Examine React Query hook: `hooks.ts`

2. **React Query Integration:**
   - Study `src/hooks/useSessionActions.ts` for mutation patterns
   - Understand cache invalidation in `onSuccess` callbacks
   - Review `src/lib/providers/QueryClientProvider.tsx` for global config

3. **Hands-On Exercise:**
   - Add console.logs to track query lifecycle
   - Create a session and observe cache updates in React Query DevTools
   - Trigger an error and see rollback behavior

### Week 2: Advanced Features & Architecture

#### Day 6-7: AI Generation Pipeline
**Goal:** Understand end-to-end AI feature implementation

**Study Path (follow the data flow):**
1. Frontend trigger: `src/components/dashboard/AIWizardModal.tsx`
2. API gateway: `src/pages/api/sessions/ai/index.ts` (study feature flag check)
3. Service orchestration: `src/lib/services/ai/generateSession.ts`
4. OpenRouter client: `src/lib/services/ai/openrouter.ts`
5. Quota management: `src/lib/services/ai/getQuota.ts`

**Critical Files:**
- `src/features/flags.ts` - understand feature flag system
- `src/lib/services/ai/openrouterSingleton.ts` - Cloudflare pattern

**Hands-On Exercise:**
- Trace an AI generation request with debugger breakpoints
- Modify prompt in `generateSession.ts` and test output
- Understand quota enforcement by examining DB queries

#### Day 8: Multi-Runtime Architecture
**Goal:** Understand development vs. production environment differences

**Study Path:**
1. **Configuration:**
   - Read `astro.config.mjs` - note conditional react-dom aliasing
   - Study `src/env.d.ts` - understand type definitions
   - Review `wrangler.toml` - Cloudflare Workers config

2. **Runtime Differences:**
   - Compare env var access: `import.meta.env` vs. `context.locals.runtime.env`
   - Understand why `openrouterSingleton.ts` exists
   - Study middleware: `src/middleware/index.ts` for context setup

3. **Hands-On Exercise:**
   - Run production build: `npm run build`
   - Test with Wrangler: `npx wrangler pages dev dist`
   - Compare behavior with `npm run dev`

#### Day 9-10: Testing Strategy & Contribution Workflow

**E2E Testing:**
1. Study Page Object Model: `e2e/pages/DashboardPage.ts`
2. Review test helpers: `e2e/helpers/auth.ts`, `db-cleanup.ts`
3. Read existing tests: `e2e/dashboard.spec.ts`
4. Write a new E2E test for a user flow

**Unit Testing:**
1. Study service tests: `src/lib/services/sessions/createSession.test.ts`
2. Understand mocking patterns (Supabase, fetch)
3. Review test setup: `src/test/setup.ts`

**Contribution Workflow:**
1. Review commit history: `git log --oneline --graph -n 20`
2. Study commit message patterns (feat:, refactor:, chore:)
3. Check linter config: `eslint.config.js`
4. Run pre-commit checks: `npm run lint`, `npm run format`

### Week 3+: Feature Development

#### Suggested First Contributions (Increasing Difficulty)

1. **Starter: UI Refinement**
   - Add loading skeleton to a component
   - Improve error message in a form
   - Add a new icon to HeaderNav

2. **Intermediate: Form Enhancement**
   - Add "rest period" field to SessionForm
   - Implement validation and persistence
   - Write unit and E2E tests

3. **Advanced: New Feature**
   - Implement session editing (update existing session)
   - Add API endpoint, service method, form modal
   - Handle ETag concurrency control
   - Full test coverage

4. **Expert: Cross-Cutting Feature**
   - Implement user preferences/settings
   - Add new database table and types
   - Create migration, update DTOs
   - Build settings UI with form pattern
   - Add React Query cache management

### Documentation Improvements Needed

**Based on analysis gaps, consider documenting:**

1. **Feature Flag Usage Guide:**
   - Where flags are defined
   - How to add new flags
   - Environment-specific configuration

2. **React Query Patterns:**
   - Query key conventions
   - Mutation with optimistic updates template
   - Cache invalidation decision tree

3. **Multi-Runtime Environment Guide:**
   - Development vs. production differences
   - Environment variable access patterns
   - Cloudflare Workers limitations and workarounds

4. **Testing Guidelines:**
   - When to write unit vs. E2E tests
   - Page Object Model best practices
   - Test data management strategies

5. **Error Handling Standards:**
   - HTTP error response structure
   - Client-side error discrimination (202/400/409/500)
   - User feedback patterns (toast vs. form error vs. alert)

### Key Resources to Bookmark

- **Astro Docs:** https://docs.astro.build/ (SSR, middleware, API routes)
- **React Query (TanStack):** https://tanstack.com/query/latest (mutations, caching)
- **Supabase Docs:** https://supabase.com/docs (auth, database, Row Level Security)
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/ (runtime API differences)
- **Playwright:** https://playwright.dev/ (E2E testing patterns)
- **Shadcn/ui:** https://ui.shadcn.com/ (component examples and variants)

## Development Environment Setup

### Prerequisites

1. **Node.js v22.14.0** (required - check with `node --version`)
   - Use nvm for version management: `nvm use 22.14.0`
   
2. **Package Manager:**
   - npm (included with Node.js)
   - Project uses npm, not yarn or pnpm

3. **External Services:**
   - **Supabase Account** (database, authentication, storage)
     - Create project at https://supabase.com/dashboard
     - Note the Project URL and anon/public key
     - Optional: Service role key for admin operations
   
   - **OpenRouter API Key** (AI session generation)
     - Sign up at https://openrouter.ai/
     - Generate API key from dashboard
     - Required for AI features (can be disabled via feature flags)

4. **Optional Tools:**
   - Wrangler CLI for Cloudflare Workers testing: `npm install -g wrangler`
   - Playwright browsers for E2E tests: `npx playwright install`

### Installation Steps

```bash
# Clone repository
git clone <repository-url>
cd 10xdevs-pull-up-trainer

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual credentials:
# - SUPABASE_URL=your-project-url
# - SUPABASE_KEY=your-anon-key
# - OPENROUTER_API_KEY=your-api-key
# - PUBLIC_ENV_NAME=local (or integration/prod)

# Run database migrations (via Supabase CLI or dashboard)
# Migrations are in supabase/migrations/

# Start development server
npm run dev
# Application runs at http://localhost:3000
```

### Available Scripts

**Development:**
- `npm run dev` - Start local dev server (PUBLIC_ENV_NAME=local)
- `npm run dev:integration` - Dev server with integration env
- `npm run dev:prod` - Dev server with production env
- `npm run dev:e2e` - Dev server for E2E tests (uses .env.test)

**Building:**
- `npm run build` - Production build for Cloudflare Workers
- `npm run preview` - Preview production build locally

**Testing:**
- `npm run test` - Run Vitest unit/integration tests
- `npm run test:watch` - Vitest in watch mode
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:ui` - Playwright interactive UI mode
- `npm run test:e2e:debug` - Playwright debug mode with inspector

**Code Quality:**
- `npm run lint` - Check code with ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format with Prettier

### Environment Variables Reference

**Required:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Supabase anon/public key
- `OPENROUTER_API_KEY` - OpenRouter API key for AI features

**Optional:**
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `PUBLIC_ENV_NAME` - Environment identifier (local/integration/prod)

**Note:** In Cloudflare Workers production, these are accessed via `context.locals.runtime.env`

### Common Issues & Solutions

1. **Port 3000 Already in Use**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   # Or change port in astro.config.mjs
   ```

2. **Supabase Connection Errors**
   - Verify URL and key in .env
   - Check project is not paused in Supabase dashboard
   - Ensure Row Level Security (RLS) policies are applied (see migrations)

3. **OpenRouter API Errors**
   - Verify API key is active
   - Check quota limits in OpenRouter dashboard
   - Feature can be disabled via feature flags if needed

4. **TypeScript Errors After Migration Updates**
   ```bash
   # Regenerate Supabase types
   npx supabase gen types typescript --project-id <your-project-id> > src/db/database.types.ts
   ```

5. **E2E Tests Failing**
   - Ensure test database is clean: check `e2e/helpers/db-cleanup.ts`
   - Install Playwright browsers: `npx playwright install`
   - Check .env.test has separate test database credentials

6. **React Query DevTools Not Showing**
   - DevTools only work in development mode
   - Check `src/lib/providers/QueryClientProvider.tsx` includes `@tanstack/react-query-devtools`

7. **Cloudflare Build Failures**
   - Check `astro.config.mjs` has correct adapter configuration
   - Verify `wrangler.toml` exists and is properly configured
   - Ensure Node.js version matches Cloudflare Workers compatibility

## Helpful Resources

### Official Documentation

**Framework & Libraries:**
- **Astro Documentation:** https://docs.astro.build/
  - [Server-side Rendering](https://docs.astro.build/en/guides/server-side-rendering/)
  - [API Routes](https://docs.astro.build/en/core-concepts/endpoints/)
  - [Middleware](https://docs.astro.build/en/guides/middleware/)
  - [Integrations](https://docs.astro.build/en/guides/integrations-guide/)

- **React Documentation:** https://react.dev/
  - [Hooks Reference](https://react.dev/reference/react)
  - [React 19 Features](https://react.dev/blog/2024/12/05/react-19)

- **TanStack Query (React Query):** https://tanstack.com/query/latest
  - [Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
  - [Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
  - [Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)

- **React Hook Form:** https://react-hook-form.com/
  - [Controller API](https://react-hook-form.com/docs/usecontroller/controller)
  - [Resolver (Zod)](https://react-hook-form.com/get-started#SchemaValidation)

**Backend & Services:**
- **Supabase Documentation:** https://supabase.com/docs
  - [Auth (SSR)](https://supabase.com/docs/guides/auth/server-side)
  - [Database](https://supabase.com/docs/guides/database)
  - [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
  - [TypeScript Types](https://supabase.com/docs/guides/api/generating-types)

- **OpenRouter API:** https://openrouter.ai/docs
  - [API Reference](https://openrouter.ai/docs#quick-start)
  - [Model Selection](https://openrouter.ai/docs#models)

**Deployment & Infrastructure:**
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/
  - [Astro on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
  - [Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)
  - [Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)

- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/

**Testing:**
- **Vitest:** https://vitest.dev/
  - [API Reference](https://vitest.dev/api/)
  - [Mocking](https://vitest.dev/guide/mocking.html)

- **Playwright:** https://playwright.dev/
  - [Test Runner](https://playwright.dev/docs/intro)
  - [Page Object Model](https://playwright.dev/docs/pom)
  - [Best Practices](https://playwright.dev/docs/best-practices)

**UI Components:**
- **Shadcn/ui:** https://ui.shadcn.com/
  - [Component Examples](https://ui.shadcn.com/docs/components/)
  - [Theming](https://ui.shadcn.com/docs/theming)

- **Radix UI (Primitives):** https://www.radix-ui.com/primitives
- **Tailwind CSS v4:** https://tailwindcss.com/docs
- **Lucide Icons:** https://lucide.dev/icons/

**Validation & Type Safety:**
- **Zod:** https://zod.dev/
  - [Schema Definition](https://zod.dev/?id=primitives)
  - [Error Handling](https://zod.dev/?id=error-handling)

- **TypeScript:** https://www.typescriptlang.org/docs/

### Project-Specific Resources

**Codebase Navigation:**
- `README.md` - Project overview and quick start
- `package.json` - Available scripts and dependencies
- `.ai/onboarding.md` - This comprehensive onboarding guide
- `e2e/README.md` - E2E testing documentation
- `src/features/README.md` - Feature flag system documentation

**Database Schema:**
- `supabase/migrations/` - Database migration files (read in order)
- `src/db/database.types.ts` - Generated TypeScript types from Supabase

**Architecture Patterns:**
- `src/components/auth/LoginForm.tsx` - Reference form implementation
- `src/lib/services/sessions/createSession.ts` - Service layer pattern example
- `src/pages/api/sessions/ai/index.ts` - API endpoint pattern example
- `e2e/pages/DashboardPage.ts` - Page Object Model example

### Learning Path Resources

**For Understanding Astro + React Islands:**
- [Astro Islands Architecture](https://docs.astro.build/en/concepts/islands/)
- [When to Use client: Directives](https://docs.astro.build/en/reference/directives-reference/#client-directives)

**For React Query Migration:**
- [Practical React Query](https://tkdodo.eu/blog/practical-react-query) (TkDodo's blog)
- [React Query as State Manager](https://tkdodo.eu/blog/react-query-as-a-state-manager)

**For Cloudflare Workers:**
- [Workers vs. Traditional Servers](https://developers.cloudflare.com/workers/learning/how-workers-works/)
- [Compatibility Dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/)

**For Testing:**
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)

### Community & Support

**Issue Tracker:**
- GitHub Issues page for bug reports and feature requests
- Check existing issues before creating new ones

**Contribution Guidelines:**
- Follow commit message conventions: `feat:`, `refactor:`, `chore:`
- Run linter before committing: `npm run lint:fix`
- Include tests with feature changes
- Update E2E tests for user-facing changes

**Code Review Checklist:**
- [ ] TypeScript types properly defined
- [ ] Zod schemas synchronized (client + server)
- [ ] Error handling implemented
- [ ] Accessibility attributes added (ARIA, semantic HTML)
- [ ] Unit tests passing
- [ ] E2E tests updated if needed
- [ ] No linter errors
- [ ] DTOs mapped if database schema touched

### Additional Tools

**VS Code Extensions (Recommended):**
- Astro (astro-build.astro-vscode)
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)
- Playwright Test for VSCode (ms-playwright.playwright)

**Browser Extensions:**
- React Developer Tools
- TanStack Query DevTools (integrated in app during dev)

---

## Summary

This Pull-Up Training Tracker is a production-ready application built with modern web technologies, emphasizing:
- **Type Safety:** TypeScript + Zod validation throughout
- **User Experience:** Accessible, responsive, real-time feedback
- **Testing:** Comprehensive unit + E2E coverage
- **Architecture:** Clean separation of concerns (components, services, API)
- **Deployment:** Multi-runtime support (Node.js dev, Cloudflare Workers prod)

The codebase demonstrates mature patterns in form handling, state management, error handling, and testing. As a new developer, focus on understanding the form architecture pattern first (Days 3-4 in Next Steps), as it's consistently applied throughout the application and will give you a strong foundation for contributing effectively.
