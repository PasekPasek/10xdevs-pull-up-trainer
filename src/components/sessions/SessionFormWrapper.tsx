import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionForm } from "./SessionForm";

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0,
    },
  },
});

/**
 * SessionFormWrapper provides the QueryClient context for the SessionForm
 * This is necessary for Astro hydration with client:load
 */
export function SessionFormWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionForm />
    </QueryClientProvider>
  );
}
