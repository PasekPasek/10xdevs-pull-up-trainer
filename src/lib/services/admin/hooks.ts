import { useQuery } from "@tanstack/react-query";

import type { AdminMetricsResponse } from "@/types";
import { createApiRequest } from "@/lib/utils/httpError";

export function useAdminMetrics() {
  return useQuery({
    queryKey: ["adminMetrics"],
    queryFn: async () => {
      const response = await createApiRequest<AdminMetricsResponse>("/api/admin/metrics", {
        method: "GET",
        credentials: "include",
      });
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
}
