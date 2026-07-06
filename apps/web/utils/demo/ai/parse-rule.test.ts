import { beforeEach, describe, expect, it, vi } from "vitest";
import { guardDemoAiCall } from "@/utils/demo/ai/guard";
import { parseRule } from "@/utils/demo/ai/parse-rule";
import type { ClassifiedDemoEmailInput } from "@/utils/demo/ai/schemas";

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

function makeEmails(
  overrides: Partial<ClassifiedDemoEmailInput> = {},
): ClassifiedDemoEmailInput[] {
  return [
    {
      id: "newsletter-1",
      from: { name: "Morning Brew", email: "crew@morningbrew.com" },
      subject: "Today's roundup",
      body: "Here's the news.",
      snippet: "Here's the news...",
      date: new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      unread: true,
      category: "newsletter",
      priority: "low",
      ...overrides,
    },
  ];
}

describe("parseRule", () => {
  beforeEach(() => {
    mockGenerateObject.mockReset();
    vi.mocked(guardDemoAiCall).mockResolvedValue({ allowed: true });
  });

  it("returns a parsed rule with a computed preview on success", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        name: "Archive old newsletters",
        match: "all",
        conditions: [
          { field: "category", operator: "in", value: ["newsletter"] },
          { field: "date", operator: "olderThanDays", value: 7 },
        ],
        actions: [{ type: "archive" }],
      },
    });

    const result = await parseRule({
      instruction: "Archive newsletters older than 7 days",
      emails: makeEmails(),
    });

    expect(result.status).toBe("parsed");
    expect(result.mode).toBe("ai");
    expect(result.reason).toBe("ok");
    expect(result.preview?.matchedCount).toBe(1);
    expect(result.preview?.actions).toEqual([{ type: "archive" }]);
  });

  it("returns unsupported with the model's reason when the model declines", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        unsupported: true,
        unsupportedReason: "This can't be expressed with supported fields.",
      },
    });

    const result = await parseRule({
      instruction: "Do something impossible",
      emails: makeEmails(),
    });

    expect(result.status).toBe("unsupported");
    expect(result.rule).toBeNull();
    expect(result.preview).toBeNull();
    expect(result.message).toBe(
      "This can't be expressed with supported fields.",
    );
    expect(result.mode).toBe("ai");
    expect(result.reason).toBe("ok");
  });

  it("returns unsupported with model_error when the model output fails schema validation", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        name: "Bad rule",
        conditions: [{ field: "subject", operator: "not-a-real-operator" }],
        actions: [{ type: "archive" }],
      },
    });

    const result = await parseRule({
      instruction: "Some instruction",
      emails: makeEmails(),
    });

    expect(result.status).toBe("unsupported");
    expect(result.mode).toBe("ai");
    expect(result.reason).toBe("model_error");
  });

  it("uses a fallback template when the guard denies but a template matches", async () => {
    vi.mocked(guardDemoAiCall).mockResolvedValue({
      allowed: false,
      reason: "missing_api_key",
    });

    const result = await parseRule({
      instruction: "Archive newsletters older than 7 days",
      emails: makeEmails(),
    });

    expect(mockGenerateObject).not.toHaveBeenCalled();
    expect(result.status).toBe("parsed");
    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("missing_api_key");
    expect(result.preview?.matchedCount).toBe(1);
  });

  it("returns unsupported when the guard denies and no template matches", async () => {
    vi.mocked(guardDemoAiCall).mockResolvedValue({
      allowed: false,
      reason: "daily_budget_exceeded",
    });

    const result = await parseRule({
      instruction: "Do a thing no template covers",
      emails: makeEmails(),
    });

    expect(result.status).toBe("unsupported");
    expect(result.rule).toBeNull();
    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("daily_budget_exceeded");
    expect(result.message).toBeTruthy();
  });

  it("falls back to a template when the LLM call throws", async () => {
    mockGenerateObject.mockRejectedValue(new Error("model unavailable"));

    const result = await parseRule({
      instruction: "Star urgent emails please",
      emails: makeEmails({ category: "urgent" }),
    });

    expect(result.status).toBe("parsed");
    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("model_error");
  });

  it("serves a repeat instruction from cache without calling the model again", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        name: "Star urgent",
        conditions: [{ field: "category", operator: "in", value: ["urgent"] }],
        actions: [{ type: "star" }],
      },
    });

    const instruction = "Star all urgent emails from now on";
    const first = await parseRule({ instruction, emails: makeEmails() });
    const second = await parseRule({ instruction, emails: makeEmails() });

    expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    expect(first.cached).toBe(0);
    expect(second.cached).toBe(1);
    expect(second.status).toBe("parsed");
    expect(second.mode).toBe("ai");
  });
});
