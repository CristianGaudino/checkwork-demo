import Link from "next/link";
import { useId } from "react";
import { card, press } from "@/components/ui";

// The admin kit: the few pieces every admin page is made of. Same tokens as the site, denser and calmer.

export function PageHeader({ title, text, actions }: { title: string; text?: string; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-display font-bold">{title}</h1>
        {text && <p className="mt-1 max-w-[65ch] text-body text-text-2">{text}</p>}
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

export function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <div className={`${card} flex min-w-0 flex-col gap-1 p-4`}>
      <p className="text-meta text-text-2">{label}</p>
      <p className="truncate text-display font-bold tabular-nums">{value}</p>
      {hint && <p className={`text-meta ${tone === "good" ? "text-better" : tone === "bad" ? "text-destructive" : "text-text-2"}`}>{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

const TONES = { neutral: "bg-hairline text-text", good: "bg-better/15 text-better", warn: "bg-warning/15 text-warning", bad: "bg-destructive/15 text-destructive", info: "bg-accent/15 text-accent" } as const;
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

export type Column<T> = { key: string; header: string; cell: (row: T) => React.ReactNode; align?: "right"; className?: string };

// A table that scrolls sideways inside its card on a phone and never makes the page scroll.
// `bare` drops the table's own card, for use inside a Panel.
export function DataTable<T>({ columns, rows, rowKey, empty, bare = false }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; empty?: React.ReactNode; bare?: boolean }) {
  const frame = bare ? "" : card;
  if (rows.length === 0) return <div className={frame}>{empty ?? <EmptyState title="Nothing here yet" />}</div>;
  return (
    <div className={`${frame} overflow-x-auto`}>
      <table className="w-full min-w-[22rem] border-collapse text-left text-body">
        <thead>
          <tr className="border-b border-hairline text-meta text-text-2">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`px-4 py-3 font-semibold ${c.align === "right" ? "text-right" : ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="align-top">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right tabular-nums" : ""} ${c.className ?? ""}`}>
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
export function FilterTabs({ items }: { items: { label: string; href: string; active: boolean; count?: number }[] }) {
  return (
    <nav aria-label="Filter" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((i) => (
        <Link
          key={i.label}
          href={i.href}
          aria-current={i.active ? "true" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-meta font-semibold ${i.active ? "border-accent bg-accent text-on-accent" : "border-control"} ${press}`}
        >
          {i.label}
          {i.count !== undefined && <span className="tabular-nums opacity-80">{i.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export const adminInput = "h-11 w-full rounded-control border border-control bg-card px-3 text-body";
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
