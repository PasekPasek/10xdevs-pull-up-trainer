import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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

          <div className="space-y-3">
            <Label className="text-sm font-medium">Sets</Label>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Controller
                  key={index}
                  control={form.control}
                  name={`sets.${index}`}
                  render={({ field }) => (
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`set-${index}`} className="text-xs text-muted-foreground">
                        Set {index + 1}
                      </Label>
                      <Input
                        id={`set-${index}`}
                        type="number"
                        min={1}
                        max={60}
                        value={field.value ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          field.onChange(value === "" ? null : Number(value));
                        }}
                      />
                    </div>
                  )}
                />
              ))}
            </div>
            {form.formState.errors.sets ? (
              <p className="text-sm text-destructive">{form.formState.errors.sets.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rpe" className="text-sm font-medium">
              RPE (optional)
            </Label>
            <Controller
              control={form.control}
              name="rpe"
              render={({ field }) => (
                <Input
                  id="rpe"
                  type="number"
                  min={1}
                  max={10}
                  placeholder="Rate of perceived exertion"
                  value={field.value ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    field.onChange(value === "" ? null : Number(value));
                  }}
                />
              )}
            />
            {form.formState.errors.rpe ? (
              <p className="text-sm text-destructive">{form.formState.errors.rpe.message}</p>
            ) : null}
          </div>

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
