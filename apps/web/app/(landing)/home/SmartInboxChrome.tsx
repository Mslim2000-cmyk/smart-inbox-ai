import { GithubIcon } from "@/components/BrandIcons";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// TODO: replace with your actual repository URL before deploying.
export const GITHUB_REPO_URL =
  "https://github.com/your-username/smart-inbox-ai";

export function SmartInboxNav() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold">
          Smart Inbox AI
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/demo">Try the Demo</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
              <GithubIcon className="mr-2 size-4" />
              GitHub
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function SmartInboxFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-8 text-center text-sm text-muted-foreground">
        <p>
          Smart Inbox AI is a portfolio project inspired by AI email
          productivity tools. It is not affiliated with, and does not claim to
          be, the original Inbox Zero product.
        </p>
        <Link
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          View source on GitHub
        </Link>
      </div>
    </footer>
  );
}
