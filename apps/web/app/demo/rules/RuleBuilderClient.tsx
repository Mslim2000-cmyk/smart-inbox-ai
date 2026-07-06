"use client";

import { AlertTriangleIcon, SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getDemoAiReasonText } from "@/app/demo/ai-reason-text";
import {
  DemoAiRateLimitedError,
  postDemoAiJson,
} from "@/app/demo/demo-ai-client";
import { useDemoOverlay } from "@/app/demo/useDemoOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { describeAction, describeCondition } from "@/utils/demo/ai/rule-match";
import { fromDemoEmail } from "@/utils/demo/ai/normalize";
import type {
  Classification,
  ClassifiedDemoEmailInput,
  ClassifyResponse,
  ParsedRule,
  ParseRuleResponse,
} from "@/utils/demo/ai/schemas";
import type { DemoEmail } from "@/utils/demo/inbox-data";

const EXAMPLE_INSTRUCTIONS = [
  "Archive newsletters older than 7 days",
  "Mark cold emails as spam",
  "Star urgent emails from my professor",
  "Create a follow-up for emails I haven't replied to",
  "Label all receipts as Finance",
];

type ClassifyStatus = "loading" | "ready" | "error";

type ParseState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; response: ParseRuleResponse }
  | { status: "error"; rateLimited: boolean };

type AppliedRule = {
  rule: ParsedRule;
  matchedCount: number;
  appliedAt: string;
};

export function RuleBuilderClient({ emails }: { emails: DemoEmail[] }) {
  const [classifications, setClassifications] = useState<
    Record<string, Classification>
  >({});
  const [classifyStatus, setClassifyStatus] = useState<ClassifyStatus>(
    "loading",
  );
  const [instruction, setInstruction] = useState("");
  const [parseState, setParseState] = useState<ParseState>({
    status: "idle",
  });
  const [appliedRules, setAppliedRules] = useState<AppliedRule[]>([]);
  const { applyRule, resetOverlay } = useDemoOverlay();

  useEffect(() => {
    let cancelled = false;

    postDemoAiJson<ClassifyResponse>("/api/demo/classify", {
      emails: emails.map(fromDemoEmail),
    })
      .then((response) => {
        if (cancelled) return;
        const byId: Record<string, Classification> = {};
        for (const result of response.results) byId[result.emailId] = result;
        setClassifications(byId);
        setClassifyStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setClassifyStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [emails]);

  const classifiedEmails: ClassifiedDemoEmailInput[] = emails.map((email) => {
    const classification = classifications[email.id];
    return {
      id: email.id,
      from: email.from,
      subject: email.subject,
      body: email.body,
      snippet: email.preview,
      date: email.date,
      unread: email.unread,
      category: classification?.category ?? email.category,
      priority: classification?.priority ?? "normal",
    };
  });

  async function handleParse() {
    setParseState({ status: "loading" });
    try {
      const response = await postDemoAiJson<ParseRuleResponse>(
        "/api/demo/rules/parse",
        { instruction, emails: classifiedEmails },
      );
      setParseState({ status: "done", response });
    } catch (error) {
      setParseState({
        status: "error",
        rateLimited: error instanceof DemoAiRateLimitedError,
      });
    }
  }

  function handleApply() {
    if (parseState.status !== "done") return;
    const { rule, preview } = parseState.response;
    if (!rule || !preview) return;

    applyRule(preview.matches, preview.actions);
    setAppliedRules((current) => [
      { rule, matchedCount: preview.matchedCount, appliedAt: nowLabel() },
      ...current,
    ]);
  }

  function handleReset() {
    resetOverlay();
    setAppliedRules([]);
    setParseState({ status: "idle" });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder='e.g. "Archive newsletters older than 7 days"'
            className="min-h-20"
            disabled={classifyStatus === "loading"}
          />

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_INSTRUCTIONS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setInstruction(example)}
                className="rounded-full border border-input bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              onClick={handleParse}
              loading={parseState.status === "loading"}
              disabled={
                classifyStatus === "loading" || instruction.trim().length < 3
              }
              Icon={SparklesIcon}
            >
              Preview rule
            </Button>
            {classifyStatus === "loading" && (
              <span className="text-xs text-muted-foreground">
                Preparing sample inbox…
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <ParseResult state={parseState} onApply={handleApply} />

      {appliedRules.length > 0 && (
        <AppliedRulesList rules={appliedRules} onReset={handleReset} />
      )}
    </div>
  );
}

function ParseResult({
  state,
  onApply,
}: {
  state: ParseState;
  onApply: () => void;
}) {
  if (state.status === "idle" || state.status === "loading") return null;

  if (state.status === "error") {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {state.rateLimited
            ? "Too many requests right now — please wait a moment and try again."
            : "Something went wrong parsing that rule. Please try again."}
        </CardContent>
      </Card>
    );
  }

  const { status, rule, preview, message, mode, reason } = state.response;

  if (status === "unsupported" || !rule || !preview) {
    return (
      <Card>
        <CardContent className="space-y-1 pt-6 text-sm">
          <p>{message ?? "That rule isn't supported yet."}</p>
          {mode === "fallback" && (
            <p className="text-xs text-muted-foreground">
              {getDemoAiReasonText(reason)}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div>
          <h3 className="text-sm font-semibold">{rule.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {preview.explanation}
          </p>
          {mode === "fallback" && (
            <p className="mt-1 text-xs text-muted-foreground">
              {getDemoAiReasonText(reason)} — parsed with a basic template.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">match: {rule.match}</Badge>
          {rule.conditions.map((condition, i) => (
            <Badge key={i} variant="secondary">
              {describeCondition(condition, false)}
            </Badge>
          ))}
          {rule.actions.map((action, i) => (
            <Badge key={i} variant="default">
              {describeAction(action)}
            </Badge>
          ))}
        </div>

        {preview.warnings.length > 0 && (
          <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50">
            {preview.warnings.map((warning) => (
              <p
                key={warning}
                className="flex items-start gap-1.5 text-xs text-amber-900 dark:text-amber-200"
              >
                <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
                {warning}
              </p>
            ))}
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Matched emails ({preview.matchedCount} of {preview.totalCount})
          </p>
          {preview.matches.length > 0 && (
            <ul className="mt-1 divide-y rounded-md border text-sm">
              {preview.matches.map((match) => (
                <li key={match.emailId} className="p-2">
                  <span className="font-medium">{match.from}</span>
                  <span className="text-muted-foreground"> — {match.subject}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button
          onClick={onApply}
          disabled={preview.matchedCount === 0}
          variant="outline"
        >
          Apply to sample inbox
        </Button>
      </CardContent>
    </Card>
  );
}

function AppliedRulesList({
  rules,
  onReset,
}: {
  rules: AppliedRule[];
  onReset: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Applied this session</h3>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset demo
          </Button>
        </div>
        <ul className="space-y-2 text-sm">
          {rules.map((applied, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 text-muted-foreground"
            >
              <span>
                <span className="font-medium text-foreground">
                  {applied.rule.name}
                </span>{" "}
                — {applied.matchedCount} email
                {applied.matchedCount === 1 ? "" : "s"}
              </span>
              <span className="shrink-0 text-xs">{applied.appliedAt}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function nowLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
