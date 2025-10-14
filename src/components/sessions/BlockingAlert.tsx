import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface BlockingAlertProps {
  message: string;
  actions?: React.ReactNode;
}

/**
 * BlockingAlert displays a critical error that prevents form submission.
 * Used when an active session already exists or other blocking conditions occur.
 */
export function BlockingAlert({ message, actions }: BlockingAlertProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="size-4" />
      <AlertTitle>Cannot Create Session</AlertTitle>
      <AlertDescription>
        <p className="mb-2">{message}</p>
        {actions && <div className="flex gap-2 mt-3">{actions}</div>}
      </AlertDescription>
    </Alert>
  );
}
