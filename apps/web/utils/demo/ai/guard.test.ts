import { beforeEach, describe, expect, it, vi } from "vitest";
import { guardDemoAiCall } from "@/utils/demo/ai/guard";
import { reserveDemoAiBudget } from "@/utils/demo/ai/budget";
import { isDemoAiConfigured } from "@/utils/demo/ai/model";

vi.mock("@/utils/demo/ai/model", () => ({
  isDemoAiConfigured: vi.fn(() => true),
}));

vi.mock("@/utils/demo/ai/budget", () => ({
  reserveDemoAiBudget: vi.fn(async () => ({ allowed: true, remaining: 999 })),
}));

describe("guardDemoAiCall", () => {
  beforeEach(() => {
    vi.mocked(isDemoAiConfigured).mockReturnValue(true);
    vi.mocked(reserveDemoAiBudget).mockResolvedValue({
      allowed: true,
      remaining: 999,
    });
  });

  it("allows the call when configured and within budget", async () => {
    const result = await guardDemoAiCall(3);
    expect(result).toEqual({ allowed: true });
    expect(reserveDemoAiBudget).toHaveBeenCalledWith(3);
  });

  it("denies with missing_api_key when AI is not configured", async () => {
    vi.mocked(isDemoAiConfigured).mockReturnValue(false);

    const result = await guardDemoAiCall(1);

    expect(result).toEqual({
      allowed: false,
      reason: "missing_api_key",
    });
    expect(reserveDemoAiBudget).not.toHaveBeenCalled();
  });

  it("denies with daily_budget_exceeded when the budget guard denies", async () => {
    vi.mocked(reserveDemoAiBudget).mockResolvedValue({
      allowed: false,
      remaining: 0,
    });

    const result = await guardDemoAiCall(1);

    expect(result).toEqual({
      allowed: false,
      reason: "daily_budget_exceeded",
    });
  });
});
