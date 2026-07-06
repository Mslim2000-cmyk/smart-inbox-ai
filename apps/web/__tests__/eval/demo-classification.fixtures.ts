import type { EmailCategory, EmailPriority } from "@/utils/demo/ai/schemas";

export type DemoClassificationEvalCase = {
  // Must match an id in utils/demo/inbox-data.ts's DEMO_EMAILS.
  emailId: string;
  expected: { category: EmailCategory; priority: EmailPriority };
  // A second acceptable category for seed emails a model could defensibly
  // classify either way, so the eval doesn't punish reasonable judgment calls.
  alsoAcceptable?: EmailCategory[];
};

// Two representative cases per category in utils/demo/inbox-data.ts, used to
// exercise the classification pipeline against realistic seed content. This
// is a mocked-LLM fixture for classify.fixtures.test.ts today; the same data
// can back a live-model eval (gated behind `pnpm test-ai`) later without
// changes.
export const DEMO_CLASSIFICATION_EVAL_SET: DemoClassificationEvalCase[] = [
  { emailId: "urgent-1", expected: { category: "urgent", priority: "high" } },
  { emailId: "urgent-2", expected: { category: "urgent", priority: "high" } },
  {
    emailId: "reply-1",
    expected: { category: "reply_needed", priority: "normal" },
  },
  {
    emailId: "reply-4",
    expected: { category: "reply_needed", priority: "normal" },
  },
  {
    emailId: "newsletter-1",
    expected: { category: "newsletter", priority: "low" },
  },
  {
    emailId: "newsletter-2",
    expected: { category: "newsletter", priority: "low" },
    alsoAcceptable: ["fyi"],
  },
  { emailId: "cold-1", expected: { category: "cold_spam", priority: "low" } },
  { emailId: "cold-4", expected: { category: "cold_spam", priority: "low" } },
  {
    emailId: "notif-1",
    expected: { category: "notification", priority: "normal" },
  },
  {
    emailId: "notif-2",
    expected: { category: "notification", priority: "low" },
  },
  { emailId: "fyi-1", expected: { category: "fyi", priority: "low" } },
  { emailId: "fyi-3", expected: { category: "fyi", priority: "low" } },
];
