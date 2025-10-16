import { useCallback, useState } from "react";

import { hasNoQuota, type AiQuotaDTO, type AiWizardState } from "@/components/dashboard/types";

export function useDashboardWizard(initialState: AiWizardState, quota?: AiQuotaDTO) {
  const [wizardState, setWizardStateInternal] = useState<AiWizardState>(() => ({ ...initialState, quota }));

  const setWizardState = useCallback((updater: AiWizardState | ((prev: AiWizardState) => AiWizardState)) => {
    setWizardStateInternal((prev) => {
      if (typeof updater === "function") {
        return (updater as (prev: AiWizardState) => AiWizardState)(prev);
      }

      return { ...prev, ...updater };
    });
  }, []);

  const openWizard = useCallback(() => {
    setWizardState((prev) => {
      if (hasNoQuota(prev.quota)) {
        return { ...prev, step: "quota" };
      }

      return { ...prev, step: "input" };
    });
  }, [setWizardState]);

  const closeWizard = useCallback(() => {
    setWizardState({ ...initialState, quota });
  }, [initialState, quota, setWizardState]);

  return { wizardState, setWizardState, openWizard, closeWizard };
}
