import { env } from "@/env";
import { SafeError } from "@/utils/error";
import type { Logger } from "@/utils/logger";
import {
  checkRateLimit,
  createRateLimitKey,
  hashRateLimitValue,
} from "@/utils/rate-limit";

export type DemoAiFeature = "classify" | "summarize" | "reply" | "rules";

// Sized for a portfolio demo, not a production SaaS: generous enough that a
// real visitor clicking around never notices, tight enough that a scripted
// loop can't run up the AI bill. Mirrors the burst+daily shape used by
// utils/booking/public-rate-limit.ts for other public routes. Each feature
// gets its own limit so a burst on one demo AI action doesn't consume
// another's budget.
const DEMO_AI_RATE_LIMITS = {
  ipBurst: { limit: 5, windowSeconds: 60 },
  ipDaily: { limit: 60, windowSeconds: 24 * 60 * 60 },
} as const;

const RATE_LIMITED_MESSAGE =
  "Too many demo requests from this device. Please try again in a minute.";

export async function enforceDemoAiRateLimit({
  feature,
  clientIp,
  logger,
}: {
  feature: DemoAiFeature;
  clientIp: string;
  logger: Logger;
}) {
  const ipHash = hashRateLimitValue(clientIp);
  const rules = [
    {
      id: `demo-${feature}-ip-burst`,
      key: createRateLimitKey([
        "rate-limit",
        "demo-ai",
        feature,
        "ip-burst",
        ipHash,
      ]),
      ...DEMO_AI_RATE_LIMITS.ipBurst,
    },
    {
      id: `demo-${feature}-ip-daily`,
      key: createRateLimitKey([
        "rate-limit",
        "demo-ai",
        feature,
        "ip-daily",
        ipHash,
      ]),
      ...DEMO_AI_RATE_LIMITS.ipDaily,
    },
  ];

  for (const rule of rules) {
    const result = isRedisRateLimitConfigured()
      ? await checkRateLimit({ rule, logger })
      : checkRateLimitInMemory(rule);

    if (result.limited) {
      logger.warn("Demo AI rate limit exceeded", {
        rateLimitId: rule.id,
        feature,
        limit: result.limit,
      });
      throw new SafeError(RATE_LIMITED_MESSAGE, 429);
    }
  }
}

function isRedisRateLimitConfigured() {
  return Boolean(env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN);
}

type MemoryRule = { key: string; limit: number; windowSeconds: number };
type MemoryWindow = { count: number; resetAt: number };

// In-memory fixed-window fallback so local dev and Redis-less preview
// deployments still get real protection, instead of silently disabling rate
// limiting the way utils/rate-limit.ts's own "not configured" path does for
// the rest of the app. Per-instance only - a distributed deployment should
// configure Upstash for cross-instance enforcement.
const memoryWindows = new Map<string, MemoryWindow>();

function checkRateLimitInMemory(
  rule: MemoryRule,
): { limited: boolean; limit: number } {
  const now = Date.now();
  const existing = memoryWindows.get(rule.key);

  if (!existing || existing.resetAt <= now) {
    memoryWindows.set(rule.key, {
      count: 1,
      resetAt: now + rule.windowSeconds * 1000,
    });
    return { limited: false, limit: rule.limit };
  }

  existing.count += 1;
  return { limited: existing.count > rule.limit, limit: rule.limit };
}
