import { NextResponse } from "next/server";
import { withError } from "@/utils/middleware";
import { draftReply } from "@/utils/demo/ai/reply";
import { replyRequestSchema } from "@/utils/demo/ai/schemas";
import { enforceDemoAiRateLimit } from "@/utils/demo/rate-limit";
import { getClientIp } from "@/utils/rate-limit";

export const maxDuration = 30;
export const runtime = "nodejs";

// Public, unauthenticated endpoint powering the /demo email detail page.
// Operates only on the request-supplied seed email - no DB reads/writes.
export const POST = withError("demo/reply", async (request) => {
  const clientIp = getClientIp(request.headers);
  await enforceDemoAiRateLimit({
    feature: "reply",
    clientIp,
    logger: request.logger,
  });

  const body = replyRequestSchema.parse(await request.json());

  const result = await draftReply(body.email, body.tone);

  request.logger.info("Demo reply draft complete", {
    emailId: body.email.id,
    tone: body.tone,
    mode: result.mode,
    reason: result.reason,
  });

  return NextResponse.json(result);
});
