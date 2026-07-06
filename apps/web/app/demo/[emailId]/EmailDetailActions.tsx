"use client";

import { CopyIcon, MessageCircleReplyIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { getDemoAiReasonText } from "@/app/demo/ai-reason-text";
import {
  DemoAiRateLimitedError,
  postDemoAiJson,
} from "@/app/demo/demo-ai-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fromDemoEmail } from "@/utils/demo/ai/normalize";
import type {
  ReplyResponse,
  ReplyTone,
  SummarizeResponse,
} from "@/utils/demo/ai/schemas";
import type { DemoEmail } from "@/utils/demo/inbox-data";

const TONE_OPTIONS: { value: ReplyTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "short", label: "Short" },
  { value: "detailed", label: "Detailed" },
];

type ActionState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; response: T }
  | { status: "error"; rateLimited: boolean };

export function EmailDetailActions({ email }: { email: DemoEmail }) {
  const [summaryState, setSummaryState] = useState<
    ActionState<SummarizeResponse>
  >({ status: "idle" });
  const [replyState, setReplyState] = useState<ActionState<ReplyResponse>>({
    status: "idle",
  });
  const [tone, setTone] = useState<ReplyTone>("professional");
  const [copied, setCopied] = useState(false);

  async function handleSummarize() {
    setSummaryState({ status: "loading" });
    try {
      const response = await postDemoAiJson<SummarizeResponse>(
        "/api/demo/summarize",
        { email: fromDemoEmail(email) },
      );
      setSummaryState({ status: "done", response });
    } catch (error) {
      setSummaryState({
        status: "error",
        rateLimited: error instanceof DemoAiRateLimitedError,
      });
    }
  }

  async function handleGenerateReply() {
    setReplyState({ status: "loading" });
    setCopied(false);
    try {
      const response = await postDemoAiJson<ReplyResponse>(
        "/api/demo/reply",
        { email: fromDemoEmail(email), tone },
      );
      setReplyState({ status: "done", response });
    } catch (error) {
      setReplyState({
        status: "error",
        rateLimited: error instanceof DemoAiRateLimitedError,
      });
    }
  }

  function handleCopy() {
    if (replyState.status !== "done") return;
    navigator.clipboard.writeText(replyState.response.draft.reply);
    setCopied(true);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summarize</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            loading={summaryState.status === "loading"}
            onClick={handleSummarize}
            Icon={SparklesIcon}
          >
            Summarize
          </Button>
          <SummaryResult state={summaryState} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Reply</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={tone}
              onValueChange={(value: ReplyTone) => setTone(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tone" />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              loading={replyState.status === "loading"}
              onClick={handleGenerateReply}
              Icon={MessageCircleReplyIcon}
            >
              Generate Reply
            </Button>
          </div>
          <ReplyResult state={replyState} copied={copied} onCopy={handleCopy} />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryResult({ state }: { state: ActionState<SummarizeResponse> }) {
  if (state.status === "idle") return null;
  if (state.status === "loading") {
    return <p className="text-sm text-muted-foreground">Summarizing…</p>;
  }
  if (state.status === "error") {
    return <p className="text-sm text-muted-foreground">{errorText(state)}</p>;
  }

  const { summary, mode, reason } = state.response;
  return (
    <div className="space-y-1 text-sm">
      <p>
        <span className="font-medium">Main point:</span> {summary.mainPoint}
      </p>
      <p>
        <span className="font-medium">Requested action:</span>{" "}
        {summary.requestedAction ?? "None"}
      </p>
      <p>
        <span className="font-medium">Deadline:</span>{" "}
        {summary.deadline ?? "None mentioned"}
      </p>
      <p>
        <span className="font-medium">Importance:</span> {summary.importance}
      </p>
      {mode === "fallback" && (
        <p className="text-xs text-muted-foreground">
          {getDemoAiReasonText(reason)} — showing a basic fallback summary.
        </p>
      )}
    </div>
  );
}

function ReplyResult({
  state,
  copied,
  onCopy,
}: {
  state: ActionState<ReplyResponse>;
  copied: boolean;
  onCopy: () => void;
}) {
  if (state.status === "idle") return null;
  if (state.status === "loading") {
    return <p className="text-sm text-muted-foreground">Drafting reply…</p>;
  }
  if (state.status === "error") {
    return <p className="text-sm text-muted-foreground">{errorText(state)}</p>;
  }

  const { draft, mode, reason } = state.response;
  return (
    <div className="space-y-2">
      <Textarea readOnly value={draft.reply} className="min-h-32 text-sm" />
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onCopy} Icon={CopyIcon}>
          {copied ? "Copied!" : "Copy"}
        </Button>
        {mode === "fallback" && (
          <span className="text-xs text-muted-foreground">
            {getDemoAiReasonText(reason)}
          </span>
        )}
      </div>
    </div>
  );
}

function errorText(state: { rateLimited: boolean }): string {
  return state.rateLimited
    ? "Too many requests right now — please wait a moment and try again."
    : "Something went wrong. Please try again.";
}
