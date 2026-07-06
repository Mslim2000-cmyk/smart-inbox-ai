import { NextResponse } from "next/server";
import { withError } from "@/utils/middleware";
import { parseRule } from "@/utils/demo/ai/parse-rule";
import { parseRuleRequestSchema } from "@/utils/demo/ai/schemas";
import { enforceDemoAiRateLimit } from "@/utils/demo/rate-limit";
import { getClientIp } from "@/utils/rate-limit";

export const maxDuration = 30;
export const runtime = "nodejs";

// Public, unauthenticated endpoint powering /demo/rules. Accepts the
// client's current (already-classified) emails so the preview reflects what
// the user is actually looking at - no DB reads/writes, no session.
export const POST = withError("demo/rules", async (request) => {
  const clientIp = getClientIp(request.headers);
  await enforceDemoAiRateLimit({
    feature: "rules",
    clientIp,
    logger: request.logger,
  });

  const body = parseRuleRequestSchema.parse(await request.json());

  const result = await parseRule(body);

  request.logger.info("Demo rule parse complete", {
    status: result.status,
    mode: result.mode,
    reason: result.reason,
    cached: result.cached,
    matchedCount: result.preview?.matchedCount,
  });

  return NextResponse.json(result);
});
