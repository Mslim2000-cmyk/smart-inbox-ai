import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestLogger } from "@/__tests__/helpers";
import { enforceDemoAiRateLimit } from "@/utils/demo/rate-limit";
import type { SafeError } from "@/utils/error";

const { mockedEnv, mockCheckRateLimit } = vi.hoisted(() => ({
  mockedEnv: {
    UPSTASH_REDIS_URL: undefined as string | undefined,
    UPSTASH_REDIS_TOKEN: undefined as string | undefined,
  },
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/env", () => ({ env: mockedEnv }));
vi.mock("@/utils/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
  createRateLimitKey: (parts: string[]) => parts.join(":"),
  hashRateLimitValue: (value: string) => value,
}));

const logger = createTestLogger();

describe("enforceDemoAiRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedEnv.UPSTASH_REDIS_URL = undefined;
    mockedEnv.UPSTASH_REDIS_TOKEN = undefined;
  });

  describe("without Redis configured (in-memory fallback)", () => {
    it("allows requests under the burst limit", async () => {
      await expect(
        enforceDemoAiRateLimit({
          feature: "classify",
          clientIp: "203.0.113.10",
          logger,
        }),
      ).resolves.toBeUndefined();
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it("blocks a client once it exceeds the burst limit", async () => {
      const clientIp = "203.0.113.11";

      // Burst limit is 5/minute; the 6th request in the window should 429.
      for (let i = 0; i < 5; i++) {
        await enforceDemoAiRateLimit({
          feature: "classify",
          clientIp,
          logger,
        });
      }

      await expect(
        enforceDemoAiRateLimit({ feature: "classify", clientIp, logger }),
      ).rejects.toMatchObject({
        name: "SafeError",
        statusCode: 429,
      } satisfies Partial<SafeError>);
    });

    it("tracks separate clients independently", async () => {
      const clientA = "203.0.113.12";
      const clientB = "203.0.113.13";

      for (let i = 0; i < 5; i++) {
        await enforceDemoAiRateLimit({
          feature: "classify",
          clientIp: clientA,
          logger,
        });
      }

      await expect(
        enforceDemoAiRateLimit({
          feature: "classify",
          clientIp: clientB,
          logger,
        }),
      ).resolves.toBeUndefined();
    });

    it("tracks separate features independently for the same client", async () => {
      const clientIp = "203.0.113.14";

      for (let i = 0; i < 5; i++) {
        await enforceDemoAiRateLimit({
          feature: "classify",
          clientIp,
          logger,
        });
      }

      await expect(
        enforceDemoAiRateLimit({ feature: "summarize", clientIp, logger }),
      ).resolves.toBeUndefined();
      await expect(
        enforceDemoAiRateLimit({ feature: "reply", clientIp, logger }),
      ).resolves.toBeUndefined();
    });
  });

  describe("with Redis configured", () => {
    beforeEach(() => {
      mockedEnv.UPSTASH_REDIS_URL = "https://redis.example.com";
      mockedEnv.UPSTASH_REDIS_TOKEN = "token";
    });

    it("delegates to the shared Redis rate limiter", async () => {
      mockCheckRateLimit.mockResolvedValue({
        limited: false,
        limit: 5,
        remaining: 4,
      });

      await expect(
        enforceDemoAiRateLimit({
          feature: "reply",
          clientIp: "203.0.113.20",
          logger,
        }),
      ).resolves.toBeUndefined();
      expect(mockCheckRateLimit).toHaveBeenCalledTimes(2); // burst + daily rules
    });

    it("throws a 429 SafeError when the shared limiter reports limited", async () => {
      mockCheckRateLimit.mockResolvedValue({
        limited: true,
        limit: 5,
        retryAfterSeconds: 60,
      });

      await expect(
        enforceDemoAiRateLimit({
          feature: "summarize",
          clientIp: "203.0.113.21",
          logger,
        }),
      ).rejects.toMatchObject({
        name: "SafeError",
        statusCode: 429,
      } satisfies Partial<SafeError>);
    });
  });
});
