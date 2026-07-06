import type { Metadata } from "next";
import { SmartInboxArchitecture } from "@/app/(landing)/home/SmartInboxArchitecture";
import {
  SmartInboxFooter,
  SmartInboxNav,
} from "@/app/(landing)/home/SmartInboxChrome";
import { SmartInboxFeatures } from "@/app/(landing)/home/SmartInboxFeatures";
import { SmartInboxHero } from "@/app/(landing)/home/SmartInboxHero";
import { SmartInboxSafety } from "@/app/(landing)/home/SmartInboxSafety";

const TITLE = "Smart Inbox AI — AI Email Productivity Demo";
const DESCRIPTION =
  "An AI-powered email productivity demo that classifies, summarizes, drafts replies, and previews automation rules safely. Portfolio project - no Gmail sign-in required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function SmartInboxLandingPage() {
  return (
    <div>
      <SmartInboxNav />
      <main className="mx-auto max-w-5xl px-6 lg:px-8">
        <SmartInboxHero />
        <SmartInboxFeatures />
        <SmartInboxSafety />
        <SmartInboxArchitecture />
      </main>
      <SmartInboxFooter />
    </div>
  );
}
