import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { ApiEventDTO, EventsListQuery, PaginationMeta } from "../../../types";
import type { Json } from "../../../db/database.types";
import { createHttpError } from "../../utils/httpError";

interface ListEventsDependencies {
  supabase: SupabaseClient<Database>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export interface ListEventsResult {
  events: ApiEventDTO[];
  pagination: PaginationMeta;
}

/**
 * List user events with pagination and filtering.
 * Read-only audit trail of user actions.
 */
export async function listEvents(
  dependencies: ListEventsDependencies,
  userId: string,
  query: EventsListQuery
): Promise<ListEventsResult> {
  const { supabase } = dependencies;

  // Parse pagination params
  const page = Math.max(1, query.page ?? DEFAULT_PAGE);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  // Build query
  let queryBuilder = supabase.from("events").select("*", { count: "exact" }).eq("user_id", userId);

  // Apply event type filter
  if (query.eventType && query.eventType.length > 0) {
    queryBuilder = queryBuilder.in("event_type", query.eventType);
  }

  // Order by created_at descending (most recent first)
  queryBuilder = queryBuilder.order("created_at", { ascending: false });

  // Apply pagination
  queryBuilder = queryBuilder.range(offset, offset + pageSize - 1);

  // Execute query
  const { data, error, count } = await queryBuilder;

  if (error) {
    throw createHttpError({
      status: 500,
      code: "FETCH_EVENTS_FAILED",
      message: "Failed to fetch events",
      details: { hint: error.message },
    });
  }

  // Map to DTOs
  const events: ApiEventDTO[] = (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    eventData: row.event_data as Json,
    createdAt: row.created_at,
    userId: row.user_id,
  }));

  // Build pagination meta
  const totalItems = count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const pagination: PaginationMeta = {
    page,
    pageSize,
    totalPages,
    totalItems,
  };

  return {
    events,
    pagination,
  };
}
