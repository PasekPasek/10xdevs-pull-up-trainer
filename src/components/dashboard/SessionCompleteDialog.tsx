import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import type { SessionDetailDTO } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SetsInput } from "@/components/sessions/SetsInput";
import { RpeSlider } from "@/components/sessions/RpeSlider";

const completionSchema = z.object({
  sets: z
    .array(z.number().int().min(1).max(60).nullable())
    .length(5)
    .refine((sets) => sets.some((value) => (value ?? 0) > 0), {
      message: "At least one set must have reps",
    }),
  rpe: z.number().int().min(1).max(10).optional().nullable(),
});

type CompletionFormValues = z.infer<typeof completionSchema>;

interface SessionCompleteDialogProps {
  open: boolean;
  session?: SessionDetailDTO;
  isSubmitting?: boolean;
  onOpenChange: (value: boolean) => void;
  onSubmit: (values: CompletionFormValues) => void;
}

export function SessionCompleteDialog({
  open,
  session,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: SessionCompleteDialogProps) {
  const form = useForm<CompletionFormValues>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      sets: session?.sets ?? [null, null, null, null, null],
      rpe: session?.rpe ?? null,
    },
  });

  useEffect(() => {
    if (session) {
      form.reset({
        sets: session.sets ?? [null, null, null, null, null],
        rpe: session.rpe ?? null,
      });
    }
  }, [session, form]);

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit({
      sets: values.sets,
      rpe: values.rpe ?? undefined,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Complete session</DialogTitle>
            <DialogDescription>Confirm final reps and optional RPE before completing the session.</DialogDescription>
          </DialogHeader>

          <SetsInput
            control={form.control}
            name="sets"
            error={form.formState.errors.sets?.message}
            disabled={isSubmitting}
          />

          <RpeSlider
            control={form.control}
            name="rpe"
            value={form.watch("rpe")}
            error={form.formState.errors.rpe?.message}
            disabled={isSubmitting}
            required={false}
            showTooltip={false}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Complete session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
