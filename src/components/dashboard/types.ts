import type { AiQuotaDTO } from "@/types";

export type { AiQuotaDTO };

export type AiWizardStep = "input" | "loading" | "result" | "error" | "confirmDelete" | "confirmFail" | "quota";

export interface AiWizardState {
  step: AiWizardStep;
  maxPullups?: number;
  generationId?: string;
  quota?: AiQuotaDTO;
  errorMessage?: string;
}

export const INITIAL_WIZARD_STATE: AiWizardState = {
  step: "quota",
};

export function hasNoQuota(quota?: AiQuotaDTO) {
  return !quota || quota.remaining <= 0;
}
