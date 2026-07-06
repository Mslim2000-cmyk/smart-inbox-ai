import {
  AlertTriangleIcon,
  ClockIcon,
  MailWarningIcon,
  MessageCircleReplyIcon,
  NewspaperIcon,
  UsersIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DemoDashboardStats } from "@/utils/demo/stats";

export function DemoStatsRow({ stats }: { stats: DemoDashboardStats }) {
  const tiles = [
    {
      label: "Urgent",
      value: stats.urgentCount,
      icon: AlertTriangleIcon,
      accent: "text-red-600 bg-red-50",
    },
    {
      label: "Reply Needed",
      value: stats.replyNeededCount,
      icon: MessageCircleReplyIcon,
      accent: "text-amber-600 bg-amber-50",
    },
    {
      label: "Newsletters",
      value: stats.newsletterCount,
      icon: NewspaperIcon,
      accent: "text-blue-600 bg-blue-50",
    },
    {
      label: "Cold / Spam",
      value: stats.coldSpamCount,
      icon: MailWarningIcon,
      accent: "text-slate-600 bg-slate-100",
    },
    {
      label: "Time Saved",
      value: `${stats.timeSavedMinutes}m`,
      icon: ClockIcon,
      accent: "text-green-600 bg-green-50",
    },
    {
      label: "Top Sender",
      value: stats.topSenders[0]?.name ?? "—",
      icon: UsersIcon,
      accent: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div
              className={`flex size-8 items-center justify-center rounded-md ${tile.accent}`}
            >
              <tile.icon className="size-4" />
            </div>
            <div>
              <p className="truncate text-lg font-semibold">{tile.value}</p>
              <p className="text-xs text-muted-foreground">{tile.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
