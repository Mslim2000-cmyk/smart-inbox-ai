import { generateObject } from "ai";
import { createScopedLogger } from "@/utils/logger";
import { guardDemoAiCall } from "@/utils/demo/ai/guard";
import { DEMO_MODEL_ID, getDemoModel } from "@/utils/demo/ai/model";
import type { NormalizedEmail } from "@/utils/demo/ai/normalize";
import {
  emailSummarySchema,
  type SummarizeResponse,
} from "@/utils/demo/ai/schemas";

const logger = createScopedLogger("demo-summarize");

const SUMMARIZE_SYSTEM_PROMPT = `You summarize a single email for someone triaging their inbox.

Return JSON with exactly these fields:
- "mainPoint": one short sentence capturing what the email is actually about.
- "requestedAction": the specific action the sender wants the recipient to take, or null if the email doesn't ask for anything.
- "deadline": the deadline mentioned in the email (in the sender's own words, e.g. "5pm today", "by Friday"), or null if none is mentioned.
- "importance": "high" if this needs prompt attention (time pressure, escalation, real stakes), "low" if it's routine/informational/promotional, "normal" otherwise.

Base this only on the email content provided. Do not invent a deadline or action that isn't there.`;

export async function summarizeEmail(
  email: NormalizedEmail,
): Promise<SummarizeResponse> {
  const guard = await guardDemoAiCall(1);
  if (!guard.allowed) {
    return {
      summary: fallbackSummary(email),
      mode: "fallback",
      model: DEMO_MODEL_ID,
      reason: guard.reason,
    };
  }

  try {
    const { object } = await generateObject({
      model: getDemoModel(),
      schema: emailSummarySchema,
      system: SUMMARIZE_SYSTEM_PROMPT,
      prompt: buildSummarizeUserPrompt(email),
    });

    return {
      summary: object,
      mode: "ai",
      model: DEMO_MODEL_ID,
      reason: "ok",
    };
  } catch (error) {
    logger.warn("Demo summarize call failed, using fallback", { error });
    return {
      summary: fallbackSummary(email),
      mode: "fallback",
      model: DEMO_MODEL_ID,
      reason: "model_error",
    };
  }
}

function buildSummarizeUserPrompt(email: NormalizedEmail): string {
  return `Summarize this email:

From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Body:
${email.body}`;
}

function fallbackSummary(email: NormalizedEmail) {
  // Deliberately crude, same rationale as classify.ts's fallbackClassification:
  // a safety net for when AI is unavailable, not a second summarizer. It just
  // echoes the subject line rather than attempting real extraction.
  return {
    mainPoint: email.subject,
    requestedAction: null,
    deadline: null,
    importance: "normal" as const,
  };
}
