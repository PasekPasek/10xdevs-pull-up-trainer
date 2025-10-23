import type { APIRoute } from "astro";

import { createAuthService } from "@/lib/services/auth/authService";
import { buildErrorResponse, createHttpError } from "@/lib/utils/httpError";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  const requestId = crypto.randomUUID();

  try {
    const supabase = locals.supabase;

    if (!supabase) {
      throw createHttpError({
        status: 500,
        code: "SUPABASE_CLIENT_MISSING",
        message: "Supabase client is not available in the request context",
        details: { requestId },
      });
    }

    const authService = createAuthService(supabase);

    await authService.logout();

    // Supabase SSR automatically clears cookies via setAll callback in createSupabaseServerInstance
    // No manual session management needed

    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "LOGOUT_FAILED") {
      return buildErrorResponse(
        createHttpError({
          status: 500,
          code: "LOGOUT_FAILED",
          message: "Failed to sign out. Please try again.",
          details: { requestId },
        }),
        { requestId }
      );
    }

    return buildErrorResponse(error, { requestId });
  }
};
