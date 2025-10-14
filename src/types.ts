import type { Enums, Tables, TablesInsert, TablesUpdate } from "./db/database.types";

/**
 * Root entities inferred from Supabase schema. These preserve a direct link to the
 * database layer while allowing DTOs to project camelCase shapes required by the API.
 */
export type SessionRow = Tables<"sessions">;
export type SessionInsert = TablesInsert<"sessions">;
export type SessionUpdate = TablesUpdate<"sessions">;

export type GenerationRow = Tables<"generations">;
export type GenerationInsert = TablesInsert<"generations">;
export type GenerationUpdate = TablesUpdate<"generations">;

export type GenerationErrorLogRow = Tables<"generation_error_logs">;
export type EventRow = Tables<"events">;

export type SessionStatus = Enums<"session_status">;
export type GenerationStatus = Enums<"generation_status">;

/**
 * Tuple representation of the five pull-up set columns (`set_1` ... `set_5`).
 * Each entry maps 1:1 to its column counterpart to keep type safety with the table.
 */
export type SessionSets = [
  SessionRow["set_1"],
  SessionRow["set_2"],
  SessionRow["set_3"],
  SessionRow["set_4"],
  SessionRow["set_5"],
];

export type SessionAction = "start" | "complete" | "fail" | "edit" | "delete";

/**
 * Session notes are modelled as free-form text persisted alongside session events.
 * They derive from `events.event_data` payloads, hence the JSON linkage for typing.
 */
export type SessionNote = string | null;

/** Shared API primitives */
export interface ApiWarning {
  code: string;
  message: string;
}

export interface ApiMetaBase {
  requestId?: string;
  warnings?: ApiWarning[];
}

export type ApiMetaWithExtras<TExtras extends Record<string, unknown> = Record<string, never>> = ApiMetaBase & TExtras;

export interface ApiEnvelope<TData, TMeta extends ApiMetaBase = ApiMetaBase> {
  data: TData;
  meta: TMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

/** Sessions */
export interface SessionDTO {
  id: SessionRow["id"];
  status: SessionStatus;
  sessionDate: SessionRow["session_date"];
  sets: SessionSets;
  totalReps: SessionRow["total_reps"];
  rpe: SessionRow["rpe"];
  aiComment: SessionRow["ai_comment"];
  isAiGenerated: SessionRow["is_ai_generated"];
  isModified: SessionRow["is_modified"];
  createdAt: SessionRow["created_at"];
  updatedAt: SessionRow["updated_at"];
}

export type SessionDetailDTO = SessionDTO & {
  canEdit: boolean;
  canDelete: boolean;
  actions: SessionAction[];
};

export type SessionSortOption = "sessionDate_desc" | "sessionDate_asc";

export interface ListSessionsQuery {
  page?: number;
  pageSize?: number;
  status?: SessionStatus[];
  dateFrom?: SessionRow["session_date"];
  dateTo?: SessionRow["session_date"];
  sort?: SessionSortOption;
  persistedFilterId?: string;
}

export interface SessionFiltersState {
  status?: SessionStatus[];
  dateFrom?: SessionRow["session_date"];
  dateTo?: SessionRow["session_date"];
}

export type ListSessionsResponse = ApiEnvelope<
  {
    sessions: SessionDTO[];
    pagination: PaginationMeta;
  },
  ApiMetaWithExtras<{ filters?: SessionFiltersState }>
>;

export interface CreateSessionCommand {
  status?: SessionStatus;
  sessionDate: SessionRow["session_date"];
  sets: SessionSets;
  rpe?: SessionRow["rpe"];
  notes?: SessionNote;
  startNow?: boolean;
}

export type CreateSessionResponse = ApiEnvelope<{ session: SessionDTO }, ApiMetaWithExtras>;

export interface UpdateSessionCommand {
  sessionDate?: SessionRow["session_date"];
  sets?: SessionSets;
  notes?: SessionNote;
  aiComment?: SessionRow["ai_comment"];
  markAsModified?: boolean;
}

export interface DeleteSessionCommand {
  sessionId: SessionRow["id"];
}

export interface StartSessionCommand {
  startAt?: SessionRow["created_at"];
}

export interface CompleteSessionCommand {
  sets?: SessionSets;
  rpe?: SessionRow["rpe"];
  completedAt?: SessionRow["updated_at"];
}

export interface FailSessionCommand {
  reason?: string;
}

/** AI quota & generations */
export interface AiQuotaDTO {
  remaining: number;
  limit: number;
  resetsAt: GenerationRow["created_at"];
  nextWindowSeconds: number;
}

export type AiQuotaResponse = ApiEnvelope<AiQuotaDTO, ApiMetaBase>;

export interface HistoricalSessionDTO {
  sessionDate: SessionRow["session_date"];
  sets: SessionSets;
  status: SessionStatus;
  totalReps?: SessionRow["total_reps"];
  rpe?: SessionRow["rpe"];
}

export interface AiStructuredResponseNew {
  sets: [number, number, number, number, number];
  comment: string;
}

export interface AiStructuredResponseExisting extends AiStructuredResponseNew {
  sessionDate: SessionRow["session_date"];
}

export interface GenerateAiSessionCommand {
  startNow?: boolean;
  maxPullups?: number;
  model: GenerationRow["model"];
}

export interface GenerationDTO {
  id: GenerationRow["id"];
  model: GenerationRow["model"];
  durationMs: GenerationRow["duration_ms"];
  status: GenerationStatus;
}

export type GenerateAiSessionResponse = ApiEnvelope<
  {
    session: SessionDTO;
    generation: GenerationDTO;
  },
  ApiMetaWithExtras<{ quota: AiQuotaDTO }>
>;

export interface RetryAiGenerationCommand {
  generationId: GenerationRow["id"];
}

export interface ListAiGenerationsQuery {
  page?: number;
  pageSize?: number;
  status?: GenerationStatus[];
}

export type AiGenerationHistoryItemDTO = GenerationDTO & {
  session?: SessionDTO;
  createdAt?: GenerationRow["created_at"];
  durationMs: GenerationRow["duration_ms"];
};

export type ListAiGenerationsResponse = ApiEnvelope<
  {
    generations: AiGenerationHistoryItemDTO[];
    pagination: PaginationMeta;
  },
  ApiMetaBase
>;

/** Validation helpers */
export interface SessionValidationQuery {
  sessionDate: SessionRow["session_date"];
  status: SessionStatus;
  ignoreRestWarning?: boolean;
}

export interface SessionValidationOutcomeDTO {
  blocking: boolean;
  warnings: ApiWarning[];
  lastCompletedSession?: {
    id: SessionRow["id"];
    hoursSince: number;
  };
}

export type SessionValidationResponse = ApiEnvelope<SessionValidationOutcomeDTO, ApiMetaBase>;

/** Dashboard snapshot */
export interface DashboardCallToAction {
  primary: string;
  secondary: string;
}

export interface DashboardSnapshotDTO {
  activeSession?: SessionDetailDTO;
  lastCompletedSession?: SessionDTO;
  aiQuota: AiQuotaDTO;
  cta: DashboardCallToAction;
}

export type DashboardSnapshotResponse = ApiEnvelope<DashboardSnapshotDTO, ApiMetaBase>;

/** Events & audit trail */
export interface ApiEventDTO {
  id: EventRow["id"];
  eventType: EventRow["event_type"];
  eventData: EventRow["event_data"];
  createdAt: EventRow["created_at"];
  userId: EventRow["user_id"];
}

export interface EventsListQuery {
  eventType?: EventRow["event_type"][];
  page?: number;
  pageSize?: number;
}

export type EventsListResponse = ApiEnvelope<
  {
    events: ApiEventDTO[];
    pagination: PaginationMeta;
  },
  ApiMetaBase
>;

/** Admin metrics */
export interface AdminKpiSummaryDTO {
  totalUsers: number;
  totalSessions: number;
  activationRate: number;
  aiAdoptionRate: number;
  failureRate: number;
  restPeriodCorrelation: number;
}

export type AdminMetricsResponse = ApiEnvelope<AdminKpiSummaryDTO, ApiMetaBase>;

export interface AdminAiMetricsQuery {
  windowStart?: GenerationRow["created_at"];
  windowEnd?: GenerationRow["created_at"];
}

export interface AdminAiMetricsDTO {
  windowStart: GenerationRow["created_at"];
  windowEnd: GenerationRow["created_at"];
  successRate: number;
  averageLatencyMs: number;
  failureBreakdown: Record<string, number>;
}

export type AdminAiMetricsResponse = ApiEnvelope<AdminAiMetricsDTO, ApiMetaBase>;

export interface AdminGenerationErrorsQuery {
  page?: number;
  pageSize?: number;
  errorType?: GenerationErrorLogRow["error_type"][];
  dateFrom?: GenerationErrorLogRow["created_at"];
  dateTo?: GenerationErrorLogRow["created_at"];
}

export interface GenerationErrorLogDTO {
  id: GenerationErrorLogRow["id"];
  userId: GenerationErrorLogRow["user_id"];
  generationId: GenerationErrorLogRow["generation_id"];
  errorType: GenerationErrorLogRow["error_type"];
  errorMessage: GenerationErrorLogRow["error_message"];
  errorStack: GenerationErrorLogRow["error_stack"];
  createdAt: GenerationErrorLogRow["created_at"];
}

export type AdminGenerationErrorsResponse = ApiEnvelope<
  {
    errors: GenerationErrorLogDTO[];
    pagination: PaginationMeta;
  },
  ApiMetaBase
>;
