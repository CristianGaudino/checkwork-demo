"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Combobox } from "@/components/Combobox";
import { useDensity } from "@/components/admin/density";
import { CloseIcon, SearchIcon } from "@/components/stock/icons";
import { press } from "@/components/ui";

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
  // What this box last sent. When the address says something else (a menu link, another tab, Back), the box takes it, set while rendering
  // so it is never shown stale; what it sent itself is left alone, so a word typed while the list loads is not lost.
  const [sent, setSent] = useState(inUrl);
  if (inUrl !== sent) {
    setSent(inUrl);
    setValue(inUrl);
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

// A filter as a drop-down, bound to one URL param. The first option is everything (no param).
export function FilterSelect({ name, label, options, all }: { name: string; label: string; options: readonly (readonly [string, string])[]; all: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const hrefWith = useParamHref();
  const [, start] = useTransition();
  return (
    <Combobox
      size="md"
      label={label}
      className="w-full sm:w-48"
      value={sp.get(name) ?? ""}
      onChange={(v) => start(() => router.replace(hrefWith({ [name]: v || undefined }), { scroll: false }))}
      options={[{ value: "", label: all }, ...options.map(([value, text]) => ({ value, label: text }))]}
    />
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

// Previous and Next, keeping the search, filters and sort.
export function PagerLinks({ page, pageCount }: { page: number; pageCount: number }) {
  const hrefWith = useParamHref();
  const cls = `inline-flex h-10 items-center justify-center rounded-control border border-hairline bg-card px-3 text-meta font-medium text-text transition-colors hover:border-control ${press}`;
  return (
    <div className="flex gap-2">
      {page > 1 && (
        <Link href={hrefWith({ page: page > 2 ? String(page - 1) : undefined }, true)} className={cls}>
          Previous
        </Link>
      )}
      {page < pageCount && (
        <Link href={hrefWith({ page: String(page + 1) }, true)} className={cls}>
          Next
        </Link>
      )}
    </div>
  );
}
