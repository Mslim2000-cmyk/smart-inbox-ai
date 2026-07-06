import { createHash } from "node:crypto";
import { generateObject } from "ai";
import { createScopedLogger } from "@/utils/logger";
import { guardDemoAiCall } from "@/utils/demo/ai/guard";
import { DEMO_MODEL_ID, getDemoModel } from "@/utils/demo/ai/model";
import type { NormalizedEmail } from "@/utils/demo/ai/normalize";
import {
  buildClassifyUserPrompt,
  CLASSIFY_SYSTEM_PROMPT,
} from "@/utils/demo/ai/prompt";
import {
  type Classification,
  classificationSchema,
  type ClassifyResponse,
  type DemoAiReason,
  modelClassificationsSchema,
} from "@/utils/demo/ai/schemas";

const logger = createScopedLogger("demo-classify");

// Bounds tokens per request; long arrays also degrade model output quality.
const BATCH_SIZE = 15;

// Bump when the prompt or taxonomy changes so stale cached results don't
// leak across a prompt revision.
const PROMPT_VERSION = "v1";

// Module-scoped memoization only. Seed emails are static, so this turns
// repeat requests on a warm instance into free, instant responses. No Redis
// dependency - the demo must work on a bare deploy with no cache configured.
const cache = new Map<string, Classification>();

export async function classifyEmails(
  emails: NormalizedEmail[],
): Promise<ClassifyResponse> {
  const results = new Map<string, Classification>();
  let cachedCount = 0;
  let fallbackCount = 0;
  let reason: DemoAiReason = "ok";

  const uncached: NormalizedEmail[] = [];
  for (const email of emails) {
    const cached = cache.get(cacheKey(email));
    if (cached) {
      results.set(email.id, cached);
      cachedCount += 1;
    } else {
      uncached.push(email);
    }
  }

  if (uncached.length > 0) {
    const guard = await guardDemoAiCall(uncached.length);
    if (!guard.allowed) {
      reason = guard.reason;
      fallbackCount += fallbackAll(uncached, results);
    } else {
      for (const batch of chunk(uncached, BATCH_SIZE)) {
        const classified = await classifyBatch(batch);
        for (const email of batch) {
          const classification = classified.get(email.id);
          if (classification) {
            results.set(email.id, classification);
            cache.set(cacheKey(email), classification);
          } else {
            results.set(email.id, fallbackClassification(email));
            fallbackCount += 1;
            if (reason === "ok") reason = "model_error";
          }
        }
      }
    }
  }

  const mode = fallbackCount < emails.length ? "ai" : "fallback";

  return {
    results: emails.map(
      (email) => results.get(email.id) ?? fallbackClassification(email),
    ),
    mode,
    model: DEMO_MODEL_ID,
    cached: cachedCount,
    fallback: fallbackCount,
    reason,
  };
}

function fallbackAll(
  emails: NormalizedEmail[],
  results: Map<string, Classification>,
): number {
  for (const email of emails) {
    results.set(email.id, fallbackClassification(email));
  }
  return emails.length;
}

async function classifyBatch(
  emails: NormalizedEmail[],
): Promise<Map<string, Classification>> {
  try {
    const { object } = await generateObject({
      model: getDemoModel(),
      schema: modelClassificationsSchema,
      system: CLASSIFY_SYSTEM_PROMPT,
      prompt: buildClassifyUserPrompt(emails),
    });

    const validated = new Map<string, Classification>();
    for (const raw of object.classifications) {
      const parsed = classificationSchema.safeParse(raw);
      if (parsed.success) {
        validated.set(parsed.data.emailId, parsed.data);
      } else {
        logger.warn("Dropping malformed classification entry", {
          issues: parsed.error.issues,
        });
      }
    }
    return validated;
  } catch (error) {
    logger.warn("Demo classification batch failed, using fallback", {
      error,
      batchSize: emails.length,
    });
    return new Map();
  }
}

function cacheKey(email: NormalizedEmail): string {
  const content = [
    PROMPT_VERSION,
    DEMO_MODEL_ID,
    email.from.email,
    email.subject,
    email.body.trim(),
  ].join("\n");
  return createHash("sha256").update(content).digest("hex");
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function fallbackClassification(email: NormalizedEmail): Classification {
  // Deliberately crude: this is a safety net for when AI is unavailable
  // (missing key, exhausted budget, or a model/parse error), not a second
  // classifier. It rarely matches the AI-assigned category and always
  // reports confidence 0, so callers can visually distinguish it from a
  // real classification rather than mistake it for one.
  const looksLikeNewsletter = /unsubscribe|newsletter|digest/i.test(
    email.body,
  );
  return {
    emailId: email.id,
    category: looksLikeNewsletter ? "newsletter" : "fyi",
    priority: "low",
    confidence: 0,
    reasoning: "Fallback: AI classification unavailable.",
  };
}
