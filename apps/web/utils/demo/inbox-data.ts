// Static seed data powering the public, no-auth "/demo" experience.
// Deliberately decoupled from the real EmailProvider/Gmail pipeline so the
// demo works with zero OAuth setup on a fresh Vercel deploy.

import type { EmailCategory } from "@/utils/demo/ai/schemas";

// Re-exported so the AI classification taxonomy (utils/demo/ai/schemas.ts)
// stays the single source of truth for category values.
export type DemoEmailCategory = EmailCategory;

export type DemoSender = {
  name: string;
  email: string;
};

export type DemoEmail = {
  id: string;
  from: DemoSender;
  subject: string;
  preview: string;
  body: string;
  date: string; // ISO timestamp
  category: DemoEmailCategory;
  unread: boolean;
};

export const DEMO_CATEGORY_LABELS: Record<DemoEmailCategory, string> = {
  urgent: "Urgent",
  reply_needed: "Reply Needed",
  newsletter: "Newsletter",
  cold_spam: "Cold / Spam",
  notification: "Notification",
  fyi: "FYI",
};

// Demo "today" is anchored so seeded timestamps always read as recent,
// regardless of when the deploy is viewed.
function daysAgo(days: number, hour: number, minute = 0): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,
      minute,
    ),
  );
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export const DEMO_EMAILS: DemoEmail[] = [
  // --- Urgent ---
  {
    id: "urgent-1",
    from: { name: "Priya Nair", email: "priya@northstarhq-customer.com" },
    subject: "Production outage impacting our checkout flow",
    preview: "We're seeing 500 errors on checkout since 9am. Can someone look at this urgently?",
    body: "Hi team, we're seeing 500 errors on our checkout flow since about 9am today. This is blocking real customer transactions. Can someone from your side jump on a call in the next 30 minutes? This is now our top priority incident.",
    date: daysAgo(0, 9, 12),
    category: "urgent",
    unread: true,
  },
  {
    id: "urgent-2",
    from: { name: "Marcus Reyes", email: "marcus@bluecrest-legal.com" },
    subject: "Contract signature needed before 5pm today",
    preview: "Legal needs the countersigned MSA before end of day or the renewal lapses.",
    body: "Hi, just a reminder that we need the countersigned MSA back before 5pm today, otherwise the renewal window closes and we'll need to restart the whole legal review next quarter. Let me know if you have questions on any of the redlines.",
    date: daysAgo(0, 8, 0),
    category: "urgent",
    unread: true,
  },
  {
    id: "urgent-3",
    from: { name: "Dana Whitfield", email: "dana@harborview-customer.com" },
    subject: "Escalation: renewal terms still unresolved",
    preview: "Procurement pauses tomorrow if we don't get final pricing today.",
    body: "Following up urgently — procurement is going to pause our renewal tomorrow morning if we don't have your final position on the multi-year discount by end of day. Can you confirm the numbers so I can get this over the line?",
    date: daysAgo(1, 16, 45),
    category: "urgent",
    unread: true,
  },

  // --- Reply needed ---
  {
    id: "reply-1",
    from: { name: "Sam Okafor", email: "sam@lighthouse-ventures.com" },
    subject: "Quick question on your Series A metrics",
    preview: "Could you send over updated MRR and churn numbers ahead of Thursday's meeting?",
    body: "Hey, ahead of Thursday's meeting could you send over your updated MRR, net revenue retention, and churn numbers? No rush before end of week, just want to review before we talk.",
    date: daysAgo(1, 11, 30),
    category: "reply_needed",
    unread: true,
  },
  {
    id: "reply-2",
    from: { name: "Jordan Blake", email: "jordan@fieldnote-customer.com" },
    subject: "Re: Pricing for the team plan",
    preview: "We're comparing you against two other vendors, can you clarify seat pricing?",
    body: "Thanks for the demo last week. We're comparing a couple of vendors right now — could you clarify how seat pricing works once we go above 25 users, and whether annual billing gets a discount?",
    date: daysAgo(2, 14, 5),
    category: "reply_needed",
    unread: true,
  },
  {
    id: "reply-3",
    from: { name: "Elena Kowalski", email: "elena@brightpath-recruiting.com" },
    subject: "Interview availability next week",
    preview: "Can you send over 3 time slots for the panel interview next week?",
    body: "Hi, the hiring panel would like to move forward with a follow-up interview. Could you send over three time slots that work for you next week? We'd like to wrap this stage up by Friday if possible.",
    date: daysAgo(2, 9, 0),
    category: "reply_needed",
    unread: false,
  },
  {
    id: "reply-4",
    from: { name: "Tomas Rivera", email: "tomas@customer-refunds.com" },
    subject: "Refund request for duplicate charge",
    preview: "I was charged twice for my annual plan, could you process a refund?",
    body: "Hi, I noticed I was charged twice for my annual subscription this month. Could you look into this and process a refund for the duplicate charge? Order confirmation numbers are 88213 and 88214.",
    date: daysAgo(3, 10, 20),
    category: "reply_needed",
    unread: true,
  },
  {
    id: "reply-5",
    from: { name: "Grace Lindqvist", email: "grace@partner-alliance.io" },
    subject: "Following up on co-marketing proposal",
    preview: "Wanted to check in on the joint webinar proposal from two weeks ago.",
    body: "Hi again, just wanted to follow up on the joint webinar proposal I sent over a couple of weeks back. Happy to hop on a call if it's easier to talk through details and pick a date.",
    date: daysAgo(4, 13, 15),
    category: "reply_needed",
    unread: false,
  },

  // --- Newsletters ---
  {
    id: "newsletter-1",
    from: { name: "Morning Brew", email: "crew@morningbrew.com" },
    subject: "☕ The AI arms race just got weirder",
    preview: "Today's markets, plus why every SaaS company suddenly has a chatbot.",
    body: "Good morning! Markets were mixed yesterday as investors digested the latest earnings reports. In tech news, another wave of startups announced AI copilots for... everything, apparently.",
    date: daysAgo(0, 7, 0),
    category: "newsletter",
    unread: true,
  },
  {
    id: "newsletter-2",
    from: { name: "Stratechery", email: "ben@stratechery.com" },
    subject: "Platforms, Aggregators, and the New Bottleneck",
    preview: "This week's essay on why distribution still beats product in most markets.",
    body: "This week I want to revisit the aggregation theory framework in light of recent shifts in how AI products are distributed. The bottleneck is moving, but the underlying dynamics remain familiar.",
    date: daysAgo(2, 6, 30),
    category: "newsletter",
    unread: false,
  },
  {
    id: "newsletter-3",
    from: { name: "TLDR Newsletter", email: "dan@tldrnewsletter.com" },
    subject: "TLDR: New model releases, a $200M seed round, and more",
    preview: "5-minute daily digest of what's happening in tech.",
    body: "Here's what you need to know today: a new frontier model launched with impressive benchmarks, a seed-stage startup raised an unusually large round, and a major cloud provider had a brief outage.",
    date: daysAgo(1, 6, 45),
    category: "newsletter",
    unread: true,
  },
  {
    id: "newsletter-4",
    from: { name: "Product Hunt Daily", email: "hello@producthunt.com" },
    subject: "Today's top products: 5 tools worth a look",
    preview: "See what's trending on Product Hunt today.",
    body: "Here are today's top launches on Product Hunt, including a new AI note-taking app, a developer productivity tool, and a design collaboration platform.",
    date: daysAgo(3, 8, 15),
    category: "newsletter",
    unread: false,
  },

  // --- Cold / spam ---
  {
    id: "cold-1",
    from: { name: "Ryan @ GrowthPeak SEO", email: "ryan@growthpeak-seo.net" },
    subject: "Noticed your site could rank higher",
    preview: "We help SaaS companies triple organic traffic in 90 days.",
    body: "Hi there, I took a look at your website and noticed a few quick SEO wins that could significantly boost your organic traffic. We've helped similar companies triple their traffic in 90 days. Want a free audit?",
    date: daysAgo(1, 15, 0),
    category: "cold_spam",
    unread: true,
  },
  {
    id: "cold-2",
    from: { name: "InstaBoost Team", email: "team@instaboost-growth.biz" },
    subject: "Get 10,000 followers this month",
    preview: "Grow your social presence fast with our automated growth service.",
    body: "Want to grow your Instagram following fast? Our automated growth service can get you 10,000+ real, targeted followers this month. Reply to get started with a free trial.",
    date: daysAgo(2, 12, 0),
    category: "cold_spam",
    unread: false,
  },
  {
    id: "cold-3",
    from: { name: "Talent Sourcing Bot", email: "noreply@masshiring-outreach.com" },
    subject: "We found 500 candidates for your open roles",
    preview: "Automated sourcing for your engineering openings, no commitment required.",
    body: "We noticed you have open engineering roles. Our platform automatically sourced 500 matching candidates. Book a demo this week to get free access to the full list.",
    date: daysAgo(3, 9, 30),
    category: "cold_spam",
    unread: false,
  },
  {
    id: "cold-4",
    from: { name: "CryptoYield Advisors", email: "invest@cryptoyield-returns.io" },
    subject: "12% guaranteed monthly returns",
    preview: "Limited slots available for our new investment pool.",
    body: "Our investment pool is currently offering 12% guaranteed monthly returns to early participants. Slots are limited — reply now to reserve your spot before the pool closes.",
    date: daysAgo(4, 11, 0),
    category: "cold_spam",
    unread: true,
  },

  // --- Notifications ---
  {
    id: "notif-1",
    from: { name: "GitHub", email: "notifications@github.com" },
    subject: "[org/repo] Review requested on PR #482",
    preview: "alex-dev requested your review on 'Fix rate limit retry logic'",
    body: "alex-dev requested your review on pull request #482: Fix rate limit retry logic. The PR has 3 commits and touches 5 files.",
    date: daysAgo(0, 10, 5),
    category: "notification",
    unread: true,
  },
  {
    id: "notif-2",
    from: { name: "Stripe", email: "notifications@stripe.com" },
    subject: "You received a payment of $1,200.00",
    preview: "Payment from Acme Customer Co. has been deposited.",
    body: "A payment of $1,200.00 from Acme Customer Co. has been successfully processed and will be deposited into your account within 2 business days.",
    date: daysAgo(1, 13, 40),
    category: "notification",
    unread: false,
  },
  {
    id: "notif-3",
    from: { name: "Google Calendar", email: "calendar-notification@google.com" },
    subject: "Reminder: Board meeting in 1 hour",
    preview: "Your event 'Q2 Board Meeting' starts at 2:00 PM.",
    body: "This is a reminder that 'Q2 Board Meeting' starts in 1 hour at 2:00 PM. Location: Zoom (link in original invite).",
    date: daysAgo(2, 13, 0),
    category: "notification",
    unread: false,
  },
  {
    id: "notif-4",
    from: { name: "Slack", email: "notifications@slack.com" },
    subject: "Daily digest: 14 unread messages across 3 channels",
    preview: "Catch up on what happened in #product, #eng, and #general.",
    body: "Here's your daily digest: 14 unread messages across #product, #eng, and #general. Highlights include a discussion on the upcoming release and a question about the API rate limits.",
    date: daysAgo(3, 18, 0),
    category: "notification",
    unread: false,
  },

  // --- FYI ---
  {
    id: "fyi-1",
    from: { name: "Wei Zhang", email: "wei@northstarhq.com" },
    subject: "Weekly eng update — no action needed",
    preview: "Shipped 3 features, fixed 2 bugs, on track for the Q3 roadmap.",
    body: "Quick weekly update from engineering: we shipped 3 features, fixed 2 bugs in production, and are on track for the Q3 roadmap milestones. No action needed, just keeping everyone in the loop.",
    date: daysAgo(2, 17, 0),
    category: "fyi",
    unread: false,
  },
  {
    id: "fyi-2",
    from: { name: "Billing", email: "billing@cloudhost-vendor.com" },
    subject: "Your invoice for June is ready",
    preview: "Invoice #4471 for $340.00 has been generated.",
    body: "Your invoice #4471 for $340.00 covering usage in June has been generated and is available in your billing portal. This is an automated receipt, no action is required.",
    date: daysAgo(5, 9, 0),
    category: "fyi",
    unread: false,
  },
  {
    id: "fyi-3",
    from: { name: "Nora Patel", email: "nora@northstarhq.com" },
    subject: "FYI: moved the design review to Friday",
    preview: "Just moving this to Friday 10am, no need to reply.",
    body: "Heads up — I moved the design review from Wednesday to Friday at 10am since a few people had conflicts. Calendar invite updated, no need to reply.",
    date: daysAgo(1, 16, 0),
    category: "fyi",
    unread: false,
  },
];
