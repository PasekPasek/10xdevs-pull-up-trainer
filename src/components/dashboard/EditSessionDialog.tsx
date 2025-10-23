import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SetsInput } from "@/components/sessions/SetsInput";

const editSessionSchema = z.object({
  sessionDate: z.string().datetime({ offset: true }),
  sets: z
    .array(z.number().int().min(1).max(60).nullable())
    .length(5)
    .refine((sets) => sets.some((value) => (value ?? 0) > 0), {
      message: "At least one set must have reps",
    }),
  aiComment: z.string().max(500).optional().nullable(),
});

export type EditSessionFormValues = z.infer<typeof editSessionSchema>;

interface EditSessionDialogProps {
  open: boolean;
  session?: SessionDetailDTO;
  etag?: string;
  isSubmitting?: boolean;
  onOpenChange: (value: boolean) => void;
  onSubmit: (values: EditSessionFormValues) => void;
}

export function EditSessionDialog({ open, session, isSubmitting, onOpenChange, onSubmit }: EditSessionDialogProps) {
  const form = useForm<EditSessionFormValues>({
    resolver: zodResolver(editSessionSchema),
    defaultValues: {
      sessionDate: session?.sessionDate ?? new Date().toISOString(),
      sets: session?.sets ?? [null, null, null, null, null],
      aiComment: session?.aiComment ?? "",
    },
  });

  useEffect(() => {
    if (session) {
      form.reset({
        sessionDate: session.sessionDate,
        sets: session.sets ?? [null, null, null, null, null],
        aiComment: session.aiComment ?? "",
      });
    }
  }, [session, form]);

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit({
      ...values,
      aiComment: values.aiComment?.trim() || undefined,
    });
  });

  const disabled = session?.status === "in_progress";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit session</DialogTitle>
            <DialogDescription>Make changes to the planned session details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="sessionDate">Session date</Label>
            <Controller
              control={form.control}
              name="sessionDate"
              render={({ field }) => (
                <Input
                  id="sessionDate"
                  type="datetime-local"
                  disabled={disabled}
                  value={field.value.slice(0, 16)}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(new Date(value).toISOString());
                  }}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
            {form.formState.errors.sessionDate ? (
              <p className="text-sm text-destructive">{form.formState.errors.sessionDate.message}</p>
            ) : null}
          </div>

          <SetsInput
            control={form.control}
            name="sets"
            error={form.formState.errors.sets?.message}
            disabled={disabled}
            testIdPrefix="edit-set"
          />

          <div className="space-y-2">
            <Label htmlFor="aiComment" className="text-sm font-medium">
              AI comment
            </Label>
            <Controller
              control={form.control}
              name="aiComment"
              render={({ field }) => (
                <Textarea
                  id="aiComment"
                  placeholder="Optional note displayed in the session card"
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                  rows={4}
                />
              )}
            />
            {form.formState.errors.aiComment ? (
              <p className="text-sm text-destructive">{form.formState.errors.aiComment.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
