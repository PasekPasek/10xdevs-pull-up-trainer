import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Calendar, Clock, Info, Loader2 } from "lucide-react";

import {
  createManualSessionFormSchema,
  getDefaultFormValues,
  type CreateManualSessionFormValues,
} from "@/lib/validation/ui/createManualSessionForm.schema";
import { useCreateSession, useSessionValidation } from "@/lib/services/sessions/hooks";
import { localDateToUtcIso, getMaxFutureDate, isPast, isTodayOrFuture } from "@/lib/utils/date";
import { computeTotal, normalizeSets } from "@/lib/utils/session";
import { isHttpError } from "@/lib/utils/httpError";
import type { CreateSessionCommand } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { BlockingAlert } from "./BlockingAlert";
import { InlineAlert } from "./InlineAlert";

/**
 * Custom hook for debounced value
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * SessionForm component for creating manual training sessions
 * Supports planned, start-now, and historical (completed/failed) sessions
 */
export function SessionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup with react-hook-form + zod
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateManualSessionFormValues>({
    resolver: zodResolver(createManualSessionFormSchema),
    defaultValues: getDefaultFormValues(),
    mode: "onChange",
  });

  // Watch form values for dynamic behavior
  const sessionDateLocal = watch("sessionDateLocal");
  const status = watch("status");
  const startNow = watch("startNow");
  const sets = watch("sets");
  const rpe = watch("rpe");

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

  // Debounced values for preflight validation (500ms delay)
  const debouncedDateLocal = useDebouncedValue(sessionDateLocal, 500);
  const debouncedStatus = useDebouncedValue(status, 500);

  // Convert to UTC for validation API
  const validationDateUtc = useMemo(() => {
    if (!debouncedDateLocal) return "";
    try {
      return localDateToUtcIso(debouncedDateLocal);
    } catch {
      return "";
    }
  }, [debouncedDateLocal]);

  // Preflight validation query
  const { data: validationData, isLoading: isValidating } = useSessionValidation(
    {
      sessionDate: validationDateUtc,
      status: debouncedStatus,
      ignoreRestWarning: false,
    },
    {
      enabled: Boolean(validationDateUtc && debouncedStatus),
    }
  );

  // Extract validation state
  const isBlocking = validationData?.blocking ?? false;
  const warnings = validationData?.warnings ?? [];

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
    setValue("startNow", checked);
    if (checked) {
      // Force status to planned when starting now
      setValue("status", "planned");
      // Clear RPE when starting now
      setValue("rpe", null);
    }
  };

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    const validStatus = newStatus as CreateManualSessionFormValues["status"];
    setValue("status", validStatus);
    // Set default RPE when changing to completed
    if (newStatus === "completed" && !rpe) {
      setValue("rpe", 5);
    }
    // Clear RPE if status is not completed
    if (newStatus !== "completed") {
      setValue("rpe", null);
    }
  };

  // Handle set value change
  const handleSetChange = (index: number, value: string) => {
    const numValue = value === "" ? null : parseInt(value, 10);
    const newSets = [...sets];
    newSets[index] = numValue;
    setValue("sets", newSets as CreateManualSessionFormValues["sets"]);
  };

  // Handle RPE change from slider
  const handleRpeChange = (value: number[]) => {
    setValue("rpe", value[0] ?? null);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto p-6 space-y-6">
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
          <Input
            id="sessionDateLocal"
            type="date"
            max={getMaxFutureDate()}
            {...register("sessionDateLocal")}
            aria-invalid={!!errors.sessionDateLocal}
            aria-describedby={errors.sessionDateLocal ? "sessionDateLocal-error" : undefined}
            data-testid="session-date"
          />
          {errors.sessionDateLocal && (
            <p id="sessionDateLocal-error" className="text-sm text-destructive">
              {errors.sessionDateLocal.message}
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
            {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
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
        {errors.startNow && <p className="text-sm text-destructive">{errors.startNow.message}</p>}

        {/* Sets Grid */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Pull-Up Sets</Label>
          <div className="grid grid-cols-5 gap-2">
            {sets.map((set, index) => (
              <div key={index} className="space-y-1">
                <Label htmlFor={`set-${index}`} className="text-xs text-muted-foreground">
                  Set {index + 1}
                </Label>
                <Input
                  id={`set-${index}`}
                  type="number"
                  min={1}
                  max={60}
                  placeholder="-"
                  value={set ?? ""}
                  onChange={(e) => handleSetChange(index, e.target.value)}
                  className="text-center"
                  aria-label={`Set ${index + 1} reps`}
                  data-testid={`session-set-${index}`}
                />
              </div>
            ))}
          </div>
          {errors.sets && <p className="text-sm text-destructive">{errors.sets.message}</p>}

          {/* Running Total */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <span className="text-sm font-medium">Total Reps</span>
            <span className="text-2xl font-bold">{totalReps}</span>
          </div>
        </div>

        {/* RPE Input (completed only, optional) */}
        {showRpe && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="rpe" className="text-base font-medium">
                RPE (Rate of Perceived Exertion) *
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Rate how hard the session felt on a scale of 1-10, where 1 is very easy and 10 is maximum effort.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="space-y-2">
              <Slider
                id="rpe"
                min={1}
                max={10}
                step={1}
                value={rpe ? [rpe] : [5]}
                onValueChange={handleRpeChange}
                className="w-full"
                aria-label="RPE slider"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Easy (1)</span>
                <span className="text-lg font-semibold text-foreground">{rpe ?? "-"}</span>
                <span>Max (10)</span>
              </div>
            </div>
            {errors.rpe && <p className="text-sm text-destructive">{errors.rpe.message}</p>}
          </div>
        )}

        {/* Notes Field */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about this session..."
            rows={3}
            maxLength={2000}
            {...register("notes")}
            aria-describedby={errors.notes ? "notes-error" : undefined}
          />
          {errors.notes && (
            <p id="notes-error" className="text-sm text-destructive">
              {errors.notes.message}
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
