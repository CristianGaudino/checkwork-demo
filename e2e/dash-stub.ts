import { expect } from "@playwright/test";

// The stub dealer dashboard (dash-stub-server.mjs) that playwright.config.ts runs for the whole E2E run, beside the site on PORT, so two
// runs on different ports do not clash.
export const DASH_STUB_PORT = Number(process.env.PORT ?? 3000) + 11;
export const DASH_STUB_URL = `http://127.0.0.1:${DASH_STUB_PORT}`;

export type DashBody = { lead: { name: string; type: string; email?: string; phone?: string; carSlug?: string; sourcePath?: string; details: Record<string, string> }; emailed?: boolean; photoCount?: number; journey?: unknown };

// Every lead body the stub has received so far, from any spec.
export const dashBodies = async (): Promise<DashBody[]> => (await fetch(`${DASH_STUB_URL}/bodies`)).json();

// The lead a spec just sent, found by its name (which no other spec sends: the stub takes every spec's leads). The send runs after the
// buyer's answer, so it is waited for.
export async function leadSentTo(name: string): Promise<DashBody> {
  let body: DashBody | undefined;
  await expect.poll(async () => (body = (await dashBodies()).find((b) => b.lead.name === name))).toBeTruthy();
  return body!;
}
