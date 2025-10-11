import type { APIRoute } from "astro";
import { z } from "zod";

import { buildErrorResponse, createHttpError } from "../../../../lib/utils/httpError";
import { listGenerations } from "../../../../lib/services/ai/listGenerations";
import type { GenerationStatus } from "../../../../types";

export const prerender = false;

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const arr = Array.isArray(val) ? val : [val];
      return arr.filter((s): s is GenerationStatus => ["success", "error", "timeout"].includes(s));
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

    const authHeader = context.request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

    if (!token) {
      throw createHttpError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        details: { requestId },
      });
    }

    const { data: userResult, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userResult?.user) {
      throw createHttpError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
        details: { requestId },
        cause: userError,
      });
    }

    // Parse query params
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Handle multiple status values
    const statusParams = url.searchParams.getAll("status");
    if (statusParams.length > 0) {
      queryParams.status = statusParams;
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

    // List generations
    const { generations, pagination } = await listGenerations({ supabase }, userResult.user.id, queryResult.data);

    const body = JSON.stringify({
      data: {
        generations,
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
