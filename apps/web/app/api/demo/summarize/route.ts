import { NextResponse } from "next/server";
import { withError } from "@/utils/middleware";
import { summarizeEmail } from "@/utils/demo/ai/summarize";
import { summarizeRequestSchema } from "@/utils/demo/ai/schemas";
import { enforceDemoAiRateLimit } from "@/utils/demo/rate-limit";
import { getClientIp } from "@/utils/rate-limit";

export const maxDuration = 30;
export const runtime = "nodejs";

// Public, unauthenticated endpoint powering the /demo email detail page.
// Operates only on the request-supplied seed email - no DB reads/writes.
export const POST = withError("demo/summarize", async (request) => {
  const clientIp = getClientIp(request.headers);
  await enforceDemoAiRateLimit({
    feature: "summarize",
    clientIp,
    logger: request.logger,
  });

  const body = summarizeRequestSchema.parse(await request.json());

  const result = await summarizeEmail(body.email);

  request.logger.info("Demo summarize complete", {
    emailId: body.email.id,
    mode: result.mode,
    reason: result.reason,
  });

  return NextResponse.json(result);
});
