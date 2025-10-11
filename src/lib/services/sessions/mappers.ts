import type { ApiWarning, SessionDTO, SessionRow, SessionSets } from "../../../types";

export function mapSessionRowToDTO(session: SessionRow): SessionDTO {
  const sets: SessionSets = [
    session.set_1 ?? null,
    session.set_2 ?? null,
    session.set_3 ?? null,
    session.set_4 ?? null,
    session.set_5 ?? null,
  ];

  return {
    id: session.id,
    status: session.status,
    sessionDate: session.session_date,
    sets,
    totalReps: session.total_reps,
    rpe: session.rpe,
    aiComment: session.ai_comment,
    isAiGenerated: session.is_ai_generated,
    isModified: session.is_modified,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

export interface WarningPayload {
  code: string;
  message?: string;
}

export function mapWarnings(warnings: WarningPayload[] | undefined): ApiWarning[] | undefined {
  if (!warnings || warnings.length === 0) {
    return undefined;
  }

  return warnings.map((warning) => ({
    code: warning.code,
    message: warning.message ?? warning.code,
  }));
}
