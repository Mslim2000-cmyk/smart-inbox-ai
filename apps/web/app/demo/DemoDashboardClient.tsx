"use client";

import { useEffect, useState } from "react";
import { getDemoAiReasonText } from "@/app/demo/ai-reason-text";
import { DemoInboxList } from "@/app/demo/DemoInboxList";
import { DemoStatsRow } from "@/app/demo/DemoStatsRow";
import {
  DemoAiRateLimitedError,
  postDemoAiJson,
} from "@/app/demo/demo-ai-client";
import { useDemoOverlay } from "@/app/demo/useDemoOverlay";
import { Button } from "@/components/ui/button";
import { fromDemoEmail } from "@/utils/demo/ai/normalize";
import type { Classification, ClassifyResponse } from "@/utils/demo/ai/schemas";
import type { DemoEmail } from "@/utils/demo/inbox-data";
import { getDemoDashboardStats } from "@/utils/demo/stats";

type ClassifyStatus =
  | { state: "loading" }
  | { state: "done"; response: ClassifyResponse }
  | { state: "error"; rateLimited: boolean };

// Demo mode holds all state client-side (sessionStorage-free for now - a
// single fetch per page load is enough for this milestone). No DB writes,
// no auth: this component only ever talks to the public /api/demo/classify
// endpoint with the static seed set already rendered by the server.
export function DemoDashboardClient({ emails }: { emails: DemoEmail[] }) {
  const [classifications, setClassifications] = useState<
    Record<string, Classification>
  >({});
  const [status, setStatus] = useState<ClassifyStatus>({ state: "loading" });
  const { overlay, resetOverlay } = useDemoOverlay();

  useEffect(() => {
    let cancelled = false;

    fetchClassifications(emails)
      .then((response) => {
        if (cancelled) return;
        setClassifications(indexById(response.results));
        setStatus({ state: "done", response });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus({
          state: "error",
          rateLimited: error instanceof DemoAiRateLimitedError,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [emails]);

  const classifiedEmails = emails.map((email) => {
    const classification = classifications[email.id];
    return classification
      ? { ...email, category: classification.category }
      : email;
  });
  const visibleEmails = classifiedEmails.filter(
    (email) => !overlay[email.id]?.archived,
  );
  const archivedCount = classifiedEmails.length - visibleEmails.length;

  return (
    <>
      <DemoStatsRow stats={getDemoDashboardStats(visibleEmails)} />
      <AiStatusLine status={status} />
      {(archivedCount > 0 || Object.keys(overlay).length > 0) && (
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {archivedCount > 0
              ? `${archivedCount} email${archivedCount === 1 ? "" : "s"} archived by demo rules.`
              : "Some demo rules have been applied."}
          </span>
          <Button variant="ghost" size="xs" onClick={resetOverlay}>
            Reset demo
          </Button>
        </div>
      )}
      <div className="mt-8">
        <DemoInboxList
          emails={classifiedEmails}
          classifications={classifications}
          overlay={overlay}
        />
      </div>
    </>
  );
}

function AiStatusLine({ status }: { status: ClassifyStatus }) {
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {getStatusText(status)}
    </p>
  );
}

function getStatusText(status: ClassifyStatus): string {
  if (status.state === "loading") return "Classifying inbox with AI…";

  if (status.state === "error") {
    return status.rateLimited
      ? "Too many demo requests right now — please wait a moment and reload."
      : "AI classification unavailable — showing seed categories.";
  }

  const { mode, reason, model } = status.response;
  if (mode === "ai") {
    return reason === "ok"
      ? `Live-classified by ${model}`
      : `Live-classified by ${model} (a few emails used fallback categories)`;
  }

  return `${getDemoAiReasonText(reason)} — showing seed categories.`;
}

function fetchClassifications(
  emails: DemoEmail[],
): Promise<ClassifyResponse> {
  return postDemoAiJson<ClassifyResponse>("/api/demo/classify", {
    emails: emails.map(fromDemoEmail),
  });
}

function indexById(
  classifications: Classification[],
): Record<string, Classification> {
  const byId: Record<string, Classification> = {};
  for (const classification of classifications) {
    byId[classification.emailId] = classification;
  }
  return byId;
}
