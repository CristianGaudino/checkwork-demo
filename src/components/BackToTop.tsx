"use client";

import { scrollBehavior } from "./useMediaQuery";

// A text link in the footer that takes the reader back to the top of any page. A button, not an anchor: it needs no hash in the URL.
export function BackToTop({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })} className={className}>
      Back to top
    </button>
  );
}
