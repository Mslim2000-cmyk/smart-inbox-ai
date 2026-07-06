import { GithubIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { GITHUB_REPO_URL } from "@/app/(landing)/home/SmartInboxChrome";
import { Button } from "@/components/ui/button";

export function SmartInboxHero() {
  return (
    <section className="py-16 text-center sm:py-24">
      <div className="mx-auto flex max-w-xl items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
        <SparklesIcon className="size-4" />
        Portfolio project — not affiliated with Inbox Zero
      </div>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
        Smart Inbox AI
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
        An AI-powered email productivity demo that classifies, summarizes,
        drafts replies, and previews automation rules safely.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/demo">Try the Demo</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
            <GithubIcon className="mr-2 size-4" />
            View on GitHub
          </Link>
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        No Gmail sign-in required — the demo runs entirely on seeded sample
        data.
      </p>
    </section>
  );
}
