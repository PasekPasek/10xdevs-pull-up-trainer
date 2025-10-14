import { useMutation, useQuery } from "@tanstack/react-query";

import type {
  CompleteSessionCommand,
  GenerateAiSessionResponse,
  SessionDTO,
  SessionDetailDTO,
  ListSessionsQuery,
  ListSessionsResponse,
  CreateSessionCommand,
  CreateSessionResponse,
  SessionValidationQuery,
  SessionValidationResponse,
  AiQuotaResponse,
  ListAiGenerationsResponse,
} from "@/types";
import { createApiRequest } from "@/lib/utils/httpError";

interface StartSessionParams {
  sessionId: string;
}

interface FailSessionParams {
  sessionId: string;
  reason?: string;
}

interface DeleteSessionParams {
  sessionId: string;
}

interface CompleteSessionParams {
  sessionId: string;
  command: CompleteSessionCommand;
}

interface GenerateAiSessionParams {
  maxPullups: number;
  startNow?: boolean;
}

interface RetryAiGenerationParams {
  generationId: string;
}

interface UpdateSessionPayload {
  sessionDate?: SessionDetailDTO["sessionDate"];
  sets?: SessionDetailDTO["sets"];
  notes?: SessionDetailDTO["notes"];
  aiComment?: SessionDetailDTO["aiComment"];
  markAsModified?: boolean;
}

interface ApiResponse<T> {
  data: T;
}

export function useStartSessionMutation(options?: {
  onSuccess?: (session: SessionDTO) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation({
    mutationFn: async ({ sessionId }: StartSessionParams) => {
      const response = await createApiRequest<ApiResponse<{ session: SessionDTO }>>(
        `/api/sessions/${sessionId}/start`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      return response.data.session;
    },
    ...options,
  });
}

export function useCompleteSessionMutation(options?: {
  onSuccess?: (session: SessionDTO) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation({
    mutationFn: async ({ sessionId, command }: CompleteSessionParams) => {
      const response = await createApiRequest<ApiResponse<{ session: SessionDTO }>>(
        `/api/sessions/${sessionId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(command),
        }
      );

      return response.data.session;
    },
    ...options,
  });
}

export function useFailSessionMutation(options?: {
  onSuccess?: (session: SessionDTO) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation({
    mutationFn: async ({ sessionId, reason }: FailSessionParams) => {
      const response = await createApiRequest<ApiResponse<{ session: SessionDTO }>>(`/api/sessions/${sessionId}/fail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });

      return response.data.session;
    },
    ...options,
  });
}

export function useDeleteSessionMutation(options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) {
  return useMutation({
    mutationFn: async ({ sessionId }: DeleteSessionParams) => {
      await createApiRequest<ApiResponse<Record<string, never>>>(`/api/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    ...options,
  });
}

export function useUpdateSessionMutation(options?: {
  onSuccess?: (session: SessionDetailDTO) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation({
    mutationFn: async ({
      sessionId,
      command,
      etag,
    }: {
      sessionId: string;
      command: UpdateSessionPayload;
      etag: string;
    }) => {
      const response = await createApiRequest<ApiResponse<{ session: SessionDetailDTO }>>(
        `/api/sessions/${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "If-Match": etag,
          },
          credentials: "include",
          body: JSON.stringify(command),
        }
      );

      return response.data.session;
    },
    ...options,
  });
}

export interface GenerateAiSessionResult {
  session: SessionDTO;
  generation: {
    id: string;
    model: string;
    durationMs: number;
    status: string;
  };
  quota: {
    remaining: number;
    limit: number;
    resetsAt: string;
    nextWindowSeconds: number;
  };
}

export function useGenerateAiSessionMutation(options?: {
  onSuccess?: (result: GenerateAiSessionResult) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation({
    mutationFn: async ({ maxPullups, startNow }: GenerateAiSessionParams) => {
      const response = await createApiRequest<GenerateAiSessionResponse>("/api/sessions/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ maxPullups, startNow }),
      });

      return {
        session: response.data.session,
        generation: response.data.generation,
        quota: response.meta.quota,
      } satisfies GenerateAiSessionResult;
    },
    ...options,
  });
}

export function useRetryAiGenerationMutation(options?: {
  onSuccess?: (result: GenerateAiSessionResult) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation({
    mutationFn: async ({ generationId }: RetryAiGenerationParams) => {
      const response = await createApiRequest<GenerateAiSessionResponse>(`/api/sessions/ai/${generationId}/retry`, {
        method: "POST",
        credentials: "include",
      });

      return {
        session: response.data.session,
        generation: response.data.generation,
        quota: response.meta.quota,
      } satisfies GenerateAiSessionResult;
    },
    ...options,
  });
}

// Query hooks

export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const response = await createApiRequest<ApiResponse<{ session: SessionDetailDTO }>>(
        `/api/sessions/${sessionId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      return response.data.session;
    },
    enabled: !!sessionId,
  });
}

export function useListSessions(query: ListSessionsQuery) {
  const params = new URLSearchParams();

  if (query.page) params.append("page", query.page.toString());
  if (query.pageSize) params.append("pageSize", query.pageSize.toString());
  if (query.status) query.status.forEach((s) => params.append("status", s));
  if (query.dateFrom) params.append("dateFrom", query.dateFrom);
  if (query.dateTo) params.append("dateTo", query.dateTo);
  if (query.sort) params.append("sort", query.sort);

  return useQuery({
    queryKey: ["sessions", query],
    queryFn: async () => {
      const response = await createApiRequest<ListSessionsResponse>(`/api/sessions?${params}`, {
        method: "GET",
        credentials: "include",
      });
      return response;
    },
  });
}

export function useCreateSession(options?: {
  onSuccess?: (response: CreateSessionResponse) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation({
    mutationFn: async (command: CreateSessionCommand) => {
      const response = await createApiRequest<CreateSessionResponse>("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(command),
      });
      return response;
    },
    ...options,
  });
}

export function useSessionValidation(query: SessionValidationQuery, options?: { enabled?: boolean }) {
  const params = new URLSearchParams();
  params.append("sessionDate", query.sessionDate);
  params.append("status", query.status);
  if (query.ignoreRestWarning !== undefined) {
    params.append("ignoreRestWarning", query.ignoreRestWarning.toString());
  }

  return useQuery({
    queryKey: ["validation", query],
    queryFn: async () => {
      const response = await createApiRequest<SessionValidationResponse>(`/api/sessions/validation?${params}`, {
        method: "GET",
        credentials: "include",
      });
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 0,
  });
}

export function useAiQuota() {
  return useQuery({
    queryKey: ["aiQuota"],
    queryFn: async () => {
      const response = await createApiRequest<AiQuotaResponse>("/api/sessions/ai/quota", {
        method: "GET",
        credentials: "include",
      });
      return response.data;
    },
    staleTime: 5000,
  });
}

export function useAiGenerationHistory(query?: { page?: number; pageSize?: number; status?: string[] }) {
  const params = new URLSearchParams();
  if (query?.page) params.append("page", query.page.toString());
  if (query?.pageSize) params.append("pageSize", query.pageSize.toString());
  if (query?.status) query.status.forEach((s) => params.append("status", s));

  return useQuery({
    queryKey: ["aiGenerations", query],
    queryFn: async () => {
      const response = await createApiRequest<ListAiGenerationsResponse>(`/api/sessions/ai/history?${params}`, {
        method: "GET",
        credentials: "include",
      });
      return response;
    },
  });
}
