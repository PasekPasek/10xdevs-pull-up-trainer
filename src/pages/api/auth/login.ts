import type { APIRoute } from "astro";

import { createAuthService } from "@/lib/services/auth/authService";
import { loginRequestSchema } from "@/lib/validation/api/authSchemas";
import { buildErrorResponse, createHttpError } from "@/lib/utils/httpError";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
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

    const rawBody = await request.json().catch(() => {
      throw createHttpError({
        status: 400,
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
        details: { requestId },
      });
    });

    const parseResult = loginRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      throw createHttpError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
        details: { requestId, issues: parseResult.error.flatten().fieldErrors },
      });
    }

    const { email, password } = parseResult.data;

    const authService = createAuthService(supabase);

    const result = await authService.login({ email, password });

    // Supabase SSR automatically sets cookies via setAll callback in createSupabaseServerInstance
    // No manual session management needed

    const body = JSON.stringify({
      data: {
        user: result.user,
      },
      meta: {
        requestId,
      },
    });

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return buildErrorResponse(
        createHttpError({
          status: 401,
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
          details: { requestId },
        }),
        { requestId }
      );
    }

    return buildErrorResponse(error, { requestId });
  }
};
