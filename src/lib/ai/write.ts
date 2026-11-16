import "server-only";
import { modeOf } from "@/lib/integrations";
import { mockText } from "./mock";
import type { Adjust, FactsOf, Task } from "./tasks";

// The one place text is written for the dashboard (#179). The caller has already checked the module and the usage cap, and counts the use after.
// On the demo (simulated) it is the mock in mock.ts, after a short pause so it feels like writing. A failure is a result, never a throw, so the
// dealer's own text is left alone.
// ADAPTER GOES HERE: with ANTHROPIC_API_KEY, call the Claude API (model claude-opus-5-5) with one prompt per task kept in one file, the fixed
// instructions and the dealer's voice marked for prompt caching, only `facts` in the user turn, and a refusal or an error returned as
// { ok: false }. The output goes through the same dash strip as the mock. Haiku may do for alt text and summaries (owner's decision).
const PAUSE_MS = 700;
export type Written = { ok: true; text: string; subject?: string } | { ok: false };

export async function writeWithAI<T extends Task>(task: T, facts: FactsOf[T], adjust?: Adjust, current = ""): Promise<Written> {
  if (modeOf("ai") !== "simulated") return { ok: false };
  await new Promise((r) => setTimeout(r, PAUSE_MS));
  const text = mockText(task, facts, adjust, current);
  return text ? { ok: true, text, ...(task === "newsletter" && { subject: (facts as FactsOf["newsletter"]).cars.length ? `New arrivals at ${(facts as FactsOf["newsletter"]).dealer}` : `News from ${(facts as FactsOf["newsletter"]).dealer}` }) } : { ok: false };
}
