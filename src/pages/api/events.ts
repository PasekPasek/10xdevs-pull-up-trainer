import type { APIRoute } from "astro";
import { z } from "zod";

import { buildErrorResponse, createHttpError } from "../../lib/utils/httpError";
import { listEvents } from "../../lib/services/events/listEvents";

export const prerender = false;

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
  eventType: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return Array.isArray(val) ? val : [val];
    }),
});

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

    // Parse query params
    const url = new URL(context.request.url);
    const queryParams: Record<string, string | string[]> = Object.fromEntries(url.searchParams.entries());

    // Handle multiple eventType values
    const eventTypeParams = url.searchParams.getAll("eventType");
    if (eventTypeParams.length > 0) {
      queryParams.eventType = eventTypeParams;
    }

    const queryResult = querySchema.safeParse(queryParams);

    if (!queryResult.success) {
      throw createHttpError({
        status: 400,
        code: "INVALID_QUERY",
        message: "Invalid query parameters",
        details: { requestId, issues: queryResult.error },
      });
    }

    // List events
    const { events, pagination } = await listEvents({ supabase }, user.id, queryResult.data);

    const body = JSON.stringify({
      data: {
        events,
        pagination,
      },
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
