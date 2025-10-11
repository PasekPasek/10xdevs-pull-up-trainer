import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../db/database.types";
import type { AiQuotaDTO } from "../../../types";
import { createHttpError } from "../../utils/httpError";

interface GetQuotaDependencies {
  supabase: SupabaseClient<Database>;
}

const AI_GENERATION_LIMIT = 5;
const AI_WINDOW_HOURS = 24;

/**
 * Get AI generation quota for user.
 * Returns remaining generations in 24h rolling window.
 */
export async function getQuota(dependencies: GetQuotaDependencies, userId: string): Promise<AiQuotaDTO> {
  const { supabase } = dependencies;

  // Calculate window start time (24h ago)
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - AI_WINDOW_HOURS);

  // Count successful generations in the last 24h
  const { count, error } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "success")
    .gte("created_at", windowStart.toISOString());

  if (error) {
    throw createHttpError({
      status: 500,
      code: "FETCH_QUOTA_FAILED",
      message: "Failed to fetch AI quota",
      details: { hint: error.message },
    });
  }

  const usedCount = count ?? 0;
  const remaining = Math.max(0, AI_GENERATION_LIMIT - usedCount);

  // Find the earliest generation in the window to calculate reset time
  const { data: earliestGeneration } = await supabase
    .from("generations")
    .select("created_at")
    .eq("user_id", userId)
    .eq("status", "success")
    .gte("created_at", windowStart.toISOString())
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Calculate reset time (24h after earliest generation)
  let resetsAt: string;
  let nextWindowSeconds: number;

  if (earliestGeneration && usedCount >= AI_GENERATION_LIMIT) {
    const earliestDate = new Date(earliestGeneration.created_at);
    const resetDate = new Date(earliestDate);
    resetDate.setHours(resetDate.getHours() + AI_WINDOW_HOURS);
    resetsAt = resetDate.toISOString();
    nextWindowSeconds = Math.max(0, Math.floor((resetDate.getTime() - Date.now()) / 1000));
  } else {
    // If not at limit, reset is 24h from now
    const resetDate = new Date();
    resetDate.setHours(resetDate.getHours() + AI_WINDOW_HOURS);
    resetsAt = resetDate.toISOString();
    nextWindowSeconds = AI_WINDOW_HOURS * 3600;
  }

  return {
    remaining,
    limit: AI_GENERATION_LIMIT,
    resetsAt,
    nextWindowSeconds,
  };
}
