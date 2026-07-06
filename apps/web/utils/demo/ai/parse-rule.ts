import { createHash } from "node:crypto";
import { generateObject } from "ai";
import { createScopedLogger } from "@/utils/logger";
import { guardDemoAiCall } from "@/utils/demo/ai/guard";
import { DEMO_MODEL_ID, getDemoModel } from "@/utils/demo/ai/model";
import { evaluateRule } from "@/utils/demo/ai/rule-match";
import { tryFallbackParse } from "@/utils/demo/ai/rule-fallback";
import {
  type ClassifiedDemoEmailInput,
  type DemoAiMode,
  type DemoAiReason,
  modelParsedRuleSchema,
  type ParsedRule,
  parsedRuleSchema,
  type ParseRuleResponse,
} from "@/utils/demo/ai/schemas";

const logger = createScopedLogger("demo-parse-rule");

// Bump when the prompt or supported field/operator/action set changes so
// stale cached rules don't leak across a prompt revision.
const PROMPT_VERSION = "v1";

// Module-scoped memoization of parsed rules, keyed by instruction text -
// mirrors classify.ts's cache. Only the rule itself is cached; the preview
// (matches/warnings) is always recomputed against the emails passed in, so a
// cache hit still reflects the caller's current inbox state.
const ruleCache = new Map<string, ParsedRule>();

const UNSUPPORTED_HELP_MESSAGE =
  'AI rule parsing isn\'t available right now. Try a simple rule like "archive newsletters older than 7 days" or "label receipts as Finance".';

const PARSE_RULE_SYSTEM_PROMPT = `You convert a user's plain-language inbox rule into a structured rule for an email assistant.

A rule has: a short "name", a "match" ("all" = every condition must hold, "any" = at least one), a list of "conditions", and a list of "actions".

CONDITION FIELDS and the operators each allows (use ONLY these):
- sender_email / sender_domain / subject / body: equals, contains, startsWith, endsWith. value is a string.
- category: in (or equals). value is an array of these EXACT categories only: urgent, reply_needed, newsletter, cold_spam, notification, fyi.
- priority: in (or equals). value is an array of: high, normal, low.
- unread: isTrue or isFalse. No value.
- date: olderThanDays or newerThanDays. value is a NUMBER of days (relative to now). Never output an absolute date.

ACTIONS (use ONLY these). Only "label" takes a "label" string field:
- archive, label, markRead, star, followUp, draftReply, unsubscribe.

RULES FOR MAPPING:
- Use ONLY the fields, operators, categories, and actions listed above. Never invent new ones.
- If a concept has no matching category (e.g. "receipts", "invoices"), do NOT invent a category. Use a subject or body "contains" condition instead.
- If the user asks for something with no exact matching action (e.g. "mark as spam" - there is no spam action), map it to the closest supported action (e.g. "label" with an appropriate label name) and keep going.
- Relative time ("older than 7 days", "in the last week") -> date olderThanDays/newerThanDays with a number.
- "haven't replied to" / "needs a reply" -> category in ["reply_needed"].
- When the user references a specific person/sender you cannot identify (e.g. "my professor"), either use the best available heuristic (a sender_domain or sender_email "contains") or omit that condition and keep the rest of the rule - do not fail the whole rule over an unidentifiable sender.
- If the request truly cannot be expressed with the supported fields and actions at all, return "unsupported": true with a one-sentence "unsupportedReason" explaining what isn't supported, and omit conditions/actions.

Return ONLY JSON matching the schema.`;

export async function parseRule({
  instruction,
  emails,
}: {
  instruction: string;
  emails: ClassifiedDemoEmailInput[];
}): Promise<ParseRuleResponse> {
  const cachedRule = ruleCache.get(cacheKey(instruction));
  if (cachedRule) {
    return buildParsedResponse({
      rule: cachedRule,
      emails,
      mode: "ai",
      reason: "ok",
      cachedCount: 1,
    });
  }

  const guard = await guardDemoAiCall(1);
  if (!guard.allowed) {
    return fallbackOrUnsupported({
      instruction,
      emails,
      mode: "fallback",
      reason: guard.reason,
    });
  }

  try {
    const { object } = await generateObject({
      model: getDemoModel(),
      schema: modelParsedRuleSchema,
      system: PARSE_RULE_SYSTEM_PROMPT,
      prompt: buildParseRuleUserPrompt(instruction),
    });

    if (object.unsupported) {
      return {
        status: "unsupported",
        rule: null,
        preview: null,
        message: object.unsupportedReason || UNSUPPORTED_HELP_MESSAGE,
        mode: "ai",
        model: DEMO_MODEL_ID,
        cached: 0,
        reason: "ok",
      };
    }

    const parsed = parsedRuleSchema.safeParse({
      name: object.name ?? "Custom rule",
      match: object.match ?? "all",
      conditions: object.conditions ?? [],
      actions: object.actions ?? [],
    });

    if (!parsed.success) {
      logger.warn("Demo rule parse produced an invalid rule shape", {
        issues: parsed.error.issues,
      });
      return {
        status: "unsupported",
        rule: null,
        preview: null,
        message: UNSUPPORTED_HELP_MESSAGE,
        mode: "ai",
        model: DEMO_MODEL_ID,
        cached: 0,
        reason: "model_error",
      };
    }

    ruleCache.set(cacheKey(instruction), parsed.data);
    return buildParsedResponse({
      rule: parsed.data,
      emails,
      mode: "ai",
      reason: "ok",
      cachedCount: 0,
    });
  } catch (error) {
    logger.warn("Demo rule parse call failed, trying fallback", { error });
    return fallbackOrUnsupported({
      instruction,
      emails,
      mode: "fallback",
      reason: "model_error",
    });
  }
}

function fallbackOrUnsupported({
  instruction,
  emails,
  mode,
  reason,
}: {
  instruction: string;
  emails: ClassifiedDemoEmailInput[];
  mode: DemoAiMode;
  reason: DemoAiReason;
}): ParseRuleResponse {
  const fallbackRule = tryFallbackParse(instruction);
  if (fallbackRule) {
    return buildParsedResponse({
      rule: fallbackRule,
      emails,
      mode,
      reason,
      cachedCount: 0,
    });
  }

  return {
    status: "unsupported",
    rule: null,
    preview: null,
    message: UNSUPPORTED_HELP_MESSAGE,
    mode,
    model: DEMO_MODEL_ID,
    cached: 0,
    reason,
  };
}

function buildParsedResponse({
  rule,
  emails,
  mode,
  reason,
  cachedCount,
}: {
  rule: ParsedRule;
  emails: ClassifiedDemoEmailInput[];
  mode: DemoAiMode;
  reason: DemoAiReason;
  cachedCount: number;
}): ParseRuleResponse {
  return {
    status: "parsed",
    rule,
    preview: evaluateRule(rule, emails),
    message: null,
    mode,
    model: DEMO_MODEL_ID,
    cached: cachedCount,
    reason,
  };
}

function buildParseRuleUserPrompt(instruction: string): string {
  return `Convert this instruction into a rule:\n\n"${instruction}"`;
}

function cacheKey(instruction: string): string {
  const content = [PROMPT_VERSION, DEMO_MODEL_ID, instruction.trim()].join(
    "\n",
  );
  return createHash("sha256").update(content).digest("hex");
}
