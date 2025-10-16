import { z } from "zod";

const MAX_FUTURE_DAYS = 30;
const MAX_REPS_PER_SET = 60;
const MIN_REPS_PER_SET = 1;
const TOTAL_SETS = 5;

const sessionDateSchema = z
  .string({ required_error: "sessionDate is required" })
  .datetime({ message: "sessionDate must be a valid ISO 8601 datetime" });

const sessionStatusSchema = z
  .enum(["planned", "completed", "failed"], {
    errorMap: () => ({ message: "status must be a valid session status" }),
  })
  .default("planned")
  .transform((value) => value ?? "planned");

const sessionSetValueSchema = z
  .number({ invalid_type_error: "set value must be a number" })
  .int("set value must be an integer")
  .min(MIN_REPS_PER_SET, `set value must be at least ${MIN_REPS_PER_SET}`)
  .max(MAX_REPS_PER_SET, `set value must be at most ${MAX_REPS_PER_SET}`);

const sessionSetsSchema = z
  .array(sessionSetValueSchema.nullable(), {
    required_error: "sets is required",
    invalid_type_error: "sets must be an array",
  })
  .length(TOTAL_SETS, `sets must contain exactly ${TOTAL_SETS} items`);

const rpeSchema = z
  .number({ invalid_type_error: "rpe must be a number" })
  .int("rpe must be an integer")
  .min(1, "rpe must be at least 1")
  .max(10, "rpe must be at most 10");

export const createSessionSchema = z
  .object({
    status: z.optional(sessionStatusSchema),
    sessionDate: sessionDateSchema,
    sets: sessionSetsSchema,
    rpe: z.optional(rpeSchema),
    notes: z
      .string({ invalid_type_error: "notes must be a string" })
      .max(2000, "notes must have at most 2000 characters")
      .nullable()
      .optional(),
    startNow: z.optional(z.boolean()),
  })
  .transform((value) => ({
    ...value,
    status: value.status ?? "planned",
    startNow: value.startNow ?? false,
  }))
  .superRefine((value, ctx) => {
    const { sessionDate, status, sets, rpe, startNow } = value;
    const parsedDate = new Date(sessionDate);
    const now = new Date();

    if (Number.isNaN(parsedDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sessionDate must be a valid ISO 8601 datetime",
        path: ["sessionDate"],
      });
      return;
    }

    const maxFutureDate = new Date(now);
    maxFutureDate.setDate(now.getDate() + MAX_FUTURE_DAYS);

    // Compare dates only (ignore time) for past/future determination
    // This prevents microsecond timing issues where "today" sessions are treated as "past"
    const sessionDateOnly = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isFuture = parsedDate > now;
    const isPast = sessionDateOnly < todayDateOnly;

    if (isFuture && parsedDate > maxFutureDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `sessionDate cannot be more than ${MAX_FUTURE_DAYS} days in the future`,
        path: ["sessionDate"],
      });
    }

    const isHistoricalStatus = status === "completed" || status === "failed";

    if (isPast && !isHistoricalStatus) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Historical sessions must use status completed or failed",
        path: ["status"],
      });
    }

    if (startNow && status && status !== "planned") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startNow cannot be combined with an explicit status",
        path: ["startNow"],
      });
    }

    if (status === "completed") {
      if (rpe === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "rpe is required when status is completed",
          path: ["rpe"],
        });
      }

      const hasPositiveSet = sets.some((set) => (set ?? 0) > 0);
      if (!hasPositiveSet) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one set must be greater than 0 when status is completed",
          path: ["sets"],
        });
      }
    }

    if (status === "failed" && rpe !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rpe cannot be provided when status is failed",
        path: ["rpe"],
      });
    }
  });

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
