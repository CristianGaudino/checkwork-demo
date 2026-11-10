import { Meter } from "@/components/admin/kit";
import { fmtNum } from "@/lib/admin/format";

// Charts drawn by hand in SVG and HTML: no library, nothing to load. Colours come from the tokens, so both themes work. Each chart
// carries its numbers as text for a screen reader, and never relies on colour alone.

type Point = { label: string; value: number };

// A filled line over time. The line keeps a constant width however the box is stretched (non-scaling-stroke).
export function AreaChart({ data, summary }: { data: Point[]; summary: string }) {
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
        <span>
          Busiest: {peak.label}, {fmtNum(peak.value)}
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
              <td>{d.value}</td>
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
            <span className="min-w-0 truncate">{i.label}</span>
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
