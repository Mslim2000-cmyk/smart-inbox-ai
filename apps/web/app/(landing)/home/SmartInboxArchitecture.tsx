import { Card, CardContent } from "@/components/ui/card";

const ARCHITECTURE_STEPS = [
  {
    title: "Demo mode is route-isolated",
    description:
      'Everything under "/demo/*" and "/api/demo/*" is public and stateless. It never touches the authenticated app or its database.',
  },
  {
    title: "Real email provider logic stays separate",
    description:
      "Gmail and Outlook integrations live behind their own authenticated routes and are untouched by anything in the demo.",
  },
  {
    title: "One shared, provider-agnostic AI core",
    description:
      'Classification, summarization, reply drafting, and rule parsing are written once against a "NormalizedEmail" shape, not against Gmail or seed-data specifics.',
  },
  {
    title: "Demo data and real provider data map to the same shape",
    description:
      "Seed emails are normalized into that same contract today. A real provider (Gmail/Outlook) mapping into it is the natural next step to reuse the identical AI core in production.",
  },
];

export function SmartInboxArchitecture() {
  return (
    <section className="py-12">
      <h2 className="text-center text-2xl font-semibold sm:text-3xl">
        Architecture
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
        The demo isn't a separate toy - it exercises the same AI core a real
        integration would use.
      </p>
      <div className="mx-auto mt-8 max-w-2xl space-y-4">
        {ARCHITECTURE_STEPS.map((step, index) => (
          <Card key={step.title}>
            <CardContent className="flex gap-4 pt-6">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                {index + 1}
              </div>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
