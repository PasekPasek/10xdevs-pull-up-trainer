import type { PropsWithChildren } from "react";

import { INITIAL_WIZARD_STATE } from "@/components/dashboard/types";
import { DashboardContext } from "@/components/dashboard/DashboardContext";
import { useDashboardWizard } from "@/components/dashboard/useDashboardWizard";
import { Toaster } from "@/components/ui/sonner";

export function DashboardLayout({ children }: PropsWithChildren) {
  const { wizardState, setWizardState, openWizard, closeWizard } = useDashboardWizard(INITIAL_WIZARD_STATE);

  return (
    <DashboardContext.Provider value={{ wizardState, setWizardState, openWizard, closeWizard }}>
      {children}
      <Toaster />
    </DashboardContext.Provider>
  );
}
