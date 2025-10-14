import { useEffect, useMemo, useState } from "react";

import type { AiQuotaDTO } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiQuotaBadgeProps {
  quota: AiQuotaDTO;
  className?: string;
}

interface Countdown {
  label: string;
  seconds: number;
}

function useQuotaCountdown(resetsAt: string): Countdown {
  const calculate = useMemo(() => {
    const resetDate = new Date(resetsAt).getTime();

    return () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((resetDate - now) / 1000));

      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (diff === 0) {
        return {
          label: "Resets soon",
          seconds: 0,
        } satisfies Countdown;
      }

      if (hours > 0) {
        return {
          label: `Resets in ${hours}h ${minutes}m`,
          seconds: diff,
        } satisfies Countdown;
      }

      return {
        label: `Resets in ${minutes}m ${seconds}s`,
        seconds: diff,
      } satisfies Countdown;
    };
  }, [resetsAt]);

  const [countdown, setCountdown] = useState<Countdown>(() => calculate());

  useEffect(() => {
    setCountdown(calculate());

    const interval = window.setInterval(() => {
      setCountdown(calculate());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [calculate]);

  return countdown;
}

export function AIQuotaBadge({ quota, className }: AiQuotaBadgeProps) {
  const countdown = useQuotaCountdown(quota.resetsAt);
  const isDepleted = quota.remaining <= 0;
  const tooltipLabel = useMemo(() => new Date(quota.resetsAt).toLocaleString(), [quota.resetsAt]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-2 shadow-sm",
            isDepleted ? "border-destructive/40 bg-destructive/10" : "border-border bg-card",
            className
          )}
        >
          <div className="flex items-center gap-2">
            {isDepleted ? (
              <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
            ) : (
              <Timer className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI quota</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold">{quota.remaining}</span>
                <span className="text-sm text-muted-foreground">/ {quota.limit}</span>
              </div>
            </div>
          </div>
          <Badge variant={isDepleted ? "destructive" : "secondary"} aria-live="polite" aria-atomic="true">
            {countdown.label}
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent sideOffset={8} className="text-xs">
        {tooltipLabel}
      </TooltipContent>
    </Tooltip>
  );
}
