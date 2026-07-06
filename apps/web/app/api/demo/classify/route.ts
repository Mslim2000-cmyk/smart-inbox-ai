import { NextResponse } from "next/server";
import { withError } from "@/utils/middleware";
import { classifyEmails } from "@/utils/demo/ai/classify";
import { classifyRequestSchema } from "@/utils/demo/ai/schemas";
import { enforceDemoAiRateLimit } from "@/utils/demo/rate-limit";
import { getClientIp } from "@/utils/rate-limit";

export const maxDuration = 30;
export const runtime = "nodejs";

// Public, unauthenticated endpoint powering the /demo dashboard. Operates
// only on request-supplied seed emails - no DB reads/writes, no session.
export const POST = withError("demo/classify", async (request) => {
  const clientIp = getClientIp(request.headers);
  await enforceDemoAiRateLimit({
    feature: "classify",
    clientIp,
    logger: request.logger,
  });

  const body = classifyRequestSchema.parse(await request.json());

  const result = await classifyEmails(body.emails);

  request.logger.info("Demo classification complete", {
    count: body.emails.length,
    mode: result.mode,
    reason: result.reason,
    cached: result.cached,
    fallback: result.fallback,
  });

  return NextResponse.json(result);
});
