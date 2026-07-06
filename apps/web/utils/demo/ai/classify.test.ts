import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyEmails } from "@/utils/demo/ai/classify";
import { reserveDemoAiBudget } from "@/utils/demo/ai/budget";
import { isDemoAiConfigured } from "@/utils/demo/ai/model";
import type { NormalizedEmail } from "@/utils/demo/ai/normalize";

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

// The classification cache keys on email content (from/subject/body), not id,
// and the cache is a module-level singleton shared across every test in this
// file. Each test below therefore uses content that is unique to it, so a
// cache write in one test can never register as a hit in another.
function makeEmail(overrides: Partial<NormalizedEmail> = {}): NormalizedEmail {
  return {
    id: "email-1",
    from: { name: "Jane Doe", email: "jane@example.com" },
    subject: "Quick question",
    body: "Can you take a look at this when you get a chance?",
    snippet: "Can you take a look...",
    date: new Date().toISOString(),
    unread: true,
    ...overrides,
  };
}

describe("classifyEmails", () => {
  beforeEach(() => {
    mockGenerateObject.mockReset();
    vi.mocked(isDemoAiConfigured).mockReturnValue(true);
    vi.mocked(reserveDemoAiBudget).mockResolvedValue({
      allowed: true,
      remaining: 999,
    });
  });

  it("reconciles model output by emailId regardless of order", async () => {
    const emailA = makeEmail({
      id: "a",
      subject: "Production outage impacting checkout",
      body: "We're seeing 500 errors on checkout since 9am.",
    });
    const emailB = makeEmail({
      id: "b",
      subject: "Weekly team update",
      body: "No action needed, just keeping everyone in the loop.",
    });

    mockGenerateObject.mockResolvedValue({
      object: {
        classifications: [
          {
            emailId: "b",
            category: "fyi",
            priority: "low",
            confidence: 0.9,
            reasoning: "No action needed.",
          },
          {
            emailId: "a",
            category: "urgent",
            priority: "high",
            confidence: 0.95,
            reasoning: "Needs a same-day response.",
          },
        ],
      },
    });

    const result = await classifyEmails([emailA, emailB]);

    expect(result.results[0]).toMatchObject({
      emailId: "a",
      category: "urgent",
    });
    expect(result.results[1]).toMatchObject({
      emailId: "b",
      category: "fyi",
    });
    expect(result.mode).toBe("ai");
    expect(result.reason).toBe("ok");
    expect(result.fallback).toBe(0);
  });

  it("falls back to a deterministic classification for missing ids", async () => {
    const email = makeEmail({
      id: "missing-1",
      subject: "Our monthly newsletter",
      body: "Please unsubscribe from future updates like this.",
    });

    mockGenerateObject.mockResolvedValue({
      object: { classifications: [] },
    });

    const result = await classifyEmails([email]);

    expect(result.results).toEqual([
      {
        emailId: "missing-1",
        category: "newsletter",
        priority: "low",
        confidence: 0,
        reasoning: "Fallback: AI classification unavailable.",
      },
    ]);
    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("model_error");
    expect(result.fallback).toBe(1);
  });

  it("falls back for every email in a batch when the LLM call throws", async () => {
    const emails = [
      makeEmail({ id: "x", subject: "Message one", body: "Regular message." }),
      makeEmail({ id: "y", subject: "Message two", body: "Regular message." }),
    ];

    mockGenerateObject.mockRejectedValue(new Error("model unavailable"));

    const result = await classifyEmails(emails);

    expect(result.results).toHaveLength(2);
    for (const classification of result.results) {
      expect(classification.confidence).toBe(0);
    }
    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("model_error");
    expect(result.fallback).toBe(2);
  });

  it("recovers valid entries when only some items in a batch fail schema validation", async () => {
    const emailGood = makeEmail({
      id: "good-1",
      subject: "Contract needs signature today",
      body: "Please sign before 5pm or the renewal lapses.",
    });
    const emailBad = makeEmail({
      id: "bad-1",
      subject: "Some other message",
      body: "This one will come back malformed from the model.",
    });

    mockGenerateObject.mockResolvedValue({
      object: {
        classifications: [
          {
            emailId: "good-1",
            category: "urgent",
            priority: "high",
            confidence: 0.9,
            reasoning: "Same-day deadline.",
          },
          {
            emailId: "bad-1",
            category: "not-a-real-category", // fails the category enum
            priority: "high",
            confidence: 0.9,
            reasoning: "Malformed entry.",
          },
        ],
      },
    });

    const result = await classifyEmails([emailGood, emailBad]);

    expect(result.results.find((r) => r.emailId === "good-1")).toMatchObject({
      category: "urgent",
      confidence: 0.9,
    });
    expect(result.results.find((r) => r.emailId === "bad-1")).toMatchObject({
      confidence: 0, // fell back, but only this one entry
    });
    expect(result.fallback).toBe(1);
    // A mix of real AI output and one fallback still counts as "ai" mode -
    // the request delivered real AI value overall.
    expect(result.mode).toBe("ai");
    expect(result.reason).toBe("model_error");
  });

  it("serves repeat requests for the same content from cache", async () => {
    const email = makeEmail({
      id: "cache-me",
      subject: "Following up on my last message",
      body: "Still waiting to hear back on this, any update?",
    });

    mockGenerateObject.mockResolvedValue({
      object: {
        classifications: [
          {
            emailId: "cache-me",
            category: "reply_needed",
            priority: "normal",
            confidence: 0.8,
            reasoning: "A person is waiting on a reply.",
          },
        ],
      },
    });

    const first = await classifyEmails([email]);
    const second = await classifyEmails([email]);

    expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    expect(first.cached).toBe(0);
    expect(second.cached).toBe(1);
    expect(second.results[0]).toMatchObject({
      emailId: "cache-me",
      category: "reply_needed",
    });
  });

  it("falls back everything and reports missing_api_key when AI is not configured", async () => {
    vi.mocked(isDemoAiConfigured).mockReturnValue(false);

    const email = makeEmail({
      id: "no-key-1",
      subject: "Needs a key to classify",
      body: "This should fall back because there's no API key.",
    });

    const result = await classifyEmails([email]);

    expect(mockGenerateObject).not.toHaveBeenCalled();
    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("missing_api_key");
    expect(result.fallback).toBe(1);
  });

  it("falls back everything and reports daily_budget_exceeded when the budget guard denies", async () => {
    vi.mocked(reserveDemoAiBudget).mockResolvedValue({
      allowed: false,
      remaining: 0,
    });

    const email = makeEmail({
      id: "budget-1",
      subject: "Over the daily AI budget",
      body: "This should fall back because the demo budget is spent.",
    });

    const result = await classifyEmails([email]);

    expect(mockGenerateObject).not.toHaveBeenCalled();
    expect(result.mode).toBe("fallback");
    expect(result.reason).toBe("daily_budget_exceeded");
    expect(result.fallback).toBe(1);
  });
});
