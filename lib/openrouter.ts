import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/** True when the optional concierge can reach its model provider. */
export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const bargainModel = openrouter.chat("openrouter/free");
