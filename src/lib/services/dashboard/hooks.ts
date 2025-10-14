import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { DashboardSnapshotResponse } from "@/types";
import { createApiRequest } from "@/lib/utils/httpError";

const DASHBOARD_KEY = ["dashboard" as const];

export function useDashboardSnapshot() {
  return useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: async () => {
      const response = await createApiRequest<DashboardSnapshotResponse>("/api/dashboard", {
        method: "GET",
        credentials: "include",
      });

      return response.data;
    },
    staleTime: 5000,
  });
}

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
}
