import {
  DEMO_EMAILS,
  type DemoEmail,
  type DemoEmailCategory,
} from "@/utils/demo/inbox-data";

// Rough per-email triage time a user would otherwise spend reading, deciding,
// and acting on an email. Only categories the assistant can safely handle
// automatically (newsletters, cold/spam, routine notifications) count toward
// "time saved" — urgent and reply-needed emails still need a human.
const MINUTES_SAVED_PER_EMAIL: Partial<Record<DemoEmailCategory, number>> = {
  newsletter: 1.5,
  cold_spam: 1,
  notification: 0.5,
  fyi: 0.5,
};

export type DemoTopSender = {
  name: string;
  email: string;
  count: number;
};

export type DemoDashboardStats = {
  totalEmails: number;
  urgentCount: number;
  replyNeededCount: number;
  newsletterCount: number;
  coldSpamCount: number;
  notificationCount: number;
  timeSavedMinutes: number;
  topSenders: DemoTopSender[];
};

export function getDemoEmailsByCategory(
  category: DemoEmailCategory,
): DemoEmail[] {
  return DEMO_EMAILS.filter((email) => email.category === category);
}

export function getDemoDashboardStats(
  emails: DemoEmail[] = DEMO_EMAILS,
): DemoDashboardStats {
  const countFor = (category: DemoEmailCategory) =>
    emails.filter((email) => email.category === category).length;

  const timeSavedMinutes = emails.reduce((total, email) => {
    const minutes = MINUTES_SAVED_PER_EMAIL[email.category];
    return minutes ? total + minutes : total;
  }, 0);

  return {
    totalEmails: emails.length,
    urgentCount: countFor("urgent"),
    replyNeededCount: countFor("reply_needed"),
    newsletterCount: countFor("newsletter"),
    coldSpamCount: countFor("cold_spam"),
    notificationCount: countFor("notification"),
    timeSavedMinutes: Math.round(timeSavedMinutes * 10) / 10,
    topSenders: getTopSenders(emails),
  };
}

function getTopSenders(emails: DemoEmail[], limit = 5): DemoTopSender[] {
  const bySender = new Map<string, DemoTopSender>();

  for (const email of emails) {
    const existing = bySender.get(email.from.email);
    if (existing) {
      existing.count += 1;
    } else {
      bySender.set(email.from.email, {
        name: email.from.name,
        email: email.from.email,
        count: 1,
      });
    }
  }

  return [...bySender.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
