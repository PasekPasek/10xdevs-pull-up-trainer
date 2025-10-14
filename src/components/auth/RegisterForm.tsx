import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  registerFormSchema,
  type RegisterFormValues,
  calculatePasswordStrength,
} from "@/lib/validation/ui/registerForm.schema";
import { supabaseClient } from "@/db/supabase.client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { PasswordField } from "./PasswordField";
import { cn } from "@/lib/utils";

function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState<{
    strength: "weak" | "medium" | "strong";
    percentage: number;
  }>({ strength: "weak", percentage: 0 });

  const form = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  const password = form.watch("password");

  useEffect(() => {
    if (password) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength({ strength: "weak", percentage: 0 });
    }
  }, [password]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabaseClient.auth.getUser();
        if (data.user) {
          window.location.href = "/dashboard";
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          toast.error("An account with this email already exists");
        } else {
          toast.error("Failed to create account. Please try again.");
        }
        return;
      }

      if (data.user) {
        // Auto-login after successful registration
        const { error: signInError } = await supabaseClient.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (signInError) {
          toast.error("Account created, but failed to sign in. Please try signing in manually.");
          window.location.href = "/login";
          return;
        }

        toast.success("Account created successfully!");
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An error occurred during registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isDisabled = isLoading;

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

      <form onSubmit={(e) => form.handleSubmit(onSubmit)(e)}>
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
                  autoFocus
                  disabled={isDisabled}
                  aria-invalid={Boolean(form.formState.errors.email)}
                  {...field}
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
            {isLoading ? "Creating account..." : "Create account"}
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
