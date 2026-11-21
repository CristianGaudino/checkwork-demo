"use client";

import { useEffect, useState } from "react";
import { Field, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { CarPicker } from "@/components/admin/CarPicker";
import { Select } from "@/components/Select";
import { Stepper, useStepHeading } from "@/components/leads/Stepper";
import { CheckIcon } from "@/components/stock/icons";
import type { CarCard } from "@/lib/admin/car-cards";
import { AD_PLATFORMS, AD_PLATFORM_LABELS, FORMATS_FOR, FORMAT_LABELS, FORMAT_LIMITS, LAYOUT_LABELS, NETWORKS, POST_LIMITS, PUBLISH_MODE, STORY_LAYOUTS, type Network, type PostFormat, type StoryLayout } from "@/lib/admin/networks";
import { AIWriter } from "@/components/admin/AIWriter";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { PostPreview } from "@/components/admin/PostPreview";
import type { MediaItem } from "@/lib/admin/collections";
import { press } from "@/components/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { BrandIcon } from "@/components/admin/BrandIcon";

// The page sends the cars as small cards (CarPicker); the chosen car's photos and suggested text are asked for when it is chosen (`load`), so the page
// stays small with any size of stock.
export type ComposerCar = { slug: string; title: string; photos: { src: string; width: number; height: number }[]; text: Record<Network, string>; byFormat: Record<PostFormat, Record<Network, string>>; price: string; was?: string };
// What the composer needs of a library file.
export type LibraryFile = Pick<MediaItem, "id" | "kind" | "src" | "name" | "durationSec" | "carSlug">;

const STEPS = ["Choose a car", "Where to post", "Words and photos", "Check and post"];
// Now, as datetime-local wants it (this device's time). Only read once "Later" is picked, so never on the server.
const localNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const card = (on: boolean) => `rounded-card border bg-card text-left ${on ? "border-accent ring-2 ring-accent" : "border-hairline"} ${press}`;
const chip = (on: boolean) => `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-meta font-medium ${on ? "border-accent bg-accent text-on-accent" : "border-control bg-card text-text"} ${press}`;

// A post (and its ad) in four steps, one per screen on a phone: pick the car from photo cards, pick where it goes, edit the suggested text and
// photos, then choose when. The preview sits beside the steps on a wide screen and comes in the last step on a phone. Every field stays in
// one form, so going back keeps what was typed; `action` is a server action and validates every field.
export function PostComposer({ cars, initialSlug, initialFormat = "post", initialLayout = "just-in", library, action, load }: { cars: CarCard[]; initialSlug: string; initialFormat?: PostFormat; initialLayout?: StoryLayout; library: LibraryFile[]; action: (data: FormData) => void | Promise<void>; load: (slug: string) => Promise<ComposerCar | null> }) {
  const start = cars.some((c) => c.slug === initialSlug) ? initialSlug : "";
  const [step, setStep] = useState(start ? 1 : 0);
  const [slug, setSlug] = useState(start);
  const [network, setNetwork] = useState<Network>("Facebook");
  const [format, setFormat] = useState<PostFormat>(initialFormat);
  const [layout, setLayout] = useState<StoryLayout>(initialLayout);
  const [video, setVideo] = useState("");
  const [added, setAdded] = useState<string[]>([]); // library photos picked or just uploaded
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
  const limits = FORMAT_LIMITS[format];
  // A story is a few words over the photo, led by the layout; the other formats start from the car's facts for this network.
  const storyLine = car ? (layout === "price-drop" && car.was ? `Now ${car.price}, was ${car.was}.` : `${car.price}.`) : "";
  const suggestion = car ? (format === "story" ? [`${LAYOUT_LABELS[layout]}: ${car.title}.`, storyLine].filter(Boolean).join("\n") : car.byFormat[format][network]) : "";
  // The text follows the suggestion until the dealer types; "Use the suggestion" brings it back.
  const [typed, setTyped] = useState<string | null>(null);
  const text = typed ?? suggestion;
  const [chosen, setChosen] = useState<string[] | null>(null);
  // Pictures come from the car's own photos and the dealer's library (the photos of this car first). A reel has no pictures, only its video.
  const mine = library.filter((m) => m.kind === "image").sort((a, b) => Number(b.carSlug === slug) - Number(a.carSlug === slug));
  const videos = library.filter((m) => m.kind === "video" && (m.durationSec ?? 0) <= limits.maxSeconds);
  const pool = car ? [...car.photos.map((p) => p.src), ...mine.map((m) => m.src)] : [];
  const photos = !car || !limits.photos[1] ? [] : (chosen ?? [...added, ...car.photos.slice(0, format === "carousel" ? 3 : 1).map((p) => p.src)]).filter((src) => pool.includes(src) || added.includes(src)).slice(0, limits.photos[1]);
  const clip = limits.video && videos.some((v) => v.src === video) ? video : "";
  const mode = PUBLISH_MODE[network][format];
  const [later, setLater] = useState(false);
  const [ad, setAd] = useState(false);
  const picked = cars.find((c) => c.slug === slug);

  const heading = useStepHeading(step);

  const canNext = step === 0 ? Boolean(slug) : step === 2 ? Boolean(car && text.trim() && (format === "reel" ? clip : photos.length >= limits.photos[0])) : true;
  const pick = (n: Network, f: PostFormat) => {
    setNetwork(n);
    setFormat(FORMATS_FOR[n].includes(f) ? f : "post");
    setChosen(null);
  };

  return (
    <form action={action} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Stepper titles={STEPS} step={step} headingRef={heading} />
        <input type="hidden" name="carSlug" value={slug} />
        <input type="hidden" name="network" value={network} />
        <input type="hidden" name="format" value={format} />
        <input type="hidden" name="layout" value={layout} />
        <input type="hidden" name="video" value={clip} />
        <input type="hidden" name="timing" value={later ? "later" : "now"} />
        {photos.map((src) => <input key={src} type="hidden" name="photos" value={src} />)}

        {/* The car stays in view after step 1, with the way back to change it, so nobody loses track of what they are posting. */}
        {picked && step > 0 && (
          <div className="flex items-center gap-3 rounded-card border border-hairline bg-row-alt p-2 pr-3">
            <span aria-hidden="true" className="size-14 shrink-0 overflow-hidden rounded-control bg-photo-bg">
              {picked.photo && <img src={picked.photo} alt="" className="size-full object-cover" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="line-clamp-2 font-medium">{picked.title}</span>
              <span className="text-meta text-text-2">{picked.price}</span>
            </span>
            <button type="button" onClick={() => setStep(0)} className={`${adminButtonQuiet} px-3`}>
              Change car
            </button>
          </div>
        )}

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
          <div role="radiogroup" aria-label="Where" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {NETWORKS.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={network === n} onClick={() => pick(n, format)} className={`${card(network === n)} flex min-h-14 items-center justify-between gap-3 px-4 text-body font-medium`}>
                <span className="inline-flex items-center gap-2"><BrandIcon name={n} className="size-5" />{n}</span>
                {network === n && <CheckIcon className="size-4 text-accent-text" />}
              </button>
            ))}
          </div>
          <div role="radiogroup" aria-label="Format" className="flex flex-wrap gap-2">
            {FORMATS_FOR[network].map((f) => (
              <button key={f} type="button" role="radio" aria-checked={format === f} onClick={() => { setFormat(f); setChosen(null); }} className={chip(format === f)}>
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
          {mode === "prepare" && <p className="text-meta text-text-2">A {FORMAT_LABELS[format].toLowerCase()} on {network} is made ready here and posted from your phone.</p>}
        </section>

        <section hidden={step !== 2} className="flex flex-col gap-4">
          {format === "story" && (
            <div role="radiogroup" aria-label="Story layout" className="flex flex-wrap gap-2">
              {STORY_LAYOUTS.map((l) => (
                <button key={l} type="button" role="radio" aria-checked={layout === l} onClick={() => setLayout(l)} className={chip(layout === l)}>
                  {LAYOUT_LABELS[l]}
                </button>
              ))}
            </div>
          )}
          <Field label="Text">
            <textarea name="text" rows={7} maxLength={POST_LIMITS.text} required value={text} placeholder={car ? undefined : "Loading the suggested text"} onChange={(e) => setTyped(e.target.value)} className={`${adminInput} h-auto py-2`} />
          </Field>
          <AIWriter task="post" format={format} text={text} request={() => (slug ? { task: "post", carSlug: slug, network, format, ...(format === "story" && { layout }) } : null)} onText={(t) => setTyped(t)} />
          {typed !== null && typed !== suggestion && suggestion && (
            <button type="button" onClick={() => setTyped(null)} className="-mt-3 min-h-11 self-start text-meta font-medium text-accent-text underline">
              Use the suggestion
            </button>
          )}
          {car && limits.photos[1] > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-meta font-medium">{format === "carousel" ? `Photos, ${limits.photos[0]} to ${limits.photos[1]}` : format === "story" ? "Photo" : `Photos, up to ${limits.photos[1]}`}</legend>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[...car.photos.map((p) => p.src), ...mine.map((m) => m.src)].filter((src, i, all) => all.indexOf(src) === i).map((src) => {
                  const on = photos.includes(src);
                  return (
                    <button
                      key={src}
                      type="button"
                      aria-pressed={on}
                      aria-label={on ? "Remove photo" : "Add photo"}
                      onClick={() => setChosen(on ? photos.filter((x) => x !== src) : limits.photos[1] === 1 ? [src] : [...photos, src].slice(0, limits.photos[1]))}
                      className={`relative size-20 shrink-0 overflow-hidden rounded-control border-2 bg-photo-bg ${on ? "border-accent" : "border-transparent"} ${press}`}
                    >
                      <img src={src} alt="" className="size-full object-cover" />
                      {on && (
                        <span className="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-full bg-accent text-on-accent">
                          <CheckIcon className="size-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <MediaUpload accept="image/jpeg,image/png,image/webp" carSlug={slug} label="Add a photo from this device" onAdded={(m) => { if (m.kind === "image") { setAdded((a) => [m.src, ...a]); setChosen((c) => (limits.photos[1] === 1 ? [m.src] : [...(c ?? photos), m.src].slice(0, limits.photos[1]))); } }} />
            </fieldset>
          )}
          {car && limits.video && format === "reel" && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-meta font-medium">Video, up to {limits.maxSeconds} seconds</legend>
              {videos.length > 0 && (
                <div role="radiogroup" aria-label="Video" className="flex flex-wrap gap-2">
                  {videos.map((v) => (
                    <button key={v.id} type="button" role="radio" aria-checked={clip === v.src} onClick={() => setVideo(v.src)} className={chip(clip === v.src)}>
                      {v.name}
                    </button>
                  ))}
                </div>
              )}
              <MediaUpload accept="video/mp4,video/quicktime" carSlug={slug} label="Add a video from this device" onAdded={(m) => m.kind === "video" && setVideo(m.src)} />
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
          {/* An ad starts with the post, so it is only offered for a post that goes out now, and that we send (not one made ready for the phone). */}
          {!later && mode === "auto" && (
            <label className="flex min-h-11 items-start gap-3 py-1">
              <input type="checkbox" name="ad" checked={ad} onChange={(e) => setAd(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
              <span className="flex flex-col">
                <span className="text-body">Also run it as an ad</span>
                <span className="text-meta text-text-2">You pay to show it to more people near you. It never spends more than the budget you set.</span>
              </span>
            </label>
          )}
          {ad && !later && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Ad platform">
                <Select name="platform" label="Ad platform" defaultValue={AD_PLATFORMS[0]} options={AD_PLATFORMS.map((p) => [p, AD_PLATFORM_LABELS[p]] as const)} />
              </Field>
              <Field label="Budget (€)">
                <input name="budgetEur" type="number" min={POST_LIMITS.budgetMin} max={POST_LIMITS.budgetMax} defaultValue={POST_LIMITS.budgetDefault} className={adminInput} />
              </Field>
            </div>
          )}
        </section>

        {/* Step 1 has no buttons (picking a car moves on), so no empty divider either. */}
        <div className={`${step > 0 ? "flex" : "hidden"} flex-wrap items-center gap-3 border-t border-hairline pt-4`}>
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
              <SubmitButton name="intent" value="publish" className={adminButton}>{later ? "Schedule" : mode === "prepare" ? `Get it ready for ${network}` : `Post to ${network} now`}</SubmitButton>
              <SubmitButton name="intent" value="draft" formNoValidate className={adminButtonQuiet}>Save draft</SubmitButton>
            </>
          )}
        </div>
      </div>

      {/* Beside the steps from 1024px once a car is chosen; on a phone, in the last step only. */}
      <figure aria-label="Preview" className={`${step === 3 ? "flex" : "hidden"} ${slug ? "lg:flex" : "lg:hidden"} min-w-0 flex-col self-start overflow-hidden rounded-card border border-hairline bg-card lg:sticky lg:top-24`}>
        <figcaption className="flex items-center gap-1.5 px-4 py-3 text-meta font-medium"><BrandIcon name={network} />{network}{format !== "post" && ` ${FORMAT_LABELS[format].toLowerCase()}`}</figcaption>
        <div className="px-4 pb-4">
          <PostPreview network={network} format={format} layout={layout} text={text} photos={photos} video={clip || undefined} title={picked?.title ?? ""} price={car?.price} was={car?.was} />
        </div>
      </figure>
    </form>
  );
}
