import {
  DESTRUCTIVE_RULE_ACTIONS,
  type ClassifiedDemoEmailInput,
  type ParsedRule,
  type RuleAction,
  type RuleCondition,
  type RulePreview,
} from "@/utils/demo/ai/schemas";

const LARGE_MATCH_SHARE = 0.5;

// Pure, dependency-free matcher: no AI, no I/O. Runs server-side in
// parse-rule.ts today, but has no reason it couldn't run client-side later -
// it only depends on its arguments.
export function evaluateRule(
  rule: ParsedRule,
  emails: ClassifiedDemoEmailInput[],
  now: Date = new Date(),
): RulePreview {
  const invalidCombos = new Set<string>();

  const matchedEmails = emails.filter((email) =>
    matchesRule(rule, email, now, invalidCombos),
  );

  const matches = matchedEmails.map((email) => ({
    emailId: email.id,
    from: email.from.email,
    subject: email.subject,
  }));

  return {
    matches,
    matchedCount: matches.length,
    totalCount: emails.length,
    actions: rule.actions,
    explanation: buildExplanation(rule, matches.length),
    warnings: buildWarnings({
      rule,
      matchedCount: matches.length,
      totalCount: emails.length,
      invalidCombos,
    }),
  };
}

function matchesRule(
  rule: ParsedRule,
  email: ClassifiedDemoEmailInput,
  now: Date,
  invalidCombos: Set<string>,
): boolean {
  const results = rule.conditions.map((condition) =>
    matchesCondition(condition, email, now, invalidCombos),
  );

  return rule.match === "any" ? results.some(Boolean) : results.every(Boolean);
}

function matchesCondition(
  condition: RuleCondition,
  email: ClassifiedDemoEmailInput,
  now: Date,
  invalidCombos: Set<string>,
): boolean {
  const { field, operator, value } = condition;

  switch (field) {
    case "sender_email":
      return matchesText(email.from.email, operator, value, invalidCombos, field);
    case "sender_domain":
      return matchesText(
        getDomain(email.from.email),
        operator,
        value,
        invalidCombos,
        field,
      );
    case "subject":
      return matchesText(email.subject, operator, value, invalidCombos, field);
    case "body":
      return matchesText(email.body, operator, value, invalidCombos, field);
    case "category":
      return matchesSet([email.category], operator, value, invalidCombos, field);
    case "priority":
      return matchesSet([email.priority], operator, value, invalidCombos, field);
    case "unread":
      return matchesBoolean(email.unread, operator, invalidCombos, field);
    case "date":
      return matchesDate(email.date, operator, value, now, invalidCombos, field);
    default:
      return false;
  }
}

function matchesText(
  fieldValue: string,
  operator: RuleCondition["operator"],
  value: RuleCondition["value"],
  invalidCombos: Set<string>,
  field: RuleCondition["field"],
): boolean {
  if (typeof value !== "string") {
    invalidCombos.add(`${field} ${operator}`);
    return false;
  }

  const haystack = fieldValue.toLowerCase();
  const needle = value.toLowerCase();

  switch (operator) {
    case "equals":
      return haystack === needle;
    case "contains":
      return haystack.includes(needle);
    case "startsWith":
      return haystack.startsWith(needle);
    case "endsWith":
      return haystack.endsWith(needle);
    default:
      invalidCombos.add(`${field} ${operator}`);
      return false;
  }
}

function matchesSet(
  fieldValues: string[],
  operator: RuleCondition["operator"],
  value: RuleCondition["value"],
  invalidCombos: Set<string>,
  field: RuleCondition["field"],
): boolean {
  const candidates = (Array.isArray(value) ? value : [value])
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.toLowerCase());

  if (candidates.length === 0) {
    invalidCombos.add(`${field} ${operator}`);
    return false;
  }

  if (operator !== "in" && operator !== "equals") {
    invalidCombos.add(`${field} ${operator}`);
    return false;
  }

  const values = fieldValues.map((v) => v.toLowerCase());
  return values.some((v) => candidates.includes(v));
}

function matchesBoolean(
  fieldValue: boolean,
  operator: RuleCondition["operator"],
  invalidCombos: Set<string>,
  field: RuleCondition["field"],
): boolean {
  if (operator === "isTrue") return fieldValue === true;
  if (operator === "isFalse") return fieldValue === false;
  invalidCombos.add(`${field} ${operator}`);
  return false;
}

function matchesDate(
  dateValue: string,
  operator: RuleCondition["operator"],
  value: RuleCondition["value"],
  now: Date,
  invalidCombos: Set<string>,
  field: RuleCondition["field"],
): boolean {
  if (typeof value !== "number") {
    invalidCombos.add(`${field} ${operator}`);
    return false;
  }

  const ageInDays =
    (now.getTime() - new Date(dateValue).getTime()) / (1000 * 60 * 60 * 24);

  if (operator === "olderThanDays") return ageInDays > value;
  if (operator === "newerThanDays") return ageInDays < value;

  invalidCombos.add(`${field} ${operator}`);
  return false;
}

function getDomain(email: string): string {
  return email.slice(email.indexOf("@") + 1);
}

const ACTION_VERB: Record<RuleAction["type"], string> = {
  archive: "Archives",
  label: "Labels",
  markRead: "Marks as read",
  star: "Stars",
  followUp: "Creates a follow-up for",
  draftReply: "Drafts a reply for",
  unsubscribe: "Unsubscribes from",
};

// Exported for reuse by the rule builder UI (rendering condition/action
// chips) so the "how do we describe this in English" logic lives in one
// place, not once here and once in the client component.
export function describeAction(action: RuleAction): string {
  if (action.type === "label") {
    return action.label
      ? `Labels as "${action.label}"`
      : "Labels (no label name given)";
  }
  return ACTION_VERB[action.type];
}

export function describeCondition(
  condition: RuleCondition,
  isPlural: boolean,
): string {
  const { field, operator, value } = condition;
  const be = isPlural ? "are" : "is";

  if (field === "unread") {
    return operator === "isTrue" ? `${be} unread` : `${be} read`;
  }
  if (field === "date") {
    const days = typeof value === "number" ? value : "?";
    return operator === "olderThanDays"
      ? `${be} older than ${days} days`
      : `${be} newer than ${days} days`;
  }
  if (field === "category" || field === "priority") {
    const values = Array.isArray(value) ? value : [value];
    const label = field === "category" ? "categorized as" : "priority";
    return `${be} ${label} ${values.join(" or ")}`;
  }

  const fieldLabel = field.replace("_", " ");
  const opLabel = TEXT_OPERATOR_LABEL[operator] ?? operator;
  return `${fieldLabel} ${opLabel} "${value}"`;
}

const TEXT_OPERATOR_LABEL: Partial<Record<RuleCondition["operator"], string>> = {
  equals: "is",
  contains: "contains",
  startsWith: "starts with",
  endsWith: "ends with",
};

function buildExplanation(rule: ParsedRule, matchedCount: number): string {
  const isPlural = matchedCount !== 1;
  const actionText = rule.actions.map(describeAction).join(" and ");
  const conditionText = rule.conditions
    .map((condition) => describeCondition(condition, isPlural))
    .join(rule.match === "any" ? " or " : " and ");
  const emailWord = isPlural ? "emails" : "email";

  return `${actionText} ${matchedCount} ${emailWord} that ${conditionText}.`;
}

function buildWarnings({
  rule,
  matchedCount,
  totalCount,
  invalidCombos,
}: {
  rule: ParsedRule;
  matchedCount: number;
  totalCount: number;
  invalidCombos: Set<string>;
}): string[] {
  const warnings: string[] = [];

  const destructiveActions = rule.actions.filter((action) =>
    DESTRUCTIVE_RULE_ACTIONS.includes(action.type),
  );
  for (const action of destructiveActions) {
    const verb = action.type === "archive" ? "archive" : "unsubscribe from";
    warnings.push(
      `This will ${verb} ${matchedCount} ${matchedCount === 1 ? "email" : "emails"}. In a real inbox, this is hard to undo.`,
    );
  }

  if (matchedCount === 0) {
    warnings.push("This rule doesn't match any emails in the sample inbox.");
  } else if (totalCount > 0 && matchedCount / totalCount >= LARGE_MATCH_SHARE) {
    warnings.push(
      `Matches ${matchedCount} of ${totalCount} emails — a large share of the inbox. Double-check the conditions.`,
    );
  }

  const missingLabel = rule.actions.some(
    (action) => action.type === "label" && !action.label,
  );
  if (missingLabel) {
    warnings.push("The label action is missing a label name.");
  }

  for (const combo of invalidCombos) {
    warnings.push(`Ignored an unsupported condition: ${combo}.`);
  }

  return warnings;
}
