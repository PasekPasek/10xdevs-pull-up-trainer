import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ApiWarning } from "@/types";

export interface InlineAlertProps {
  warnings: ApiWarning[];
}

/**
 * InlineAlert displays non-blocking warnings from preflight validation.
 * Shows warnings like REST_PERIOD or MULTIPLE_SAME_DAY that inform the user but don't prevent submission.
 */
export function InlineAlert({ warnings }: InlineAlertProps) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <Alert className="mb-4">
      <AlertTriangle className="size-4" />
      <AlertTitle>Please Note</AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside space-y-1">
          {warnings.map((warning, index) => (
            <li key={index}>
              <span className="font-medium">{warning.code}:</span> {warning.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
