import type { AdminReview } from "./collections";

export type ReviewFilter = "all" | "unreplied" | "flagged" | "low";
export const REVIEW_FILTERS: [ReviewFilter, string][] = [["all", "All"], ["unreplied", "Needs a reply"], ["low", "3 stars or fewer"], ["flagged", "Flagged"]];
export const parseReviewFilter = (v: unknown): ReviewFilter => (REVIEW_FILTERS.some(([k]) => k === v) ? (v as ReviewFilter) : "all");

export function filterReviews(reviews: AdminReview[], f: ReviewFilter): AdminReview[] {
  return reviews
    .filter((r) => (f === "unreplied" ? !r.reply : f === "flagged" ? r.flagged : f === "low" ? r.rating <= 3 : true))
    .sort((a, b) => b.createdAt - a.createdAt);
}

// Average and how many reviews at each star, five down to one. Zero reviews gives a zero average, never NaN.
export function ratingSummary(reviews: AdminReview[]) {
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length }));
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return { average, count: reviews.length, distribution };
}
