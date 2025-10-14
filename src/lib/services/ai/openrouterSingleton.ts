import type { OpenRouterService } from "./openrouter";
import { createOpenRouterService } from "./openrouter";

let instance: OpenRouterService | undefined;

export function getOpenRouterService(): OpenRouterService {
  if (!instance) {
    instance = createOpenRouterService();
  }

  return instance;
}

export function setOpenRouterService(service: OpenRouterService | undefined): void {
  instance = service;
}
