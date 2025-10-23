import * as React from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Form field wrapper component that integrates with React Hook Form
 * Provides consistent error display and accessibility attributes
 */
export interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  render: (props: {
    field: {
      value: TFieldValues[TName];
      onChange: (...event: unknown[]) => void;
      onBlur: () => void;
      ref: React.Ref<unknown>;
    };
    fieldState: {
      error?: { message?: string };
      invalid: boolean;
      isDirty: boolean;
      isTouched: boolean;
    };
    formState: {
      isSubmitting: boolean;
      isValidating: boolean;
    };
  }) => React.ReactElement;
}

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, render }: FormFieldProps<TFieldValues, TName>) {
  return <Controller control={control} name={name} render={render} />;
}

/**
 * Form item wrapper that provides consistent spacing and layout
 */
export interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function FormItem({ className, children, ...props }: FormItemProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Form label component
 */
export interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean;
}

export const FormLabel = React.forwardRef<React.ElementRef<typeof Label>, FormLabelProps>(
  ({ className, children, required, ...props }, ref) => {
    return (
      <Label ref={ref} className={cn(className)} {...props}>
        {children}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </Label>
    );
  }
);
FormLabel.displayName = "FormLabel";

/**
 * Form error message component
 */
export interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export function FormMessage({ className, children, ...props }: FormMessageProps) {
  if (!children) return null;

  return (
    <p className={cn("text-sm text-destructive", className)} role="alert" {...props}>
      {children}
    </p>
  );
}

/**
 * Form description component for helper text
 */
export interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export function FormDescription({ className, children, ...props }: FormDescriptionProps) {
  if (!children) return null;

  return (
    <p className={cn("text-xs text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}
