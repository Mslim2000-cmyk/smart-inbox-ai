import { beforeEach, describe, expect, it, vi } from "vitest";
import { guardDemoAiCall } from "@/utils/demo/ai/guard";
import type { NormalizedEmail } from "@/utils/demo/ai/normalize";
import { draftReply } from "@/utils/demo/ai/reply";

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
    from: { name: "Jordan Blake", email: "jordan@example.com" },
    subject: "Pricing for the team plan",
    body: "Could you clarify how seat pricing works above 25 users?",
    snippet: "Could you clarify...",
    date: new Date().toISOString(),
    unread: true,
    ...overrides,
  };
}

describe("draftReply", () => {
  beforeEach(() => {
    mockGenerateObject.mockReset();
    vi.mocked(guardDemoAiCall).mockResolvedValue({ allowed: true });
  });

  it("returns the model's draft on success", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { reply: "Hi Jordan, seat pricing above 25 users is..." },
    });

    const result = await draftReply(makeEmail(), "professional");

    expect(result).toEqual({
      draft: { reply: "Hi Jordan, seat pricing above 25 users is..." },
      mode: "ai",
      model: "test-model",
      reason: "ok",
    });
  });

  it("passes the requested tone into the system prompt", async () => {
    mockGenerateObject.mockResolvedValue({ object: { reply: "Hi." } });

    await draftReply(makeEmail(), "short");

    const call = mockGenerateObject.mock.calls[0][0];
    expect(call.system).toMatch(/short/i);
  });

  it("falls back with model_error when the LLM call throws", async () => {
    mockGenerateObject.mockRejectedValue(new Error("model unavailable"));

    const result = await draftReply(
      makeEmail({ from: { name: "Sam Okafor", email: "sam@example.com" } }),
      "friendly",
    );

    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("model_error");
    expect(result.draft.reply).toContain("Hi Sam");
  });

  it("falls back without calling the model when the guard denies", async () => {
    vi.mocked(guardDemoAiCall).mockResolvedValue({
      allowed: false,
      reason: "missing_api_key",
    });

    const result = await draftReply(makeEmail(), "detailed");

    expect(mockGenerateObject).not.toHaveBeenCalled();
    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("missing_api_key");
  });
});
