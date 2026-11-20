import Link from "next/link";
import { useId } from "react";
import { NEW_TAB, card, press } from "@/components/ui";
import { Tween } from "@/components/Tween";
import { AppliedFilters, DensityToggle, Filters, LiveSearch, SortHeader, type FilterGroup } from "./TableTools";
import { PER_PAGE_DEFAULT, perPage } from "@/lib/admin/paging";
import { fmtNum } from "@/lib/admin/format";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";
export { TableFooter, type FilterGroup } from "./TableTools";

// The admin kit: the few pieces every admin page is made of. Same tokens as the site, denser and calmer.

// The page's own bar: its title and its actions. From 1024px it stays at the top while the page scrolls, so where you are and what you can
// do are always in view; the title is sized as a working tool's, not a headline.
// `back` is the way up from an inner page: one small link above the title, the same on every page, never a button among the actions.
export function PageHeader({ title, text, actions, back }: { title: string; text?: string; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:sticky lg:top-0 lg:z-20 lg:-mx-10 lg:min-h-20 lg:border-b lg:border-hairline lg:bg-surface lg:px-10 lg:py-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="-ml-1 mb-1 inline-flex min-h-11 items-center gap-0.5 rounded-control pr-2 text-meta font-medium text-text-2 hover:text-text lg:min-h-8">
            <ChevronLeftIcon aria-hidden="true" className="size-4" />
            {back.label}
          </Link>
        )}
        <h1 className="text-title font-bold">{title}</h1>
        {text && <p className="mt-0.5 max-w-measure text-meta text-text-2">{text}</p>}
      </div>
      {/* On a phone two or more actions are one full-width row of equal buttons, each icon above its label, so three fit at 360px and
          never wrap two and one. A single action (All leads) keeps its own size. From 640px they sit beside the title as they are. */}
      {actions && <div className="flex flex-wrap gap-2 max-sm:has-[>:nth-child(2)]:w-full max-sm:has-[>:nth-child(2)]:flex-nowrap max-sm:has-[>:nth-child(2)]:[&>*]:h-auto max-sm:has-[>:nth-child(2)]:[&>*]:min-h-11 max-sm:has-[>:nth-child(2)]:[&>*]:flex-1 max-sm:has-[>:nth-child(2)]:[&>*]:flex-col max-sm:has-[>:nth-child(2)]:[&>*]:gap-1 max-sm:has-[>:nth-child(2)]:[&>*]:px-2 max-sm:has-[>:nth-child(2)]:[&>*]:py-2 max-sm:has-[>:nth-child(2)]:[&>*]:text-center">{actions}</div>}
    </header>
  );
}

// A titled panel is a region named by its heading, so a screen reader can jump to it. Three kinds: the work of the page (raised, the
// default); `quiet` for what sits beside it (details, settings of the record), flat on a tint, so the eye goes to the work first; and
// `plain`, no frame at all, for a supporting block of a heading and a few lines (a card would make it look as important as the work).
// `text`: one short line under the title, when the title alone cannot say what the panel is for.
export function Panel({ title, text, count, action, children, className = "", quiet = false, plain = false }: { title?: string; text?: string; count?: number; action?: React.ReactNode; children: React.ReactNode; className?: string; quiet?: boolean; plain?: boolean }) {
  const id = useId();
  const frame = plain ? "" : quiet ? "rounded-card border border-hairline bg-row-alt p-5" : `${card} p-5`;
  return (
    <section aria-labelledby={title ? id : undefined} className={`${frame} flex min-w-0 flex-col gap-4 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3">
          {title && (
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 id={id} className="text-section font-semibold">
                {title}
                {count !== undefined && <span className="ml-2 font-normal text-text-2 tabular-nums">{count}</span>}
              </h2>
              {text && <p className="text-meta text-text-2">{text}</p>}
            </div>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// A page in two columns from 1280px: the work on the left, wider, and `aside` (what supports it) on the right. Under 1280px one column,
// the aside after the work.
export function Columns({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      <div className="flex min-w-0 flex-col gap-6">{aside}</div>
    </div>
  );
}

// The link in a panel's corner to the whole list behind it ("All leads"): one look for it everywhere.
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-0.5 text-meta font-medium text-accent-text hover:underline">
      {children}
      <ChevronRightIcon aria-hidden="true" className="size-4" />
    </Link>
  );
}

// With `href` the whole tile is a link to the page behind the number. `tone` colours the hint only when it says something good or to act on.
// A tile is a number: a chart belongs in its own panel (Analytics).
export function StatCard({ label, value, hint, tone, href }: { label: string; value: string; hint?: string; tone?: "good" | "bad" | "warn"; href?: string }) {
  const body = (
    <>
      <p className="min-h-[2lh] text-meta text-text-2">{label}</p>
      {/* Sized from the tile's own width (a container query), so tiles side by side show their figures at the same size, and a
          half-width tile on a 360px phone still fits €117,565 on one line. A year's sales (€5,864,950) take a smaller share. Anything
          longer still wraps, never spills. */}
      <p className={`font-display font-semibold leading-[1.1] tracking-[-0.02em] tabular-nums [overflow-wrap:anywhere] ${value.length > 8 ? "text-[min(2rem,15cqi)]" : "text-[min(2rem,20cqi)]"}`}>
        <Tween value={value} />
      </p>
      {hint && <p className={`text-meta ${tone === "good" ? "text-ok" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-text-2"}`}>{hint}</p>}
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
export function Meter({ value, max }: { value: number; max: number }) {
  const share = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-hairline">
      <span className="block h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
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

// Nothing to show: what that means and, with `action`, the button for the next step. `icon` sits above the title in a soft circle.
// `compact`: inside a panel beside others (the overview's lists), where a tall empty block would leave a hole.
export function EmptyState({ title, text, action, icon, compact = false }: { title: string; text?: string; action?: React.ReactNode; icon?: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 px-4 text-center ${compact ? "py-6" : "py-12"}`}>
      {icon && <span aria-hidden="true" className="mb-1 grid size-12 place-items-center rounded-full bg-row-alt text-text-2 [&>svg]:size-6">{icon}</span>}
      <p className={`${compact ? "text-body" : "text-heading"} font-semibold`}>{title}</p>
      {text && <p className="max-w-[45ch] text-body text-text-2">{text}</p>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

// `hide` keeps a less important column off narrow screens: it shows from that width up. `nowrap` keeps short values (a name, a date) on one line.
// A right-aligned column is figures, which never wrap either.
const HIDE = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell", "2xl": "hidden 2xl:table-cell" } as const;
// `sort`: the value the column sorts by; with it, its header sorts the list (sortRows does it on the server, before the list is paged).
// `quietHeader`: the header is for screen readers only (a column of tick boxes).
export type Column<T> = { key: string; header: string; quietHeader?: boolean; cell: (row: T) => React.ReactNode; align?: "right"; className?: string; hide?: keyof typeof HIDE; nowrap?: boolean; sort?: (row: T) => string | number | undefined };

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
const colClass = (c: Column<unknown>) => `${c.hide ? HIDE[c.hide] : ""} ${c.nowrap || c.align === "right" ? "whitespace-nowrap" : ""}`;

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
                {c.quietHeader ? <span className="sr-only">{c.header}</span> : c.sort && sort ? <SortHeader k={c.key} label={c.header} active={sort.key === c.key} dir={sort.dir} align={c.align} /> : c.header || <span className="sr-only">Actions</span>}
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
          className={`flex min-w-28 shrink-0 flex-col gap-0.5 rounded-card border bg-card px-4 py-3 text-text transition-colors ${i.active ? "border-accent ring-1 ring-inset ring-accent" : "border-hairline hover:border-control"} ${press}`}
        >
          <span className="text-meta text-text-2">{i.label}</span>
          {i.count !== undefined && <span className={`text-heading font-semibold tabular-nums ${i.active ? "text-accent-text" : ""}`}>{typeof i.count === "number" ? fmtNum(i.count) : i.count}</span>}
          {i.hint && <span className="text-meta text-text-2">{i.hint}</span>}
        </Link>
      ))}
    </nav>
  );
}

// Above a table: its search and one Filters button (every filter it has, in a panel), the density switch at the end of the row, and under
// them the filters that are on, as chips to take off. On a phone the search and Filters share a row and the density switch is left out.
export function TableToolbar({ search, filters }: { search?: { placeholder: string; label: string }; filters?: FilterGroup[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {search && <LiveSearch placeholder={search.placeholder} label={search.label} />}
        {filters && filters.length > 0 && <Filters groups={filters} />}
        <div className="ml-auto hidden sm:block">
          <DensityToggle />
        </div>
      </div>
      {filters && <AppliedFilters groups={filters} />}
    </div>
  );
}

// Long lists in pages, so a dealer with a big stock or a busy year of leads gets a page that loads fast and reads well. `page` is
// 1-based and clamped, so a stale link past the end shows the last page, never an empty one. `per` is the footer's Rows (?per=).
export function paginate<T>(rows: T[], asked: string | undefined, size = PER_PAGE_DEFAULT) {
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(asked ?? "1", 10) || 1));
  return { rows: rows.slice((page - 1) * size, page * size), page, pageCount, total: rows.length, per: size };
}
// A table's page from the URL (?page=, ?per=), ready for its footer: <TableFooter {...pageOf(rows, sp)} />.
export const pageOf = <T,>(rows: T[], sp: { page?: string; per?: string }) => paginate(rows, sp.page, perPage(sp.per));

// A small button in a table row: always a word, sometimes an icon before it.
export const rowButton = `inline-flex h-11 group-data-[density=compact]/shell:h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-hairline bg-card px-3 text-meta font-medium text-text transition-colors hover:border-control ${press}`;

// A page's views, one at a time (Today, Week, List): links, so the view is in the URL. Not a filter: a view changes how the page is laid out.
export function Segmented({ items, label }: { items: { label: string; href: string; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="inline-flex rounded-control border border-hairline bg-card p-1">
      {items.map((i) => (
        <Link key={i.label} href={i.href} aria-current={i.active ? "page" : undefined} className={`inline-flex min-h-11 items-center justify-center rounded-[calc(var(--radius-control)-4px)] px-4 text-meta max-sm:flex-1 font-medium ${i.active ? "bg-accent text-white" : "text-text-2 hover:text-text"} ${press}`}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

// A one-line result at the top of a page (saved, deleted, not connected). Only fixed text the page knows, never text from the URL.
const NOTICE_TONES = { good: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", neutral: "bg-hairline text-text" } as const;
export function Notice({ tone = "good", children }: { tone?: keyof typeof NOTICE_TONES; children: React.ReactNode }) {
  return (
    <p role="status" className={`rounded-control px-4 py-3 text-body ${NOTICE_TONES[tone]}`}>
      {children}
    </p>
  );
}

// A record's details as label and value pairs, two across from 640px: an order, a claim, a booking, a deposit.
export function Facts({ items }: { items: (readonly [string, React.ReactNode, string?])[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value, className = ""]) => (
        <div key={label} className="flex flex-col">
          <dt className="text-meta text-text-2">{label}</dt>
          <dd className={`text-body ${className}`}>{value}</dd>
        </div>
      ))}
    </dl>
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

// One answer from a few, as radio buttons under a legend: what happened to a deposit, why a sale was undone. Errors as Field shows them.
export function Choice({ name, options, value, onChange, legend, error, className = "" }: { name: string; options: [string, string][]; value: string; onChange: (v: string) => void; legend: string; error?: string; className?: string }) {
  return (
    <fieldset className={`flex flex-col gap-2 ${className}`}>
      <legend className="mb-1 text-meta font-medium">{legend}</legend>
      {options.map(([v, label]) => (
        <label key={v} className="flex min-h-11 items-center gap-3 text-body">
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="size-5 accent-accent" />
          {label}
        </label>
      ))}
      {error && (
        <span role="alert" className="text-meta text-destructive">
          {error}
        </span>
      )}
    </fieldset>
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
// A choice among a few (a status, who has it), filled when it is the one now. ChoiceAct (ActButton.tsx) runs it with Undo in its toast.
export const choicePill = (active: boolean) => `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-meta font-medium ${active ? "border-text bg-text text-ink" : "border-control bg-card text-text"} ${press}`;

// What needs doing, as a list a person works down: each row says what it is, why it matters now (`detail`) and has the button that does
// it (`action`), so nobody has to work out where to go. The marker on the left is the urgency: `now` (red) is late or due today, `soon`
// (amber) is coming up, `info` is worth knowing. The row's own link (`href`) opens the thing; the action sits above it and is what a press
// on it hits. Inside a Panel, or on its own as the page's first block.
const TASK_MARK = { now: "bg-bad", soon: "bg-warn", info: "bg-hairline" } as const;
const TASK_ICON = { now: "bg-bad-soft text-bad", soon: "bg-warn-soft text-warn", info: "bg-row-alt text-text-2" } as const;
export type TaskUrgency = keyof typeof TASK_MARK;
export function TaskList({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="-mx-1 flex flex-col divide-y divide-hairline">
      {children}
    </ul>
  );
}
export function Task({ title, detail, href, action, icon, urgency = "info", count }: { title: string; detail?: React.ReactNode; href?: string; action?: React.ReactNode; icon?: React.ReactNode; urgency?: TaskUrgency; count?: number }) {
  return (
    // On a phone the buttons drop under the words when both do not fit, so a name is never squeezed to a word a line.
    <li className="relative flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 py-3 pl-4 pr-1 transition-colors has-[>a:hover]:bg-surface">
      <span aria-hidden="true" className={`absolute inset-y-3 left-0 w-1 rounded-full ${TASK_MARK[urgency]}`} />
      {icon && <span aria-hidden="true" className={`hidden size-10 shrink-0 place-items-center sm:grid rounded-control [&>svg]:size-5 ${TASK_ICON[urgency]}`}>{icon}</span>}
      <span className="flex min-w-[min(12rem,100%)] flex-1 flex-col">
        <span className="font-medium">
          {count !== undefined && <span className="mr-1.5 tabular-nums">{fmtNum(count)}</span>}
          {title}
        </span>
        {detail && <span className="text-meta text-text-2">{detail}</span>}
      </span>
      {href && <Link href={href} aria-label={count !== undefined ? `${count} ${title}` : title} className="absolute inset-0" />}
      {action && <span className="relative z-10 ml-auto flex shrink-0 flex-wrap justify-end gap-2">{action}</span>}
    </li>
  );
}

// The page's main jobs as big buttons, each an icon, a verb and one line on what it is for: what a person who has never used the dashboard
// presses first. Two across on a phone, up to four across from 640px. The first is the page's primary job and is filled.
export function ActionTiles({ children, label = "Quick actions" }: { children: React.ReactNode; label?: string }) {
  return (
    <nav aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
      {children}
    </nav>
  );
}
// `external`: another site (DoneDeal), opened in a new tab and said so to screen readers.
export function ActionTile({ href, icon, label, text, primary = false, external = false }: { href: string; icon: React.ReactNode; label: string; text?: string; primary?: boolean; external?: boolean }) {
  const className = `flex min-h-24 flex-col justify-between gap-3 rounded-card border p-4 transition-colors ${primary ? "border-accent bg-accent text-on-accent" : `${card} hover:border-control`} ${press}`;
  const body = (
    <>
      <span aria-hidden="true" className={`grid size-10 place-items-center rounded-control [&>svg]:size-5 ${primary ? "bg-card text-accent-text" : "bg-row-alt text-accent-text"}`}>{icon}</span>
      <span className="flex flex-col">
        <span className="font-semibold">
          {label}
          {external && <span className="sr-only"> (opens in a new tab)</span>}
        </span>
        {text && <span className={`text-meta ${primary ? "" : "text-text-2"}`}>{text}</span>}
      </span>
    </>
  );
  return external ? (
    <a href={href} {...NEW_TAB} className={className}>
      {body}
    </a>
  ) : (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}
