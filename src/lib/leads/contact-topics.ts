import type { ModuleId } from "@/lib/modules-rules";

// The guided contact form (#176): what the buyer needs, a few taps about it, how to reach them. No zod here: the form imports this file,
// and schema.ts, the dealer's email and the leads list read the same words.

// `module`: the card shows only with that module on; without it, that need goes to "Something else".
export const TOPICS = [
  { id: "buying", label: "Buying a car", subject: "Buying" },
  { id: "selling", label: "Selling or trading in my car", subject: "Selling", module: "tradeIn" },
  { id: "finance", label: "Finance", subject: "Finance", module: "finance" },
  { id: "service", label: "Service or repair", subject: "Service", module: "service" },
  { id: "bought", label: "A car I bought from you", subject: "Aftersales" },
  { id: "other", label: "Something else", subject: "Message" },
] as const satisfies readonly { id: string; label: string; subject: string; module?: ModuleId }[];
export type TopicId = (typeof TOPICS)[number]["id"];
export const TOPIC_IDS = TOPICS.map((t) => t.id) as [TopicId, ...TopicId[]];

type Opt = { value: string; label: string };
const opts = (...pairs: string[][]): Opt[] => pairs.map(([value, label]) => ({ value, label }));

// The tap questions, by the key they are stored under.
export const CHOICES = {
  timing: opts(["this-week", "This week"], ["this-month", "This month"], ["looking", "Just looking"]),
  hasTradeIn: opts(["yes", "Yes"], ["no", "No"]),
  serviceNeed: opts(["service-due", "Service due"], ["warning-light", "Warning light"], ["noise", "A noise"], ["tyres", "Tyres"], ["nct", "NCT check"], ["other", "Something else"]),
  boughtWhen: opts(["month", "In the last month"], ["half-year", "1 to 6 months ago"], ["year", "6 to 12 months ago"], ["older", "Over a year ago"]),
  concern: opts(["fault", "A fault"], ["paperwork", "Paperwork"], ["warranty", "Warranty"], ["other", "Something else"]),
  urgency: opts(["cant-drive", "Can't be driven"], ["this-week", "This week"], ["next-week", "Next week"], ["no-rush", "No rush"]),
  contactVia: opts(["call", "Call me"], ["whatsapp", "WhatsApp"], ["email", "Write to me"]),
  contactWhen: opts(["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"]),
} as const;
export type ChoiceKey = keyof typeof CHOICES;
// Which urgency answers each topic offers.
export const URGENCY_FOR: Record<"service" | "bought", string[]> = { service: ["this-week", "next-week", "no-rush"], bought: ["cant-drive", "this-week", "no-rush"] };

// The answers stored on a lead, besides the topic: what the dashboard shows as tags.
export const ANSWER_KEYS = ["timing", "hasTradeIn", "serviceNeed", "boughtWhen", "concern", "urgency", "reg", "contactVia", "contactWhen"] as const;
export type Answers = Partial<Record<(typeof ANSWER_KEYS)[number], string>>;

const word = (key: ChoiceKey, v: string | undefined) => CHOICES[key].find((o) => o.value === v)?.label;
// "Can't be driven" reads as "can't be driven" in a line, but "NCT check" keeps its capitals.
const plain = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.toLowerCase());

// The words for a stored value, for the dealer's email and the lead's text.
export function readable(key: string, value: string): string {
  if (key === "topic") return TOPICS.find((t) => t.id === value)?.label ?? value;
  if (key === "whatsappOptIn") return "Yes";
  return key in CHOICES ? (word(key as ChoiceKey, value) ?? value) : value;
}

// What the lead is about, short: "Buying", "this week", "trade-in". Never the registration or any contact detail.
export function topicBits(a: Answers): string[] {
  const bits = [
    word("serviceNeed", a.serviceNeed),
    word("concern", a.concern),
    word("timing", a.timing),
    word("urgency", a.urgency),
    a.hasTradeIn === "yes" ? "Trade-in" : undefined,
  ].filter((s): s is string => Boolean(s));
  return bits.map(plain);
}
export const leadTags = (topic: string | undefined, a: Answers): string[] => (topic ? [TOPICS.find((t) => t.id === topic)?.subject ?? topic, ...topicBits(a)] : []);
// "Service: warning light, this week": the dealer's email subject.
export const topicSubject = (topic: string | undefined, a: Answers): string | undefined => {
  const t = TOPICS.find((x) => x.id === topic);
  return t && [t.subject, topicBits(a).join(", ")].filter(Boolean).join(": ");
};
// Answered "can't be driven" or "this week": to be answered first.
export const isUrgent = (a: Answers) => a.urgency === "cant-drive" || a.urgency === "this-week" || a.timing === "this-week";
