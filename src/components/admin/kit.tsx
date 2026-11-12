import Link from "next/link";
import { useId } from "react";
import { card, press } from "@/components/ui";
import { DensityToggle, LiveSearch, PagerLinks, SortHeader } from "./TableTools";
export { DensityToggle, FilterSelect, LiveSearch } from "./TableTools";

// The admin kit: the few pieces every admin page is made of. Same tokens as the site, denser and calmer.

// The page's own bar: its title and its actions. From 1024px it stays at the top while the page scrolls, so where you are and what you can
// do are always in view; the title is sized as a working tool's, not a headline.
export function PageHeader({ title, text, actions }: { title: string; text?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:sticky lg:top-0 lg:z-20 lg:-mx-10 lg:min-h-20 lg:border-b lg:border-hairline lg:bg-surface lg:px-10 lg:py-4">
      <div className="min-w-0">
        <h1 className="text-title font-bold">{title}</h1>
        {text && <p className="mt-0.5 max-w-measure text-meta text-text-2">{text}</p>}
      </div>
      {/* On a phone two or more actions are one full-width row of equal buttons, each icon above its label, so three fit at 360px and
          never wrap two and one. A single action (All leads) keeps its own size. From 640px they sit beside the title as they are. */}
      {actions && <div className="flex flex-wrap gap-2 max-sm:has-[>:nth-child(2)]:w-full max-sm:has-[>:nth-child(2)]:flex-nowrap max-sm:has-[>:nth-child(2)]:[&>*]:h-auto max-sm:has-[>:nth-child(2)]:[&>*]:min-h-11 max-sm:has-[>:nth-child(2)]:[&>*]:flex-1 max-sm:has-[>:nth-child(2)]:[&>*]:flex-col max-sm:has-[>:nth-child(2)]:[&>*]:gap-1 max-sm:has-[>:nth-child(2)]:[&>*]:px-2 max-sm:has-[>:nth-child(2)]:[&>*]:py-2">{actions}</div>}
    </header>
  );
}

// A titled panel is a region named by its heading, so a screen reader can jump to it. Two kinds: the work of the page (raised, the default),
// and `quiet` for what sits beside it (details, settings of the record): flat on a tint, so the eye goes to the work first.
export function Panel({ title, count, action, children, className = "", quiet = false }: { title?: string; count?: number; action?: React.ReactNode; children: React.ReactNode; className?: string; quiet?: boolean }) {
  const id = useId();
  return (
    <section aria-labelledby={title ? id : undefined} className={`${quiet ? "rounded-card border border-hairline bg-row-alt" : card} flex min-w-0 flex-col gap-4 p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && (
            <h2 id={id} className="text-section font-semibold">
              {title}
              {count !== undefined && <span className="ml-2 font-normal text-text-2 tabular-nums">{count}</span>}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// With `href` the whole tile is a link to the page behind the number. `tone` colours the hint only when it says something good or to act on;
// `chart` is a small picture under it that answers a question the number alone cannot (is this week a normal one?).
export function StatCard({ label, value, hint, tone, href, chart }: { label: string; value: string; hint?: string; tone?: "good" | "bad" | "warn"; href?: string; chart?: React.ReactNode }) {
  const body = (
    <>
      <p className="text-meta text-text-2">{label}</p>
      {/* Sized from the tile's own width (a container query), so tiles side by side show their figures at the same size, and a
          half-width tile on a 360px phone still fits €117,565 on one line. A year's sales (€5,864,950) take a smaller share. Anything
          longer still wraps, never spills. */}
      <p className={`font-display font-semibold leading-[1.1] tracking-[-0.02em] tabular-nums [overflow-wrap:anywhere] ${value.length > 8 ? "text-[min(2rem,15cqi)]" : "text-[min(2rem,20cqi)]"}`}>{value}</p>
      {hint && <p className={`text-meta ${tone === "good" ? "text-ok" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-text-2"}`}>{hint}</p>}
      {chart}
    </>
  );
  const frame = `${card} @container flex min-w-0 flex-col gap-1 p-4`; // @container: the figure is sized from the tile
  return href ? (
    <Link href={href} className={`${frame} transition-colors hover:border-control ${press}`}>
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}

// A thin bar filled to a share of its width: ratings, visitors by source. Decorative: the number is always written beside it.
export function Meter({ value, max, tone = "accent", className = "" }: { value: number; max: number; tone?: "accent" | "warning"; className?: string }) {
  const share = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <span aria-hidden="true" className={`h-2 overflow-hidden rounded-full bg-hairline ${className}`}>
      <span className={`block h-full rounded-full ${tone === "warning" ? "bg-warning" : "bg-accent"}`} style={{ width: `${share}%` }} />
    </span>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">{children}</div>;
}

const TONES = { neutral: "bg-hairline text-text", good: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", info: "bg-info-soft text-info" } as const;
// Urgency, filled: for what needs doing now (overdue, past its date), and only that, so a filled badge always means act.
const STRONG = { warn: "bg-warn text-ink", bad: "bg-bad text-ink" } as const;
export type Tone = keyof typeof TONES;
// A short status in words, never a colour alone.
export function Badge({ tone = "neutral", strong = false, children }: { tone?: Tone; strong?: boolean; children: React.ReactNode }) {
  const look = strong && (tone === "warn" || tone === "bad") ? STRONG[tone] : TONES[tone];
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-meta font-medium ${look}`}>{children}</span>;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <p className="text-heading font-semibold">{title}</p>
      {text && <p className="max-w-[45ch] text-body text-text-2">{text}</p>}
      {action}
    </div>
  );
}

// `hide` keeps a less important column off narrow screens: it shows from that width up. `nowrap` keeps short values (a name, a date) on one line.
const HIDE = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell", "2xl": "hidden 2xl:table-cell" } as const;
// `sort`: the value the column sorts by; with it, its header sorts the list (sortRows does it on the server, before the list is paged).
export type Column<T> = { key: string; header: string; cell: (row: T) => React.ReactNode; align?: "right"; className?: string; hide?: keyof typeof HIDE; nowrap?: boolean; sort?: (row: T) => string | number | undefined };

// The list's sort from the URL (?sort=column&dir=asc|desc): a column that sorts, else the page's own order. Empty values go last either way.
export type Sort = { key: string; dir: "asc" | "desc" };
export function sortRows<T>(rows: T[], columns: Column<T>[], sp: { sort?: string; dir?: string }, fallback: Sort): { rows: T[]; sort: Sort } {
  const asked = columns.find((c) => c.key === sp.sort && c.sort);
  const sort: Sort = asked ? { key: asked.key, dir: sp.dir === "desc" ? "desc" : "asc" } : fallback;
  const by = (asked ?? columns.find((c) => c.key === fallback.key))?.sort;
  if (!by) return { rows, sort };
  const sign = sort.dir === "asc" ? 1 : -1;
  const empty = (v: unknown) => v === undefined || v === "";
  const sorted = [...rows].sort((a, b) => {
    const [x, y] = [by(a), by(b)];
    if (empty(x) || empty(y)) return empty(x) === empty(y) ? 0 : empty(x) ? 1 : -1;
    return sign * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "en-IE", { numeric: true, sensitivity: "base" }));
  });
  return { rows: sorted, sort };
}
const colClass = (c: Column<unknown>) => `${c.hide ? HIDE[c.hide] : ""} ${c.nowrap ? "whitespace-nowrap" : ""}`;

// The dealer's tables: every other row filled, so a long list is easy to follow across; 48px rows; numbers on the right in even figures.
// A table wider than its card scrolls sideways inside it at every width, so no column or button is ever cut off.
// `bare` drops the table's own card, for use inside a Panel. `linkRows`: each row is one link, the one with `after:absolute after:inset-0`
// in its first cell, so the whole row is clickable.
// `sort`: the list's sort now, so the sortable headers show it. Rows are 48px, 36px when the person chose compact tables (DensityToggle).
export function DataTable<T>({ columns, rows, rowKey, empty, bare = false, linkRows = false, label, sort }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: React.ReactNode; bare?: boolean; linkRows?: boolean; label?: string; sort?: Sort }) {
  const frame = bare ? "" : card;
  if (rows.length === 0) return <div className={frame}>{empty ?? <EmptyState title="Nothing here yet" />}</div>;
  return (
    // Focusable, so a keyboard user can scroll it sideways on a phone.
    <div tabIndex={0} aria-label={label} className={`${frame} overflow-x-auto`}>
      {/* 18rem at least, so a column is never squeezed to a word a line, and a two-column table (stock, leads, team) still fits a 320px
          phone. A table whose columns need more scrolls inside its card. */}
      <table className="w-full min-w-[18rem] border-collapse text-left text-body">
        <thead>
          <tr className="text-meta text-text-2">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={sort?.key === c.key && c.sort ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                className={`relative z-10 h-11 border-b border-hairline bg-card px-4 font-medium ${c.align === "right" ? "text-right" : ""} ${colClass(c as Column<unknown>)}`}
              >
                {/* The screen reader text is positioned inside this cell (relative above), so the scroll box clips it and it cannot widen the page. */}
                {c.sort && sort ? <SortHeader k={c.key} label={c.header} active={sort.key === c.key} dir={sort.dir} align={c.align} /> : c.header || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className={`even:bg-row-alt ${linkRows ? "relative transition-colors hover:bg-surface" : ""}`}>
              {columns.map((c) => (
                <td key={c.key} className={`h-12 px-4 py-2 align-middle group-data-[density=compact]/shell:h-9 group-data-[density=compact]/shell:py-1 ${c.align === "right" ? "text-right tabular-nums" : ""} ${c.className ?? ""} ${colClass(c as Column<unknown>)}`}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The summary that is also the filter: one tile per view, its count, and the chosen one filled. The filter lives in the URL, so a filtered
// list can be shared and the back button works. Never a row of numbers above a separate row of chips.
export type SummaryTab = { label: string; href: string; active: boolean; count?: number | string; hint?: string };
export function SummaryTabs({ items, label = "Filter" }: { items: SummaryTab[]; label?: string }) {
  return (
    <nav aria-label={label} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] sm:overflow-visible sm:px-0">
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          aria-current={i.active ? "true" : undefined}
          className={`flex min-w-32 shrink-0 flex-col gap-0.5 rounded-card border px-4 py-3 transition-colors ${i.active ? "border-accent bg-accent text-on-accent" : "border-hairline bg-card text-text hover:border-control"} ${press}`}
        >
          <span className={`text-meta ${i.active ? "" : "text-text-2"}`}>{i.label}</span>
          {i.count !== undefined && <span className="text-heading font-semibold tabular-nums">{i.count}</span>}
          {i.hint && <span className={`text-meta ${i.active ? "" : "text-text-2"}`}>{i.hint}</span>}
        </Link>
      ))}
    </nav>
  );
}

// Above a table: its search, then its filters, then the density switch at the end of the row. Wraps on a phone, where the rows are a
// list already and the switch is left out.
export function TableToolbar({ search, children }: { search?: { placeholder: string; label: string }; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {search && <LiveSearch placeholder={search.placeholder} label={search.label} />}
      {children}
      <div className="hidden sm:ml-auto sm:block">
        <DensityToggle />
      </div>
    </div>
  );
}

// Long lists in pages, so a dealer with a big stock or a busy year of leads gets a page that loads fast and reads well. `page` is
// 1-based and clamped, so a stale link past the end shows the last page, never an empty one.
export const PAGE_SIZE = 50;
export function paginate<T>(rows: T[], asked: string | undefined, size = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(asked ?? "1", 10) || 1));
  return { rows: rows.slice((page - 1) * size, page * size), page, pageCount, total: rows.length };
}

// Without `href`, the links keep whatever the URL holds now (search, filters, sort): the dashboard's tables. `href` is for a page that builds
// its own (the public test drive list).
export function Pager({ page, pageCount, total, href }: { page: number; pageCount: number; total: number; href?: (page: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-meta text-text-2">
        Page {page} of {pageCount}, {total} in all
      </p>
      {!href ? (
        <PagerLinks page={page} pageCount={pageCount} />
      ) : (
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className={rowButton}>
            Previous
          </Link>
        )}
        {page < pageCount && (
          <Link href={href(page + 1)} className={rowButton}>
            Next
          </Link>
        )}
      </div>
      )}
    </nav>
  );
}

// A small button in a table row: always a word, sometimes an icon before it.
export const rowButton = `inline-flex h-10 group-data-[density=compact]/shell:h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-hairline bg-card px-3 text-meta font-medium text-text transition-colors hover:border-control ${press}`;

// Filter links as chips: for a second, smaller filter under SummaryTabs (lead type, review rating).
export function FilterTabs({ items, label = "Filter" }: { items: { label: string; href: string; active: boolean; count?: number }[]; label?: string }) {
  return (
    <nav aria-label={label} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          aria-current={i.active ? "true" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-meta font-medium ${i.active ? "border-text bg-text text-ink" : "border-hairline bg-card hover:border-control"} ${press}`}
        >
          {i.label}
          {i.count !== undefined && <span className="tabular-nums">{i.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export const adminInput = "h-11 rounded-control border border-control bg-card px-3 text-body";
export const adminButton = `inline-flex h-11 items-center justify-center gap-2 rounded-control bg-accent px-5 text-meta font-semibold text-on-accent ${press}`;
export const adminButtonQuiet = `inline-flex h-11 items-center justify-center gap-2 rounded-control border border-control bg-card px-5 text-meta font-semibold ${press}`;
// For what cannot be taken back: outlined in red, never filled, so it never reads as the main action.
export const dangerButton = `inline-flex h-11 items-center justify-center gap-2 rounded-control border border-bad bg-card px-5 text-meta font-semibold text-bad ${press}`;

// A labelled form control. `children` is the control itself, so selects, textareas and inputs share one frame.
export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-meta font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="text-meta text-text-2">{hint}</span>}
      {error && (
        <span role="alert" className="text-meta text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

// Initials in a circle: a person at a glance.
export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <span aria-hidden="true" className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-hairline text-meta font-medium text-text ${className}`}>
      {initials}
    </span>
  );
}

// One choice among several, as a button that posts on its own: a server action gets the `name` and `value`. The chosen one is filled.
export function ChoiceButton({ action, name, value, active, children }: { action: (data: FormData) => void | Promise<void>; name: string; value: string; active: boolean; children: React.ReactNode }) {
  return (
    <form action={action}>
      <input type="hidden" name={name} value={value} />
      <button
        type="submit"
        aria-pressed={active}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-meta font-medium ${active ? "border-accent bg-accent text-on-accent" : "border-control bg-card text-text"} ${press}`}
      >
        {children}
      </button>
    </form>
  );
}
