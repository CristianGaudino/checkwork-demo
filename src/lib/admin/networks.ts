// Where a post can go. Apart from the records so the post composer (a client component) can use it.
export const NETWORKS = ["Facebook", "Instagram", "TikTok"] as const;
export type Network = (typeof NETWORKS)[number];
