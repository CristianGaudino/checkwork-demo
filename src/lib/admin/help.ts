import "server-only";
import { DAY, HOUR } from "@/lib/time";
import { getBindings } from "@/lib/leads/bindings";
import { sniffImage } from "@/lib/leads/photos";
import { defineCollection } from "./docs";
import { newId } from "./ids";
import { notify } from "./notifications";
import { SCREENSHOT_MAX_BYTES, type HelpStatus, type HelpType } from "./help-rules";

// What the team sends us from the dashboard, and our replies (#182). One record each. On a real site a request is also emailed to us and
// passed to the owner's program (#174, #62); on the demo it is only saved, so nothing leaves the site.
export type HelpRequest = {
  id: string;
  type: HelpType;
  message: string;
  steps?: string; // for "Something isn't working": what they were doing and what happened
  screenshot?: string; // where the dealer's image is kept: a bucket key, or a data URL with no bucket
  from: string; // the dashboard page they were on
  name: string;
  role: string;
  status: HelpStatus;
  reply?: string;
  repliedAt?: number;
  at: number;
};
export const helpStore = defineCollection<HelpRequest>("help-requests", seedRequests);
// The last feedback each person gave (by name), so it is asked for at most once a quarter.
export type HelpFeedback = { id: string; at: number; score: number; note?: string };
export const feedbackStore = defineCollection<HelpFeedback>("help-feedback", () => []);

export async function requestsOf(name: string): Promise<HelpRequest[]> {
  return (await helpStore.list()).filter((r) => r.name === name).sort((a, b) => b.at - a.at);
}

// Checks the dealer's image by its bytes and keeps it. null: not an image, or too big.
// shortcut: with no bucket (next dev, E2E) the image is kept in the record as a data URL; a real site has the bucket.
export async function storeScreenshot(id: string, file: unknown): Promise<string | null> {
  if (!(file instanceof Blob) || file.size === 0 || file.size > SCREENSHOT_MAX_BYTES) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return null;
  const bucket = getBindings().LEAD_PHOTOS;
  if (!bucket) return `data:${kind.contentType};base64,${Buffer.from(bytes).toString("base64")}`;
  const key = `help/${id}.${kind.ext}`;
  await bucket.put(key, bytes.slice().buffer, { httpMetadata: { contentType: kind.contentType } });
  return key;
}

export async function addRequest(r: Omit<HelpRequest, "id" | "status" | "at">): Promise<HelpRequest> {
  const full: HelpRequest = { ...r, id: newId("help"), status: "received", at: Date.now() };
  await helpStore.put(full);
  // ADAPTER GOES HERE: email the request to support and send it to the owner's program. The demo sends nothing outside.
  await notify({ kind: "help", text: `We got your request: ${r.type}`, href: "/dashboard/help", for: r.name });
  return full;
}

function seedRequests(): HelpRequest[] {
  const now = Date.now();
  const reply = (r: Omit<HelpRequest, "role" | "reply" | "repliedAt">, text: string, after: number): HelpRequest => ({ ...r, role: r.name === "Aoife Brennan" ? "Owner" : "Manager", reply: text, repliedAt: r.at + after });
  return [
    reply({ id: "help-seed-1", type: "Request a change", message: "Can you change our Saturday closing time to 4pm?", from: "/dashboard/settings", name: "Aoife Brennan", status: "done", at: now - 12 * DAY }, "Done. Saturday now closes at 4pm on the site. Anything else, tell us.", 5 * HOUR),
    reply({ id: "help-seed-2", type: "Question", message: "Can Sales see the margin on a car?", from: "/dashboard/margins", name: "Aoife Brennan", status: "done", at: now - 5 * DAY }, "No. Only the Owner, Manager and Finance roles see margins. You can change a person's role under Settings, Team.", 3 * HOUR),
    reply({ id: "help-seed-3", type: "Feedback or an idea", message: "It would help to see which leads were assigned to me on the overview.", from: "/dashboard", name: "Aoife Brennan", status: "inProgress", at: now - 2 * DAY }, "Good idea. We have added it to the list and will let you know when it is ready.", 20 * HOUR),
    reply({ id: "help-seed-4", type: "Question", message: "How do I add a second photo to a car?", from: "/dashboard/stock", name: "Ciara Walsh", status: "done", at: now - 9 * DAY }, "Open the car, then Photos, and choose Add photos. You can add up to 20 and drag to put the best one first.", 2 * HOUR),
  ];
}
