import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAdminMetrics } from "@/lib/services/admin/hooks";
import { KpiCardGrid } from "@/components/admin/KpiCardGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, ShieldAlert } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 401/403
        if (error instanceof Error && "status" in error) {
          const status = (error as { status?: number }).status;
          if (status === 401 || status === 403) return false;
        }
        return failureCount < 2;
      },
    },
  },
});

function AdminMetricsContent() {
  const { data, isLoading, isError, error, refetch } = useAdminMetrics();

  // Check for unauthorized errors
  const isUnauthorized =
    isError &&
    error instanceof Error &&
    "status" in error &&
    ((error as { status?: number }).status === 401 || (error as { status?: number }).status === 403);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Admin Metrics</h1>
            <p className="text-muted-foreground mt-1 text-sm">Platform-wide KPIs and performance indicators</p>
          </div>
          {!isLoading && !isUnauthorized && (
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 self-start md:self-auto">
              <RefreshCcw className="size-4" />
              Refresh
            </Button>
          )}
        </header>

        {isError && isUnauthorized ? (
          <Alert variant="destructive" className="border-destructive/60 bg-destructive/10">
            <AlertDescription className="flex items-center gap-2">
              <ShieldAlert className="size-5" aria-hidden="true" />
              <div>
                <p className="font-medium">Unauthorized. Admin access required.</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Please{" "}
                  <a href="/login" className="underline underline-offset-4 hover:text-foreground">
                    log in
                  </a>{" "}
                  with an admin account to view these metrics.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        ) : isError ? (
          <Alert variant="destructive" className="border-destructive/60 bg-destructive/10 text-destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-sm">
                <AlertCircle className="size-4" aria-hidden="true" />
                Failed to load admin metrics. Please try again.
              </span>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCcw className="size-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <KpiCardGrid metrics={data} isLoading={isLoading} />
        )}
      </div>
    </div>
  );
}

export default function AdminMetricsView() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminMetricsContent />
      <Toaster />
    </QueryClientProvider>
  );
}
