import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

export function KpiCard({ label, value, description, icon: Icon, iconColor }: KpiCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          {Icon && (
            <div className={cn("rounded-lg bg-accent/50 p-2", iconColor)}>
              <Icon className="size-4" aria-hidden="true" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description && <CardDescription className="mt-1">{description}</CardDescription>}
      </CardContent>
    </Card>
  );
}
