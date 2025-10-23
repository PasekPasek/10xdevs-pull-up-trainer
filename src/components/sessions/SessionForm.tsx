import { useEffect, useMemo, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Calendar, Clock, Loader2 } from "lucide-react";

import {
  createManualSessionFormSchema,
  getDefaultFormValues,
  type CreateManualSessionFormValues,
} from "@/lib/validation/ui/createManualSessionForm.schema";
import { useCreateSession } from "@/lib/services/sessions/hooks";
import { localDateToUtcIso, getMaxFutureDate, isPast, isTodayOrFuture } from "@/lib/utils/date";
import { computeTotal, normalizeSets } from "@/lib/utils/session";
import { isHttpError } from "@/lib/utils/httpError";
import { useSessionPreflightValidation } from "@/hooks/useSessionPreflightValidation";
import type { CreateSessionCommand } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SetsInput } from "@/components/sessions/SetsInput";
import { RpeSlider } from "@/components/sessions/RpeSlider";

import { BlockingAlert } from "./BlockingAlert";
import { InlineAlert } from "./InlineAlert";

/**
 * SessionForm component for creating manual training sessions
 * Supports planned, start-now, and historical (completed/failed) sessions
 */
export function SessionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup with react-hook-form + zod
  const form = useForm<CreateManualSessionFormValues>({
    resolver: zodResolver(createManualSessionFormSchema),
    defaultValues: getDefaultFormValues(),
    mode: "onChange",
  });

  // Watch form values for dynamic behavior using useWatch for proper re-renders
  const sessionDateLocal = useWatch({ control: form.control, name: "sessionDateLocal" });
  const status = useWatch({ control: form.control, name: "status" });
  const startNow = useWatch({ control: form.control, name: "startNow" });
  const sets = useWatch({ control: form.control, name: "sets" });
  const rpe = useWatch({ control: form.control, name: "rpe" });

  // Derived state: determine if date is past/future
  const dateIsPast = useMemo(() => {
    if (!sessionDateLocal) return false;
    try {
      return isPast(localDateToUtcIso(sessionDateLocal));
    } catch {
      return false;
    }
  }, [sessionDateLocal]);

  const dateIsTodayOrFuture = useMemo(() => {
    if (!sessionDateLocal) return false;
    try {
      return isTodayOrFuture(localDateToUtcIso(sessionDateLocal));
    } catch {
      return false;
    }
  }, [sessionDateLocal]);

  // Calculate total reps
  const totalReps = useMemo(() => computeTotal(sets), [sets]);

  // Show RPE field only for completed status
  const showRpe = status === "completed";

  // Show status selector only for past dates
  const showStatusSelector = dateIsPast;

  // Allow Start Now only for today/future
  const allowStartNow = dateIsTodayOrFuture;

  // Preflight validation using custom hook
  const { isBlocking, warnings, isValidating } = useSessionPreflightValidation({
    sessionDateLocal,
    status,
  });

  const [shouldRedirect, setShouldRedirect] = useState(false);

  const createSessionMutation = useCreateSession({
    onSuccess: () => {
      toast.success("Session created successfully!");
      setShouldRedirect(true);
    },
    onError: (error: unknown) => {
      setIsSubmitting(false);
      if (isHttpError(error)) {
        // Check for 409 conflict
        if (error.status === 409) {
          toast.error("Cannot create session: an active session already exists");
        } else {
          toast.error(error.message || "Failed to create session");
        }
      } else if (error instanceof Error) {
        toast.error(error.message || "Failed to create session");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    },
  });

  useEffect(() => {
    if (!shouldRedirect) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.location.href = "/dashboard";
    }, 300);

    return () => window.clearTimeout(timer);
  }, [shouldRedirect]);

  // Handle form submission
  const onSubmit = async (formValues: CreateManualSessionFormValues) => {
    // Prevent submission if blocking
    if (isBlocking) {
      toast.error("Cannot create session: please resolve blocking issues first");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert form values to API command
      const sessionDate = localDateToUtcIso(formValues.sessionDateLocal);

      const command: CreateSessionCommand = {
        sessionDate,
        status: formValues.status,
        sets: normalizeSets(formValues.sets),
        rpe: formValues.rpe ?? undefined,
        notes: formValues.notes ?? undefined,
        startNow: formValues.startNow,
      };

      await createSessionMutation.mutateAsync(command);
    } catch (error) {
      globalThis.reportError?.(error);
    }
  };

  // Handle Start Now toggle
  const handleStartNowChange = (checked: boolean) => {
    form.setValue("startNow", checked);
    if (checked) {
      // Force status to planned when starting now
      form.setValue("status", "planned");
      // Clear RPE when starting now
      form.setValue("rpe", null);
    }
  };

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    const validStatus = newStatus as CreateManualSessionFormValues["status"];
    form.setValue("status", validStatus);
    // Set default RPE when changing to completed
    if (newStatus === "completed" && !rpe) {
      form.setValue("rpe", 5);
    }
    // Clear RPE if status is not completed
    if (newStatus !== "completed") {
      form.setValue("rpe", null);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Create Training Session</h1>
          <p className="text-muted-foreground">Plan a session, start training now, or log a historical workout.</p>
        </div>

        {/* Blocking Alert */}
        {isBlocking && (
          <BlockingAlert
            message="You already have an active session in progress."
            actions={
              <Button variant="outline" size="sm" onClick={() => (window.location.href = "/dashboard")}>
                Go to Dashboard
              </Button>
            }
          />
        )}

        {/* Non-blocking Warnings */}
        {!isBlocking && warnings.length > 0 && <InlineAlert warnings={warnings} />}

        {/* Date Field */}
        <div className="space-y-2">
          <Label htmlFor="sessionDateLocal" className="flex items-center gap-2">
            <Calendar className="size-4" />
            Session Date
          </Label>
          <Controller
            control={form.control}
            name="sessionDateLocal"
            render={({ field }) => (
              <Input
                id="sessionDateLocal"
                type="date"
                max={getMaxFutureDate()}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={!!form.formState.errors.sessionDateLocal}
                aria-describedby={form.formState.errors.sessionDateLocal ? "sessionDateLocal-error" : undefined}
                data-testid="session-date"
              />
            )}
          />
          {form.formState.errors.sessionDateLocal && (
            <p id="sessionDateLocal-error" className="text-sm text-destructive">
              {form.formState.errors.sessionDateLocal.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {dateIsTodayOrFuture
              ? "Creating a planned session for today or future"
              : "Creating a historical session (completed/failed)"}
          </p>
        </div>

        {/* Status Selector (past only) */}
        {showStatusSelector && !startNow && (
          <div className="space-y-2">
            <Label htmlFor="status">Session Status</Label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status && (
              <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
            )}
          </div>
        )}

        {/* Start Now Toggle (today/future only) */}
        {allowStartNow && (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Clock className="size-4" />
                <Label htmlFor="startNow" className="text-base font-medium">
                  Start Training Now
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Begin this session immediately (sets status to in-progress)
              </p>
            </div>
            <Switch
              id="startNow"
              checked={startNow}
              onCheckedChange={handleStartNowChange}
              disabled={!allowStartNow}
              aria-label="Start training session now"
            />
          </div>
        )}
        {form.formState.errors.startNow && (
          <p className="text-sm text-destructive">{form.formState.errors.startNow.message}</p>
        )}

        {/* Sets Grid */}
        <SetsInput
          control={form.control}
          name="sets"
          error={form.formState.errors.sets?.message}
          testIdPrefix="session-set"
        />

        {/* Running Total */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
          <span className="text-sm font-medium">Total Reps</span>
          <span className="text-2xl font-bold">{totalReps}</span>
        </div>

        {/* RPE Input (completed only, optional) */}
        {showRpe && (
          <RpeSlider
            control={form.control}
            name="rpe"
            value={rpe}
            error={form.formState.errors.rpe?.message}
            required={true}
            showTooltip={true}
          />
        )}

        {/* Notes Field */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Controller
            control={form.control}
            name="notes"
            render={({ field }) => (
              <Textarea
                id="notes"
                placeholder="Add any notes about this session..."
                rows={3}
                maxLength={2000}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-describedby={form.formState.errors.notes ? "notes-error" : undefined}
              />
            )}
          />
          {form.formState.errors.notes && (
            <p id="notes-error" className="text-sm text-destructive">
              {form.formState.errors.notes.message}
            </p>
          )}
        </div>
      </div>

      {/* Submit Button (sticky on mobile) */}
      <div className="sticky bottom-0 pt-4 pb-6 bg-background border-t -mx-6 px-6 sm:static sm:border-0 sm:mx-0 sm:px-0">
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={isBlocking || isSubmitting || isValidating}
          data-testid="session-submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating Session...
            </>
          ) : (
            "Create Session"
          )}
        </Button>
      </div>
    </form>
  );
}
