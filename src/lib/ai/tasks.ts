import type { Network, PostFormat, StoryLayout } from "@/lib/admin/networks";

// What AI writing help is asked for (#179). Plain data, safe for the browser: the buttons, and the facts each task is allowed to see.
export const TASKS = ["post", "newsletter", "carDescription", "leadReply", "reviewReply"] as const;
export type Task = (typeof TASKS)[number];

export const ADJUSTS = {
  professional: "More professional",
  friendlier: "Friendlier",
  shorter: "Shorter",
  detail: "More detail",
  urgency: "Add urgency",
  hashtags: "Add hashtags",
  formal: "More formal",
  apologetic: "More apologetic",
  economy: "Highlight economy",
  family: "Highlight family use",
} as const;
export type Adjust = keyof typeof ADJUSTS;

const BY_TASK: Record<Task, Adjust[]> = {
  post: ["professional", "friendlier", "shorter", "detail", "urgency", "hashtags"],
  newsletter: ["shorter", "friendlier", "professional"],
  carDescription: ["shorter", "detail", "economy", "family"],
  leadReply: ["formal", "friendlier", "shorter"],
  reviewReply: ["apologetic", "shorter"],
};
// A story is a few words on a photo: it only gets the buttons that make sense there.
export const adjustsFor = (task: Task, format?: PostFormat): Adjust[] => (task === "post" && format === "story" ? ["shorter", "urgency"] : BY_TASK[task]);

// The only facts a prompt gets. Names and numbers come from the record; nothing else is ever passed in (no phone, no email).
export type CarFacts = { name: string; year?: number; mileageKm?: number; fuel?: string; gearbox?: string; body?: string; engineLitres?: number; colour?: string; doors?: number; seats?: number; owners?: number; nctExpiry?: string; price?: string; was?: string; features?: string[]; link?: string };
export type Voice = { signOff: string; hashtags: string };
export type FactsOf = {
  post: { dealer: string; car: CarFacts; network: Network; format: PostFormat; layout?: StoryLayout; voice: Voice };
  newsletter: { dealer: string; cars: CarFacts[]; voice: Voice };
  carDescription: { dealer: string; car: CarFacts; notes?: string };
  leadReply: { dealer: string; firstName: string; kind: string; message: string; car?: string };
  reviewReply: { dealer: string; firstName: string; rating: number; text: string };
};

// What the browser sends: ids and the form's own fields. The server builds the facts from the records, so the browser never supplies them.
export type WriteRequest =
  | { task: "post"; carSlug: string; network: Network; format: PostFormat; layout?: StoryLayout }
  | { task: "newsletter" }
  | { task: "carDescription"; fields: Record<string, string> }
  | { task: "leadReply"; leadId: string }
  | { task: "reviewReply"; reviewId: string };

export type WriteResult = { ok: true; text: string; subject?: string } | { ok: false; reason: "limit" | "failed" };
