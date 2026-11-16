import { Meter } from "@/components/admin/kit";
import { fmtNum, threeLetter } from "@/lib/admin/format";

// Charts drawn by hand in SVG and HTML: no library, nothing to load. Colours come from the tokens, so both themes work. Each chart
// carries its numbers as text for a screen reader, and never relies on colour alone.

type Point = { label: string; value: number };

// A filled line over time. The line keeps a constant width however the box is stretched (non-scaling-stroke).
// `format` writes a value (euros on Reports, a plain count on Analytics), in the caption and the table read aloud.
export function AreaChart({ data, summary, format = fmtNum }: { data: Point[]; summary: string; format?: (n: number) => string }) {
  const W = 600;
  const H = 180;
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * W : W / 2);
  const y = (v: number) => H - 8 - (v / max) * (H - 24);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(" ");
  const area = data.length ? `${line} L${x(data.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z` : "";
  const peak = data.reduce((m, d) => (d.value > m.value ? d : m), data[0] ?? { label: "", value: 0 });
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={summary} className="h-44 w-full text-accent-text">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H - 8 - f * (H - 24)} y2={H - 8 - f * (H - 24)} stroke="var(--color-hairline)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill="currentColor" opacity="0.12" />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="flex flex-wrap justify-between gap-x-4 text-meta text-text-2">
        <span>{data[0]?.label}</span>
        <span className="order-last basis-full sm:order-none sm:basis-auto">
          Busiest: {peak.label}, {format(peak.value)}
        </span>
        <span>{data.at(-1)?.label}</span>
      </figcaption>
      {/* A div clips the hidden table: a table ignores a 1px width, and would stretch the page. */}
      <div className="sr-only">
      <table>
        <caption>{summary}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}

// Horizontal bars with the number beside each. `of` is what a full bar means (the biggest value by default).
export function BarList({ items, of, format = fmtNum }: { items: { label: string; value: number; note?: string }[]; of?: number; format?: (n: number) => string }) {
  const full = of ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-body">
            <span className="min-w-0">{i.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {format(i.value)}
              {i.note && <span className="ml-2 text-meta font-normal text-text-2">{i.note}</span>}
            </span>
          </div>
          <Meter value={i.value} max={full} />
        </li>
      ))}
    </ul>
  );
}

const weekOf = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", timeZone: "Europe/Dublin" });
const weekShort = new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "numeric", timeZone: "Europe/Dublin" }); // 18/9, for a phone

// The overview's one main chart: leads each week for eight weeks, this one last and the only one in the accent, against a dashed line at a
// usual week. It answers whether this week is a normal one. Each bar has its count over it, each week its start under it; read aloud whole.
export function LeadsByWeek({ weeks, starts, usual }: { weeks: number[]; starts: number[]; usual: number }) {
  const max = Math.max(1, usual, ...weeks);
  const now = weeks.at(-1) ?? 0;
  return (
    <figure className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-[2rem] font-semibold leading-none tabular-nums">{now}</span>
        <span className={`text-meta ${now >= usual ? "text-ok" : "text-bad"}`}>
          this week, against {usual} in a usual week
        </span>
      </div>
      {/* The usual week is a dashed line behind the bars; each count sits on the card's colour, so the line passes behind it. */}
      <div className="relative grid h-40 grid-cols-8 items-end gap-2" aria-hidden>
        <span className="absolute inset-x-0 border-t border-dashed border-control" style={{ bottom: `${(usual / max) * 86}%` }} />
        {weeks.map((n, i) => (
          <span key={i} className="relative flex h-full flex-col items-center justify-end gap-1">
            <span className={`relative z-10 rounded-sm bg-card px-1.5 py-0.5 text-meta tabular-nums ${i === weeks.length - 1 ? "font-medium text-text" : "text-text-2"}`}>{n}</span>
            <span className={`w-full max-w-10 rounded-t-control ${i === weeks.length - 1 ? "bg-accent" : "bg-chart-muted"}`} style={{ height: `${Math.max(2, (n / max) * 86)}%` }} />
          </span>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-2 text-center text-meta text-text-2" aria-hidden>
        {starts.map((t, i) => (
          // On a phone every other date, short (18/9), so none run into the next or past the screen; this week always, as Now.
          <span key={t} className={`min-w-0 whitespace-nowrap ${i === starts.length - 1 ? "font-medium text-text" : i % 2 || i === starts.length - 2 ? "max-sm:invisible" : ""}`}>
            {i === starts.length - 1 ? (
              <>
                <span className="max-sm:hidden">This week</span>
                <span className="sm:hidden">Now</span>
              </>
            ) : (
              <>
                <span className="max-sm:hidden">{threeLetter(weekOf.format(t))}</span>
                <span className="sm:hidden">{weekShort.format(t)}</span>
              </>
            )}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        Leads each week for the last eight weeks, from the week of {threeLetter(weekOf.format(starts[0]))}: {weeks.join(", ")}. A usual week has {usual}.
      </figcaption>
    </figure>
  );
}

// How long a car has been for sale, on a scale to `full` days: amber from `late`, when it is worth a price check. The days are written beside.
export function AgeBar({ days, late, full = 90 }: { days: number; late: number; full?: number }) {
  return (
    <span aria-hidden className="block h-1.5 w-16 overflow-hidden rounded-full bg-hairline">
      <span className={`block h-full rounded-full ${days >= late ? "bg-warn" : "bg-control"}`} style={{ width: `${Math.min(100, (days / full) * 100)}%` }} />
    </span>
  );
}

// Where a record is on its way, as dots in a table row: the steps done, the one it is at (larger, in the accent), the rest to come. A list
// of them reads down the column at a glance. A record's own page has its status buttons, which say the same, so it has none.
export function StepDots({ steps, at, className = "" }: { steps: readonly string[]; at: number; className?: string }) {
  return (
    <span role="img" aria-label={`Step ${at + 1} of ${steps.length}: ${steps[at]}`} className={`inline-flex items-center gap-1 ${className}`}>
        {steps.map((s, i) => (
          <span key={s} className={`rounded-full ${i === at ? "size-2.5 bg-accent" : `size-2 ${i < at ? "bg-text-2" : "bg-hairline"}`}`} />
      ))}
    </span>
  );
}

// Time used of a span (a warranty, from the sale to its end): how much is left at a glance, the words saying it exactly.
export function TimeLeft({ from, to, now, text }: { from: number; to: number; now: number; text: string }) {
  const used = to > from ? Math.min(1, Math.max(0, (now - from) / (to - from))) : 1;
  return (
    <span className="flex flex-col gap-1.5">
      <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-hairline">
        <span className={`block h-full rounded-full ${used >= 1 ? "bg-control" : used > 0.85 ? "bg-warn" : "bg-ok"}`} style={{ width: `${used * 100}%` }} />
      </span>
      <span className="text-meta text-text-2">{text}</span>
    </span>
  );
}
