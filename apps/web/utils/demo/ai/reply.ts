import { generateObject } from "ai";
import { createScopedLogger } from "@/utils/logger";
import { guardDemoAiCall } from "@/utils/demo/ai/guard";
import { DEMO_MODEL_ID, getDemoModel } from "@/utils/demo/ai/model";
import type { NormalizedEmail } from "@/utils/demo/ai/normalize";
import {
  replyDraftSchema,
  type ReplyResponse,
  type ReplyTone,
} from "@/utils/demo/ai/schemas";

const logger = createScopedLogger("demo-reply");

// TODO(streaming): the real app streams long-running AI text (see
// chatCompletionStream + .toTextStreamResponse() in
// app/api/ai/summarise/route.ts and app/api/ai/compose-autocomplete/route.ts),
// but there's no existing client-side stream consumer to mirror in this repo
// today, and the real reply-drafting flow (utils/ai/reply/draft-reply.ts)
// itself uses non-streaming generateObject. Matching that non-streaming
// convention here is the smaller, safer first version; revisit once a
// streaming UI pattern exists.
const TONE_INSTRUCTIONS: Record<ReplyTone, string> = {
  professional: "Formal, polished business tone. No slang or emoji.",
  friendly:
    "Warm and conversational, but still professional. A light, personable tone is fine.",
  short:
    "As brief as possible - 1 to 2 sentences total. Only the essential point.",
  detailed:
    "Thorough - address every question or point raised in the original email.",
};

const REPLY_SYSTEM_PROMPT_BASE = `You draft a reply to a single email on behalf of the recipient.

Return JSON with exactly one field, "reply", containing the complete reply body as plain text.
Do not include a subject line or a signature placeholder like "[Your Name]" - end after the last sentence.
Do not invent facts, dates, or commitments that aren't in the original email.
Write only the reply body, nothing else.`;

export async function draftReply(
  email: NormalizedEmail,
  tone: ReplyTone,
): Promise<ReplyResponse> {
  const guard = await guardDemoAiCall(1);
  if (!guard.allowed) {
    return {
      draft: fallbackReply(email),
      mode: "fallback",
      model: DEMO_MODEL_ID,
      reason: guard.reason,
    };
  }

  try {
    const { object } = await generateObject({
      model: getDemoModel(),
      schema: replyDraftSchema,
      system: buildReplySystemPrompt(tone),
      prompt: buildReplyUserPrompt(email),
    });

    return {
      draft: object,
      mode: "ai",
      model: DEMO_MODEL_ID,
      reason: "ok",
    };
  } catch (error) {
    logger.warn("Demo reply draft call failed, using fallback", { error });
    return {
      draft: fallbackReply(email),
      mode: "fallback",
      model: DEMO_MODEL_ID,
      reason: "model_error",
    };
  }
}

function buildReplySystemPrompt(tone: ReplyTone): string {
  return `${REPLY_SYSTEM_PROMPT_BASE}\n\nTone: ${tone} - ${TONE_INSTRUCTIONS[tone]}`;
}

function buildReplyUserPrompt(email: NormalizedEmail): string {
  return `Draft a reply to this email:

From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Body:
${email.body}`;
}

function fallbackReply(email: NormalizedEmail) {
  // Deliberately generic, same rationale as classify.ts's
  // fallbackClassification: a safety net for when AI is unavailable, not a
  // second reply drafter.
  const firstName = email.from.name.split(" ")[0] || "there";
  return {
    reply: `Hi ${firstName},\n\nThanks for your email about "${email.subject}". I've received it and will get back to you shortly.\n\nBest`,
  };
}
