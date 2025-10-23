import { Controller, type Control, type FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form";

interface SetsInputProps<TFieldValues extends FieldValues = FieldValues> {
  control: Control<TFieldValues>;
  name?: string;
  error?: string;
  disabled?: boolean;
  testIdPrefix?: string;
}

/**
 * Reusable component for pull-up sets input (5 sets grid)
 * Integrates with React Hook Form via Controller
 * Used across SessionForm, EditSessionDialog, and SessionCompleteDialog
 */
export function SetsInput<TFieldValues extends FieldValues = FieldValues>({
  control,
  name = "sets",
  error,
  disabled,
  testIdPrefix = "set",
}: SetsInputProps<TFieldValues>) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Pull-Up Sets</Label>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Controller
            key={index}
            control={control}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name={`${name}.${index}` as any}
            render={({ field }) => (
              <div className="space-y-1">
                <Label htmlFor={`${name}-${index}`} className="text-xs text-muted-foreground">
                  Set {index + 1}
                </Label>
                <Input
                  id={`${name}-${index}`}
                  type="number"
                  min={1}
                  max={60}
                  placeholder="-"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? null : Number(value));
                  }}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  className="text-center"
                  disabled={disabled}
                  aria-label={`Set ${index + 1} reps`}
                  data-testid={`${testIdPrefix}-${index}`}
                />
              </div>
            )}
          />
        ))}
      </div>
      {error && <FormMessage>{error}</FormMessage>}
    </div>
  );
}
