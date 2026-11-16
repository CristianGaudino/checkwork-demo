import { SITE_URL } from "@/lib/site";
import { formatPrice, carHref } from "@/lib/stock/format";
import type { LeadRow } from "./process";
import { EMPLOYMENT } from "./constants";
import { DETAIL_LABELS, TYPE_LABELS } from "./schema";
import { readable, topicSubject, type Answers } from "./contact-topics";

// The form stores keys and raw numbers; the dealer reads words and formatted figures.
function show(key: string, value: unknown): string {
  const v = String(value);
  if (key === "employment") return EMPLOYMENT[v as keyof typeof EMPLOYMENT] ?? v;
  if (key === "intent") return v === "sell" ? "Sell the car" : "Trade it in";
  if (key === "mileage") return `${Number(v).toLocaleString("en-IE")} km`;
  if (key === "budgetMax" || key === "deposit") return formatPrice(Number(v));
  return readable(key, v);
}

// Text only, no HTML: nothing the buyer typed can inject markup. The subject is built from server values only (D-02).
// photoPaths are the signed /lead-photos paths for row.photoKeys, made by processLead so this file never sees the secret.
export function buildLeadEmail(row: LeadRow, opts: { demo: boolean; photoPaths?: string[] }): { subject: string; text: string } {
  // A car to sell outright says so, so the dealer does not look for a car it is against.
  const guided = row.type === "general" ? topicSubject(row.details.topic as string | undefined, row.details as Answers) : undefined; // "Service: warning light, this week"
  const label = guided ?? (row.type === "trade_in" && row.details.intent === "sell" ? "Car to buy from a seller" : TYPE_LABELS[row.type]);
  const subject = `${opts.demo ? "[DEMO] " : ""}${label}${row.carTitle ? (guided ? ` (${row.carTitle})` : `: ${row.carTitle}`) : ""}`;
  const lines = [
    `Name: ${row.name}`,
    row.phone && `Phone: ${row.phone}`,
    row.email && `Email: ${row.email}`,
    ...Object.entries(DETAIL_LABELS).map(([k, label]) => row.details[k] !== undefined && `${label}: ${show(k, row.details[k])}`),
    row.message && `Message:\n${row.message}`,
    row.carTitle && `Car: ${row.carTitle}`,
    row.carPriceEur !== null && `Price: ${formatPrice(row.carPriceEur)}`,
    row.carSlug && `Car page: ${SITE_URL}${carHref(row.carSlug)}`,
    ...(opts.photoPaths ?? []).map((p, i) => `Photo ${i + 1}: ${SITE_URL}${p}`),
    `Sent from: ${SITE_URL}${row.sourcePath}`,
    `Consent: ${row.consentAt.toISOString()}, version ${row.consentVersion}`,
  ];
  return { subject, text: lines.filter(Boolean).join("\n\n") };
}
