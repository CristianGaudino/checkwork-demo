"use client";

import { useEffect, useState } from "react";
import { Field, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { CarPicker } from "@/components/admin/CarPicker";
import { Select } from "@/components/Select";
import { Stepper, useStepHeading } from "@/components/leads/Stepper";
import { CheckIcon } from "@/components/stock/icons";
import type { CarCard } from "@/lib/admin/car-cards";
import { AD_PLATFORMS, NETWORKS, POST_LIMITS, type Network } from "@/lib/admin/networks";
import { press } from "@/components/ui";

// The page sends the cars as small cards (CarPicker); the chosen car's photos and suggested text are asked for when it is chosen (`load`), so the page
// stays small with any size of stock.
export type ComposerCar = { slug: string; title: string; photos: { src: string; width: number; height: number }[]; text: Record<Network, string> };

const STEPS = ["Car", "Where", "Post", "When"];
// Now, as datetime-local wants it (this device's time). Only read once "Later" is picked, so never on the server.
const localNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const card = (on: boolean) => `rounded-card border bg-card text-left ${on ? "border-accent ring-2 ring-accent" : "border-hairline"} ${press}`;
const chip = (on: boolean) => `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-meta font-medium ${on ? "border-accent bg-accent text-on-accent" : "border-control bg-card text-text"} ${press}`;

// A post (and its ad) in four steps, one per screen on a phone: pick the car from photo cards, pick where it goes, edit the suggested text and
// photos, then choose when. The preview sits beside the steps on a wide screen and comes in the last step on a phone. Every field stays in
// one form, so going back keeps what was typed; `action` is a server action and validates every field.
export function PostComposer({ cars, initialSlug, action, load }: { cars: CarCard[]; initialSlug: string; action: (data: FormData) => void | Promise<void>; load: (slug: string) => Promise<ComposerCar | null> }) {
  const start = cars.some((c) => c.slug === initialSlug) ? initialSlug : "";
  const [step, setStep] = useState(start ? 1 : 0);
  const [slug, setSlug] = useState(start);
  const [network, setNetwork] = useState<Network>("Facebook");
  const [loaded, setLoaded] = useState<ComposerCar | null>(null);
  useEffect(() => {
    if (!slug) return;
    let live = true; // a slower answer for a car chosen earlier never replaces the current one
    load(slug).then((c) => live && setLoaded(c));
    return () => {
      live = false;
    };
  }, [slug, load]);
  const car = loaded?.slug === slug ? loaded : undefined;
  const suggestion = car ? car.text[network] : "";
  // The text follows the suggestion until the dealer types; "Use the suggestion" brings it back.
  const [typed, setTyped] = useState<string | null>(null);
  const text = typed ?? suggestion;
  const [chosen, setChosen] = useState<string[] | null>(null);
  const photos = car ? (chosen ?? car.photos.slice(0, 1).map((p) => p.src)) : [];
  const [later, setLater] = useState(false);
  const [ad, setAd] = useState(false);
  const first = car?.photos.find((p) => p.src === photos[0]);
  const picked = cars.find((c) => c.slug === slug);

  const heading = useStepHeading(step);

  const canNext = step === 0 ? Boolean(slug) : step === 2 ? Boolean(car && text.trim()) : true;

  return (
    <form action={action} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Stepper titles={STEPS} step={step} headingRef={heading} />
        <input type="hidden" name="carSlug" value={slug} />
        <input type="hidden" name="network" value={network} />
        <input type="hidden" name="timing" value={later ? "later" : "now"} />
        {photos.map((src) => <input key={src} type="hidden" name="photos" value={src} />)}

        <section hidden={step !== 0}>
          <CarPicker
            cars={cars}
            value={slug}
            onPick={(next) => {
              if (next !== slug) {
                setSlug(next);
                setTyped(null);
                setChosen(null);
              }
              setStep(1);
            }}
          />
        </section>

        <section hidden={step !== 1} className="flex flex-col gap-3">
          {picked && <p className="text-body text-text-2">{picked.title}</p>}
          <div role="radiogroup" aria-label="Where" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {NETWORKS.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={network === n} onClick={() => setNetwork(n)} className={`${card(network === n)} flex min-h-14 items-center justify-between gap-3 px-4 text-body font-medium`}>
                {n}
                {network === n && <CheckIcon className="size-4 text-accent-text" />}
              </button>
            ))}
          </div>
        </section>

        <section hidden={step !== 2} className="flex flex-col gap-4">
          <Field label="Text">
            <textarea name="text" rows={7} maxLength={POST_LIMITS.text} required value={text} placeholder={car ? undefined : "Loading the suggested text"} onChange={(e) => setTyped(e.target.value)} className={`${adminInput} h-auto py-2`} />
          </Field>
          {typed !== null && typed !== suggestion && suggestion && (
            <button type="button" onClick={() => setTyped(null)} className="-mt-3 min-h-11 self-start text-meta font-medium text-accent-text underline">
              Use the suggestion
            </button>
          )}
          {car && car.photos.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-meta font-medium">Photos, up to {POST_LIMITS.photos}</legend>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {car.photos.map((p) => {
                  const on = photos.includes(p.src);
                  return (
                    <button
                      key={p.src}
                      type="button"
                      aria-pressed={on}
                      aria-label={on ? "Remove photo" : "Add photo"}
                      onClick={() => setChosen(on ? photos.filter((x) => x !== p.src) : [...photos, p.src].slice(0, POST_LIMITS.photos))}
                      className={`relative size-20 shrink-0 overflow-hidden rounded-control border-2 bg-photo-bg ${on ? "border-accent" : "border-transparent"} ${press}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local static photo; images are unoptimized on this Worker */}
                      <img src={p.src} alt="" width={p.width} height={p.height} className="size-full object-cover" />
                      {on && (
                        <span className="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-full bg-accent text-on-accent">
                          <CheckIcon className="size-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </section>

        <section hidden={step !== 3} className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="When" className="flex flex-wrap gap-2">
            <button type="button" role="radio" aria-checked={!later} onClick={() => setLater(false)} className={chip(!later)}>Now</button>
            <button type="button" role="radio" aria-checked={later} onClick={() => setLater(true)} className={chip(later)}>Later</button>
          </div>
          {later && (
            <Field label="Date and time">
              <input name="when" type="datetime-local" required min={localNow()} className={`${adminInput} w-60`} />
            </Field>
          )}
          {/* An ad starts with the post, so it is only offered for a post that goes out now. */}
          {!later && (
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" name="ad" checked={ad} onChange={(e) => setAd(e.target.checked)} className="size-5 accent-[var(--color-accent)]" />
              <span className="text-body">Also run it as an ad</span>
            </label>
          )}
          {ad && !later && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Ad platform">
                <Select name="platform" label="Ad platform" defaultValue={AD_PLATFORMS[0]} options={AD_PLATFORMS.map((p) => [p, p] as const)} />
              </Field>
              <Field label="Budget (€)">
                <input name="budgetEur" type="number" min={POST_LIMITS.budgetMin} max={POST_LIMITS.budgetMax} defaultValue={POST_LIMITS.budgetDefault} className={adminInput} />
              </Field>
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className={adminButtonQuiet}>
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            step > 0 && (
              <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className={`${adminButton} disabled:opacity-50`}>
                Next
              </button>
            )
          ) : (
            <>
              <button type="submit" name="intent" value="publish" className={adminButton}>{later ? "Schedule" : "Publish"}</button>
              <button type="submit" name="intent" value="draft" formNoValidate className={adminButtonQuiet}>Save draft</button>
            </>
          )}
        </div>
      </div>

      {/* Beside the steps from 1024px once a car is chosen; on a phone, in the last step only. */}
      <figure aria-label="Preview" className={`${step === 3 ? "flex" : "hidden"} ${slug ? "lg:flex" : "lg:hidden"} min-w-0 flex-col self-start overflow-hidden rounded-card border border-hairline bg-card lg:sticky lg:top-24`}>
        <figcaption className="px-4 py-3 text-meta font-medium">{network}</figcaption>
        {first ? (
          // eslint-disable-next-line @next/next/no-img-element -- local static photo; images are unoptimized on this Worker
          <img src={first.src} alt="" width={first.width} height={first.height} className="aspect-photo w-full bg-photo-bg object-cover" />
        ) : (
          <div className="aspect-photo w-full bg-photo-bg" />
        )}
        <p className="line-clamp-[12] whitespace-pre-line px-4 py-3 text-body [overflow-wrap:anywhere]">{text || "Your post appears here."}</p>
      </figure>
    </form>
  );
}
