import type { APIRoute } from "astro";
import { z } from "zod";

import type { CreateSessionInput } from "../../../lib/validation/sessions/createSession.schema";
import { mapSessionRowToDTO, mapWarnings } from "../../../lib/services/sessions/mappers";
import { createSession } from "../../../lib/services/sessions/createSession";
import { listSessions } from "../../../lib/services/sessions/listSessions";
import { buildErrorResponse, createHttpError } from "../../../lib/utils/httpError";
import { createSessionSchema } from "../../../lib/validation/sessions/createSession.schema";
import type { SessionStatus } from "../../../types";

export const prerender = false;

const listSessionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const arr = Array.isArray(val) ? val : [val];
      return arr.filter((s): s is SessionStatus => ["planned", "in_progress", "completed", "failed"].includes(s));
    }),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sort: z.enum(["sessionDate_desc", "sessionDate_asc"]).optional(),
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

    // Handle multiple status values
    const statusParams = url.searchParams.getAll("status");
    if (statusParams.length > 0) {
      queryParams.status = statusParams;
    }

    const queryResult = listSessionsQuerySchema.safeParse(queryParams);

    if (!queryResult.success) {
      throw createHttpError({
        status: 400,
        code: "INVALID_QUERY",
        message: "Invalid query parameters",
        details: { requestId, issues: queryResult.error },
      });
    }

    // List sessions
    const { sessions, pagination, filters } = await listSessions({ supabase }, user.id, queryResult.data);

    const body = JSON.stringify({
      data: {
        sessions,
        pagination,
      },
      meta: {
        requestId,
        filters,
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
    return buildErrorResponse(error, { requestId });
  }
};

export const POST: APIRoute = async (context) => {
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

    const rawBody = await context.request.json().catch(() => {
      throw createHttpError({
        status: 400,
        code: "INVALID_JSON",
        message: "Request body must be valid JSON",
        details: { requestId },
      });
    });

    let payload: CreateSessionInput;

    try {
      payload = createSessionSchema.parse(rawBody);
    } catch (parseError) {
      throw createHttpError({
        status: 400,
        code: "INVALID_PAYLOAD",
        message: "Payload validation failed",
        details: { requestId, issues: parseError },
        cause: parseError,
      });
    }

    const { session, warnings } = await createSession({ supabase }, user.id, payload);

    const sessionDto = mapSessionRowToDTO(session);
    const mappedWarnings = mapWarnings(warnings);

    const headers = new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });

    if (sessionDto.updatedAt) {
      headers.set("ETag", sessionDto.updatedAt);
    }

    const body = JSON.stringify({
      data: { session: sessionDto },
      meta: {
        requestId,
        warnings: mappedWarnings,
      },
    });

    return new Response(body, {
      status: 201,
      headers,
    });
  } catch (error) {
    return buildErrorResponse(error, { requestId });
  }
};
