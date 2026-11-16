import "server-only";
import { modeOf } from "@/lib/integrations";
import { getBindings } from "@/lib/leads/bindings";
import { claudeText } from "./claude";
import { mockText } from "./mock";
import type { Adjust, FactsOf, Task } from "./tasks";

// The one place text is written for the dashboard (#179). The caller has already checked the module and the usage cap, and counts the use after.
// On the demo (simulated) it is the mock in mock.ts, after a short pause so it feels like writing. A failure is a result, never a throw, so the
// dealer's own text is left alone.
// With ANTHROPIC_API_KEY set (live) the text comes from Claude, with every prompt in claude.ts.
const PAUSE_MS = 700;
export type Written = { ok: true; text: string; subject?: string } | { ok: false };

const subject = (f: FactsOf["newsletter"]) => (f.cars.length ? `New arrivals at ${f.dealer}` : `News from ${f.dealer}`);

export async function writeWithAI<T extends Task>(task: T, facts: FactsOf[T], adjust?: Adjust, current = ""): Promise<Written> {
  const mode = modeOf("ai");
  if (mode === "off") return { ok: false };
  let text: string | null;
  if (mode === "live") {
    // A backstop on top of the monthly cap: at most AI_LIMITER's calls a minute for the whole site (wrangler.jsonc), so nothing can run up a bill.
    const limiter = getBindings().AI_LIMITER;
    if (limiter && !(await limiter.limit({ key: "ai" })).success) return { ok: false };
    text = await claudeText(task, facts, adjust, current);
  }
  else {
    await new Promise((r) => setTimeout(r, PAUSE_MS));
    text = mockText(task, facts, adjust, current);
  }
  return text ? { ok: true, text, ...(task === "newsletter" && { subject: subject(facts as FactsOf["newsletter"]) }) } : { ok: false };
}
