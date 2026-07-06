import { describe, expect, it } from "vitest";
import { tryFallbackParse } from "@/utils/demo/ai/rule-fallback";

describe("tryFallbackParse", () => {
  it("parses 'Archive newsletters older than 7 days'", () => {
    const rule = tryFallbackParse("Archive newsletters older than 7 days");

    expect(rule).not.toBeNull();
    expect(rule?.conditions).toEqual(
      expect.arrayContaining([
        { field: "category", operator: "in", value: ["newsletter"] },
        { field: "date", operator: "olderThanDays", value: 7 },
      ]),
    );
    expect(rule?.actions).toEqual([{ type: "archive" }]);
  });

  it("parses a newsletter rule with no age qualifier", () => {
    const rule = tryFallbackParse("Archive all newsletters");

    expect(rule?.conditions).toEqual([
      { field: "category", operator: "in", value: ["newsletter"] },
    ]);
    expect(rule?.actions).toEqual([{ type: "archive" }]);
  });

  it("parses 'Mark cold emails as spam'", () => {
    const rule = tryFallbackParse("Mark cold emails as spam");

    expect(rule?.conditions).toEqual([
      { field: "category", operator: "in", value: ["cold_spam"] },
    ]);
    expect(rule?.actions).toEqual([{ type: "label", label: "Spam" }]);
  });

  it("parses 'Star urgent emails from my professor'", () => {
    const rule = tryFallbackParse("Star urgent emails from my professor");

    expect(rule?.conditions).toEqual([
      { field: "category", operator: "in", value: ["urgent"] },
    ]);
    expect(rule?.actions).toEqual([{ type: "star" }]);
  });

  it("parses 'Label all receipts as Finance'", () => {
    const rule = tryFallbackParse("Label all receipts as Finance");

    expect(rule?.match).toBe("any");
    expect(rule?.conditions).toEqual(
      expect.arrayContaining([
        { field: "subject", operator: "contains", value: "receipt" },
        { field: "subject", operator: "contains", value: "invoice" },
      ]),
    );
    expect(rule?.actions).toEqual([{ type: "label", label: "Finance" }]);
  });

  it("falls back to a default label when no 'as X' phrase is present", () => {
    const rule = tryFallbackParse("Please deal with my cold emails");

    expect(rule?.actions).toEqual([{ type: "label", label: "Cold/Spam" }]);
  });

  it("returns null for instructions with no matching template", () => {
    const rule = tryFallbackParse(
      "Create a follow-up for emails I haven't replied to",
    );

    expect(rule).toBeNull();
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(tryFallbackParse("")).toBeNull();
    expect(tryFallbackParse("   ")).toBeNull();
  });
});
