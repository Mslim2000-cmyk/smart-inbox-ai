import {
  FileTextIcon,
  GlobeIcon,
  MessageCircleReplyIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: SparklesIcon,
    title: "AI Inbox Classification",
    description:
      "Every sample email is classified live by an LLM into urgent, reply-needed, newsletter, cold/spam, notification, or FYI - with a visible confidence score.",
  },
  {
    icon: FileTextIcon,
    title: "Email Summaries",
    description:
      "One click extracts the main point, requested action, deadline, and importance of any email - structured output, not a wall of text.",
  },
  {
    icon: MessageCircleReplyIcon,
    title: "AI Reply Drafts",
    description:
      "Generate a reply in professional, friendly, short, or detailed tone, then copy it out - grounded only in what the email actually says.",
  },
  {
    icon: TerminalIcon,
    title: "Natural-Language Rules",
    description:
      'Type a rule like "archive newsletters older than 7 days" and watch it get parsed into structured conditions and actions.',
  },
  {
    icon: ShieldCheckIcon,
    title: "Preview-Before-Apply Safety",
    description:
      "Every rule shows exactly which sample emails it would affect and warns about destructive actions before anything is applied.",
  },
  {
    icon: GlobeIcon,
    title: "Public Demo Without Gmail OAuth",
    description:
      "The entire demo runs on seeded sample data - no Google/Microsoft sign-in, no real inbox access, ever.",
  },
];

export function SmartInboxFeatures() {
  return (
    <section className="py-12">
      <h2 className="text-center text-2xl font-semibold sm:text-3xl">
        What it does
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardContent className="pt-6">
              <feature.icon className="size-6 text-blue-600" />
              <h3 className="mt-3 font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
