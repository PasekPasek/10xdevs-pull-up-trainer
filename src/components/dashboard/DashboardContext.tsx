import { createContext, useContext } from "react";

import type { AiWizardState } from "@/components/dashboard/types";

interface DashboardContextValue {
  wizardState: AiWizardState;
  setWizardState: (updater: AiWizardState | ((prev: AiWizardState) => AiWizardState)) => void;
  openWizard: () => void;
  closeWizard: () => void;
}

export const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function useDashboardContext() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("useDashboardContext must be used within DashboardProvider");
  }

  return context;
}
