import type { Role } from "@/lib/permission-rules";

// The Help area's pure rules (#182): who we are, the kinds of request, their statuses, and reading the form. No server code, so the form and
// the tests use them too.
export const SUPPORT = { phone: "+353 1 906 0099", email: "support@checkwork.ie", hours: "Monday to Friday, 9am to 5:30pm" } as const;
export const supportTel = `tel:${SUPPORT.phone.replace(/\s/g, "")}`;
export const supportWhatsApp = `https://wa.me/${SUPPORT.phone.replace(/\D/g, "")}`;

export const HELP_TYPES = ["Question", "Something isn't working", "Request a change", "Feedback or an idea", "Billing", "Add a module"] as const;
export type HelpType = (typeof HELP_TYPES)[number];
// Billing and module requests are the Owner's and Manager's: they are the ones who see Billing.
export const typesFor = (role: Role | null): HelpType[] => HELP_TYPES.filter((t) => (t !== "Billing" && t !== "Add a module") || role === "Owner" || role === "Manager");

export const HELP_STATUSES = ["received", "inProgress", "done"] as const;
export type HelpStatus = (typeof HELP_STATUSES)[number];
export const STATUS_LABELS: Record<HelpStatus, string> = { received: "Received", inProgress: "In progress", done: "Done" };

export const MESSAGE_MAX = 2000;
export const SCREENSHOT_MAX_BYTES = 3 * 1024 * 1024;

// The page a request came from: a dashboard path only, so a link in the URL can never put anything else in the record.
export function safeFrom(raw: unknown): string {
  const s = typeof raw === "string" ? raw.split("?")[0] : "";
  return /^\/dashboard(\/[a-z0-9-]{1,60}){0,4}$/.test(s) ? s : "/dashboard";
}

export function parseRequest(get: (k: string) => string, role: Role | null): { value?: { type: HelpType; message: string; steps?: string }; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const type = typesFor(role).find((t) => t === get("type"));
  const message = get("message").trim();
  const steps = get("steps").trim();
  if (!type) errors.type = "Choose what this is about";
  if (!message) errors.message = "Write a few words";
  else if (message.length > MESSAGE_MAX) errors.message = `Keep it under ${MESSAGE_MAX} characters`;
  if (steps.length > MESSAGE_MAX) errors.steps = `Keep it under ${MESSAGE_MAX} characters`;
  if (Object.keys(errors).length || !type) return { errors };
  return { value: { type, message, ...(type === "Something isn't working" && steps && { steps }) }, errors };
}

// Quick feedback is asked at most once a quarter per person.
export const FEEDBACK_EVERY_DAYS = 90;
export const feedbackDue = (lastAt: number | undefined, now: number) => lastAt === undefined || now - lastAt >= FEEDBACK_EVERY_DAYS * 86_400_000;
