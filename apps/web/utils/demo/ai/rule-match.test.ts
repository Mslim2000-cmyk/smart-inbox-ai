import { describe, expect, it } from "vitest";
import { evaluateRule } from "@/utils/demo/ai/rule-match";
import type {
  ClassifiedDemoEmailInput,
  ParsedRule,
} from "@/utils/demo/ai/schemas";

const NOW = new Date("2026-07-03T12:00:00.000Z");

function makeEmail(
  overrides: Partial<ClassifiedDemoEmailInput> = {},
): ClassifiedDemoEmailInput {
  return {
    id: "email-1",
    from: { name: "Morning Brew", email: "crew@morningbrew.com" },
    subject: "Today's roundup",
    body: "Here's what happened today.",
    snippet: "Here's what happened...",
    date: NOW.toISOString(),
    unread: true,
    category: "newsletter",
    priority: "low",
    ...overrides,
  };
}

function makeRule(overrides: Partial<ParsedRule> = {}): ParsedRule {
  return {
    name: "Test rule",
    match: "all",
    conditions: [{ field: "category", operator: "in", value: ["newsletter"] }],
    actions: [{ type: "archive" }],
    ...overrides,
  };
}

describe("evaluateRule - operators", () => {
  it("matches sender_email with contains", () => {
    const rule = makeRule({
      conditions: [
        { field: "sender_email", operator: "contains", value: "morningbrew" },
      ],
    });
    const result = evaluateRule(rule, [makeEmail()], NOW);
    expect(result.matchedCount).toBe(1);
  });

  it("matches sender_domain with equals", () => {
    const rule = makeRule({
      conditions: [
        {
          field: "sender_domain",
          operator: "equals",
          value: "morningbrew.com",
        },
      ],
    });
    const result = evaluateRule(rule, [makeEmail()], NOW);
    expect(result.matchedCount).toBe(1);
  });

  it("matches subject with startsWith", () => {
    const rule = makeRule({
      conditions: [
        { field: "subject", operator: "startsWith", value: "Today's" },
      ],
    });
    expect(evaluateRule(rule, [makeEmail()], NOW).matchedCount).toBe(1);
  });

  it("matches body with endsWith", () => {
    const rule = makeRule({
      conditions: [{ field: "body", operator: "endsWith", value: "today." }],
    });
    expect(evaluateRule(rule, [makeEmail()], NOW).matchedCount).toBe(1);
  });

  it("text matches are case-insensitive", () => {
    const rule = makeRule({
      conditions: [
        { field: "subject", operator: "contains", value: "ROUNDUP" },
      ],
    });
    expect(evaluateRule(rule, [makeEmail()], NOW).matchedCount).toBe(1);
  });

  it("matches category with in", () => {
    const rule = makeRule({
      conditions: [
        { field: "category", operator: "in", value: ["urgent", "newsletter"] },
      ],
    });
    expect(evaluateRule(rule, [makeEmail()], NOW).matchedCount).toBe(1);
  });

  it("matches priority with equals", () => {
    const rule = makeRule({
      conditions: [{ field: "priority", operator: "equals", value: "low" }],
    });
    expect(evaluateRule(rule, [makeEmail()], NOW).matchedCount).toBe(1);
  });

  it("matches unread isTrue and isFalse", () => {
    const unreadRule = makeRule({
      conditions: [{ field: "unread", operator: "isTrue" }],
    });
    const readRule = makeRule({
      conditions: [{ field: "unread", operator: "isFalse" }],
    });

    expect(
      evaluateRule(unreadRule, [makeEmail({ unread: true })], NOW).matchedCount,
    ).toBe(1);
    expect(
      evaluateRule(readRule, [makeEmail({ unread: true })], NOW).matchedCount,
    ).toBe(0);
    expect(
      evaluateRule(readRule, [makeEmail({ unread: false })], NOW).matchedCount,
    ).toBe(1);
  });

  it("matches date olderThanDays", () => {
    const rule = makeRule({
      conditions: [{ field: "date", operator: "olderThanDays", value: 7 }],
    });
    const oldEmail = makeEmail({
      date: new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const recentEmail = makeEmail({
      id: "email-2",
      date: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(evaluateRule(rule, [oldEmail, recentEmail], NOW).matchedCount).toBe(
      1,
    );
  });

  it("matches date newerThanDays", () => {
    const rule = makeRule({
      conditions: [{ field: "date", operator: "newerThanDays", value: 7 }],
    });
    const oldEmail = makeEmail({
      date: new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const recentEmail = makeEmail({
      id: "email-2",
      date: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(evaluateRule(rule, [oldEmail, recentEmail], NOW).matchedCount).toBe(
      1,
    );
  });
});

describe("evaluateRule - match all vs any", () => {
  it("requires every condition with match:all", () => {
    const rule = makeRule({
      match: "all",
      conditions: [
        { field: "category", operator: "in", value: ["newsletter"] },
        { field: "unread", operator: "isFalse" },
      ],
    });
    expect(evaluateRule(rule, [makeEmail({ unread: true })], NOW).matchedCount).toBe(
      0,
    );
  });

  it("requires only one condition with match:any", () => {
    const rule = makeRule({
      match: "any",
      conditions: [
        { field: "category", operator: "in", value: ["urgent"] },
        { field: "unread", operator: "isTrue" },
      ],
    });
    expect(
      evaluateRule(rule, [makeEmail({ unread: true, category: "fyi" })], NOW)
        .matchedCount,
    ).toBe(1);
  });
});

describe("evaluateRule - invalid combos", () => {
  it("ignores an unsupported field+operator combo and warns instead of throwing", () => {
    const rule = makeRule({
      conditions: [
        { field: "subject", operator: "olderThanDays", value: 7 },
      ],
    });

    const result = evaluateRule(rule, [makeEmail()], NOW);

    expect(result.matchedCount).toBe(0);
    expect(
      result.warnings.some((w) => w.includes("subject olderThanDays")),
    ).toBe(true);
  });
});

describe("evaluateRule - warnings", () => {
  it("warns for destructive archive actions", () => {
    const rule = makeRule({ actions: [{ type: "archive" }] });
    const result = evaluateRule(rule, [makeEmail()], NOW);
    expect(result.warnings.some((w) => w.includes("archive"))).toBe(true);
  });

  it("warns for destructive unsubscribe actions", () => {
    const rule = makeRule({ actions: [{ type: "unsubscribe" }] });
    const result = evaluateRule(rule, [makeEmail()], NOW);
    expect(result.warnings.some((w) => w.includes("unsubscribe"))).toBe(true);
  });

  it("does not warn about destructiveness for non-destructive actions", () => {
    const rule = makeRule({ actions: [{ type: "star" }] });
    const result = evaluateRule(rule, [makeEmail()], NOW);
    expect(
      result.warnings.some((w) => w.includes("hard to undo")),
    ).toBe(false);
  });

  it("warns when nothing matches", () => {
    const rule = makeRule({
      conditions: [{ field: "category", operator: "in", value: ["urgent"] }],
      actions: [{ type: "star" }],
    });
    const result = evaluateRule(rule, [makeEmail({ category: "fyi" })], NOW);
    expect(
      result.warnings.some((w) => w.includes("doesn't match any emails")),
    ).toBe(true);
  });

  it("warns when the match share is large", () => {
    const rule = makeRule({
      conditions: [{ field: "category", operator: "in", value: ["newsletter"] }],
      actions: [{ type: "star" }],
    });
    const emails = [
      makeEmail({ id: "a" }),
      makeEmail({ id: "b" }),
    ];
    const result = evaluateRule(rule, emails, NOW);
    expect(result.warnings.some((w) => w.includes("large share"))).toBe(true);
  });

  it("warns when a label action has no label", () => {
    const rule = makeRule({ actions: [{ type: "label" }] });
    const result = evaluateRule(rule, [makeEmail()], NOW);
    expect(
      result.warnings.some((w) => w.includes("missing a label name")),
    ).toBe(true);
  });
});

describe("evaluateRule - explanation and matches", () => {
  it("builds a deterministic human-readable explanation", () => {
    const rule = makeRule({
      conditions: [
        { field: "category", operator: "in", value: ["newsletter"] },
        { field: "date", operator: "olderThanDays", value: 7 },
      ],
      actions: [{ type: "archive" }],
    });
    const oldNewsletter = makeEmail({
      date: new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const result = evaluateRule(rule, [oldNewsletter], NOW);

    expect(result.explanation).toBe(
      "Archives 1 email that is categorized as newsletter and is older than 7 days.",
    );
  });

  it("returns matched email id/from/subject", () => {
    const rule = makeRule();
    const email = makeEmail({ id: "n-1" });
    const result = evaluateRule(rule, [email], NOW);

    expect(result.matches).toEqual([
      { emailId: "n-1", from: email.from.email, subject: email.subject },
    ]);
  });
});
