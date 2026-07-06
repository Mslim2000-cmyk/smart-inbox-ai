import { createAnthropic } from "@ai-sdk/anthropic";
import { env } from "@/env";

// Fast/cheap model by default: classification doesn't need a frontier model,
// and this endpoint is public, so cost per call matters.
const DEFAULT_DEMO_MODEL_ID = "claude-haiku-4-5-20251001";

export const DEMO_MODEL_ID = env.DEMO_AI_MODEL || DEFAULT_DEMO_MODEL_ID;

export function isDemoAiConfigured(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY);
}

export function getDemoModel() {
  if (!isDemoAiConfigured()) {
    throw new Error(
      "ANTHROPIC_API_KEY is required to run the demo AI classifier",
    );
  }

  return createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(DEMO_MODEL_ID);
}
