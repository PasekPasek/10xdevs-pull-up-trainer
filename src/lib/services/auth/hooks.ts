import { useMutation } from "@tanstack/react-query";
import { createApiRequest } from "@/lib/utils/httpError";

interface LoginParams {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface RegisterParams {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface AuthResponse {
  data: {
    user: {
      id: string;
      email: string;
    };
  };
}

interface LogoutResponse {
  success: boolean;
}

/**
 * Mutation hook for user login
 */
export function useLoginMutation(options?: {
  onSuccess?: (data: AuthResponse) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation({
    mutationFn: async (params: LoginParams) => {
      const response = await createApiRequest<AuthResponse>("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(params),
      });

      return response;
    },
    ...options,
  });
}

/**
 * Mutation hook for user registration
 */
export function useRegisterMutation(options?: {
  onSuccess?: (data: AuthResponse) => void;
  onError?: (error: unknown) => void;
}) {
  return useMutation({
    mutationFn: async (params: RegisterParams) => {
      const response = await createApiRequest<AuthResponse>("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(params),
      });

      return response;
    },
    ...options,
  });
}

/**
 * Mutation hook for user logout
 */
export function useLogoutMutation(options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) {
  return useMutation({
    mutationFn: async () => {
      const response = await createApiRequest<LogoutResponse>("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      return response;
    },
    ...options,
  });
}
