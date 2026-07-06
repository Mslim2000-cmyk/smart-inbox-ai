import { CheckCircle2Icon, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const SAFETY_POINTS: string[] = [
  "No real Gmail or Outlook access required or requested",
  "No database writes in demo mode - it's entirely stateless",
  "Seed emails only - every message in the demo is fictional sample data",
  "Demo state (applied rules, starred/archived emails) lives in your browser's sessionStorage, never on a server",
  "Public AI endpoints are rate-limited per IP and per feature to prevent abuse",
  "A deterministic fallback keeps every AI action working even if the model is unavailable or a daily budget is reached",
];

export function SmartInboxSafety() {
  return (
    <section className="py-12">
      <h2 className="text-center text-2xl font-semibold sm:text-3xl">
        Built for safe public demos
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
        This is a public URL anyone can visit, so the demo is designed to be
        safe and inexpensive by default - not just functional.
      </p>
      <Card className="mt-8">
        <CardContent className="pt-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {SAFETY_POINTS.map((point) => (
              <SafetyItem key={point} icon={CheckCircle2Icon} text={point} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function SafetyItem({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-green-600" />
      <span>{text}</span>
    </li>
  );
}
