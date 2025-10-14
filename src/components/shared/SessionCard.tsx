import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { SessionDTO } from "@/types";
import { formatLocalDate } from "@/lib/utils/date";
import { formatSets, computeTotal } from "@/lib/utils/session";
import { StatusBadge } from "./StatusBadge";
import { Dumbbell, Calendar, Target } from "lucide-react";

interface SessionCardProps {
  session: SessionDTO;
  variant?: "full" | "condensed";
  className?: string;
}

export function SessionCard({ session, variant = "full", className }: SessionCardProps) {
  const totalReps = computeTotal(session.sets);

  if (variant === "condensed") {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div>
              <StatusBadge status={session.status} />
            </div>
            <div>
              <div className="text-sm font-medium">{formatLocalDate(session.sessionDate)}</div>
              <div className="text-sm text-muted-foreground">{formatSets(session.sets)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">{totalReps} reps</div>
            {session.rpe && <div className="text-xs text-muted-foreground">RPE: {session.rpe}</div>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" aria-hidden="true" />
            <span>{formatLocalDate(session.sessionDate)}</span>
          </CardTitle>
          <StatusBadge status={session.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Dumbbell className="h-4 w-4" aria-hidden="true" />
            <span>Sets</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {session.sets.map((set, idx) => (
              <div key={idx} className="rounded-md border bg-muted/50 p-2 text-center text-sm font-medium">
                {set ?? "-"}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4" aria-hidden="true" />
            <span>Total Reps</span>
          </div>
          <span className="text-lg font-bold">{totalReps}</span>
        </div>

        {session.rpe && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">RPE</span>
              <Badge variant="secondary">{session.rpe} / 10</Badge>
            </div>
          </>
        )}

        {session.aiComment && (
          <>
            <Separator />
            <div className="space-y-1">
              <div className="text-sm font-medium">AI Comment</div>
              <p className="text-sm text-muted-foreground">{session.aiComment}</p>
              {session.isModified && (
                <Badge variant="outline" className="text-xs">
                  (modified)
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
