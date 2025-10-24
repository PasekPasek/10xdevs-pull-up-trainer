/**
 * Feature flag configuration and utilities
 *
 * This module provides environment-based feature flags to separate deployments from releases.
 * Flags can be checked in both frontend (Astro/React) and backend (API routes).
 */

import type { Environment, FeatureFlag, FeatureFlagConfig } from "./types";

/**
 * Feature flag configuration per environment
 *
 * - local: Developer machines, all features enabled by default
 * - integration: Testing/staging environment, new features can be tested
 * - prod: Production environment, features controlled carefully
 */
const FLAGS: FeatureFlagConfig = {
  local: {
    ENABLE_GENERATING_AI_SESSIONS: true,
  },
  integration: {
    ENABLE_GENERATING_AI_SESSIONS: true,
  },
  prod: {
    ENABLE_GENERATING_AI_SESSIONS: true,
  },
};

/**
 * Get the current environment from PUBLIC_ENV_NAME variable
 *
 * Defaults to 'prod' (most restrictive) if PUBLIC_ENV_NAME is not set or invalid.
 * This ensures features are disabled by default in production for safety.
 *
 * Note: Must use PUBLIC_ prefix for Astro/Vite to expose to client-side code.
 */
export function getEnvironment(): Environment {
  // Check if we're in a browser or server context
  const envName = typeof import.meta !== "undefined" ? import.meta.env.PUBLIC_ENV_NAME : process.env.PUBLIC_ENV_NAME;

  const validEnvironments: Environment[] = ["local", "integration", "prod"];

  if (envName && validEnvironments.includes(envName as Environment)) {
    return envName as Environment;
  }

  // Default to prod (most restrictive) for safety
  return "prod";
}

/**
 * Check if a feature flag is enabled in the current environment
 *
 * @param flag - The feature flag to check
 * @returns true if the feature is enabled, false otherwise
 *
 * @example
 * ```typescript
 * if (isFeatureEnabled('ENABLE_GENERATING_AI_SESSIONS')) {
 *   // Show AI session generation UI
 * }
 * ```
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const env = getEnvironment();
  return FLAGS[env][flag] ?? false;
}

/**
 * Require a feature to be enabled, throwing an error if it's disabled
 *
 * This is useful for API endpoints that should return 403 when a feature is disabled.
 *
 * @param flag - The feature flag to check
 * @throws {FeatureDisabledError} If the feature is disabled
 *
 * @example
 * ```typescript
 * export const POST: APIRoute = async (context) => {
 *   // ... authentication ...
 *   requireFeature('ENABLE_GENERATING_AI_SESSIONS');
 *   // ... proceed with AI generation ...
 * };
 * ```
 */
export function requireFeature(flag: FeatureFlag): void {
  if (!isFeatureEnabled(flag)) {
    throw new FeatureDisabledError(flag);
  }
}

/**
 * Custom error thrown when a required feature is disabled
 */
export class FeatureDisabledError extends Error {
  public readonly flag: FeatureFlag;
  public readonly status = 403;

  constructor(flag: FeatureFlag) {
    super(`Feature '${flag}' is not enabled in the current environment`);
    this.name = "FeatureDisabledError";
    this.flag = flag;
  }
}
