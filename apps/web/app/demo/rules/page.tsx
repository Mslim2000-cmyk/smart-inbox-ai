import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RuleBuilderClient } from "@/app/demo/rules/RuleBuilderClient";
import { PageHeader } from "@/components/PageHeader";
import { PageWrapper } from "@/components/PageWrapper";
import { DEMO_EMAILS } from "@/utils/demo/inbox-data";

export const metadata: Metadata = {
  title: "Rule Builder | Smart Inbox AI Demo",
  description:
    "Describe an inbox rule in plain English, preview which sample emails it affects, and apply it - nothing is sent to a real inbox.",
};

export default function DemoRulesPage() {
  return (
    <PageWrapper className="mt-8">
      <Link
        href="/demo"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to inbox
      </Link>

      <div className="mt-4">
        <PageHeader
          title="Rule Builder"
          description="Describe a rule in plain English. Preview exactly what it would do before applying it to the sample inbox."
        />
      </div>
      <div className="mt-6">
        <RuleBuilderClient emails={DEMO_EMAILS} />
      </div>
    </PageWrapper>
  );
}
