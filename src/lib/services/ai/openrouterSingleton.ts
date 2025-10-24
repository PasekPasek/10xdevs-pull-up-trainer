import type { OpenRouterService } from "./openrouter";
import { createOpenRouterService } from "./openrouter";

let instance: OpenRouterService | undefined;

export function getOpenRouterService(apiKey?: string): OpenRouterService {
  // If apiKey is provided at runtime (Cloudflare), always create a new instance
  // Otherwise, use the cached instance for local development
  if (apiKey) {
    return createOpenRouterService({ apiKey });
  }

  if (!instance) {
    instance = createOpenRouterService();
  }

  return instance;
}

export function setOpenRouterService(service: OpenRouterService | undefined): void {
  instance = service;
}
