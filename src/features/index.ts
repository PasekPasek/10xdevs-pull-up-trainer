/**
 * Feature flag system - Public API
 *
 * Import from this file to use feature flags throughout the application.
 */

export { isFeatureEnabled, requireFeature, getEnvironment, FeatureDisabledError } from "./flags";
export type { Environment, FeatureFlag, FeatureFlagConfig } from "./types";
