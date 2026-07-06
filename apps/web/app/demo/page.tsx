import type { Metadata } from "next";
import Link from "next/link";
import { PageWrapper } from "@/components/PageWrapper";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DEMO_EMAILS } from "@/utils/demo/inbox-data";
import { DemoDashboardClient } from "@/app/demo/DemoDashboardClient";

export const metadata: Metadata = {
  title: "Live Demo | Smart Inbox AI",
  description:
    "Explore Smart Inbox AI with a seeded sample inbox. No sign-in or Gmail connection required.",
};

export default function DemoPage() {
  return (
    <PageWrapper className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Smart Inbox AI — Live Demo"
          description="A sample inbox seeded with realistic emails so you can explore the AI dashboard without connecting Gmail."
        />
        <Button asChild variant="outline">
          <Link href="/demo/rules">Rule Builder</Link>
        </Button>
      </div>

      <div className="mt-6">
        <DemoDashboardClient emails={DEMO_EMAILS} />
      </div>
    </PageWrapper>
  );
}
