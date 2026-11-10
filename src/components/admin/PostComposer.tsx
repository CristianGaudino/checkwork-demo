"use client";

import { useState } from "react";
import { Field, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { Select } from "@/components/Select";
import { CheckIcon } from "@/components/stock/icons";
import { NETWORKS, type Network } from "@/lib/admin/networks";
import { press } from "@/components/ui";

export type ComposerCar = { slug: string; title: string; photos: { src: string; width: number; height: number }[]; text: Record<Network, string> };

const chip = (on: boolean) => `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-meta font-medium ${on ? "border-accent bg-accent text-on-accent" : "border-control bg-card text-text"} ${press}`;

// One composer for a post and its ad: pick the car and where it goes, edit the suggested text, choose photos, see it as it will look, then
// publish, schedule or keep it as a draft. The ad is a switch on the same form. `action` is a server action; every field is validated there.
export function PostComposer({ cars, initialSlug, action }: { cars: ComposerCar[]; initialSlug: string; action: (data: FormData) => void | Promise<void> }) {
  const [slug, setSlug] = useState(cars.some((c) => c.slug === initialSlug) ? initialSlug : "");
  const [network, setNetwork] = useState<Network>("Facebook");
  const car = cars.find((c) => c.slug === slug);
  const suggestion = car ? car.text[network] : "";
  // The text follows the suggestion until the dealer types; "Use the suggestion" brings it back.
  const [typed, setTyped] = useState<string | null>(null);
  const text = typed ?? suggestion;
  const [chosen, setChosen] = useState<string[] | null>(null);
  const photos = car ? (chosen ?? car.photos.slice(0, 1).map((p) => p.src)) : [];
  const [later, setLater] = useState(false);
  const [ad, setAd] = useState(false);
  const first = car?.photos.find((p) => p.src === photos[0]);

  return (
    <form action={action} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Field label="Car">
          <Select
            name="carSlug"
            label="Car"
            required
            value={slug}
            onChange={(v) => {
              setSlug(v);
              setTyped(null);
              setChosen(null);
            }}
            options={[["", "Choose a car"], ...cars.map((c) => [c.slug, c.title] as const)]}
          />
        </Field>

        <div role="group" aria-label="Where" className="flex flex-wrap gap-2">
          {NETWORKS.map((n) => (
            <button key={n} type="button" aria-pressed={network === n} onClick={() => setNetwork(n)} className={chip(network === n)}>
              {n}
            </button>
          ))}
          <input type="hidden" name="network" value={network} />
        </div>

        <Field label="Text">
          <textarea name="text" rows={6} maxLength={1000} required value={text} onChange={(e) => setTyped(e.target.value)} className={`${adminInput} h-auto py-2`} />
        </Field>
        {typed !== null && typed !== suggestion && suggestion && (
          <button type="button" onClick={() => setTyped(null)} className="-mt-3 min-h-11 self-start text-meta font-medium text-accent-text underline">
            Use the suggestion
          </button>
        )}

        {car && car.photos.length > 0 && (
          <div role="group" aria-label="Photos" className="flex flex-wrap gap-2">
            {car.photos.slice(0, 6).map((p) => {
              const on = photos.includes(p.src);
              return (
                <button
                  key={p.src}
                  type="button"
                  aria-pressed={on}
                  aria-label={on ? "Remove photo" : "Add photo"}
                  onClick={() => setChosen(on ? photos.filter((x) => x !== p.src) : [...photos, p.src].slice(0, 4))}
                  className={`relative size-20 overflow-hidden rounded-control border-2 bg-photo-bg ${on ? "border-accent" : "border-transparent"} ${press}`}
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
        )}
        {photos.map((src) => <input key={src} type="hidden" name="photos" value={src} />)}

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
              <Select name="platform" label="Ad platform" defaultValue="Meta" options={[["Meta", "Meta"], ["Google", "Google"]]} />
            </Field>
            <Field label="Budget (€)">
              <input name="budgetEur" type="number" min={20} max={5000} defaultValue={100} className={adminInput} />
            </Field>
          </div>
        )}

        <div role="group" aria-label="When" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!later} onClick={() => setLater(false)} className={chip(!later)}>Now</button>
          <button type="button" aria-pressed={later} onClick={() => setLater(true)} className={chip(later)}>Later</button>
        </div>
        {later && (
          <Field label="Date and time">
            <input name="when" type="datetime-local" required className={`${adminInput} w-60`} />
          </Field>
        )}
        <input type="hidden" name="timing" value={later ? "later" : "now"} />

        <div className="flex flex-wrap gap-3">
          <button type="submit" name="intent" value="publish" className={adminButton}>{later ? "Schedule" : "Publish"}</button>
          <button type="submit" name="intent" value="draft" formNoValidate className={adminButtonQuiet}>Save draft</button>
        </div>
      </div>

      <figure aria-label="Preview" className="flex min-w-0 flex-col self-start overflow-hidden rounded-card border border-hairline bg-card">
        <figcaption className="px-4 py-3 text-meta font-medium">{network}</figcaption>
        {first ? (
          // eslint-disable-next-line @next/next/no-img-element -- local static photo; images are unoptimized on this Worker
          <img src={first.src} alt="" width={first.width} height={first.height} className="aspect-photo w-full bg-photo-bg object-cover" />
        ) : (
          <div className="aspect-photo w-full bg-photo-bg" />
        )}
        <p className="whitespace-pre-line px-4 py-3 text-body [overflow-wrap:anywhere]">{text || "Your post appears here."}</p>
      </figure>
    </form>
  );
}
