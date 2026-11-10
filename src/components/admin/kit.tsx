import Link from "next/link";
import { useId } from "react";
import { card, press } from "@/components/ui";

// The admin kit: the few pieces every admin page is made of. Same tokens as the site, denser and calmer.

export function PageHeader({ title, text, actions }: { title: string; text?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-display font-bold">{title}</h1>
        {text && <p className="mt-1 max-w-measure text-body text-text-2">{text}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

// A titled panel is a region named by its heading, so a screen reader can jump to it.
export function Panel({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={title ? id : undefined} className={`${card} flex min-w-0 flex-col gap-4 p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h2 id={id} className="text-heading font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// With `href` the whole tile is a link to the page behind the number.
export function StatCard({ label, value, hint, tone, href }: { label: string; value: string; hint?: string; tone?: "good" | "bad"; href?: string }) {
  const body = (
    <>
      <p className="text-meta text-text-2">{label}</p>
      <p className="text-stat font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-display">{value}</p>
      {hint && <p className={`text-meta ${tone === "good" ? "text-ok" : tone === "bad" ? "text-bad" : "text-text-2"}`}>{hint}</p>}
    </>
  );
  const frame = `${card} flex min-w-0 flex-col gap-1 p-4`;
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
export type Tone = keyof typeof TONES;
// A short status in words, never a colour alone.
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-meta font-semibold ${TONES[tone]}`}>{children}</span>;
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
const HIDE = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell", xl: "hidden xl:table-cell" } as const;
export type Column<T> = { key: string; header: string; cell: (row: T) => React.ReactNode; align?: "right"; className?: string; hide?: keyof typeof HIDE; nowrap?: boolean };
const colClass = (c: Column<unknown>) => `${c.hide ? HIDE[c.hide] : ""} ${c.nowrap ? "whitespace-nowrap" : ""}`;

// A table that scrolls sideways inside its card on a phone and never makes the page scroll.
// `bare` drops the table's own card, for use inside a Panel. `linkRows`: each row is one link, the one with `after:absolute after:inset-0` in its first cell, so the whole row is clickable.
export function DataTable<T>({ columns, rows, rowKey, empty, bare = false, linkRows = false }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: React.ReactNode; bare?: boolean; linkRows?: boolean }) {
  const frame = bare ? "" : card;
  if (rows.length === 0) return <div className={frame}>{empty ?? <EmptyState title="Nothing here yet" />}</div>;
  return (
    // Focusable, so a keyboard user can scroll it sideways on a phone.
    <div tabIndex={0} className={`${frame} overflow-x-auto`}>
      <table className="w-full min-w-[22rem] border-collapse text-left text-body">
        <thead>
          <tr className="border-b border-hairline text-meta text-text-2">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`relative px-4 py-3 font-semibold ${c.align === "right" ? "text-right" : ""} ${colClass(c as Column<unknown>)}`}>
                {/* The screen reader text is positioned inside this cell (relative above), so the scroll box clips it and it cannot widen the page. */}
                {c.header || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((r) => (
            <tr key={rowKey(r)} className={`align-top ${linkRows ? "relative transition-colors hover:bg-surface" : ""}`}>
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right tabular-nums" : ""} ${c.className ?? ""} ${colClass(c as Column<unknown>)}`}>
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

// Filter links: the filter lives in the URL, so a filtered list can be shared and the back button works.
export function FilterTabs({ items, label = "Filter" }: { items: { label: string; href: string; active: boolean; count?: number }[]; label?: string }) {
  return (
    <nav aria-label={label} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          aria-current={i.active ? "true" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-meta font-semibold ${i.active ? "border-accent bg-accent text-on-accent" : "border-control"} ${press}`}
        >
          {i.label}
          {i.count !== undefined && <span className="tabular-nums font-normal">{i.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export const adminInput = "h-11 rounded-control border border-control bg-card px-3 text-body";
export const adminButton = `inline-flex h-11 items-center justify-center gap-2 rounded-control bg-accent px-5 text-meta font-semibold text-on-accent ${press}`;
export const adminButtonQuiet = `inline-flex h-11 items-center justify-center gap-2 rounded-control border border-control bg-card px-5 text-meta font-semibold ${press}`;

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
