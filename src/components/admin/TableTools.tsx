"use client";

import { Select } from "@/components/Select";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import { useDensity } from "@/components/admin/density";
import { CloseIcon, SearchIcon, SlidersIcon } from "@/components/stock/icons";
import { fmtNum } from "@/lib/admin/format";
import { PER_PAGE, PER_PAGE_DEFAULT } from "@/lib/admin/paging";
import { press } from "@/components/ui";
import { placeSheet, sheetPanel } from "./sheet";

// The tables' controls. Everything lives in the URL, so a filtered, sorted, searched list can be shared, reloaded and gone back to; a new
// search, filter or sort starts again at page 1. The server reads the same params (sortRows, the pages' own filters).

// The URL as it is now, with these params changed (undefined removes one) and the page reset.
function useParamHref() {
  const path = usePathname();
  const sp = useSearchParams();
  return (over: Record<string, string | undefined>, keepPage = false) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(over)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    if (!keepPage && !("page" in over)) p.delete("page");
    const qs = p.toString();
    return `${path}${qs ? `?${qs}` : ""}`;
  };
}

// The search: it runs as you type (a moment after the last key), Enter runs it at once, and the cross clears it. No button to find.
export function LiveSearch({ name = "q", placeholder, label }: { name?: string; placeholder: string; label: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const hrefWith = useParamHref();
  const inUrl = sp.get(name) ?? "";
  const [value, setValue] = useState(inUrl);
  // When the address changes, the box takes its search, unless it is what the box sent itself (so a word typed while the list loads is not
  // lost). Only a change of the address is looked at, never the box's own sending, so the box is not cleared while the address catches up.
  // A menu link, another tab or Back sets it; set while rendering, so it is never shown stale.
  const [seen, setSeen] = useState(inUrl);
  const [sent, setSent] = useState(inUrl);
  if (inUrl !== seen) {
    setSeen(inUrl);
    if (inUrl !== sent) {
      setSent(inUrl);
      setValue(inUrl);
    }
  }
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = (v: string) => {
    clearTimeout(timer.current);
    setSent(v.trim());
    start(() => router.replace(hrefWith({ [name]: v.trim() || undefined }), { scroll: false }));
  };
  return (
    <form role="search" aria-busy={pending} onSubmit={(e) => (e.preventDefault(), run(value))} className="relative w-full sm:max-w-sm">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-2" />
      <input
        ref={input}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => run(v), 250);
        }}
        onKeyDown={(e) => e.key === "Escape" && value && (e.preventDefault(), setValue(""), run(""))}
        placeholder={placeholder}
        aria-label={label}
        className="h-11 w-full rounded-control border border-control bg-card pl-10 pr-11 text-body"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear the search"
          onClick={() => {
            setValue("");
            run("");
            input.current?.focus();
          }}
          className={`absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-control text-text-2 hover:text-text ${press}`}
        >
          <CloseIcon className="size-4" />
        </button>
      )}
    </form>
  );
}

// A column header that sorts: once ascending, again descending. The arrow says which way it is sorted now.
export function SortHeader({ k, label, active, dir, align }: { k: string; label: string; active: boolean; dir: "asc" | "desc"; align?: "right" }) {
  const hrefWith = useParamHref();
  const next = active && dir === "asc" ? "desc" : "asc";
  return (
    <Link href={hrefWith({ sort: k, dir: next })} scroll={false} replace className={`inline-flex min-h-11 items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-text" : "hover:text-text"}`}>
      {label}
      <span aria-hidden className={`text-[0.75rem] ${active ? "" : "opacity-0"}`}>{active && dir === "desc" ? "▼" : "▲"}</span>
      <span className="sr-only">{active ? `, sorted ${dir === "asc" ? "ascending" : "descending"}` : ", sort"}</span>
    </Link>
  );
}

// The tables' row density, for this person on every table (kept in a cookie by the frame). The pages stay as they are.
export function DensityToggle() {
  const { compact, setCompact } = useDensity();
  return (
    <button type="button" aria-pressed={compact} onClick={() => setCompact(!compact)} className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-control border px-3 text-meta font-medium ${compact ? "border-text bg-text text-ink" : "border-hairline bg-card text-text hover:border-control"} ${press}`}>
      <span aria-hidden className="flex flex-col gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-[2px] w-3.5 rounded-full bg-current" />
        ))}
      </span>
      Compact
    </button>
  );
}

// A table's filters, all in one place behind one button: a panel under it on a desktop, a sheet from the foot of the screen on a phone.
// Each filter is a short list of choices (Any first); a choice applies at once. What is on shows as chips beside the table (AppliedFilters).
export type FilterGroup = { name: string; label: string; options: readonly (readonly [string, string])[]; any?: string };
export function Filters({ groups }: { groups: FilterGroup[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const hrefWith = useParamHref();
  const [, start] = useTransition();
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // What is chosen shows at once, while the list catches up (the URL is the truth once it lands).
  const [chosen, choose] = useOptimistic(Object.fromEntries(groups.map((g) => [g.name, sp.get(g.name) ?? ""])), (now, over: Record<string, string | undefined>) => ({ ...now, ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, v ?? ""])) }));
  const on = groups.filter((g) => chosen[g.name]).length;
  const set = (over: Record<string, string | undefined>) =>
    start(() => {
      choose(over);
      router.replace(hrefWith(over), { scroll: false });
    });
  const place = () => placeSheet(panel.current, button.current);
  return (
    <>
      <button ref={button} type="button" popoverTarget={id} onClick={place} className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-control border border-control bg-card px-4 text-meta font-semibold text-text ${press}`}>
        <SlidersIcon className="size-4" />
        Filters
        {on > 0 && (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-accent text-[0.75rem] text-on-accent tabular-nums">
            {on}
            <span className="sr-only"> on</span>
          </span>
        )}
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        aria-label="Filters"
        className={`${sheetPanel} sm:max-h-[70dvh] sm:w-[22rem]`}
      >
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 className="text-body font-semibold">Filters</h2>
          <button type="button" aria-label="Close the filters" onClick={() => panel.current?.hidePopover()} className={`inline-flex size-9 items-center justify-center rounded-control text-text-2 hover:text-text ${press}`}>
            <CloseIcon className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-3">
          {groups.map((g) => (
            <fieldset key={g.name} className="flex flex-col">
              <legend className="mb-1 text-meta font-semibold">{g.label}</legend>
              {[["", g.any ?? "Any"] as const, ...g.options].map(([value, label]) => (
                <label key={value} className="-mx-2 flex min-h-10 cursor-pointer items-center gap-3 rounded-control px-2 text-body hover:bg-surface">
                  <input type="radio" name={`${id}-${g.name}`} value={value} checked={chosen[g.name] === value} onChange={() => set({ [g.name]: value || undefined })} className="size-4 accent-accent" />
                  {label}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3">
          {on > 0 ? (
            <button type="button" onClick={() => set(Object.fromEntries(groups.map((g) => [g.name, undefined])))} className="min-h-10 text-meta font-medium text-accent-text underline">
              Clear all
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={() => panel.current?.hidePopover()} className={`inline-flex h-10 items-center rounded-control bg-accent px-5 text-meta font-semibold text-on-accent ${press}`}>
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// The filters that are on, as chips beside the table: each one taken off with its cross, all of them with Clear all.
export function AppliedFilters({ groups }: { groups: FilterGroup[] }) {
  const sp = useSearchParams();
  const hrefWith = useParamHref();
  const on = groups.flatMap((g) => {
    const chosen = g.options.find(([v]) => v === sp.get(g.name));
    return chosen ? [{ g, label: chosen[1] }] : [];
  });
  if (!on.length) return null;
  return (
    <div role="group" aria-label="Filters on" className="flex flex-wrap items-center gap-2">
      {on.map(({ g, label }) => (
        <Link key={g.name} href={hrefWith({ [g.name]: undefined })} replace scroll={false} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border border-hairline bg-card pl-3 pr-2 text-meta ${press}`}>
          <span className="text-text-2">{g.label}:</span>
          <span className="font-medium">{label}</span>
          <CloseIcon aria-hidden className="size-3.5 text-text-2" />
          <span className="sr-only">, take this filter off</span>
        </Link>
      ))}
      {on.length > 1 && (
        <Link href={hrefWith(Object.fromEntries(groups.map((g) => [g.name, undefined])))} replace scroll={false} className="min-h-9 px-1 text-meta font-medium text-accent-text underline">
          Clear all
        </Link>
      )}
    </div>
  );
}

// The page numbers to show: the first, the last, and the ones around this page, with a gap where some are left out.
export function pageList(page: number, count: number): (number | "gap")[] {
  const keep = [...new Set([1, count, page - 1, page, page + 1])].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (const n of keep) {
    if (out.length && n - (out.at(-1) as number) > 1) out.push("gap");
    out.push(n);
  }
  return out;
}

// Under every table: what is showing of how many, the CSV of the list as it is filtered (where the table has one), how many rows a page,
// and the pages. Everything keeps the search, filters and sort.
export function TableFooter({ page, pageCount, total, per, exportHref }: { page: number; pageCount: number; total: number; per: number; exportHref?: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const hrefWith = useParamHref();
  const from = total ? (page - 1) * per + 1 : 0;
  const to = Math.min(total, page * per);
  let csv: string | undefined;
  if (exportHref) {
    const [path, own = ""] = exportHref.split("?");
    const p = new URLSearchParams(own);
    for (const [k, v] of sp) if (k !== "page" && k !== "per" && !p.has(k)) p.set(k, v);
    csv = p.size ? `${path}?${p}` : path;
  }
  const pageHref = (n: number) => hrefWith({ page: n > 1 ? String(n) : undefined }, true);
  const step = `inline-flex h-10 min-w-10 items-center justify-center rounded-control border border-hairline bg-card px-3 text-meta font-medium text-text transition-colors hover:border-control ${press}`;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-meta text-text-2 tabular-nums">{total ? `Showing ${fmtNum(from)} to ${fmtNum(to)} of ${fmtNum(total)}` : "Nothing to show"}</p>
        {csv && (
          <a href={csv} download className={step}>
            Export CSV
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2 text-meta text-text-2">
          <span aria-hidden>Rows</span>
          <span className="w-24">
            <Select label="Rows" value={String(per)} onChange={(v) => router.replace(hrefWith({ per: v === String(PER_PAGE_DEFAULT) ? undefined : v }), { scroll: false })} options={PER_PAGE.map((n) => [String(n), String(n)] as const)} />
          </span>
        </span>
        {pageCount > 1 && (
          <nav aria-label="Pages" className="flex items-center gap-1">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={step}>
                Previous
              </Link>
            ) : (
              <span aria-hidden className={`${step} opacity-40`}>Previous</span>
            )}
            {/* Page numbers from a small tablet up; a phone says where it is between Previous and Next. */}
            <span className="hidden items-center gap-1 sm:flex">
              {pageList(page, pageCount).map((n, i) =>
                n === "gap" ? (
                  <span key={`gap-${i}`} aria-hidden className="px-1 text-text-2">
                    …
                  </span>
                ) : (
                  <Link key={n} href={pageHref(n)} aria-current={n === page ? "page" : undefined} className={`${step} ${n === page ? "border-accent text-accent-text" : ""}`}>
                    {n}
                  </Link>
                ),
              )}
            </span>
            <span className="px-2 text-meta text-text-2 tabular-nums sm:hidden">
              {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link href={pageHref(page + 1)} className={step}>
                Next
              </Link>
            ) : (
              <span aria-hidden className={`${step} opacity-40`}>Next</span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
