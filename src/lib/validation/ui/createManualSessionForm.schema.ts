import { z } from "zod";

/**
 * UI validation schema for manual session creation form.
 * Mirrors backend validation from createSession.schema.ts but adapted for UI-layer concerns.
 */

const MAX_FUTURE_DAYS = 30;
const MAX_REPS_PER_SET = 60;
const MIN_REPS_PER_SET = 1;
const TOTAL_SETS = 5;

/**
 * Session date in local datetime-local format (YYYY-MM-DDTHH:mm)
 * Will be converted to UTC ISO for API submission
 */
const sessionDateLocalSchema = z
  .string({ required_error: "Session date is required" })
  .min(1, "Session date is required")
  .refine((value) => {
    // Validate datetime-local format
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }, "Invalid date/time format");

/**
 * Session status for the form
 * - planned: default for future sessions
 * - completed: historical session that was completed
 * - failed: historical session that was failed
 */
const sessionStatusSchema = z.enum(["planned", "completed", "failed"], {
  errorMap: () => ({ message: "Status must be planned, completed, or failed" }),
});

/**
 * Individual set value: null (empty) or 1-60 integer
 */
const sessionSetValueSchema = z
  .number({ invalid_type_error: "Set value must be a number" })
  .int("Set value must be an integer")
  .min(MIN_REPS_PER_SET, `Set value must be at least ${MIN_REPS_PER_SET}`)
  .max(MAX_REPS_PER_SET, `Set value must be at most ${MAX_REPS_PER_SET}`)
  .nullable();

/**
 * Exactly 5 sets for pull-up training
 */
const sessionSetsSchema = z
  .array(sessionSetValueSchema, {
    required_error: "Sets are required",
    invalid_type_error: "Sets must be an array",
  })
  .length(TOTAL_SETS, `Exactly ${TOTAL_SETS} sets are required`);

/**
 * RPE (Rate of Perceived Exertion) 1-10
 * Optional for completed sessions, not allowed for failed
 */
const rpeSchema = z
  .number({ invalid_type_error: "RPE must be a number" })
  .int("RPE must be an integer")
  .min(1, "RPE must be at least 1")
  .max(10, "RPE must be at most 10")
  .nullable()
  .optional();

/**
 * Notes field (optional, max 2000 characters)
 */
const notesSchema = z
  .string({ invalid_type_error: "Notes must be text" })
  .max(2000, "Notes must be at most 2000 characters")
  .nullable()
  .optional();

/**
 * Main form schema with validation rules
 */
export const createManualSessionFormSchema = z
  .object({
    sessionDateLocal: sessionDateLocalSchema,
    status: sessionStatusSchema,
    startNow: z.boolean(),
    sets: sessionSetsSchema,
    rpe: rpeSchema,
    notes: notesSchema,
  })
  .superRefine((value, ctx) => {
    const { sessionDateLocal, status, sets, rpe, startNow } = value;

    // Parse the local datetime
    const parsedDate = new Date(sessionDateLocal);
    const now = new Date();

    if (Number.isNaN(parsedDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid date/time",
        path: ["sessionDateLocal"],
      });
      return;
    }

    // Check if date is in past, present, or future
    const isPast = parsedDate < now;
    const isTodayOrFuture = parsedDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate max future date
    const maxFutureDate = new Date(now);
    maxFutureDate.setDate(now.getDate() + MAX_FUTURE_DAYS);

    // Validate future date constraint
    if (parsedDate > maxFutureDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Session date cannot be more than ${MAX_FUTURE_DAYS} days in the future`,
        path: ["sessionDateLocal"],
      });
    }

    // Past sessions must have historical status (completed/failed)
    if (isPast && status === "planned") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Past sessions must have status completed or failed",
        path: ["status"],
      });
    }

    // Start Now validation
    if (startNow) {
      // Can only start now for today or future
      if (!isTodayOrFuture) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cannot start a session in the past",
          path: ["startNow"],
        });
      }

      // Cannot combine startNow with non-planned status
      if (status !== "planned") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start Now can only be used with planned status",
          path: ["startNow"],
        });
      }
    }

    // Completed session validation
    if (status === "completed") {
      // Must have at least one set > 0
      const hasPositiveSet = sets.some((set) => (set ?? 0) > 0);
      if (!hasPositiveSet) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one set must have reps when status is completed",
          path: ["sets"],
        });
      }

      // RPE is required for completed sessions (matches backend validation)
      if (rpe === null || rpe === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "RPE is required for completed sessions",
          path: ["rpe"],
        });
      }
    }

    // Failed session validation
    if (status === "failed" && rpe !== null && rpe !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RPE cannot be provided for failed sessions",
        path: ["rpe"],
      });
    }
  });

/**
 * Form values type inferred from schema
 */
export type CreateManualSessionFormValues = z.infer<typeof createManualSessionFormSchema>;

/**
 * Helper to get default form values
 */
export function getDefaultFormValues(): CreateManualSessionFormValues {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return {
    sessionDateLocal: `${year}-${month}-${day}T${hours}:${minutes}`,
    status: "planned",
    startNow: false,
    sets: [null, null, null, null, null],
    rpe: null,
    notes: null,
  };
}
