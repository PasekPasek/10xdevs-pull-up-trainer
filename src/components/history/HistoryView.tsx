import { useEffect, useState } from "react";
import { useListSessions } from "@/lib/services/sessions/hooks";
import type { SessionStatus, SessionSortOption } from "@/types";
import { FiltersPanel } from "./FiltersPanel";
import { SessionList } from "./SessionList";
import { PaginationControl } from "./PaginationControl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "history-filters";
const PAGE_SIZE = 10;

export interface HistoryFilters {
  status?: SessionStatus[];
  dateFrom?: string;
  dateTo?: string;
  sort?: SessionSortOption;
}

function parseFiltersFromURL(searchParams: URLSearchParams): HistoryFilters {
  const filters: HistoryFilters = {};

  const statusParam = searchParams.getAll("status");
  if (statusParam.length > 0) {
    filters.status = statusParam as SessionStatus[];
  }

  const dateFrom = searchParams.get("dateFrom");
  if (dateFrom) {
    filters.dateFrom = dateFrom;
  }

  const dateTo = searchParams.get("dateTo");
  if (dateTo) {
    filters.dateTo = dateTo;
  }

  const sort = searchParams.get("sort");
  if (sort === "sessionDate_desc" || sort === "sessionDate_asc") {
    filters.sort = sort;
  }

  return filters;
}

function serializeFiltersToURL(filters: HistoryFilters): string {
  const params = new URLSearchParams();

  if (filters.status && filters.status.length > 0) {
    filters.status.forEach((s) => params.append("status", s));
  }

  if (filters.dateFrom) {
    params.append("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.append("dateTo", filters.dateTo);
  }

  if (filters.sort) {
    params.append("sort", filters.sort);
  }

  return params.toString();
}

function loadFiltersFromStorage(): HistoryFilters {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load filters from storage:", error);
  }
  return { sort: "sessionDate_desc" };
}

function saveFiltersToStorage(filters: HistoryFilters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (error) {
    console.error("Failed to save filters to storage:", error);
  }
}

function validateDateRange(dateFrom?: string, dateTo?: string): boolean {
  if (!dateFrom || !dateTo) return true;
  return new Date(dateFrom) <= new Date(dateTo);
}

export default function HistoryView() {
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<HistoryFilters>({ sort: "sessionDate_desc" });

  // Initialize filters from URL or localStorage on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlFilters = parseFiltersFromURL(searchParams);

    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    } else {
      const storedFilters = loadFiltersFromStorage();
      setFilters(storedFilters);
    }

    setMounted(true);
  }, []);

  // Sync filters to URL and localStorage
  useEffect(() => {
    if (!mounted) return;

    const queryString = serializeFiltersToURL(filters);
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

    window.history.replaceState(null, "", newUrl);
    saveFiltersToStorage(filters);
  }, [filters, mounted]);

  const { data, isLoading, isError, error, refetch } = useListSessions({
    page,
    pageSize: PAGE_SIZE,
    status: filters.status,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sort: filters.sort || "sessionDate_desc",
  });

  const handleFiltersChange = (newFilters: HistoryFilters) => {
    // Validate date range
    if (!validateDateRange(newFilters.dateFrom, newFilters.dateTo)) {
      toast.error("Start date must be before or equal to end date");
      return;
    }

    setFilters(newFilters);
    setPage(1); // Reset to page 1 when filters change
  };

  const handleClearFilters = () => {
    setFilters({ sort: "sessionDate_desc" });
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (isError) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load sessions";
      toast.error(errorMessage);
    }
  }, [isError, error]);

  const sessions = data?.data.sessions || [];
  const pagination = data?.data.pagination;
  const hasFilters =
    (filters.status && filters.status.length > 0) ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.sort !== "sessionDate_desc";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
        <p className="mt-2 text-muted-foreground">View and filter your past training sessions</p>
      </header>

      {isError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <AlertCircle className="size-4" aria-hidden="true" />
              Failed to load sessions. Please try again.
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCcw className="size-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <FiltersPanel filters={filters} onChange={handleFiltersChange} onClear={handleClearFilters} />
        </aside>

        <main>
          {isLoading ? (
            <div className="space-y-4" role="status" aria-label="Loading sessions">
              {[...Array(PAGE_SIZE)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                <h3 className="text-lg font-semibold">{hasFilters ? "No sessions found" : "No sessions yet"}</h3>
                <p className="text-sm text-muted-foreground">
                  {hasFilters
                    ? "Try adjusting your filters to find more sessions."
                    : "Start your first training session to see it here."}
                </p>
                {hasFilters && (
                  <Button variant="outline" onClick={handleClearFilters} className="mt-4">
                    Clear Filters
                  </Button>
                )}
                {!hasFilters && (
                  <Button asChild className="mt-4">
                    <a href="/dashboard">Go to Dashboard</a>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <SessionList sessions={sessions} />

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-8">
                  <PaginationControl
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
