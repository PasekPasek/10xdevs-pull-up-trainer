import { Badge } from "@/components/ui/badge";
import type { SessionStatus } from "@/types";
import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: SessionStatus;
}

const statusConfig: Record<
  SessionStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ReactNode;
  }
> = {
  planned: {
    label: "Planned",
    variant: "outline",
    icon: <Circle className="h-3 w-3" aria-hidden="true" />,
  },
  in_progress: {
    label: "In Progress",
    variant: "default",
    icon: <Clock className="h-3 w-3" aria-hidden="true" />,
  },
  completed: {
    label: "Completed",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" aria-hidden="true" />,
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" aria-hidden="true" />,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="inline-flex items-center gap-1">
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}
