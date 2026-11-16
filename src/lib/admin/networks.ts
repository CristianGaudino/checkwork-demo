// Where a post can go. Apart from the records so the post composer (a client component) can use it.
export const NETWORKS = ["Facebook", "Instagram", "TikTok"] as const;
export type Network = (typeof NETWORKS)[number];
// Where an ad runs, and the composer's limits: the form shows them and the server checks the same numbers.
export const AD_PLATFORMS = ["Meta", "Google"] as const;
export type AdPlatform = (typeof AD_PLATFORMS)[number];
export const POST_LIMITS = { text: 1000, photos: 4, budgetMin: 20, budgetMax: 5000, budgetDefault: 100 } as const;

// What a post is: a feed post, a story (9:16, with a ready layout), a reel or TikTok video, or a carousel of photos.
export const POST_FORMATS = ["post", "story", "reel", "carousel"] as const;
export type PostFormat = (typeof POST_FORMATS)[number];
export const FORMAT_LABELS: Record<PostFormat, string> = { post: "Post", story: "Story", reel: "Reel or video", carousel: "Carousel" };
export const STORY_LAYOUTS = ["just-in", "price-drop"] as const;
export type StoryLayout = (typeof STORY_LAYOUTS)[number];
export const LAYOUT_LABELS: Record<StoryLayout, string> = { "just-in": "Just in", "price-drop": "Price drop" };
// What each network takes, and how it goes out. "auto": the network's publishing API takes it from us. "prepare": we make it ready and the dealer
// posts it from the phone. Facebook Page stories are limited in the API and Instagram's API cannot add the link sticker, so both stories are
// prepared; TikTok's posting API holds an unaudited app's posts as private, so TikTok is prepared until the app is audited.
export const FORMATS_FOR: Record<Network, readonly PostFormat[]> = { Facebook: ["post", "story", "reel", "carousel"], Instagram: ["post", "story", "reel", "carousel"], TikTok: ["post", "reel", "carousel"] };
export const PUBLISH_MODE: Record<Network, Partial<Record<PostFormat, "auto" | "prepare">>> = {
  Facebook: { post: "auto", carousel: "auto", reel: "auto", story: "prepare" },
  Instagram: { post: "auto", carousel: "auto", reel: "auto", story: "prepare" },
  TikTok: { post: "prepare", reel: "prepare", carousel: "prepare" },
};
// Photos and video per format (the server checks the same numbers). Video seconds: a story is 60, a reel 90 on the demo.
export const FORMAT_LIMITS: Record<PostFormat, { photos: [min: number, max: number]; video: boolean; maxSeconds: number }> = {
  post: { photos: [0, 4], video: false, maxSeconds: 0 },
  story: { photos: [0, 1], video: true, maxSeconds: 60 },
  reel: { photos: [0, 0], video: true, maxSeconds: 90 },
  carousel: { photos: [2, 10], video: false, maxSeconds: 0 },
};
