import { z } from "zod";
import { FINANCE } from "@/lib/finance/finance.config";
import { PRICE_STOPS } from "@/lib/stock/types";
import { BAD_DRIVE_DAY, BAD_DRIVE_TIME, BAD_KM, driveDays, driveTimes, phoneError, BAD_REG, CONTACT_ERROR, EMPLOYMENT, KM_PATTERN, LIMITS, REG_PATTERN, SOURCING_BODIES, SOURCING_CAR_ERROR } from "./constants";
import { DAY } from "../time";
import { regPeriods } from "./reg-periods";
import { dublinDay, dublinMs } from "@/lib/admin/format";
import { CHOICES, TOPIC_IDS } from "./contact-topics";
import { CHANNELS, CHANNEL_LABELS } from "@/lib/visit-rules";

// The lead validation, run on the server. Client components import ./constants, never this file (it brings zod).

// One line only: a line break in a name or car text could pass for a new field (a fake "Phone:" line) in the dealer's plain-text email.
const oneLine = (s: z.ZodString) => s.regex(/^[^\r\n\u2028\u2029]*$/, "Keep this to one line.");
const tooLong = (n: number) => `Use ${n} characters or fewer.`;
// An empty or blank field counts as not given.
const given = <T extends z.ZodType>(s: T) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), s);

const contact = {
  clientRef: z.uuid(),
  sourcePath: z.string().regex(/^\/[A-Za-z0-9._~\-/]{0,200}$/),
  // Where the visit came from (src/lib/visit-rules.ts), stored as its label. Anything unknown is dropped, never an error for the buyer.
  channel: z.enum(CHANNELS).transform((c) => CHANNEL_LABELS[c]).optional().catch(undefined),
  name: given(oneLine(z.string({ error: "Enter your name." }).trim().max(LIMITS.name, tooLong(LIMITS.name)))),
  // Loose on purpose (digits, spaces, plus, hyphens and brackets), but a +353 number must be the right length for Ireland.
  phone: given(
    z
      .string()
      .trim()
      .max(LIMITS.phone, tooLong(LIMITS.phone))
      .superRefine((v, ctx) => {
        const message = phoneError(v);
        if (message) ctx.addIssue({ code: "custom", message });
      })
      .optional(),
  ),
  email: given(z.email({ error: "Enter an email like name@example.com." }).max(LIMITS.email, tooLong(LIMITS.email)).optional()),
  message: given(z.string().max(LIMITS.message, tooLong(LIMITS.message)).optional()),
  consent: z.literal("yes", { error: "Tick the box to send your request." }),
  // Optional agreement to updates on WhatsApp, only ever "yes".
  whatsappOptIn: given(z.literal("yes").optional()),
};

// A general enquiry from /contact, /service or /warranty (#58, #176). The guided form sends a topic and tap answers; the old free-text
// path (no topic) still passes, and then the message is required. The page it came from is the sourcePath.
const choice = (values: readonly string[]) => given(z.enum(values as [string, ...string[]], { error: "Choose one of the options." }).optional());
const general = {
  topic: choice(TOPIC_IDS),
  timing: choice(CHOICES.timing.map((o) => o.value)),
  hasTradeIn: choice(CHOICES.hasTradeIn.map((o) => o.value)),
  serviceNeed: choice(CHOICES.serviceNeed.map((o) => o.value)),
  boughtWhen: choice(CHOICES.boughtWhen.map((o) => o.value)),
  concern: choice(CHOICES.concern.map((o) => o.value)),
  urgency: choice(CHOICES.urgency.map((o) => o.value)),
  contactVia: choice(CHOICES.contactVia.map((o) => o.value)),
  contactWhen: choice(CHOICES.contactWhen.map((o) => o.value)),
  carId: given(z.string().regex(/^\d{1,12}$/).optional()),
  reg: given(z.string({ error: BAD_REG }).trim().toUpperCase().regex(REG_PATTERN, BAD_REG).optional()),
  message: given(z.string().trim().max(LIMITS.message, tooLong(LIMITS.message)).optional()),
};
// Only "Something else", or no topic at all, has nothing but the message to say what is wanted.
const needsMessage = (d: { topic?: string; message?: string }) => Boolean(d.message) || (d.topic !== undefined && d.topic !== "other");

const carId = z.string().regex(/^\d{1,12}$/);

const carText = {
  make: given(oneLine(z.string().trim().max(60, tooLong(60))).optional()),
  model: given(oneLine(z.string().trim().max(60, tooLong(60))).optional()),
};
// No carId key on the car-less types, so a forged one is dropped and snapshotCar stores no car (T-03-27).
const sourcing = {
  ...carText,
  bodyType: given(z.enum(SOURCING_BODIES, { error: "Choose a type from the list." }).optional()),
  budgetMax: given(
    z
      .string()
      .refine((v) => PRICE_STOPS.slice(1).includes(Number(v)), "Choose a budget on the slider.") // the slider's steps (PriceRange)
      .transform(Number)
      .optional(),
  ),
  message: given(z.string({ error: "Tell us what you're looking for." }).trim().max(LIMITS.message, tooLong(LIMITS.message))),
};

// A new car ordered from the factory (our stock only: /new-cars/order). The make and model are needed; the spec is free text; the period is
// one the dealer can order for (reg-periods.ts), checked against today, so a stale form cannot ask for one that has passed.
const order = {
  make: given(oneLine(z.string({ error: "Choose a make." }).trim().min(1, "Choose a make.").max(60, tooLong(60)))),
  model: given(oneLine(z.string({ error: "Enter the model." }).trim().min(1, "Enter the model.").max(60, tooLong(60)))),
  spec: given(oneLine(z.string().trim().max(120, tooLong(120))).optional()),
  regPeriod: given(z.string({ error: "Choose when you'd like it." }).refine((v) => regPeriods(dublinDay()).includes(v), "Choose when you'd like it.")),
  message: given(z.string().trim().max(LIMITS.message, tooLong(LIMITS.message)).optional()),
};

// D-14: plain fields, no reg lookup. Commas in the mileage are stripped; the year is the car's, so up to next year.
const nextYear = () => new Date().getUTCFullYear() + 1;
// Selling outright or trading in: one form for both doors (/sell-your-car and /trade-in). A chosen car of ours makes it a trade-in, so
// the dealer sees what it is against; choosing one is never required, so a valuation without one is still a lead.
const TRADE_INTENTS = ["sell", "trade"] as const;
const tradeIn = {
  carId: given(carId.optional()),
  intent: given(z.enum(TRADE_INTENTS).optional()),
  reg: given(z.string({ error: BAD_REG }).trim().toUpperCase().regex(REG_PATTERN, BAD_REG)),
  mileage: given(
    z
      .string({ error: BAD_KM })
      .transform((v) => v.replaceAll(",", "").trim())
      .pipe(z.string().regex(KM_PATTERN, BAD_KM))
      .transform(Number),
  ),
  ...carText,
  year: given(
    z
      .string()
      .regex(/^\d{4}$/, "Enter the year as 4 digits.")
      .transform(Number)
      .refine((y) => y >= 1900 && y <= nextYear(), { error: () => `Enter a year from 1900 to ${nextYear()}.` })
      .optional(),
  ),
};

// D-17: deposit, term and employment. An application is made from a car page, which sends the car's id; the price comes from the car.
// With PCP on, the type of finance too (none is hire purchase, as before), and a PCP term must be one PCP offers.
const BAD_DEPOSIT = "Enter the deposit in euros, numbers only.";
const finance = {
  carId: given(carId.optional()),
  deposit: given(
    z
      .string({ error: BAD_DEPOSIT })
      .transform((v) => v.replaceAll(",", "").trim())
      .pipe(z.string().regex(/^\d{1,6}$/, BAD_DEPOSIT))
      .transform(Number)
      .refine((n) => n <= 250000, BAD_DEPOSIT),
  ),
  product: given(z.enum(FINANCE.pcp ? ["hp", "pcp"] : ["hp"], { error: "Choose a type of finance." }).optional()),
  term: given(z.enum([...new Set([...FINANCE.terms, ...(FINANCE.pcp?.terms ?? [])])].map(String) as [string, ...string[]], { error: "Choose a term from the list." }).transform(Number)),
  employment: given(z.enum(Object.keys(EMPLOYMENT) as [keyof typeof EMPLOYMENT], { error: "Choose an employment status." })),
};

// A booking: the car, a day and a time that are really open (from the opening hours), then contact details.
// Checked from a day earlier, so a form opened before midnight Irish time still sends its "tomorrow" after midnight; the time must not
// have passed, so that day's grace never books a slot that is already over.
const testDrive = {
  carId,
  driveDate: given(z.string({ error: BAD_DRIVE_DAY }).refine((v) => driveDays().includes(v) || driveDays(new Date(Date.now() - DAY)).includes(v), BAD_DRIVE_DAY)),
  driveTime: given(z.string({ error: BAD_DRIVE_TIME })),
};

// A stock alert: an email is all it takes. It may name a car (back in stock, price drop) or none (any new arrival).
export const ALERT_KINDS = ["back-in-stock", "price-drop", "new-arrival"] as const;
const alert = {
  email: given(z.email({ error: "Enter an email like name@example.com." }).max(LIMITS.email, tooLong(LIMITS.email))),
  name: given(oneLine(z.string().trim().max(LIMITS.name, tooLong(LIMITS.name))).optional()),
  carId: given(carId.optional()),
  alertKind: z.enum(ALERT_KINDS, { error: "Choose an alert." }),
};

export const leadSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("enquiry"), carId, ...contact }),
    // At least one of make, model and type, so there is something to look for. `when` runs it even if another field failed.
    z
      .object({ type: z.literal("sourcing"), ...contact, ...sourcing })
      .refine((d) => Boolean(d.make || d.model || d.bodyType), { path: ["make"], message: SOURCING_CAR_ERROR, when: (p) => typeof p.value === "object" && p.value !== null }),
    z
      .object({ type: z.literal("general"), ...contact, ...general })
      .refine(needsMessage, { path: ["message"], message: "Tell us how we can help.", when: (p) => typeof p.value === "object" && p.value !== null }),
    z.object({ type: z.literal("order"), ...contact, ...order }),
    z.object({ type: z.literal("trade_in"), ...contact, ...tradeIn }),
    z
      .object({ type: z.literal("finance"), ...contact, ...finance })
      .refine((d) => typeof d.term !== "number" || Boolean((d.product === "pcp" ? FINANCE.pcp?.terms : FINANCE.terms)?.includes(d.term)), { path: ["term"], message: "Choose a term from the list.", when: (p) => typeof p.value === "object" && p.value !== null }),
    z.object({ type: z.literal("test_drive"), ...contact, ...testDrive }).refine((d) => driveTimes(d.driveDate ?? "").includes(d.driveTime ?? "") && dublinMs(d.driveDate ?? "", d.driveTime ?? "") > Date.now(), { path: ["driveTime"], message: BAD_DRIVE_TIME, when: (p) => typeof p.value === "object" && p.value !== null }),
    z.object({ type: z.literal("alert"), ...contact, ...alert }),
  ])
  // D-12. `when` runs it even if another field failed, so a blank form shows every error at once.
  .refine((d) => Boolean(d.phone || d.email), {
    path: ["email"],
    message: CONTACT_ERROR,
    when: (p) => typeof p.value === "object" && p.value !== null,
  });

export type LeadInput = z.infer<typeof leadSchema>;
export type LeadType = LeadInput["type"];

// Email subject words (D-02).
export const TYPE_LABELS: Record<LeadType, string> = {
  enquiry: "Enquiry",
  sourcing: "Find a car request",
  trade_in: "Trade-in valuation", // never the reg: nothing the buyer typed reaches a subject (T-03-29)
  finance: "Finance application",
  test_drive: "Test drive booking",
  alert: "Stock alert sign-up",
  general: "Message from the website",
  order: "New car order",
};
// Detail key to email label, in the order the email lists them; a new type's fields need only a line here.
export const DETAIL_LABELS: Record<string, string> = {
  topic: "About",
  timing: "Hoping to buy",
  hasTradeIn: "Car to trade in",
  serviceNeed: "Needs",
  boughtWhen: "Bought",
  concern: "Concern",
  urgency: "How soon",
  intent: "Wants to",
  reg: "Registration",
  mileage: "Mileage",
  make: "Make",
  model: "Model",
  bodyType: "Type of car",
  spec: "Spec",
  regPeriod: "Registration period",
  year: "Year",
  budgetMax: "Budget up to",
  product: "Finance",
  deposit: "Deposit",
  term: "Term (months)",
  employment: "Employment status",
  driveDate: "Day",
  driveTime: "Time",
  alertKind: "Alert",
  contactVia: "Reach by",
  contactWhen: "Best time",
  whatsappOptIn: "WhatsApp updates",
  channel: "Came from",
};
