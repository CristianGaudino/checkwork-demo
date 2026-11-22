// The stub dealer dashboard (dash-stub-server.mjs) that playwright.config.ts runs for the whole E2E run, beside the site on PORT, so two
// runs on different ports do not clash.
export const DASH_STUB_PORT = Number(process.env.PORT ?? 3000) + 11;
export const DASH_STUB_URL = `http://127.0.0.1:${DASH_STUB_PORT}`;

export type DashBody = { lead: { name: string }; journey?: unknown };

// Every lead body the stub has received so far, from any spec.
export const dashBodies = async (): Promise<DashBody[]> => (await fetch(`${DASH_STUB_URL}/bodies`)).json();
