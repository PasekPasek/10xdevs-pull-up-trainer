import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle } from "lucide-react";

import { useSession } from "@/lib/services/sessions/hooks";
import { SessionCard } from "@/components/shared/SessionCard";
import { ActionBar } from "./ActionBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isHttpError } from "@/lib/utils/httpError";

interface SessionDetailsViewInnerProps {
  sessionId: string;
}

function SessionDetailsViewInner({ sessionId }: SessionDetailsViewInnerProps) {
  const { data: session, isLoading, error, refetch } = useSession(sessionId);

  const handleBackToDashboard = () => {
    window.location.href = "/dashboard";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-[400px] w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  // Error states
  if (error) {
    if (isHttpError(error) && error.status === 404) {
      return (
        <div className="space-y-6">
          <Button variant="ghost" onClick={handleBackToDashboard} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">Session not found</h2>
              <p className="mb-6 text-center text-muted-foreground">
                The session you&apos;re looking for doesn&apos;t exist or has been deleted.
              </p>
              <Button onClick={handleBackToDashboard}>Go to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Network or other errors
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBackToDashboard} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {isHttpError(error) ? error.message : "Failed to load session. Please try again."}
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
          <Button onClick={handleBackToDashboard}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // No session data
  if (!session) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={handleBackToDashboard} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <SessionCard session={session} variant="full" />

      <ActionBar session={session} />
    </div>
  );
}

interface SessionDetailsViewProps {
  sessionId: string;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function SessionDetailsView({ sessionId }: SessionDetailsViewProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionDetailsViewInner sessionId={sessionId} />
    </QueryClientProvider>
  );
}
