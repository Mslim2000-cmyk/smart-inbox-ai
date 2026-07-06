import type { BadgeProps } from "@/components/ui/badge";
import type { EmailPriority } from "@/utils/demo/ai/schemas";
import type { DemoEmailCategory } from "@/utils/demo/inbox-data";

// Shared between DemoInboxList and the email detail page so category/priority
// styling can't drift between the inbox list and the detail view.
export const CATEGORY_BADGE_VARIANT: Record<
  DemoEmailCategory,
  BadgeProps["variant"]
> = {
  urgent: "red",
  reply_needed: "secondary",
  newsletter: "outline",
  cold_spam: "destructive",
  notification: "outline",
  fyi: "secondary",
};

export const PRIORITY_DOT_COLOR: Record<EmailPriority, string> = {
  high: "bg-red-500",
  normal: "bg-amber-400",
  low: "bg-slate-300",
};
