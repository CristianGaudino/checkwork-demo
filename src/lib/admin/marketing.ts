import { carName } from "@/lib/stock/format";
import { priceInfo } from "@/lib/stock/price";
import { FUEL_LABELS, GEARBOX_LABELS, type Car } from "@/lib/stock/types";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { DealerSettings, Network } from "./collections";

// The writers for posts and newsletters. Plain templates over the car's own facts and the dealer's voice settings: the same car and
// settings always give the same text, and nothing is invented (no claims, no offers). The dealer edits the text before it goes anywhere.
type Voice = DealerSettings["marketing"];

const facts = (c: Car) => [c.mileageKm !== undefined && `${c.mileageKm.toLocaleString("en-IE")} km`, c.fuel && FUEL_LABELS[c.fuel], c.gearbox && GEARBOX_LABELS[c.gearbox]].filter(Boolean).join(", ");
const priceText = (c: Car) => {
  const p = priceInfo(c);
  return [p.headline, p.vatLine].filter(Boolean).join(" ");
};

export function writePost(car: Car, network: Network, voice: Voice): string {
  const head = `Just in: ${carName(car)}${car.variant ? ` ${car.variant}` : ""}.`;
  const line = [facts(car), priceText(car)].filter(Boolean).join(". ");
  const link = network === "Instagram" || network === "TikTok" ? "Link in bio." : `${SITE_URL}/used-cars/${car.slug}`;
  const tags = voice.hashtags.trim();
  // TikTok captions stay short: no sign-off line.
  const parts = network === "TikTok" ? [head, line, tags] : [head, line, voice.signOff.trim(), link, network === "Instagram" ? tags : ""];
  return parts.filter(Boolean).join("\n");
}

export function writeNewsletter(cars: Car[], voice: Voice): { subject: string; body: string } {
  const list = cars.map((c) => `- ${carName(c)}, ${priceText(c)}. ${SITE_URL}/used-cars/${c.slug}`);
  return {
    subject: cars.length ? `New arrivals at ${SITE_NAME}` : `News from ${SITE_NAME}`,
    body: [cars.length ? "New in this week:" : "", ...list, "", voice.signOff.trim()].filter((l, i, a) => l !== "" || (i > 0 && a[i - 1] !== "")).join("\n").trim(),
  };
}

// What a send or a publish returns. A service that is not connected is a message, never a thrown error and never a pretend success.
export type SendResult = { ok: true; simulated?: boolean } | { ok: false; reason: "not-connected" | "not-installed" };

// The figures a simulated send reports, so the lists and analytics have something to show. Worked out from the record's id, so a
// record always gets the same figures and nothing about a real audience is claimed. Real adapters replace these with the provider's own.
const spread = (id: string, mod: number) => [...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 100003, 7) % mod;
export const simulatedPost = (id: string) => ({ reach: 380 + spread(id, 900), clicks: 14 + spread(id + "c", 60) });
export const simulatedAd = (id: string) => ({ impressions: 2400 + spread(id, 6000), clicks: 40 + spread(id + "c", 160), leads: 1 + spread(id + "l", 7) });
export const simulatedLetter = (id: string, subscribers: number) => ({ recipients: subscribers, opens: Math.round(subscribers * (0.38 + spread(id, 12) / 100)), clicks: Math.round(subscribers * (0.05 + spread(id + "c", 6) / 100)) });
