import type {
  ParsedRule,
  RuleAction,
  RuleActionType,
  RuleCondition,
} from "@/utils/demo/ai/schemas";

// Degraded-mode template matcher used ONLY when live AI parsing is
// unavailable (missing key, exhausted budget, or a model/parse error) - the
// same rationale as classify.ts's fallbackClassification: a safety net, not
// a second parser. It intentionally covers a handful of common phrasings
// (newsletter age, urgent, cold/spam, receipts/finance) via keyword
// matching, which is acceptable here specifically because this path never
// runs during normal AI operation and is never used as an eval target - the
// live prompt (parse-rule.ts) is what's held to a semantic accuracy bar.
export function tryFallbackParse(instruction: string): ParsedRule | null {
  const text = instruction.trim();
  if (!text) return null;

  return (
    tryNewsletterAgeTemplate(text) ??
    tryUrgentTemplate(text) ??
    tryColdSpamTemplate(text) ??
    tryReceiptsFinanceTemplate(text) ??
    null
  );
}

function tryNewsletterAgeTemplate(text: string): ParsedRule | null {
  if (!/newsletter/i.test(text)) return null;

  const ageMatch = text.match(/older than\s*(\d+)\s*day/i);
  const conditions: RuleCondition[] = [
    { field: "category", operator: "in", value: ["newsletter"] },
  ];
  if (ageMatch) {
    conditions.push({
      field: "date",
      operator: "olderThanDays",
      value: Number(ageMatch[1]),
    });
  }

  return {
    name: ageMatch
      ? `Archive newsletters older than ${ageMatch[1]} days`
      : "Handle newsletters",
    match: "all",
    conditions,
    actions: [buildAction(detectVerb(text) ?? "archive", text)],
  };
}

function tryUrgentTemplate(text: string): ParsedRule | null {
  if (!/urgent/i.test(text)) return null;

  return {
    name: "Handle urgent emails",
    match: "all",
    conditions: [{ field: "category", operator: "in", value: ["urgent"] }],
    actions: [buildAction(detectVerb(text) ?? "star", text)],
  };
}

function tryColdSpamTemplate(text: string): ParsedRule | null {
  if (!/cold email|cold-email|\bspam\b/i.test(text)) return null;

  return {
    name: "Handle cold/spam emails",
    match: "all",
    conditions: [{ field: "category", operator: "in", value: ["cold_spam"] }],
    actions: [buildAction(detectVerb(text) ?? "label", text, "Cold/Spam")],
  };
}

function tryReceiptsFinanceTemplate(text: string): ParsedRule | null {
  if (!/receipt|invoice|finance/i.test(text)) return null;

  return {
    name: "Label receipts as Finance",
    match: "any",
    conditions: [
      { field: "subject", operator: "contains", value: "receipt" },
      { field: "subject", operator: "contains", value: "invoice" },
    ],
    actions: [buildAction(detectVerb(text) ?? "label", text, "Finance")],
  };
}

const VERB_PATTERNS: [RegExp, RuleActionType][] = [
  [/\barchive\b/i, "archive"],
  [/\bmark.*\bread\b/i, "markRead"],
  [/\bstar\b/i, "star"],
  [/\bunsubscribe\b/i, "unsubscribe"],
  [/\bfollow[\s-]?up\b/i, "followUp"],
  [/\b(reply|draft)\b/i, "draftReply"],
  [/\blabel\b/i, "label"],
];

function detectVerb(text: string): RuleActionType | null {
  for (const [pattern, actionType] of VERB_PATTERNS) {
    if (pattern.test(text)) return actionType;
  }
  return null;
}

function buildAction(
  type: RuleActionType,
  text: string,
  defaultLabel?: string,
): RuleAction {
  if (type !== "label") return { type };
  return { type: "label", label: extractLabelValue(text) ?? defaultLabel ?? "Label" };
}

function extractLabelValue(text: string): string | null {
  const match = text.match(/\bas\s+["']?([a-z0-9 /&-]+?)["']?[.!]?$/i);
  if (!match) return null;
  return titleCase(match[1].trim());
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}
