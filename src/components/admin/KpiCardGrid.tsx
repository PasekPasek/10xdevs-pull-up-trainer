import type { AdminKpiSummaryDTO } from "@/types";
import { KpiCard } from "@/components/admin/KpiCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Users, Activity, Zap, TrendingUp, TrendingDown, GitMerge } from "lucide-react";

interface KpiCardGridProps {
  metrics?: AdminKpiSummaryDTO;
  isLoading?: boolean;
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function formatCorrelation(value: number): string {
  return value.toFixed(3);
}

export function KpiCardGrid({ metrics, isLoading }: KpiCardGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="mb-1 h-10 w-32" />
            <Skeleton className="h-3 w-40" />
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        label="Total Users"
        value={formatNumber(metrics.totalUsers)}
        description="Registered users on the platform"
        icon={Users}
        iconColor="text-blue-600 dark:text-blue-400"
      />

      <KpiCard
        label="Total Sessions"
        value={formatNumber(metrics.totalSessions)}
        description="All training sessions created"
        icon={Activity}
        iconColor="text-purple-600 dark:text-purple-400"
      />

      <KpiCard
        label="Activation Rate"
        value={formatPercentage(metrics.activationRate)}
        description="Users with at least one completed session"
        icon={TrendingUp}
        iconColor="text-green-600 dark:text-green-400"
      />

      <KpiCard
        label="AI Adoption Rate"
        value={formatPercentage(metrics.aiAdoptionRate)}
        description="Users utilizing AI-generated sessions"
        icon={Zap}
        iconColor="text-amber-600 dark:text-amber-400"
      />

      <KpiCard
        label="Failure Rate"
        value={formatPercentage(metrics.failureRate)}
        description="Sessions marked as failed"
        icon={TrendingDown}
        iconColor="text-red-600 dark:text-red-400"
      />

      <KpiCard
        label="Rest Period Correlation"
        value={formatCorrelation(metrics.restPeriodCorrelation)}
        description="Statistical correlation metric"
        icon={GitMerge}
        iconColor="text-slate-600 dark:text-slate-400"
      />
    </div>
  );
}
