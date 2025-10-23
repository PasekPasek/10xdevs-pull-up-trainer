import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import LoginForm from "./LoginForm";

/**
 * Wrapper component that provides QueryClient context to LoginForm
 * Necessary for Astro island architecture where each client:* directive
 * creates a separate React root
 */
export default function LoginFormWithProvider() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 5,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LoginForm />
    </QueryClientProvider>
  );
}
