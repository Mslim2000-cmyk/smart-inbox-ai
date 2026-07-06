import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_CLASSIFICATION_EVAL_SET } from "@/__tests__/eval/demo-classification.fixtures";
import { classifyEmails } from "@/utils/demo/ai/classify";
import { fromDemoEmail } from "@/utils/demo/ai/normalize";
import { emailCategorySchema } from "@/utils/demo/ai/schemas";
import { DEMO_EMAILS } from "@/utils/demo/inbox-data";

const { mockGenerateObject } = vi.hoisted(() => ({
  mockGenerateObject: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: mockGenerateObject,
}));

vi.mock("@/utils/demo/ai/model", () => ({
  DEMO_MODEL_ID: "test-model",
  getDemoModel: vi.fn(() => "mock-model"),
  isDemoAiConfigured: vi.fn(() => true),
}));

vi.mock("@/utils/demo/ai/budget", () => ({
  reserveDemoAiBudget: vi.fn(async () => ({ allowed: true, remaining: 999 })),
}));

const evalEmails = DEMO_CLASSIFICATION_EVAL_SET.map((evalCase) => {
  const seedEmail = DEMO_EMAILS.find((email) => email.id === evalCase.emailId);
  if (!seedEmail) {
    throw new Error(
      `Fixture references unknown seed email id: ${evalCase.emailId}`,
    );
  }
  return { evalCase, normalized: fromDemoEmail(seedEmail) };
});

describe("classifyEmails against the labeled demo eval set", () => {
  beforeEach(() => {
    mockGenerateObject.mockReset();
  });

  it("returns the expected category and priority when the model classifies correctly", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        classifications: evalEmails.map(({ evalCase }) => ({
          emailId: evalCase.emailId,
          category: evalCase.expected.category,
          priority: evalCase.expected.priority,
          confidence: 0.9,
          reasoning: "Matches the labeled expectation.",
        })),
      },
    });

    const result = await classifyEmails(evalEmails.map((e) => e.normalized));

    for (const { evalCase } of evalEmails) {
      const classification = result.results.find(
        (r) => r.emailId === evalCase.emailId,
      );
      expect(classification).toBeDefined();

      const acceptable = [
        evalCase.expected.category,
        ...(evalCase.alsoAcceptable ?? []),
      ];
      expect(acceptable).toContain(classification?.category);
      expect(classification?.priority).toBe(evalCase.expected.priority);
    }

    expect(result.mode).toBe("ai");
    expect(result.reason).toBe("ok");
    expect(result.fallback).toBe(0);
  });

  // The deterministic fallback (used when AI is entirely unavailable) is a
  // safety net, not a second classifier - documented in classify.ts's
  // fallbackClassification(). It is NOT expected to match the labeled
  // category here; this test instead asserts the safety properties every
  // caller depends on: it never throws, and it always returns a
  // schema-valid, clearly low-confidence result.
  it("degrades safely (but not accurately) when AI is unavailable", async () => {
    mockGenerateObject.mockRejectedValue(new Error("model unavailable"));

    // The classification cache keys on email content, not id, and is a
    // module-level singleton shared with the test above. Reusing the exact
    // same content here would just serve that test's cached AI results
    // instead of exercising the fallback path, so each email gets a small
    // content variation to guarantee a cache miss.
    const uncachedVariants = evalEmails.map(({ normalized }) => ({
      ...normalized,
      body: `${normalized.body} (fallback-test-variant)`,
    }));

    const result = await classifyEmails(uncachedVariants);

    expect(result.mode).toBe("fallback");
    expect(result.results).toHaveLength(evalEmails.length);
    for (const classification of result.results) {
      expect(emailCategorySchema.safeParse(classification.category).success).toBe(
        true,
      );
      expect(classification.priority).toBe("low");
      expect(classification.confidence).toBe(0);
    }
  });
});
