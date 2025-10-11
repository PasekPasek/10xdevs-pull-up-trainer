import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type {
  AiGenerationHistoryItemDTO,
  GenerationStatus,
  ListAiGenerationsQuery,
  PaginationMeta,
} from "../../../types";
import { createHttpError } from "../../utils/httpError";
import { mapSessionRowToDTO } from "../sessions/mappers";

interface ListGenerationsDependencies {
  supabase: SupabaseClient<Database>;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export interface ListGenerationsResult {
  generations: AiGenerationHistoryItemDTO[];
  pagination: PaginationMeta;
}

/**
 * List AI generations with optional session data.
 * Ordered by most recent first.
 */
export async function listGenerations(
  dependencies: ListGenerationsDependencies,
  userId: string,
  query: ListAiGenerationsQuery
): Promise<ListGenerationsResult> {
  const { supabase } = dependencies;

  // Parse pagination params
  const page = Math.max(1, query.page ?? DEFAULT_PAGE);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  // Build query
  let queryBuilder = supabase.from("generations").select("*, sessions(*)", { count: "exact" }).eq("user_id", userId);

  // Apply status filter
  if (query.status && query.status.length > 0) {
    queryBuilder = queryBuilder.in("status", query.status as GenerationStatus[]);
  }

  // Order by created_at descending
  queryBuilder = queryBuilder.order("created_at", { ascending: false });

  // Apply pagination
  queryBuilder = queryBuilder.range(offset, offset + pageSize - 1);

  // Execute query
  const { data, error, count } = await queryBuilder;

  if (error) {
    throw createHttpError({
      status: 500,
      code: "FETCH_GENERATIONS_FAILED",
      message: "Failed to fetch AI generations",
      details: { hint: error.message },
    });
  }

  // Map to DTOs
  const generations: AiGenerationHistoryItemDTO[] = (data ?? []).map((row) => ({
    id: row.id,
    model: row.model,
    durationMs: row.duration_ms,
    status: row.status,
    createdAt: row.created_at,
    session:
      row.sessions && typeof row.sessions === "object" && !Array.isArray(row.sessions)
        ? mapSessionRowToDTO(row.sessions)
        : undefined,
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
    generations,
    pagination,
  };
}
