import type { RuleAction, RuleMatch } from "@/utils/demo/ai/schemas";

// Per-email deltas produced by applying a demo rule. The seed data is never
// mutated - the UI renders seed ⊕ overlay. This is the entire "apply" story
// for the public demo: no DB writes, no Gmail calls, just a client-side/
// sessionStorage projection.
export type DemoOverlayEntry = {
  archived?: boolean;
  read?: boolean;
  starred?: boolean;
  labels?: string[];
  followUp?: boolean;
  unsubscribed?: boolean;
  draftCreated?: boolean;
};

export type DemoOverlay = Record<string, DemoOverlayEntry>;

const OVERLAY_STORAGE_KEY = "smart-inbox-demo-overlay-v1";

export function applyRuleToOverlay(
  overlay: DemoOverlay,
  matches: RuleMatch[],
  actions: RuleAction[],
): DemoOverlay {
  const next: DemoOverlay = { ...overlay };

  for (const match of matches) {
    let entry = next[match.emailId] ?? {};
    for (const action of actions) {
      entry = applyActionToEntry(entry, action);
    }
    next[match.emailId] = entry;
  }

  return next;
}

export function readDemoOverlay(): DemoOverlay {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(OVERLAY_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isDemoOverlay(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeDemoOverlay(overlay: DemoOverlay): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(OVERLAY_STORAGE_KEY, JSON.stringify(overlay));
  } catch {
    // sessionStorage can throw (private browsing, quota) - the demo still
    // works this session, it just won't persist across a reload.
  }
}

export function clearDemoOverlay(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(OVERLAY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function applyActionToEntry(
  entry: DemoOverlayEntry,
  action: RuleAction,
): DemoOverlayEntry {
  switch (action.type) {
    case "archive":
      return { ...entry, archived: true };
    case "markRead":
      return { ...entry, read: true };
    case "star":
      return { ...entry, starred: true };
    case "followUp":
      return { ...entry, followUp: true };
    case "unsubscribe":
      return { ...entry, unsubscribed: true };
    case "draftReply":
      return { ...entry, draftCreated: true };
    case "label": {
      if (!action.label) return entry;
      const labels = entry.labels ?? [];
      if (labels.includes(action.label)) return entry;
      return { ...entry, labels: [...labels, action.label] };
    }
    default:
      return entry;
  }
}

function isDemoOverlay(value: unknown): value is DemoOverlay {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
