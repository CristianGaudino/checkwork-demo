"use client";

import { LIMITS, PHOTO_MIN_COUNT, PHOTO_MIN_ERROR, PHOTO_SLOTS } from "@/lib/leads/constants";
import { ContactFields, Field, tidyOnBlur } from "./Field";
import { tidyKm, tidyReg } from "@/lib/reg";
import type { FieldBinding, FormStep, PhotoBinding } from "./LeadForm";
import { PhotoPicker } from "./PhotoPicker";
import { RegLookup } from "./RegLookup";

// The trade-in is four short steps. What is typed is checked with the server's own rules (LeadForm runs validate.ts for the step's fields);
// the photos are the one thing the rules cannot see in the typed values, so their count is checked here, with the server's number.
// Sell your car: these four. Trade-in: the car you want first, then the same four (TRADE_STEPS).
export const TRADE_IN_STEPS: FormStep[] = [
  { title: "Your car", fields: ["reg", "mileage", "make", "model", "year"] },
  { title: "Condition", fields: ["message"] },
  { title: "Photos", fields: ["photos"], check: ({ photos }) => (photos < PHOTO_MIN_COUNT ? { photos: [PHOTO_MIN_ERROR] } : undefined) },
  { title: "Your details", fields: ["carId", "name", "phone", "email", "consent"] },
];
export const TRADE_STEPS: FormStep[] = [{ title: "The car you want", fields: ["carId"] }, ...TRADE_IN_STEPS.map((st, i) => (i === 3 ? { ...st, fields: st.fields.filter((f) => f !== "carId") } : st))];

export type TradeMode = "sell" | "trade";
// The cars a valuation can be against: in stock, newest first, as [id, name]. "Not chosen yet" keeps it optional.
const carOptions = (cars: [string, string][]) => [{ value: "", label: "Not chosen yet" }, ...cars.map(([value, label]) => ({ value, label }))];

const GUIDE_NOTES = ["Warning lights or faults", "Accident or body damage", "Service history and NCT", "Number of owners"];

// Every step stays in the form (hidden, not removed) so the send reads all of it; only the current one shows.
export function TradeInFields({ bind, photos, step, mode = "sell", cars = [] }: { bind(name: string): FieldBinding; photos: PhotoBinding; step: number; mode?: TradeMode; cars?: [string, string][] }) {
  const at = mode === "trade" ? 1 : 0; // a trade-in has the car you want as its first step
  return (
    <>
      <input type="hidden" name="intent" value={mode} />
      {mode === "trade" && (
        <div hidden={step !== 0} className="flex flex-col gap-4">
          <p className="text-body text-text-2">Which of our cars are you thinking of? Not sure yet is fine, we can value yours first.</p>
          <Field {...bind("carId")} label="The car you want" optional options={carOptions(cars)} />
        </div>
      )}
      <div hidden={step !== at} className="flex flex-col gap-4">
        <p className="text-body text-text-2">Start with the registration and the mileage. The rest helps us value it but you can leave it out.</p>
        {/* The lookup fills make, model and year from the registration, only where they are still empty. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
          <div className="min-w-0 flex-1">
            <Field
              {...bind("reg")}
              onBlur={tidyOnBlur(bind("reg"), tidyReg)}
              label="Registration"
              required
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={12}
              placeholder="191-KY-1234"
              enterKeyHint="next"
            />
          </div>
          <RegLookup
            reg={bind("reg").value}
            className="h-12 sm:mt-6 sm:w-44"
            onFound={({ year, car }) => {
              const fill = (name: string, v: string | number | undefined) => {
                const b = bind(name);
                if (v !== undefined && !b.value) b.onChange(String(v));
              };
              fill("year", year);
              fill("make", car?.make);
              fill("model", car?.model);
            }}
          />
        </div>
        <Field {...bind("mileage")} onBlur={tidyOnBlur(bind("mileage"), tidyKm)} label="Mileage" required inputMode="numeric" suffix="km" maxLength={9} enterKeyHint="next" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field {...bind("make")} label="Make" optional maxLength={60} enterKeyHint="next" />
          <Field {...bind("model")} label="Model" optional maxLength={60} enterKeyHint="next" />
          <Field {...bind("year")} label="Year" optional inputMode="numeric" maxLength={4} enterKeyHint="next" />
        </div>
      </div>

      <div hidden={step !== at + 1} className="flex flex-col gap-4">
        <p className="text-body text-text-2">Tell us how the car really is. A valuation can change when we see it.</p>
        <ul className="flex flex-col gap-1 text-meta">
          {GUIDE_NOTES.map((n) => (
            <li key={n} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
              {n}
            </li>
          ))}
        </ul>
        <Field {...bind("message")} label="Known issues or anything we should know" optional multiline maxLength={LIMITS.message} />
      </div>

      <div hidden={step !== at + 2} className="flex flex-col gap-4">
        <p className="text-body text-text-2">
          Add at least {PHOTO_MIN_COUNT} photos. More is better: every angle, and every mark or dent, even a small one. Tap a slot to add its photo.
        </p>
        <PhotoPicker {...photos} slots={PHOTO_SLOTS} min={PHOTO_MIN_COUNT} />
      </div>

      <div hidden={step !== at + 3} className="flex flex-col gap-4">
        <p className="text-body text-text-2">We&apos;ll contact you with a valuation. It&apos;s an estimate until we&apos;ve seen the car.</p>
        {/* Selling outright: the one place we say a trade-in can pay more, with the same optional car. Picking one makes it a trade-in. */}
        {mode === "sell" && cars.length > 0 && (
          <div className="flex flex-col gap-3 rounded-control border border-hairline bg-surface p-4">
            <p className="text-body">
              <span className="font-medium">Changing car too?</span> If you buy from us we can usually give you more for yours than a straight sale.
            </p>
            <Field {...bind("carId")} label="Trade in against" optional options={carOptions(cars)} />
          </div>
        )}
        <ContactFields bind={bind} />
      </div>
    </>
  );
}
