"use client";

import { useCallback, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";

// Two rows of make pills that scroll sideways together (docs/mobile-navigation.md). A finger swipes them; with a mouse, the arrows under
// them move most of a screen at a time (on a desktop only: from 1024px with a fine pointer, and only when the rows are wider
// than the screen). The edges fade. Keyboard: Tab moves pill by pill, and the browser scrolls each into view.
const arrow = "flex size-9 items-center justify-center rounded-full border border-hairline bg-card text-text transition-colors hover:bg-hairline";

export function MakeRows({ rows, label }: { rows: React.ReactNode[]; label: string }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  const measure = useCallback((node: HTMLDivElement | null) => {
    setEl(node);
    if (!node) return;
    const o = new ResizeObserver(() => setOverflows(node.scrollWidth > node.clientWidth + 1));
    o.observe(node);
    return () => o.disconnect();
  }, []);
  const by = (dir: 1 | -1) => el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  return (
    <div className="flex flex-col gap-3">
      <div
        ref={measure}
        role="group"
        aria-label={label}
        className="scrollbar-none -mx-4 flex flex-col gap-2 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-2rem),transparent)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        {rows}
      </div>
      {overflows && (
        <div className="hidden justify-end gap-2 lg:pointer-fine:flex">
          <button type="button" aria-label="Scroll makes left" onClick={() => by(-1)} className={arrow}>
            <ChevronLeftIcon className="size-5" />
          </button>
          <button type="button" aria-label="Scroll makes right" onClick={() => by(1)} className={arrow}>
            <ChevronRightIcon className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
