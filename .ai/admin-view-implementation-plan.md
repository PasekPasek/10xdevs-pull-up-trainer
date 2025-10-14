# View Implementation Plan — Admin Metrics

## 1. Overview

The Admin view shows admin-only KPIs: total users, total sessions, AI generation success rate, activation rate, and related metrics. Access is restricted to users with `role=admin`.

## 2. View Routing

- Path: `/admin`
- Access: authenticated, admin-only (middleware and client check).

## 3. Component Structure

- `AdminPage` (Astro)
  - `AdminMetricsView` (React)
    - `KpiCardGrid`
      - `KpiCard` × 4–6

## 4. Component Details

### AdminMetricsView

- Description: Fetches metrics; renders KPI grid with loading skeletons.
- Events: none beyond data refresh interval if desired.
- Types: `AdminMetricsResponse`.

### KpiCardGrid / KpiCard

- Purpose: Display each KPI with label, value, and optional trend.

## 5. Types

- From `src/types.ts`: `AdminMetricsResponse`, `AdminKpiSummaryDTO`.

## 6. State Management

- TanStack Query: `useAdminMetrics()` → `GET /admin/metrics`.
- Optional polling/refresh.

## 7. API Integration

- `GET /admin/metrics` (admin-only); headers with `Authorization: Bearer <token>`.

## 8. User Interactions

- None critical; possible manual refresh button.

## 9. Conditions and Validation

- Gate route and component render by admin role.

## 10. Error Handling

- 403/401: show unauthorized message and redirect to `/login`.
- Network/5xx: toast and retry button.

## 11. Implementation Steps

1. Create `src/pages/admin.astro`; mount `AdminMetricsView`.
2. Implement `useAdminMetrics` in `src/lib/services/admin/hooks.ts`.
3. Build `KpiCardGrid` and `KpiCard` components with skeletons.
4. Add admin gating in middleware and client.
5. Test: non-admin access denied, admin renders metrics.
