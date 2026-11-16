"use client";

import { adminButtonQuiet } from "@/components/admin/kit";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={adminButtonQuiet}>
      Print or save as PDF
    </button>
  );
}
