import type { DemoAiReason } from "@/utils/demo/ai/schemas";

// Shared across every demo AI surface (dashboard, email detail actions) so
// the "why did this fall back" copy can't drift between them.
const REASON_TEXT: Partial<Record<DemoAiReason, string>> = {
  missing_api_key: "Demo AI isn't configured on this deployment",
  daily_budget_exceeded: "Today's demo AI budget is used up",
  model_error: "AI hit an error",
};

export function getDemoAiReasonText(reason: DemoAiReason): string {
  return REASON_TEXT[reason] ?? "AI is currently unavailable";
}
