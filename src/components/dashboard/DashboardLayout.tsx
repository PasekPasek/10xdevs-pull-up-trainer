import type { PropsWithChildren } from "react";

import type { AiQuotaDTO } from "@/types";
import { INITIAL_WIZARD_STATE } from "@/components/dashboard/types";
import { DashboardContext } from "@/components/dashboard/DashboardContext";
import { useDashboardWizard } from "@/components/dashboard/useDashboardWizard";
import { Toaster } from "@/components/ui/sonner";

interface DashboardLayoutProps extends PropsWithChildren {
  quota?: AiQuotaDTO;
}

export function DashboardLayout({ children, quota }: DashboardLayoutProps) {
  const { wizardState, setWizardState, openWizard, closeWizard } = useDashboardWizard(INITIAL_WIZARD_STATE, quota);

  return (
    <DashboardContext.Provider value={{ wizardState, setWizardState, openWizard, closeWizard }}>
      {children}
      <Toaster />
    </DashboardContext.Provider>
  );
}
