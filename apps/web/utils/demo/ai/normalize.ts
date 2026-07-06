import type { DemoEmail } from "@/utils/demo/inbox-data";

// Canonical shape the shared AI core operates on. Demo seed emails map into
// this today; a real Gmail/Outlook `EmailProvider` message maps into the same
// shape later, so classify/reply/rule logic never needs to know which mode
// it's running in.
export type NormalizedEmail = {
  id: string;
  from: { name: string; email: string };
  to?: { name?: string; email: string }[];
  subject: string;
  body: string;
  snippet: string;
  date: string; // ISO 8601
  unread: boolean;
  labels?: string[];
};

export function fromDemoEmail(email: DemoEmail): NormalizedEmail {
  return {
    id: email.id,
    from: email.from,
    to: [],
    subject: email.subject,
    body: email.body,
    snippet: email.preview,
    date: email.date,
    unread: email.unread,
  };
}
