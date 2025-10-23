import { Controller, type Control, type FieldValues } from "react-hook-form";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FormMessage } from "@/components/ui/form";

interface RpeSliderProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name?: string;
  value?: number | null;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  showTooltip?: boolean;
}

/**
 * Reusable component for RPE (Rate of Perceived Exertion) slider input
 * Integrates with React Hook Form via Controller
 * Used in SessionForm and SessionCompleteDialog
 */
export function RpeSlider<TFieldValues extends FieldValues = FieldValues>({
  control,
  name = "rpe",
  value,
  error,
  disabled,
  required,
  showTooltip = true,
}: RpeSliderProps<TFieldValues>) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label htmlFor={name} className="text-base font-medium">
          RPE (Rate of Perceived Exertion) {required && "*"}
        </Label>
        {showTooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Rate how hard the session felt on a scale of 1-10, where 1 is very easy and 10 is maximum effort.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="space-y-2">
        <Controller
          control={control}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name={name as any}
          render={({ field }) => (
            <Slider
              id={name}
              min={1}
              max={10}
              step={1}
              value={field.value ? [field.value] : [5]}
              onValueChange={(values) => field.onChange(values[0] ?? null)}
              onBlur={field.onBlur}
              disabled={disabled}
              className="w-full"
              aria-label="RPE slider"
            />
          )}
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Easy (1)</span>
          <span className="text-lg font-semibold text-foreground">{value ?? "-"}</span>
          <span>Max (10)</span>
        </div>
      </div>
      {error && <FormMessage>{error}</FormMessage>}
    </div>
  );
}
