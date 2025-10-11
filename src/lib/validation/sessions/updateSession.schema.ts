import { z } from "zod";

const MAX_FUTURE_DAYS = 30;
const MAX_REPS_PER_SET = 60;
const MIN_REPS_PER_SET = 1;
const TOTAL_SETS = 5;

const sessionDateSchema = z.string().datetime({ message: "sessionDate must be a valid ISO 8601 datetime" });

const sessionSetValueSchema = z
  .number({ invalid_type_error: "set value must be a number" })
  .int("set value must be an integer")
  .min(MIN_REPS_PER_SET, `set value must be at least ${MIN_REPS_PER_SET}`)
  .max(MAX_REPS_PER_SET, `set value must be at most ${MAX_REPS_PER_SET}`);

const sessionSetsSchema = z
  .array(sessionSetValueSchema.nullable(), {
    invalid_type_error: "sets must be an array",
  })
  .length(TOTAL_SETS, `sets must contain exactly ${TOTAL_SETS} items`);

export const updateSessionSchema = z
  .object({
    sessionDate: z.optional(sessionDateSchema),
    sets: z.optional(sessionSetsSchema),
    notes: z
      .string({ invalid_type_error: "notes must be a string" })
      .max(2000, "notes must have at most 2000 characters")
      .nullable()
      .optional(),
    aiComment: z.string({ invalid_type_error: "aiComment must be a string" }).max(2000).nullable().optional(),
    markAsModified: z.optional(z.boolean()),
  })
  .superRefine((value, ctx) => {
    const { sessionDate } = value;

    if (sessionDate) {
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

      if (parsedDate > maxFutureDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `sessionDate cannot be more than ${MAX_FUTURE_DAYS} days in the future`,
          path: ["sessionDate"],
        });
      }
    }
  });

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
