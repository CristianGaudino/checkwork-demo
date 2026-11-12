// Where a post can go. Apart from the records so the post composer (a client component) can use it.
export const NETWORKS = ["Facebook", "Instagram", "TikTok"] as const;
export type Network = (typeof NETWORKS)[number];
// Where an ad runs, and the composer's limits: the form shows them and the server checks the same numbers.
export const AD_PLATFORMS = ["Meta", "Google"] as const;
export type AdPlatform = (typeof AD_PLATFORMS)[number];
export const POST_LIMITS = { text: 1000, photos: 4, budgetMin: 20, budgetMax: 5000, budgetDefault: 100 } as const;
