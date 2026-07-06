import { reserveDemoAiBudget } from "@/utils/demo/ai/budget";
import { isDemoAiConfigured } from "@/utils/demo/ai/model";
import type { DemoAiReason } from "@/utils/demo/ai/schemas";

type DemoAiGuardDenyReason = Extract<
  DemoAiReason,
  "missing_api_key" | "daily_budget_exceeded"
>;

export type DemoAiGuardResult =
  | { allowed: true }
  | { allowed: false; reason: DemoAiGuardDenyReason };

// Shared pre-flight check every demo AI action (classify/summarize/reply)
// runs before calling the model: is a key configured, and is there budget
// left today. Centralized so the two checks - and their exact reason codes -
// can't drift between features.
export async function guardDemoAiCall(
  budgetCost: number,
): Promise<DemoAiGuardResult> {
  if (!isDemoAiConfigured()) {
    return { allowed: false, reason: "missing_api_key" };
  }

  const budget = await reserveDemoAiBudget(budgetCost);
  if (!budget.allowed) {
    return { allowed: false, reason: "daily_budget_exceeded" };
  }

  return { allowed: true };
}
