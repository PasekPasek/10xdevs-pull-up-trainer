import { useCallback, useState } from "react";

import type { AiWizardState } from "@/components/dashboard/types";

export function useDashboardWizard(initialState: AiWizardState) {
  const [wizardState, setWizardStateInternal] = useState<AiWizardState>(initialState);

  const setWizardState = useCallback((updater: AiWizardState | ((prev: AiWizardState) => AiWizardState)) => {
    setWizardStateInternal((prev) => {
      if (typeof updater === "function") {
        return (updater as (prev: AiWizardState) => AiWizardState)(prev);
      }

      return { ...prev, ...updater };
    });
  }, []);

  const openWizard = useCallback(() => {
    setWizardState((prev) => ({ ...prev, step: "input" }));
  }, [setWizardState]);

  const closeWizard = useCallback(() => {
    setWizardState(initialState);
  }, [initialState, setWizardState]);

  return { wizardState, setWizardState, openWizard, closeWizard };
}
