import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import RegisterForm from "./RegisterForm";

/**
 * Wrapper component that provides QueryClient context to RegisterForm
 * Necessary for Astro island architecture where each client:* directive
 * creates a separate React root
 */
export default function RegisterFormWithProvider() {
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
      <RegisterForm />
    </QueryClientProvider>
  );
}
