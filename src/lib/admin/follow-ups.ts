import type { Lead } from "./collections";
import { HOUR } from "@/lib/time";

// A follow-up is due on its day and after, while the lead is still open. Won and lost leads have none. Type imports only, so the overview
// and its tests can use it without the record store.
export const isOpenLead = (l: Pick<Lead, "status">) => l.status !== "won" && l.status !== "lost";
// A new lead nobody has answered within the dealer's reply target (settings.leadSlaHours).
export const pastReplyTarget = (l: Pick<Lead, "status" | "createdAt">, now: number, slaHours: number) => l.status === "new" && now - l.createdAt > slaHours * HOUR;
export const followUpDue = (l: Pick<Lead, "status" | "followUpOn">, today: string) => Boolean(l.followUpOn && isOpenLead(l) && l.followUpOn <= today);
