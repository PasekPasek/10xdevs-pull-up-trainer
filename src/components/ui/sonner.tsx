import type { CSSProperties } from "react";

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

const DEFAULT_STYLE: CSSProperties = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
};

function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      theme={props.theme ?? "light"}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={{ ...DEFAULT_STYLE, ...props.style }}
      position={props.position ?? "top-right"}
      {...props}
    />
  );
}

export { Toaster };
