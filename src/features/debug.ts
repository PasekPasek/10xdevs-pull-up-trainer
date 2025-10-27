/* eslint-disable no-console */
/**
 * Debug utility to check feature flag environment detection
 *
 * Import this in a component to see what environment is being detected
 */

import { getEnvironment } from "./flags";

export function debugFeatureFlags(): void {
  const env = getEnvironment();
  const envFromImportMeta = typeof import.meta !== "undefined" ? import.meta.env.PUBLIC_ENV_NAME : undefined;
  const envFromProcess = typeof process !== "undefined" && process.env ? process.env.PUBLIC_ENV_NAME : undefined;

  console.group("🚩 Feature Flag Debug");
  console.log("Detected environment:", env);
  console.log("import.meta.env.PUBLIC_ENV_NAME:", envFromImportMeta);
  console.log("process.env.PUBLIC_ENV_NAME:", envFromProcess);
  console.log("All import.meta.env:", typeof import.meta !== "undefined" ? import.meta.env : "N/A");
  console.groupEnd();
}
