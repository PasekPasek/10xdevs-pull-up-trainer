import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { ListSessionsQuery, PaginationMeta, SessionDTO, SessionFiltersState } from "../../../types";
import { createHttpError } from "../../utils/httpError";
import { mapSessionRowToDTO } from "./mappers";

interface ListSessionsDependencies {
  supabase: SupabaseClient<Database>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export interface ListSessionsResult {
  sessions: SessionDTO[];
  pagination: PaginationMeta;
  filters: SessionFiltersState;
}

/**
 * List user sessions with pagination, filtering, and sorting.
 * Supports multiple status filters, date range, and sort order.
 */
export async function listSessions(
  dependencies: ListSessionsDependencies,
  userId: string,
  query: ListSessionsQuery
): Promise<ListSessionsResult> {
  const { supabase } = dependencies;

  // Parse pagination params
  const page = Math.max(1, query.page ?? DEFAULT_PAGE);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  // Build query
  let queryBuilder = supabase.from("sessions").select("*", { count: "exact" }).eq("user_id", userId);

  // Apply status filter
  if (query.status && query.status.length > 0) {
    queryBuilder = queryBuilder.in("status", query.status);
  }

  // Apply date range filters
  if (query.dateFrom) {
    queryBuilder = queryBuilder.gte("session_date", query.dateFrom);
  }

  if (query.dateTo) {
    queryBuilder = queryBuilder.lte("session_date", query.dateTo);
  }

  // Apply sorting
  const sortOrder = query.sort === "sessionDate_asc" ? true : false; // true = ascending
  queryBuilder = queryBuilder.order("session_date", { ascending: sortOrder });

  // Apply pagination
  queryBuilder = queryBuilder.range(offset, offset + pageSize - 1);

  // Execute query
  const { data, error, count } = await queryBuilder;

  if (error) {
    throw createHttpError({
      status: 500,
      code: "FETCH_SESSIONS_FAILED",
      message: "Failed to fetch sessions",
      details: { hint: error.message },
    });
  }

  // Map to DTOs
  const sessions = (data ?? []).map(mapSessionRowToDTO);

  // Build pagination meta
  const totalItems = count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const pagination: PaginationMeta = {
    page,
    pageSize,
    totalPages,
    totalItems,
  };

  // Build filters state
  const filters: SessionFiltersState = {
    status: query.status,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  };

  return {
    sessions,
    pagination,
    filters,
  };
}
