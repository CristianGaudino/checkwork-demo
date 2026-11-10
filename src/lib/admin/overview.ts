import type { AdminReview, Lead, TestDrive } from "./collections";
import { DAY, HOUR } from "./seed-data";

// The numbers on the dealer's overview, worked out from the records. Pure, so the rules are tested.
export type Attention = { key: string; label: string; count: number; href: string };

export function overview(input: { leads: Lead[]; drives: TestDrive[]; reviews: AdminReview[]; now?: number; slaHours?: number }) {
  const now = input.now ?? Date.now();
  const sla = (input.slaHours ?? 24) * HOUR;
  const { leads, drives, reviews } = input;
  const week = leads.filter((l) => l.createdAt >= now - 7 * DAY);
  const prevWeek = leads.filter((l) => l.createdAt >= now - 14 * DAY && l.createdAt < now - 7 * DAY);
  const decided = leads.filter((l) => l.status === "won" || l.status === "lost");
  const won = leads.filter((l) => l.status === "won");
  const upcoming = drives.filter((d) => d.startsAt >= now && d.startsAt < now + 7 * DAY && (d.status === "requested" || d.status === "confirmed")).sort((a, b) => a.startsAt - b.startsAt);
  const rated = reviews.filter((r) => r.rating > 0);

  const attention: Attention[] = [
    { key: "slow", label: "New leads past your reply target", count: leads.filter((l) => l.status === "new" && now - l.createdAt > sla).length, href: "/admin/leads?status=new" },
    { key: "drives", label: "Test drives to confirm", count: drives.filter((d) => d.status === "requested" && d.startsAt >= now).length, href: "/admin/test-drives?status=requested" },
    { key: "reviews", label: "Reviews without a reply", count: reviews.filter((r) => !r.reply).length, href: "/admin/reviews?filter=unreplied" },
  ].filter((a) => a.count > 0);

  return {
    leadsThisWeek: week.length,
    leadsChange: week.length - prevWeek.length,
    newLeads: leads.filter((l) => l.status === "new").length,
    winRate: decided.length ? (won.length / decided.length) * 100 : 0,
    upcomingDrives: upcoming,
    averageRating: rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0,
    reviewCount: rated.length,
    recentLeads: [...leads].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6),
    attention,
  };
}
