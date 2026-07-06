import { z } from "zod";

// Single source of truth for the demo taxonomy. `utils/demo/inbox-data.ts`
// re-exports `EmailCategory` as `DemoEmailCategory` so seed data and AI
// classification never drift apart.
export const emailCategorySchema = z.enum([
  "urgent",
  "reply_needed",
  "newsletter",
  "cold_spam",
  "notification",
  "fyi",
]);
export type EmailCategory = z.infer<typeof emailCategorySchema>;

export const emailPrioritySchema = z.enum(["high", "normal", "low"]);
export type EmailPriority = z.infer<typeof emailPrioritySchema>;

// One classification result. `emailId` echoes the input id so results
// reconcile by id, never by array position.
export const classificationSchema = z.object({
  emailId: z.string(),
  category: emailCategorySchema,
  priority: emailPrioritySchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(240),
});
export type Classification = z.infer<typeof classificationSchema>;

// What the model is asked to return for a batch. Deliberately loose at the
// item level (`z.unknown()` rather than `classificationSchema`): if every
// item had to satisfy the full schema, one malformed entry would fail the
// whole `generateObject` call and fall back the entire batch. Individual
// items are validated afterwards via `classificationSchema.safeParse` in
// classify.ts, so only the malformed entries themselves fall back. A
// response that isn't valid JSON, or doesn't even have this top-level
// shape, still fails at the generateObject layer - that failure mode can't
// be salvaged without a bespoke JSON-repair pass, which is out of scope here.
export const modelClassificationsSchema = z.object({
  classifications: z.array(z.unknown()),
});

// Shared wire shape for "the current email" across every demo AI endpoint
// (classify, summarize, reply). One definition so the three request bodies
// can't quietly drift apart.
export const demoEmailInputSchema = z.object({
  id: z.string().min(1),
  from: z.object({ name: z.string(), email: z.string() }),
  subject: z.string(),
  body: z.string(),
  snippet: z.string(),
  date: z.string(),
  unread: z.boolean(),
});
export type DemoEmailInput = z.infer<typeof demoEmailInputSchema>;

// Public request body for POST /api/demo/classify.
// Capped to protect a public, unauthenticated endpoint.
export const classifyRequestSchema = z.object({
  emails: z.array(demoEmailInputSchema).min(1).max(30),
});
export type ClassifyRequest = z.infer<typeof classifyRequestSchema>;

// Whether a demo AI response reflects live AI output (at least partially)
// or is entirely deterministic fallback (AI unavailable, or everything in
// the request fell back). Shared across classify/summarize/reply responses.
export const demoAiModeSchema = z.enum(["ai", "fallback"]);
export type DemoAiMode = z.infer<typeof demoAiModeSchema>;

// Why any fallback occurred, if it did. "ok" means nothing degraded.
export const demoAiReasonSchema = z.enum([
  "ok",
  "missing_api_key",
  "daily_budget_exceeded",
  "model_error",
]);
export type DemoAiReason = z.infer<typeof demoAiReasonSchema>;

export const classifyResponseSchema = z.object({
  results: z.array(classificationSchema),
  mode: demoAiModeSchema,
  model: z.string(),
  cached: z.number(),
  fallback: z.number(),
  reason: demoAiReasonSchema,
});
export type ClassifyResponse = z.infer<typeof classifyResponseSchema>;

// --- Summarize ---

export const summarizeRequestSchema = z.object({
  email: demoEmailInputSchema,
});
export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>;

export const emailSummarySchema = z.object({
  mainPoint: z.string().max(200),
  requestedAction: z.string().max(200).nullable(),
  deadline: z.string().max(100).nullable(),
  importance: emailPrioritySchema,
});
export type EmailSummary = z.infer<typeof emailSummarySchema>;

export const summarizeResponseSchema = z.object({
  summary: emailSummarySchema,
  mode: demoAiModeSchema,
  model: z.string(),
  reason: demoAiReasonSchema,
});
export type SummarizeResponse = z.infer<typeof summarizeResponseSchema>;

// --- Reply draft ---

export const replyToneSchema = z.enum([
  "professional",
  "friendly",
  "short",
  "detailed",
]);
export type ReplyTone = z.infer<typeof replyToneSchema>;

export const replyRequestSchema = z.object({
  email: demoEmailInputSchema,
  tone: replyToneSchema.default("professional"),
});
export type ReplyRequest = z.infer<typeof replyRequestSchema>;

export const replyDraftSchema = z.object({
  reply: z.string().max(4000),
});
export type ReplyDraft = z.infer<typeof replyDraftSchema>;

export const replyResponseSchema = z.object({
  draft: replyDraftSchema,
  mode: demoAiModeSchema,
  model: z.string(),
  reason: demoAiReasonSchema,
});
export type ReplyResponse = z.infer<typeof replyResponseSchema>;

// --- Natural-language rule builder ---

export const ruleFieldSchema = z.enum([
  "sender_email",
  "sender_domain",
  "subject",
  "body",
  "category",
  "priority",
  "unread",
  "date",
]);
export type RuleField = z.infer<typeof ruleFieldSchema>;

export const ruleOperatorSchema = z.enum([
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "in",
  "olderThanDays",
  "newerThanDays",
  "isTrue",
  "isFalse",
]);
export type RuleOperator = z.infer<typeof ruleOperatorSchema>;

export const ruleActionTypeSchema = z.enum([
  "archive",
  "label",
  "markRead",
  "star",
  "followUp",
  "draftReply",
  "unsubscribe",
]);
export type RuleActionType = z.infer<typeof ruleActionTypeSchema>;

// Actions considered hard/impossible to undo in a real inbox. The preview
// always warns when a matched rule includes one of these.
export const DESTRUCTIVE_RULE_ACTIONS: readonly RuleActionType[] = [
  "archive",
  "unsubscribe",
];

// Flat shape (not a discriminated union) on purpose: it's what LLMs emit most
// reliably via structured output. `value` is a string for text-field
// operators, a number of days for date operators, a string[] for `in`, and
// absent for isTrue/isFalse. The matcher treats a field+operator combo it
// doesn't recognize as "no match" plus a warning, never a crash.
export const ruleConditionSchema = z.object({
  field: ruleFieldSchema,
  operator: ruleOperatorSchema,
  value: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
    .optional(),
});
export type RuleCondition = z.infer<typeof ruleConditionSchema>;

// Flat for the same reason. Only "label" actions use `label`.
export const ruleActionSchema = z.object({
  type: ruleActionTypeSchema,
  label: z.string().max(60).optional(),
});
export type RuleAction = z.infer<typeof ruleActionSchema>;

export const parsedRuleSchema = z.object({
  name: z.string().max(80),
  match: z.enum(["all", "any"]).default("all"),
  conditions: z.array(ruleConditionSchema).min(1).max(6),
  actions: z.array(ruleActionSchema).min(1).max(4),
});
export type ParsedRule = z.infer<typeof parsedRuleSchema>;

// What the model is asked to return for rule parsing. Loose at the
// conditions/actions item level for the same reason as
// modelClassificationsSchema above: strict validation happens afterward in
// parse-rule.ts via parsedRuleSchema.safeParse. Unlike classification,
// there's no per-item recovery here - a rule's conditions are logically
// coupled (dropping one changes what the rule means), so a malformed rule
// falls back to "unsupported" (or a fallback template) as a whole rather
// than salvaging individual conditions.
export const modelParsedRuleSchema = z.object({
  unsupported: z.boolean().optional(),
  unsupportedReason: z.string().optional(),
  name: z.string().optional(),
  match: z.enum(["all", "any"]).optional(),
  conditions: z.array(z.unknown()).optional(),
  actions: z.array(z.unknown()).optional(),
});

// An email plus its current (AI-derived or seed) category/priority, as sent
// by the client so the rule preview matches what's actually on screen -
// not a fixed server-side snapshot.
export const classifiedDemoEmailInputSchema = demoEmailInputSchema.extend({
  category: emailCategorySchema,
  priority: emailPrioritySchema,
});
export type ClassifiedDemoEmailInput = z.infer<
  typeof classifiedDemoEmailInputSchema
>;

export const parseRuleRequestSchema = z.object({
  instruction: z.string().min(3).max(280),
  emails: z.array(classifiedDemoEmailInputSchema).min(1).max(30),
});
export type ParseRuleRequest = z.infer<typeof parseRuleRequestSchema>;

export const ruleMatchSchema = z.object({
  emailId: z.string(),
  from: z.string(),
  subject: z.string(),
});
export type RuleMatch = z.infer<typeof ruleMatchSchema>;

// Produced by the pure matcher (rule-match.ts). Server-computed (since the
// endpoint accepts the client's current emails), but the matching logic
// itself has no I/O and is unit-tested independently of any HTTP/AI mocking.
export const rulePreviewSchema = z.object({
  matches: z.array(ruleMatchSchema),
  matchedCount: z.number(),
  totalCount: z.number(),
  actions: z.array(ruleActionSchema),
  explanation: z.string(),
  warnings: z.array(z.string()),
});
export type RulePreview = z.infer<typeof rulePreviewSchema>;

export const parseRuleResponseSchema = z.object({
  status: z.enum(["parsed", "unsupported"]),
  rule: parsedRuleSchema.nullable(),
  preview: rulePreviewSchema.nullable(),
  message: z.string().nullable(),
  mode: demoAiModeSchema,
  model: z.string(),
  cached: z.number(),
  reason: demoAiReasonSchema,
});
export type ParseRuleResponse = z.infer<typeof parseRuleResponseSchema>;
