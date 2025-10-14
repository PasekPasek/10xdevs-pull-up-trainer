# View Implementation Plan — History

## 1. Overview

The History view lists sessions in a paginated, filterable, and sortable manner (10 per page). It persists filters and sort preferences and provides empty states.

## 2. View Routing

- Path: `/history`
- Access: authenticated only.

## 3. Component Structure

- `HistoryPage` (Astro)
  - `HistoryView` (React)
    - `FiltersPanel`
      - `StatusCheckboxGroup`
      - `DateRangePicker` (presets + custom)
      - `SortToggle`
      - `ClearFiltersButton`
    - `SessionList` (paginated)
      - `SessionCard` (condensed)
    - `PaginationControl`

## 4. Component Details

### HistoryView

- Description: Coordinates filters, fetch, and pagination; syncs state to URL and localStorage.
- Events:
  - Change filters → reset to page 1; refetch.
  - Change sort → reset to page 1; refetch.
  - Change page → refetch.

### FiltersPanel

- Purpose: Controls for status multi-select, date presets/custom, and sort order.
- Validation: ensure `dateFrom <= dateTo`.

### SessionList / SessionCard

- Purpose: Render sessions compactly with date, status, sets total, and link to details.

### PaginationControl

- Purpose: Previous/Next and page numbers; disable appropriately; announce current page.

## 5. Types

- From `src/types.ts`: `ListSessionsQuery`, `ListSessionsResponse`, `SessionDTO`, `SessionStatus`.
- View types:

```ts
export type HistoryFilters = {
  status?: SessionStatus[];
  dateFrom?: string;
  dateTo?: string;
  sort?: "sessionDate_desc" | "sessionDate_asc";
};
```

## 6. State Management

- TanStack Query:
  - `useHistory(query)` → `GET /sessions` with filters, sort, and pagination.
- Persist filters to `localStorage`; initialize from URL and storage.
- Use `keepPreviousData` for pagination.

## 7. API Integration

- `GET /sessions` with query params: `page`, `pageSize=10`, `status[]`, `dateFrom`, `dateTo`, `sort`.
- Response: `ListSessionsResponse` with `sessions`, `pagination` meta.

## 8. User Interactions

- Toggle statuses, set date ranges, change sort, paginate.
- Clear filters resets to defaults.
- Clicking a card navigates to `/sessions/:id`.

## 9. Conditions and Validation

- Validate date range.
- Enforce `pageSize=10` client-side.
- Maintain `Newest First` default sort.

## 10. Error Handling

- 401: redirect to `/login`.
- 400 invalid filters: show inline error/Toast and revert to last valid.
- Network/5xx: show skeletons and retry affordance.
- Empty states for no data / no results.

## 11. Implementation Steps

1. Create `src/pages/history.astro`; mount `HistoryView`.
2. Implement `useHistory` hook in `src/lib/services/sessions/hooks.ts`.
3. Build components: `FiltersPanel`, `SessionCard` (condensed), `PaginationControl`.
4. URL + localStorage sync for filters/sort.
5. Add empty states and skeletons.
6. Test: filtering, sorting, pagination, persistence, empty/no-results behavior.
