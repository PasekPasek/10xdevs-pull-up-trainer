# Project Onboarding: Pull-Up Training Tracker

## Welcome

Welcome to the Pull-Up Training Tracker project! This is a mobile-responsive web application designed to help advanced fitness enthusiasts systematically track their pull-up training progress and receive AI-powered training session recommendations.

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

- **Role:** Contains all components related to the user's main dashboard, including displaying active sessions, AI quotas, and providing primary actions.
- **Key Files/Areas:**
  - Views: `DashboardView.tsx`, `ActiveSessionCard.tsx`, `LastCompletedCard.tsx`
  - Modals/Dialogs: `AIWizardModal.tsx`, `EditSessionDialog.tsx`, `SessionCompleteDialog.tsx`
- **Top Contributed Files:** `DashboardView.tsx`
- **Recent Focus:** Recent work in this area seems to be focused on building out the core user dashboard experience for managing and viewing training sessions.

### `src/components/auth`

- **Role:** Handles user authentication, including login and registration.
- **Key Files/Areas:**
  - Forms: `LoginForm.tsx`, `RegisterForm.tsx`
  - Form Providers: `LoginFormWithProvider.tsx`, `RegisterFormWithProvider.tsx`
- **Top Contributed Files:** `LoginForm.tsx`, `RegisterForm.tsx`
- **Recent Focus:** The focus has been on implementing a robust and user-friendly authentication flow.

### `src/components/sessions`

- **Role:** Components for creating, editing, and viewing training sessions.
- **Key Files/Areas:**
  - Forms: `SessionForm.tsx`, `SessionFormWrapper.tsx`
  - Views: `SessionDetailsView.tsx`
- **Top Contributed Files:** `SessionForm.tsx`
- **Recent Focus:** Development has been centered on the user's interaction with training session data.

### `src/pages`

- **Role:** Defines the application's routes and API endpoints.
- **Key Files/Areas:**
  - Astro Pages: `dashboard.astro`, `history.astro`, `login.astro`, `register.astro`
  - API Endpoints: `src/pages/api/sessions/`, `src/pages/api/auth/`
- **Top Contributed Files:** `src/pages/api/sessions/ai/index.ts`, `src/pages/login.astro`
- **Recent Focus:** Building out the core pages of the application and the API endpoints to support session management and AI features.

### `src/lib/services/sessions`

- **Role:** Contains the business logic for session management, including creating, updating, deleting, and listing sessions.
- **Key Files/Areas:**
  - CRUD operations: `createSession.ts`, `updateSession.ts`, `deleteSession.ts`, `listSessions.ts`
- **Recent Focus:** Implementing the core business logic for managing user training sessions.

### `src/lib/services/ai`

- **Role:** Manages interactions with the OpenRouter AI service for generating training sessions.
- **Key Files/Areas:**
  - `generateSession.ts`: Logic for generating AI-powered sessions.
  - `getQuota.ts`: Checks the user's AI generation quota.
  - `openrouter.ts`: Client for interacting with the OpenRouter API.
- **Recent Focus:** Integrating AI capabilities to provide users with personalized training recommendations.

## Key Contributors

- **PasekPasek:** Appears to be the primary contributor across all key areas of the application, including frontend, backend, and services.

## Overall Takeaways & Recent Focus

1.  **Feature Development:** The primary focus has been on building out the core features of the application, including user authentication, session management, and AI-powered session generation.
2.  **UI/UX Refinement:** Significant effort has been put into creating a clean and usable interface using Shadcn/ui components.
3.  **API Development:** The API endpoints under `src/pages/api` are being actively developed to support the frontend functionality.
4.  **Testing:** The presence of `e2e` and unit tests within service directories indicates a focus on ensuring application quality.

## Potential Complexity/Areas to Note

-   **AI Integration:** The logic in `src/lib/services/ai` for interacting with OpenRouter and handling different AI models might be complex.
-   **State Management:** Understanding how session state (`planned`, `in-progress`, `completed`, `failed`) is managed throughout the application will be crucial.
-   **Astro & React Integration:** The project uses both Astro for static pages and React for dynamic components. Understanding how they interoperate is important.

## Questions for the Team

1.  What is the long-term vision for the AI-powered recommendations? Are there plans to incorporate more complex algorithms or user data points?
2.  Could you walk me through the end-to-end testing philosophy and how new tests are added for features?
3.  What are the biggest technical challenges the team is currently facing?
4.  How is the application's performance monitored, especially the AI service response times?
5.  What is the process for deploying changes to production?
6.  Are there any established coding conventions or patterns that I should be aware of beyond what's in the linter configuration?
7.  How does the ETag/concurrency control (`ETagConflictDialog.tsx`) work in practice?

## Next Steps

1.  **Set up the development environment:** Follow the instructions in the `README.md` to get the project running locally. This will involve cloning the repository, installing dependencies, and setting up environment variables.
2.  **Explore the authentication flow:** Run the application and trace the code from the registration form (`src/components/auth/RegisterForm.tsx`) to the API endpoint (`src/pages/api/auth/register.ts`) and the Supabase client.
3.  **Create a training session:** Use the application to manually create a new training session. Follow the code path from the `SessionForm.tsx` to the `createSession.ts` service.
4.  **Run the tests:** Execute the unit tests with `npm run test` and the end-to-end tests with `npm run test:e2e` to see how they work.
5.  **Review recent pull requests:** Check the project's repository on GitHub for recent pull requests to understand the current development workflow and ongoing discussions.

## Development Environment Setup

1.  **Prerequisites:**
    -   Node.js v22.14.0
    -   npm (included with Node.js)
    -   A Supabase Account for database and authentication.
    -   An Openrouter.ai API Key for AI features.
2.  **Dependency Installation:** `npm install`
3.  **Building the Project:** `npm run build`
4.  **Running the Application/Service:** `npm run dev`
5.  **Running Tests:**
    -   Unit/Integration: `npm run test`
    -   End-to-end: `npm run test:e2e`
6.  **Common Issues:** Common issues section not found in checked files.

## Helpful Resources

-   **Documentation:** Links to documentation for the tech stack can be found in the `README.md`.
-   **Issue Tracker:** Not explicitly linked, but assumed to be the GitHub Issues page for the repository.
-   **Contribution Guide:** Contribution guide not found in checked files.
-   **Communication Channels:** Communication channel information not found in checked files.
-   **Learning Resources:** Specific learning resources section not found in checked files.
