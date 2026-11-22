import { z } from "zod";
import { CONDITIONS, FUELS, GEARBOXES } from "@/lib/stock/types";
import { CAR_ID, JOURNEY_CAPS, SLUG } from "@/lib/visit-note";
import { PRICE_BANDS } from "@/lib/visit-rules";

// The visit note a buyer chose to share with an enquiry (#249): the site API's `journey` field, v1 (checkwork-dash#34). Fixed values and
// capped whole numbers only, so nothing typed, no URL and nothing about the device can ride along. Strict: an unknown key fails it.
const slug = z.string().regex(SLUG);
const upTo = (max: number) => z.int().min(0).max(max);

export const journeySchema = z.strictObject({
  v: z.literal(1),
  minutes: upTo(JOURNEY_CAPS.minutes),
  cars: z.array(z.strictObject({ id: z.string().regex(CAR_ID), views: z.int().min(1).max(JOURNEY_CAPS.views) })).max(JOURNEY_CAPS.cars),
  searches: z
    .array(
      z.strictObject({
        make: slug.optional(),
        model: slug.optional(),
        body: slug.optional(),
        fuel: z.enum(FUELS).optional(),
        gearbox: z.enum(GEARBOXES).optional(),
        priceBand: z.enum(PRICE_BANDS).optional(),
        condition: z.enum(CONDITIONS).optional(),
      }),
    )
    .max(JOURNEY_CAPS.searches),
  tools: z.strictObject({
    finance: z.strictObject({ monthlyEur: upTo(JOURNEY_CAPS.monthlyEur).optional() }).optional(),
    tradeIn: z.boolean().optional(),
    saved: upTo(JOURNEY_CAPS.count).optional(),
    compared: upTo(JOURNEY_CAPS.count).optional(),
  }),
});
export type Journey = z.infer<typeof journeySchema>;
export type JourneySearch = Journey["searches"][number];

// The form's `journey` field: a contract-valid note of at most 4 KB, or null. A bad one is dropped and the lead still goes: the note is
// extra help for the dealer, never a reason to lose an enquiry.
export function parseJourney(v: FormDataEntryValue | null): Journey | null {
  if (typeof v !== "string" || new TextEncoder().encode(v).length > JOURNEY_CAPS.bytes) return null;
  try {
    const r = journeySchema.safeParse(JSON.parse(v));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
