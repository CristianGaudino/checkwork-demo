"use client";

import { useState } from "react";
import { DEALER_PHONE } from "@/lib/site";

// On a computer a tel: link has nothing to open, so the number can be copied instead. Shown only where the pointer is a mouse; a phone
// has the Call button. The label says it worked, and is read out.
export function CopyPhone() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(DEALER_PHONE);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // clipboard refused (an old browser, a blocked permission): the number is on the Call button to read
        }
      }}
      className="hidden min-h-11 items-center self-start text-body text-text-2 underline pointer-fine:inline-flex"
    >
      <span aria-live="polite">{copied ? "Number copied" : `Copy ${DEALER_PHONE}`}</span>
    </button>
  );
}
