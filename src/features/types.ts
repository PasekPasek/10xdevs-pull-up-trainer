/**
 * Feature flag system types
 */

export type Environment = "local" | "integration" | "prod";

export type FeatureFlag = "ENABLE_GENERATING_AI_SESSIONS";

export type FeatureFlagConfig = Record<Environment, Record<FeatureFlag, boolean>>;
