import { env } from "@/env";
import { createScopedLogger } from "@/utils/logger";
import { redis } from "@/utils/redis";

const logger = createScopedLogger("demo/ai-budget");

const DEFAULT_DAILY_CALL_LIMIT = 300;
const BUDGET_KEY_PREFIX = "demo-ai-budget";
// A little over a day, so a key from a slow-clocked instance never lingers
// past its day's relevance.
const REDIS_TTL_SECONDS = 2 * 24 * 60 * 60;

export type DemoAiBudgetResult = {
  allowed: boolean;
  remaining: number;
};

// Per-instance only when Redis isn't configured - acceptable for a demo
// (each serverless instance gets its own budget rather than a shared one),
// and still meaningfully bounds cost instead of leaving the guard disabled.
const memoryUsageByDay = new Map<string, number>();

// Reserves budget for `count` upcoming live AI classification calls, scoped
// to the current UTC day. Read-then-increment rather than a single atomic
// op: under concurrent requests near the limit this can allow a small
// overshoot, which is an acceptable trade for a demo endpoint (mirrors the
// "best-effort" tradeoff utils/redis/usage.ts already makes for usage counters).
export async function reserveDemoAiBudget(
  count: number,
  now: Date = new Date(),
): Promise<DemoAiBudgetResult> {
  const limit = getDailyLimit();
  const dayKey = getUtcDayKey(now);

  if (isRedisConfigured()) {
    try {
      return await reserveFromRedis({ count, limit, dayKey });
    } catch (error) {
      logger.warn("Demo AI budget check failed, allowing call", {
        error: error instanceof Error ? error.message : error,
      });
      return { allowed: true, remaining: limit };
    }
  }

  return reserveFromMemory({ count, limit, dayKey });
}

async function reserveFromRedis({
  count,
  limit,
  dayKey,
}: {
  count: number;
  limit: number;
  dayKey: string;
}): Promise<DemoAiBudgetResult> {
  const key = `${BUDGET_KEY_PREFIX}:${dayKey}`;
  const current = Number((await redis.get<number>(key)) ?? 0);

  if (current + count > limit) {
    return { allowed: false, remaining: Math.max(limit - current, 0) };
  }

  const used = await redis.incrby(key, count);
  await redis.expire(key, REDIS_TTL_SECONDS);
  return { allowed: true, remaining: Math.max(limit - used, 0) };
}

function reserveFromMemory({
  count,
  limit,
  dayKey,
}: {
  count: number;
  limit: number;
  dayKey: string;
}): DemoAiBudgetResult {
  const current = memoryUsageByDay.get(dayKey) ?? 0;

  if (current + count > limit) {
    return { allowed: false, remaining: Math.max(limit - current, 0) };
  }

  const used = current + count;
  memoryUsageByDay.set(dayKey, used);
  return { allowed: true, remaining: Math.max(limit - used, 0) };
}

function getDailyLimit(): number {
  return env.DEMO_AI_DAILY_CALL_LIMIT ?? DEFAULT_DAILY_CALL_LIMIT;
}

function getUtcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function isRedisConfigured(): boolean {
  return Boolean(env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN);
}
