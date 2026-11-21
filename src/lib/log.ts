import type { Outcome } from "@/lib/leads/process";
import type { LeadType } from "@/lib/leads/schema";

// The only logger in the lead path. It takes the allowed keys and builds the line from them by name, so nothing
// else can reach Workers Logs (D-08). Unsent and failed leads go out at error level so they stand out. status: an HTTP status, never a body.
export function logLead({ leadId, type, outcome, status }: { leadId?: string; type: LeadType | "n/a"; outcome: Outcome; status?: number }): void {
  const line = JSON.stringify({ leadId, type, outcome, status });
  if (outcome === "error" || outcome === "notify_failed" || outcome === "mirror_failed" || outcome === "dash_failed") console.error(line);
  else console.log(line);
}
