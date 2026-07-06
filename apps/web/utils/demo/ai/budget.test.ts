import { beforeEach, describe, expect, it, vi } from "vitest";
import { reserveDemoAiBudget } from "@/utils/demo/ai/budget";

const { mockedEnv, mockRedis } = vi.hoisted(() => ({
  mockedEnv: {
    UPSTASH_REDIS_URL: undefined as string | undefined,
    UPSTASH_REDIS_TOKEN: undefined as string | undefined,
    DEMO_AI_DAILY_CALL_LIMIT: undefined as number | undefined,
  },
  mockRedis: {
    get: vi.fn(),
    incrby: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock("@/env", () => ({ env: mockedEnv }));
vi.mock("@/utils/redis", () => ({ redis: mockRedis }));

// The in-memory fallback keys its counter by UTC day, and that counter is a
// module-level singleton shared across every test in this file. Each test
// below uses its own fixed `now` (a distinct day) so cumulative counts from
// one test can never leak into another.
let testDay = 0;
function nextDay(): Date {
  testDay += 1;
  return new Date(Date.UTC(2026, 0, testDay));
}

describe("reserveDemoAiBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedEnv.UPSTASH_REDIS_URL = undefined;
    mockedEnv.UPSTASH_REDIS_TOKEN = undefined;
    mockedEnv.DEMO_AI_DAILY_CALL_LIMIT = 5;
  });

  describe("without Redis configured (in-memory fallback)", () => {
    it("allows calls under the daily limit", async () => {
      const result = await reserveDemoAiBudget(2, nextDay());
      expect(result).toEqual({ allowed: true, remaining: 3 });
    });

    it("denies calls once the daily limit is reached", async () => {
      const day = nextDay();
      await reserveDemoAiBudget(3, day);
      const second = await reserveDemoAiBudget(3, day);

      expect(second.allowed).toBe(false);
      expect(second.remaining).toBe(2);
      expect(mockRedis.incrby).not.toHaveBeenCalled();
    });

    it("tracks separate budgets for separate days", async () => {
      const day = nextDay();
      const nextDayDate = new Date(day);
      nextDayDate.setUTCDate(nextDayDate.getUTCDate() + 1);

      await reserveDemoAiBudget(5, day);
      const onNextDay = await reserveDemoAiBudget(1, nextDayDate);

      expect(onNextDay).toEqual({ allowed: true, remaining: 4 });
    });
  });

  describe("with Redis configured", () => {
    beforeEach(() => {
      mockedEnv.UPSTASH_REDIS_URL = "https://redis.example.com";
      mockedEnv.UPSTASH_REDIS_TOKEN = "token";
    });

    it("reserves budget via Redis when under the limit", async () => {
      mockRedis.get.mockResolvedValue(1);
      mockRedis.incrby.mockResolvedValue(3);

      const result = await reserveDemoAiBudget(2, nextDay());

      expect(result).toEqual({ allowed: true, remaining: 2 });
      expect(mockRedis.incrby).toHaveBeenCalledWith(expect.any(String), 2);
      expect(mockRedis.expire).toHaveBeenCalled();
    });

    it("denies without incrementing when Redis reports the limit is reached", async () => {
      mockRedis.get.mockResolvedValue(4);

      const result = await reserveDemoAiBudget(3, nextDay());

      expect(result).toEqual({ allowed: false, remaining: 1 });
      expect(mockRedis.incrby).not.toHaveBeenCalled();
    });

    it("fails open (allows the call) if Redis errors", async () => {
      mockRedis.get.mockRejectedValue(new Error("redis down"));

      const result = await reserveDemoAiBudget(1, nextDay());

      expect(result).toEqual({ allowed: true, remaining: 5 });
    });
  });
});
