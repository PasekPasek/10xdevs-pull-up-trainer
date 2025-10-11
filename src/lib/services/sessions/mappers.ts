import type {
  ApiWarning,
  SessionAction,
  SessionDetailDTO,
  SessionDTO,
  SessionRow,
  SessionSets,
  SessionStatus,
} from "../../../types";

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

export function buildSessionActions(status: SessionStatus): SessionAction[] {
  const actions: SessionAction[] = [];

  switch (status) {
    case "planned":
      actions.push("start", "edit", "delete");
      break;
    case "in_progress":
      actions.push("complete", "fail", "edit", "delete");
      break;
    case "completed":
    case "failed":
      // Immutable - no actions allowed
      break;
  }

  return actions;
}

export function mapSessionRowToDetailDTO(session: SessionRow): SessionDetailDTO {
  const baseDto = mapSessionRowToDTO(session);
  const isActive = session.status === "planned" || session.status === "in_progress";

  return {
    ...baseDto,
    canEdit: isActive,
    canDelete: isActive,
    actions: buildSessionActions(session.status),
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
