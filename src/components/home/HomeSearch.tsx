"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Combobox } from "@/components/Combobox";
import { PriceRange } from "@/components/PriceRange";
import { ArrowRightIcon, SearchIcon } from "@/components/stock/icons";
import { accentButton, card } from "@/components/ui";

type Option = { slug: string; label: string };
type Props = { makes: Option[]; bodies: Option[]; models: { makeSlug: string; slug: string; label: string }[] };

const tab = "relative inline-flex min-h-11 flex-1 items-center justify-center px-4 sm:flex-none sm:justify-start text-body font-semibold transition-colors";
const bar = "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent";

// A plain GET form: /used-cars reads make, model, body, priceMin and priceMax from the URL (BRW-03). The drop-downs need scripts to pick from;
// without them it still goes to the stock, with nothing chosen.
// The /used-cars page holds the used stock only, so the tab says so (new cars and vans have their own pages).
// The mockup's "Find me a car" tab sits beside it. Search sets the height of the box; the Find panel lies over it, so switching tabs
// never moves the page. The Find panel stays one column at every width: from lg the box is only half the page. On a phone body type is left out (the stock page has it) to keep the box short.
export function HomeSearch({ makes, bodies, models }: Props) {
  const [tabName, setTab] = useState<"search" | "find">("search");
  const [make, setMake] = useState("");
  const id = useId();
  // With no make chosen a model name shared by two makes (Fiat 500, Abarth 500) is one choice: the filter is by model slug.
  const shownModels = make ? models.filter((m) => m.makeSlug === make) : [...new Map(models.map((m) => [m.slug, m])).values()];
  const [price, setPrice] = useState<{ min?: number; max?: number }>({});
  // `invisible`, not `hidden`: the search form stays in the flow (so it still sets the height), but is not seen, read or focusable.
  const panel = (t: "search" | "find") => `transition-[opacity,visibility] duration-200 motion-reduce:transition-none ${tabName === t ? "" : "invisible opacity-0"}`;

  return (
    <div className={`${card} shadow-lift`}>
      <div role="tablist" aria-label="How to find a car" className="flex border-b border-hairline sm:px-2">
        {(["search", "find"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`${id}-tab-${t}`}
            aria-selected={tabName === t}
            aria-controls={`${id}-panel-${t}`}
            onClick={() => setTab(t)}
            className={`${tab} ${tabName === t ? `text-text ${bar}` : "text-text-2 hover:text-text"}`}
          >
            {t === "search" ? "Search used cars" : "Find me a car"}
          </button>
        ))}
      </div>
      <div className="relative">
        <div role="tabpanel" id={`${id}-panel-search`} aria-labelledby={`${id}-tab-search`} className={panel("search")}>
          <form action="/used-cars" method="get" className="grid grid-cols-2 gap-x-3 gap-y-3 p-4 sm:grid-cols-3 sm:gap-4">
            <Select name="make" label="Make" any="Any make" value={make} onChange={setMake} options={makes.map((m) => [m.slug, m.label])} />
            <Select key={make} name="model" label="Model" any="Any model" options={shownModels.map((m) => [m.slug, m.label])} />
            <Select name="body" label="Body type" any="Any type" className="hidden sm:flex" options={bodies.map((b) => [b.slug, b.label])} />
            <div className="col-span-2 min-w-0 sm:col-span-3">
              <PriceRange label="Price" min={price.min} max={price.max} onCommit={(min, max) => setPrice({ min, max })} />
              {price.min !== undefined && <input type="hidden" name="priceMin" value={price.min} />}
              {price.max !== undefined && <input type="hidden" name="priceMax" value={price.max} />}
            </div>
            <button type="submit" className={`col-span-2 flex items-center justify-center gap-2 sm:col-span-3 ${accentButton}`}>
              <SearchIcon className="size-5" />
              Search cars
            </button>
          </form>
        </div>
        <div
          role="tabpanel"
          id={`${id}-panel-find`}
          aria-labelledby={`${id}-tab-find`}
          className={`${panel("find")} absolute inset-0 flex flex-col justify-center gap-4 p-4 sm:items-start lg:p-6`}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-heading font-semibold">Can&apos;t see the car you want?</p>
            <p className="text-body text-text-2">Tell us what you&apos;re looking for and we&apos;ll look for it.</p>
          </div>
          <Link href="/find-a-car" className={`inline-flex items-center justify-center gap-2 ${accentButton}`}>
            Find it for me
            <ArrowRightIcon className="size-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// A labelled drop-down (the site's own, typeable once the list is long). Controlled only when a value is passed.
function Select({
  name,
  label,
  any,
  options,
  value,
  onChange,
  className = "flex",
}: {
  name: string;
  label: string;
  any: string;
  options: [string, string][];
  value?: string;
  onChange?(v: string): void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={`${className} min-w-0 flex-col gap-1`}>
      <label htmlFor={id} className="text-meta font-semibold">
        {label}
      </label>
      <Combobox id={id} name={name} tone="surface" className="pl-3" options={[{ value: "", label: any }, ...options.map(([v, l]) => ({ value: v, label: l, ...(name === "make" ? { logo: v } : {}) }))]} {...(onChange ? { value, onChange } : {})} />
    </div>
  );
}
