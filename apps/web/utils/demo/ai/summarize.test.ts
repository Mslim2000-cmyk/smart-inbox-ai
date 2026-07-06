import { beforeEach, describe, expect, it, vi } from "vitest";
import { guardDemoAiCall } from "@/utils/demo/ai/guard";
import type { NormalizedEmail } from "@/utils/demo/ai/normalize";
import { summarizeEmail } from "@/utils/demo/ai/summarize";

const { mockGenerateObject } = vi.hoisted(() => ({
  mockGenerateObject: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: mockGenerateObject,
}));

vi.mock("@/utils/demo/ai/model", () => ({
  DEMO_MODEL_ID: "test-model",
  getDemoModel: vi.fn(() => "mock-model"),
}));

vi.mock("@/utils/demo/ai/guard", () => ({
  guardDemoAiCall: vi.fn(async () => ({ allowed: true })),
}));

function makeEmail(overrides: Partial<NormalizedEmail> = {}): NormalizedEmail {
  return {
    id: "email-1",
    from: { name: "Priya Nair", email: "priya@example.com" },
    subject: "Production outage impacting checkout",
    body: "We're seeing 500 errors on checkout since 9am. Please jump on a call in the next 30 minutes.",
    snippet: "We're seeing 500 errors...",
    date: new Date().toISOString(),
    unread: true,
    ...overrides,
  };
}

describe("summarizeEmail", () => {
  beforeEach(() => {
    mockGenerateObject.mockReset();
    vi.mocked(guardDemoAiCall).mockResolvedValue({ allowed: true });
  });

  it("returns the model's structured summary on success", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        mainPoint: "Checkout is returning 500 errors since 9am.",
        requestedAction: "Join a call within 30 minutes.",
        deadline: "in the next 30 minutes",
        importance: "high",
      },
    });

    const result = await summarizeEmail(makeEmail());

    expect(result).toEqual({
      summary: {
        mainPoint: "Checkout is returning 500 errors since 9am.",
        requestedAction: "Join a call within 30 minutes.",
        deadline: "in the next 30 minutes",
        importance: "high",
      },
      mode: "ai",
      model: "test-model",
      reason: "ok",
    });
  });

  it("falls back with model_error when the LLM call throws", async () => {
    mockGenerateObject.mockRejectedValue(new Error("model unavailable"));

    const result = await summarizeEmail(
      makeEmail({ subject: "Weekly digest" }),
    );

    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("model_error");
    expect(result.summary).toEqual({
      mainPoint: "Weekly digest",
      requestedAction: null,
      deadline: null,
      importance: "normal",
    });
  });

  it("falls back without calling the model when the guard denies", async () => {
    vi.mocked(guardDemoAiCall).mockResolvedValue({
      allowed: false,
      reason: "daily_budget_exceeded",
    });

    const result = await summarizeEmail(
      makeEmail({ subject: "Over budget" }),
    );

    expect(mockGenerateObject).not.toHaveBeenCalled();
    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("daily_budget_exceeded");
  });
});
