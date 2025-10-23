import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { registerFormSchema, type RegisterFormValues } from "@/lib/validation/ui/registerForm.schema";
import { usePasswordStrength } from "@/hooks/usePasswordStrength";
import { useAuthMutations } from "@/hooks/useAuthMutations";
import { setFormErrorsFromApi, isConflictError, getErrorMessage } from "@/lib/utils/apiErrors";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { PasswordField } from "./PasswordField";
import { cn } from "@/lib/utils";

function RegisterForm() {
  const [redirectPath, setRedirectPath] = useState("/dashboard");
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const emailFieldRef = useRef<HTMLInputElement | null>(null);

  const form = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const password = form.watch("password");
  const passwordStrength = usePasswordStrength(password);

  const { registerMutation } = useAuthMutations({
    onRegisterSuccess: () => {
      setShouldRedirect(true);
    },
  });

  useEffect(() => {
    if (shouldRedirect) {
      window.location.href = redirectPath;
    }
  }, [shouldRedirect, redirectPath]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");

    if (redirect) {
      setRedirectPath(redirect);
    }
  }, []);

  useEffect(() => {
    emailFieldRef.current?.focus({ preventScroll: true });
  }, []);

  const onSubmit = useCallback(
    (values: RegisterFormValues) => {
      registerMutation.mutate(values, {
        onError: (error) => {
          // Handle conflict error (409 - email already exists)
          if (isConflictError(error)) {
            const message = getErrorMessage(error, "An account with this email already exists");
            toast.error(message);
            form.setError("email", { message: "An account with this email already exists" });
            return;
          }

          // Handle validation errors (400 - field-level errors)
          const hasFieldErrors = setFormErrorsFromApi(error, form.setError);
          if (hasFieldErrors) {
            toast.error("Invalid input data. Please check the form.");
            return;
          }

          // Generic error fallback
          toast.error(getErrorMessage(error, "Failed to create account. Please try again."));
        },
      });
    },
    [registerMutation, form]
  );

  const isDisabled = form.formState.isSubmitting || registerMutation.isPending;

  const strengthColors = {
    weak: "text-red-600 dark:text-red-500",
    medium: "text-yellow-600 dark:text-yellow-500",
    strong: "text-green-600 dark:text-green-500",
  };

  const strengthProgressColors = {
    weak: "[&>div]:bg-red-600 dark:[&>div]:bg-red-500",
    medium: "[&>div]:bg-yellow-600 dark:[&>div]:bg-yellow-500",
    strong: "[&>div]:bg-green-600 dark:[&>div]:bg-green-500",
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Sign up to start tracking your pull-up progress</CardDescription>
      </CardHeader>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Controller
              control={form.control}
              name="email"
              render={({ field }) => (
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isDisabled}
                  aria-invalid={Boolean(form.formState.errors.email)}
                  {...field}
                  ref={(element) => {
                    field.ref(element);
                    emailFieldRef.current = element;
                  }}
                />
              )}
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Controller
              control={form.control}
              name="password"
              render={({ field }) => (
                <PasswordField
                  id="password"
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  disabled={isDisabled}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  aria-describedby="password-requirements password-strength"
                  {...field}
                />
              )}
            />

            {password ? (
              <div className="space-y-1" id="password-strength" aria-live="polite">
                <Progress
                  value={passwordStrength.percentage}
                  className={cn("h-1.5", strengthProgressColors[passwordStrength.strength])}
                  aria-label={`Password strength: ${passwordStrength.strength}`}
                />
                <p className={cn("text-xs font-medium", strengthColors[passwordStrength.strength])}>
                  {passwordStrength.strength === "weak" && "Weak"}
                  {passwordStrength.strength === "medium" && "Medium"}
                  {passwordStrength.strength === "strong" && "Strong"}
                </p>
              </div>
            ) : null}

            {form.formState.errors.password ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.password.message}
              </p>
            ) : null}

            <div id="password-requirements" className="text-xs text-muted-foreground space-y-1 pt-1">
              <p>Password must contain:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>At least 8 characters</li>
                <li>At least one letter</li>
                <li>At least one number</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <Checkbox
                  id="rememberMe"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isDisabled}
                />
              )}
            />
            <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
              Remember me
            </Label>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isDisabled}>
            {registerMutation.isPending ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default RegisterForm;
