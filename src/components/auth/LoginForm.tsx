import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { loginFormSchema, type LoginFormValues } from "@/lib/validation/ui/loginForm.schema";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordField } from "./PasswordField";

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/dashboard");
  const emailFieldRef = useRef<HTMLInputElement | null>(null);

  const form = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

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
    async (values: LoginFormValues) => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => undefined);
          const message = errorBody?.error?.message ?? "Invalid email or password";
          toast.error(message);
          return;
        }

        window.location.href = redirectPath;
      } catch (error) {
        globalThis.reportError?.(error);
        toast.error("An error occurred during login. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [redirectPath]
  );

  const isDisabled = isLoading;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
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
                  data-testid="login-email"
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isDisabled}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  data-testid="login-password"
                  {...field}
                />
              )}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.password.message}
              </p>
            ) : null}
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
          <Button type="submit" className="w-full" disabled={isDisabled} data-testid="login-submit">
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default LoginForm;
