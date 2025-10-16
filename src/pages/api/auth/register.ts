import type { APIRoute } from "astro";

import { createAuthService } from "@/lib/services/auth/authService";
import { createSessionManager } from "@/lib/services/auth/sessionManager";
import { registerRequestSchema } from "@/lib/validation/api/authSchemas";
import { buildErrorResponse, createHttpError } from "@/lib/utils/httpError";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, cookies }) => {
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

    const parseResult = registerRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      throw createHttpError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid input data",
        details: { requestId, issues: parseResult.error.flatten().fieldErrors },
      });
    }

    const { email, password, rememberMe } = parseResult.data;

    const authService = createAuthService(supabase);
    const sessionManager = createSessionManager(cookies);

    const result = await authService.register({ email, password });

    sessionManager.setSession(result.session.accessToken, result.session.refreshToken, {
      rememberMe,
      expiresAt: result.session.expiresAt,
      expiresIn: result.session.expiresIn,
    });

    const body = JSON.stringify({
      data: {
        user: result.user,
      },
      meta: {
        requestId,
      },
    });

    return new Response(body, {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EMAIL_EXISTS") {
        return buildErrorResponse(
          createHttpError({
            status: 409,
            code: "EMAIL_EXISTS",
            message: "An account with this email already exists",
            details: { requestId },
          }),
          { requestId }
        );
      }

      if (error.message === "AUTO_LOGIN_FAILED") {
        return buildErrorResponse(
          createHttpError({
            status: 500,
            code: "AUTO_LOGIN_FAILED",
            message: "Account created, but failed to sign in. Please try signing in manually.",
            details: { requestId },
          }),
          { requestId }
        );
      }

      if (error.message === "REGISTRATION_FAILED") {
        return buildErrorResponse(
          createHttpError({
            status: 500,
            code: "REGISTRATION_FAILED",
            message: "Failed to create account. Please try again.",
            details: { requestId },
          }),
          { requestId }
        );
      }
    }

    return buildErrorResponse(error, { requestId });
  }
};
