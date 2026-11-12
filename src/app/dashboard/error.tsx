"use client";

import { adminButton } from "@/components/admin/kit";
import { CONNECTION_ERROR } from "@/lib/copy";

// A dashboard page that failed to load: inside the dashboard's frame, so its menu stays (the site's own error screen would replace the
// whole frame). Nothing is logged: the error and the URL are request data.
export default function DashboardError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <h1 className="text-display font-bold">Something went wrong</h1>
      <p className="max-w-[45ch] text-body text-text-2">{CONNECTION_ERROR}</p>
      <button type="button" onClick={() => retry()} className={`mt-2 ${adminButton}`}>
        Try again
      </button>
    </div>
  );
}
