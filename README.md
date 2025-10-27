# Pull-Up Training Tracker

A mobile-responsive web application designed to help advanced fitness enthusiasts systematically track their pull-up training progress and receive AI-powered training session recommendations. Built for users capable of 15-20+ pull-ups who want data-driven progression planning without requiring extensive knowledge of training periodization.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Features

- **Session Tracking**: Record training sessions with 5 sets of pull-ups, RPE ratings, and progress notes
- **AI-Powered Recommendations**: Generate optimized training sessions based on your performance history using advanced AI models
- **Training History**: View, filter, and analyze your complete training history with pagination
- **Session State Management**: Track sessions through planned, in-progress, completed, and failed states
- **Smart Warnings**: Get notified about rest period recommendations and multiple sessions per day
- **Progress Insights**: AI-generated comments provide technique tips and encouragement
- **Mobile-First Design**: Optimized for recording workouts on mobile devices in gym environments
- **Accessibility**: WCAG 2.1 Level AA compliant for inclusive user experience

## Tech Stack

### Frontend

- **[Astro](https://astro.build/) 5.13.7** - Modern web framework for fast, content-focused applications
- **[React](https://react.dev/) 19.1.1** - UI library for interactive components
- **[TypeScript](https://www.typescriptlang.org/) 5** - Type-safe JavaScript development
- **[Tailwind CSS](https://tailwindcss.com/) 4.1.13** - Utility-first CSS framework
- **[Shadcn/ui](https://ui.shadcn.com/)** - Accessible React component library

### Backend

- **[Supabase](https://supabase.com/)** - Backend-as-a-Service platform providing:
  - PostgreSQL database
  - Built-in authentication
  - Real-time subscriptions
  - Row-level security

### AI Integration

- **[Openrouter.ai](https://openrouter.ai/)** - Unified API for multiple AI models:
  - Access to OpenAI, Anthropic, Google, and other providers
  - Financial limits and cost control
  - Model flexibility for optimal performance and cost efficiency

### Testing

- **[Vitest](https://vitest.dev/)** - Unit and integration testing
- **[Testing Library](https://testing-library.com/docs/react-testing-library/intro/)** - React component testing
- **[MSW](https://mswjs.io/)** / **[Nock](https://github.com/nock/nock)** - HTTP request mocking for tests
- **[Playwright](https://playwright.dev/)** - End-to-end testing (Chromium/Firefox + mobile WebKit)
- **[axe-core](https://www.deque.com/axe/core-documentation/)** - Accessibility testing integration

### DevOps

- **GitHub Actions** - CI/CD pipeline automation
- **Cloudflare Pages** - Edge-based application hosting

## Prerequisites

- **Node.js** v22.14.0 (as specified in `.nvmrc`)
- **npm** (comes with Node.js)
- **Supabase Account** - For database and authentication
- **Openrouter.ai API Key** - For AI-powered session generation

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/10xdevs-pull-up-trainer.git
cd 10xdevs-pull-up-trainer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Openrouter.ai Configuration
OPENROUTER_API_KEY=your_openrouter_api_key

# Application Configuration
PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 5. Build for Production

```bash
npm run build
npm run preview
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build application for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Automatically fix ESLint issues
- `npm run format` - Format code with Prettier

## Project Structure

```
.
├── src/
│   ├── layouts/        # Astro layouts
│   ├── pages/          # Astro pages and routes
│   │   ├── api/        # API endpoints
│   │   └── index.astro # Main dashboard
│   ├── middleware/     # Astro middleware (authentication, etc.)
│   │   └── index.ts
│   ├── components/     # UI components (Astro & React)
│   │   └── ui/         # Shadcn/ui components
│   ├── db/             # Supabase clients and types
│   ├── lib/            # Services and helper functions
│   ├── types.ts        # Shared TypeScript types
│   ├── styles/         # Global styles
│   └── assets/         # Static internal assets
├── public/             # Public static assets
├── .ai/                # AI development rules and documentation
├── database/           # Database migrations and schemas
└── astro.config.mjs    # Astro configuration
```

## Project Scope

### MVP Features (In Scope)

✅ **Authentication & User Management**

- Email/password authentication
- User profile management

✅ **Session Management**

- Create manual training sessions (5 sets per session)
- Track session states: planned, in progress, completed, failed
- Record RPE (Rate of Perceived Exertion) ratings (1-10 scale)
- Edit/delete planned and in-progress sessions
- Immutable completed and failed sessions

✅ **AI-Powered Features**

- AI session generation for new users based on max pull-up count
- AI recommendations based on training history (last 5-10 sessions)
- Progress comments with technique tips and encouragement
- Rate limiting: 5 AI sessions per day per user

✅ **Training History**

- Paginated session history (10 per page)
- Filtering by date range and session status
- Sort by newest/oldest first
- Filter persistence in local storage

✅ **Data Management**

- Timezone-aware date handling (UTC storage, local display)
- Data integrity and validation

✅ **User Experience**

- Mobile-responsive design
- Rest period warnings (24-hour recommendations)
- Multiple sessions per day warnings
- Loading states and error handling
- Accessibility (WCAG 2.1 Level AA)

✅ **Admin Dashboard**

- User and session metrics
- AI generation success rates
- Performance monitoring

### Post-MVP Features (Out of Scope)

❌ Email notifications and reminders  
❌ Performance charts and graphs  
❌ Social features and leaderboards  
❌ Weight tracking and other exercise types  
❌ Offline functionality and PWA features  
❌ Native mobile applications  
❌ Integration with fitness wearables  
❌ Custom exercise variations (weighted, different grips)  
❌ Video tutorials and form analysis  
❌ Community features and coaching

## Project Status

🚧 **In Active Development** - MVP Phase

This project is currently in the MVP (Minimum Viable Product) development phase. Core features are being implemented according to the [Product Requirements Document](.ai/prd.md).

### Success Criteria

The MVP will be considered successful when:

- **70%** of registered users complete at least 1 training session
- **60%** of users generate at least 1 AI-powered session
- **95%** AI generation success rate
- No critical system outages or data loss incidents

### Current Development Focus

- [x] Database schema and migrations
- [x] Authentication system with Supabase
- [x] Session creation and management
- [x] AI integration with Openrouter.ai
- [x] Training history and filtering
- [x] Admin dashboard
- [x] Accessibility compliance
- [x] Mobile responsiveness
- [ ] Data export functionality (JSON/CSV)
- [ ] Password reset functionality
- [ ] Account deletion

## License

MIT

---

**Note**: This project follows best practices for accessibility, security, and code quality. Contributions are welcome! Please refer to the AI development rules in `.cursor/rules/` for coding guidelines.
