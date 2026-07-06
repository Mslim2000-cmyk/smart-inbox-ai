import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailDetailActions } from "@/app/demo/[emailId]/EmailDetailActions";
import { CATEGORY_BADGE_VARIANT } from "@/app/demo/category-style";
import { PageWrapper } from "@/components/PageWrapper";
import { Badge } from "@/components/ui/badge";
import { classifyEmails } from "@/utils/demo/ai/classify";
import { fromDemoEmail } from "@/utils/demo/ai/normalize";
import { formatDateTimeInUserTimezone } from "@/utils/date";
import { DEMO_CATEGORY_LABELS, DEMO_EMAILS } from "@/utils/demo/inbox-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ emailId: string }>;
}): Promise<Metadata> {
  const { emailId } = await params;
  const email = DEMO_EMAILS.find((e) => e.id === emailId);

  return {
    title: email
      ? `${email.subject} | Smart Inbox AI Demo`
      : "Email not found | Smart Inbox AI Demo",
  };
}

export default async function DemoEmailDetailPage({
  params,
}: {
  params: Promise<{ emailId: string }>;
}) {
  const { emailId } = await params;
  const email = DEMO_EMAILS.find((e) => e.id === emailId);
  if (!email) notFound();

  // Reuses the same shared classifier (and its content-hash cache) as the
  // dashboard - if this email was already classified there, this is a free
  // cache hit rather than a new AI call.
  const classification = (
    await classifyEmails([fromDemoEmail(email)])
  ).results[0];

  return (
    <PageWrapper className="mt-8 max-w-3xl">
      <Link
        href="/demo"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to inbox
      </Link>

      <div className="mt-4 rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={CATEGORY_BADGE_VARIANT[classification.category]}>
            {DEMO_CATEGORY_LABELS[classification.category]}
          </Badge>
          <Badge variant="outline">{classification.priority} priority</Badge>
          {email.unread && <Badge variant="secondary">Unread</Badge>}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDateTimeInUserTimezone(new Date(email.date), null)}
          </span>
        </div>

        <h1 className="mt-3 text-xl font-semibold">{email.subject}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {email.from.name} &lt;{email.from.email}&gt;
        </p>

        <p className="mt-2 text-xs text-muted-foreground">
          AI: {Math.round(classification.confidence * 100)}% confidence —{" "}
          {classification.reasoning}
        </p>

        <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
          {email.body}
        </div>
      </div>

      <div className="mt-6">
        <EmailDetailActions email={email} />
      </div>
    </PageWrapper>
  );
}
