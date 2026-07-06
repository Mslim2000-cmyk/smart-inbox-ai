import { StarIcon } from "lucide-react";
import Link from "next/link";
import {
  CATEGORY_BADGE_VARIANT,
  PRIORITY_DOT_COLOR,
} from "@/app/demo/category-style";
import type { DemoOverlay } from "@/app/demo/demo-overlay";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatShortDate } from "@/utils/date";
import type { Classification } from "@/utils/demo/ai/schemas";
import { DEMO_CATEGORY_LABELS, type DemoEmail } from "@/utils/demo/inbox-data";

export function DemoInboxList({
  emails,
  classifications,
  overlay,
}: {
  emails: DemoEmail[];
  classifications?: Record<string, Classification>;
  overlay?: DemoOverlay;
}) {
  const visible = [...emails]
    .filter((email) => !overlay?.[email.id]?.archived)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card className="divide-y">
      {visible.map((email) => {
        const classification = classifications?.[email.id];
        const entry = overlay?.[email.id];
        const isUnread = email.unread && !entry?.read;

        return (
          <Link
            key={email.id}
            href={`/demo/${email.id}`}
            title={
              classification
                ? `AI: ${DEMO_CATEGORY_LABELS[classification.category]} · ${Math.round(classification.confidence * 100)}% confidence — ${classification.reasoning}`
                : undefined
            }
            className="flex flex-col gap-1 p-4 first:rounded-t-lg last:rounded-b-lg hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex w-full items-center justify-between gap-3 sm:w-48 sm:shrink-0">
              <span className="flex min-w-0 items-center gap-2">
                {classification && (
                  <span
                    aria-hidden
                    className={`size-1.5 shrink-0 rounded-full ${PRIORITY_DOT_COLOR[classification.priority]}`}
                  />
                )}
                {entry?.starred && (
                  <StarIcon
                    aria-hidden
                    className="size-3.5 shrink-0 fill-amber-400 text-amber-400"
                  />
                )}
                <span
                  className={`truncate text-sm ${isUnread ? "font-semibold" : "text-muted-foreground"}`}
                >
                  {email.from.name}
                </span>
              </span>
              <Badge
                variant={CATEGORY_BADGE_VARIANT[email.category]}
                className="shrink-0 sm:hidden"
              >
                {DEMO_CATEGORY_LABELS[email.category]}
              </Badge>
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm ${isUnread ? "font-semibold" : ""}`}
              >
                {email.subject}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {email.preview}
              </p>
            </div>

            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <Badge variant={CATEGORY_BADGE_VARIANT[email.category]}>
                {DEMO_CATEGORY_LABELS[email.category]}
              </Badge>
              {entry?.labels?.map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
            </div>

            <span className="shrink-0 text-xs text-muted-foreground sm:w-20 sm:text-right">
              {formatShortDate(new Date(email.date))}
            </span>
          </Link>
        );
      })}
    </Card>
  );
}
