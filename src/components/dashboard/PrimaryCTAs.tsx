import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DashboardSnapshotDTO } from "@/types";
import { Sparkles, PlusIcon, Ban } from "lucide-react";
import { hasNoQuota } from "@/components/dashboard/types";

interface PrimaryCTAsProps {
  snapshot: DashboardSnapshotDTO;
  onCreateAi: () => void;
  onCreateManual: () => void;
  disabled?: boolean;
}

export function PrimaryCTAs({ snapshot, onCreateAi, onCreateManual, disabled }: PrimaryCTAsProps) {
  const hasActiveSession = Boolean(snapshot.activeSession);
  const depleted = hasNoQuota(snapshot.aiQuota);
  const aiDisabled = disabled || depleted || hasActiveSession;
  const manualDisabled = disabled || hasActiveSession;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button onClick={onCreateAi} disabled={aiDisabled} className="flex-1 min-w-[220px] justify-center gap-2" data-testid="create-ai-button">
          <Sparkles className="size-4" />
          Create with AI
        </Button>
        <Button
          variant="outline"
          onClick={onCreateManual}
          disabled={manualDisabled}
          className="flex-1 min-w-[220px] justify-center gap-2"
          data-testid="create-manual-button"
        >
          <PlusIcon className="size-4" />
          Create manually
        </Button>
      </div>

      {hasActiveSession ? (
        <Alert variant="default" className="border-secondary/60 bg-secondary/20 text-foreground">
          <AlertDescription className="flex items-center gap-2 text-sm">
            <Ban className="size-4" aria-hidden="true" />
            You need to complete or delete the current session before creating a new one.
          </AlertDescription>
        </Alert>
      ) : null}

      {depleted ? (
        <Alert variant="destructive" className="border-destructive/60 bg-destructive/10 text-destructive">
          <AlertDescription className="flex items-start gap-2 text-sm">
            <Sparkles className="size-4" aria-hidden="true" />
            Your AI quota is depleted. It will reset soon. You can still create sessions manually.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
