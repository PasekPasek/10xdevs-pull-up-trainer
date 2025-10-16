import type { APIRoute } from "astro";

import { buildErrorResponse, createHttpError } from "../../lib/utils/httpError";
import { getDashboard } from "../../lib/services/dashboard/getDashboard";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const requestId = crypto.randomUUID();

  try {
    const supabase = context.locals.supabase;
    const user = context.locals.user;

    if (!supabase) {
      throw createHttpError({
        status: 500,
        code: "SUPABASE_CLIENT_MISSING",
        message: "Supabase client is not available in the request context",
        details: { requestId },
      });
    }

    if (!user) {
      throw createHttpError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        details: { requestId },
      });
    }

    // Get dashboard snapshot
    const dashboard = await getDashboard({ supabase }, user.id);

    const body = JSON.stringify({
      data: dashboard,
      meta: { requestId },
    });

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return buildErrorResponse(error, { requestId });
  }
};
