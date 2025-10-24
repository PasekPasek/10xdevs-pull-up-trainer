import type { APIRoute } from "astro";

import { buildErrorResponse, createHttpError } from "../../../../lib/utils/httpError";
import { getQuota } from "../../../../lib/services/ai/getQuota";
import { requireFeature } from "../../../../features";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const requestId = crypto.randomUUID();

  try {
    const supabase = context.locals.supabase;

    if (!supabase) {
      throw createHttpError({
        status: 500,
        code: "SUPABASE_CLIENT_MISSING",
        message: "Supabase client is not available in the request context",
        details: { requestId },
      });
    }

    const user = context.locals.user;

    if (!user) {
      throw createHttpError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        details: { requestId },
      });
    }

    // Check feature flag
    requireFeature("ENABLE_GENERATING_AI_SESSIONS");

    // Get quota
    const quota = await getQuota({ supabase }, user.id);

    const body = JSON.stringify({
      data: quota,
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
