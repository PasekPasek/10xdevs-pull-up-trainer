import type { SessionDTO } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, Star } from "lucide-react";

interface LastCompletedCardProps {
  session: SessionDTO;
  className?: string;
}

const statusVariant: Record<
  SessionDTO["status"],
  { label: string; variant: "secondary" | "default" | "outline" | "destructive" }
> = {
  planned: { label: "Planned", variant: "secondary" },
  in_progress: { label: "In progress", variant: "default" },
  completed: { label: "Completed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function LastCompletedCard({ session, className }: LastCompletedCardProps) {
  const { label, variant } = statusVariant[session.status];

  return (
    <Card className={cn("border-border/80", className)}>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={variant}>{label}</Badge>
            <CardTitle className="text-base font-semibold">Last completed session</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">{formatDate(session.sessionDate)}</CardDescription>
        </div>
        <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
          <Star className="size-4" aria-hidden="true" />
          {session.totalReps} total reps across five sets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>Sets</span>
            <span>Total reps: {session.totalReps}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {session.sets.map((reps, index) => (
              <div key={index} className="flex flex-col items-center rounded-lg border bg-accent/40 px-2 py-2">
                <span className="text-xs text-muted-foreground">Set {index + 1}</span>
                <span className="text-base font-semibold">{reps ?? "-"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          {session.rpe ? <span>Reported RPE: {session.rpe}</span> : null}
          {session.aiComment ? (
            <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Sparkles className="mt-0.5 size-4 text-primary" aria-hidden="true" />
              <p className="leading-snug text-primary/90">
                {session.aiComment}
                {session.isModified ? <span className="ml-2 text-xs uppercase text-primary">(modified)</span> : null}
              </p>
            </div>
          ) : session.isModified ? (
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Session modified after completion
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
