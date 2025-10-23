import { useCallback, useEffect } from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardContext } from "@/components/dashboard/DashboardContext";
import { useGenerateAiSessionMutation, useRetryAiGenerationMutation } from "@/lib/services/sessions/hooks";
import type { AiQuotaDTO } from "@/types";

const maxPullupsSchema = z.object({
  maxPullups: z.coerce.number().int().min(1).max(60),
});

type MaxPullupsFormValues = z.infer<typeof maxPullupsSchema>;

interface AIWizardModalProps {
  quota?: AiQuotaDTO;
  onSuccess: () => void;
}

export function AIWizardModal({ quota, onSuccess }: AIWizardModalProps) {
  const { wizardState, openWizard, closeWizard, setWizardState } = useDashboardContext();
  const { step, maxPullups, generationId } = wizardState;

  const generateMutation = useGenerateAiSessionMutation({
    onSuccess: () => {
      setWizardState({ step: "result" });
      onSuccess();
    },
    onError: () => {
      setWizardState({ step: "error" });
    },
  });

  // Auto-trigger generation when step is "loading" and maxPullups is undefined (existing users)
  useEffect(() => {
    if (step === "loading" && maxPullups === undefined && !generateMutation.isPending && !generationId) {
      generateMutation.mutate({});
    }
  }, [step, maxPullups, generationId, generateMutation]);

  const retryMutation = useRetryAiGenerationMutation({
    onSuccess: () => {
      setWizardState({ step: "result" });
      onSuccess();
    },
    onError: () => {
      setWizardState({ step: "error" });
    },
  });

  const form = useForm<MaxPullupsFormValues>({
    resolver: zodResolver(maxPullupsSchema),
    defaultValues: {
      maxPullups: maxPullups ?? 10,
    },
  });

  useEffect(() => {
    if (maxPullups) {
      form.setValue("maxPullups", maxPullups);
    }
  }, [maxPullups, form]);

  const handleSubmit = form.handleSubmit((values) => {
    setWizardState({ step: "loading", maxPullups: values.maxPullups });
    generateMutation.mutate({ maxPullups: values.maxPullups });
  });

  const handleRetry = useCallback(() => {
    if (!generationId) {
      setWizardState({ step: "input" });
      return;
    }
    setWizardState({ step: "loading", generationId });
    retryMutation.mutate({ generationId });
  }, [generationId, retryMutation, setWizardState]);

  const loading = generateMutation.isPending || retryMutation.isPending;

  if (step === "quota") {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={(open) => (open ? openWizard() : closeWizard())}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
        {step === "input" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create AI session</DialogTitle>
              <DialogDescription>
                Tell us your max pull-ups to generate a tailored session plan.
                {quota ? ` You have ${quota.remaining}/${quota.limit} AI generations remaining.` : null}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="maxPullups">Max pull-ups</Label>
              <Controller
                control={form.control}
                name="maxPullups"
                render={({ field }) => (
                  <Input
                    id="maxPullups"
                    type="number"
                    min={1}
                    max={60}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
              {form.formState.errors.maxPullups ? (
                <p className="text-sm text-destructive">{form.formState.errors.maxPullups.message}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => closeWizard()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Generate session
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {step === "loading" ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Generating your plan</DialogTitle>
              <DialogDescription>This can take up to 15 seconds.</DialogDescription>
            </DialogHeader>
            <Skeleton className="h-32 w-full rounded-xl" />
            <DialogFooter>
              <Button variant="outline" onClick={() => closeWizard()} disabled={loading}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === "error" ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Something went wrong</DialogTitle>
              <DialogDescription>Unable to generate a session right now. Please try again.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => closeWizard()}>
                Close
              </Button>
              <Button onClick={handleRetry} disabled={loading}>
                Retry
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
