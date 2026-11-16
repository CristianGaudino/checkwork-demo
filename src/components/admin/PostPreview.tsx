import { FORMAT_LABELS, LAYOUT_LABELS, type Network, type PostFormat, type StoryLayout } from "@/lib/admin/networks";
import { SITE_NAME } from "@/lib/site";

// A phone-sized look at a post as it will appear on its network (#177). A feed post and a carousel are a card with the caption under the
// picture; a story and a reel fill the 9:16 screen, a story with its ready layout drawn over the car's photo (HTML and CSS, so it is the
// same on every device). Picture and video are the dealer's own; nothing here is a screenshot of a network.
export type PreviewProps = { network: Network; format: PostFormat; layout?: StoryLayout; text: string; photos: string[]; video?: string; title: string; price?: string; was?: string };

const bar = "bg-band/60 text-on-accent";

function Media({ src, className = "" }: { src?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- the dealer's own upload or a local car photo; images are unoptimized on this Worker
  return src ? <img src={src} alt="" className={`size-full object-cover ${className}`} /> : <div className={`size-full bg-photo-bg ${className}`} />;
}

export function PostPreview({ network, format, layout = "just-in", text, photos, video, title, price, was }: PreviewProps) {
  const tall = format === "story" || format === "reel";
  return (
    <div className="mx-auto w-full max-w-72 overflow-hidden rounded-card border border-hairline bg-card" data-preview={format}>
      {!tall && (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-band text-meta font-semibold text-on-accent">{SITE_NAME.slice(0, 1)}</span>
          <span className="min-w-0 flex-1 truncate text-meta font-medium">{SITE_NAME}</span>
          <span className="text-meta text-text-2">{network}</span>
        </div>
      )}
      <div className={`relative overflow-hidden bg-photo-bg ${tall ? "aspect-[9/16]" : "aspect-[4/5]"}`}>
        {format === "reel" ? (
          video ? <video src={video} muted playsInline preload="metadata" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center px-6 text-center text-meta text-text-2">Choose a video</div>
        ) : (
          <Media src={photos[0]} />
        )}
        {format === "carousel" && photos.length > 1 && <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-meta font-medium ${bar}`}>1/{photos.length}</span>}
        {format === "story" && (
          <>
            <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-band/60 to-transparent p-3 text-on-accent">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-on-accent text-meta font-semibold text-band">{SITE_NAME.slice(0, 1)}</span>
              <span className="text-meta font-medium">{SITE_NAME}</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 bg-gradient-to-t from-band/80 via-band/40 to-transparent p-4 pt-16 text-on-accent">
              <span className="rounded-full bg-on-accent px-3 py-1 text-meta font-semibold text-band">{LAYOUT_LABELS[layout]}</span>
              <span className="text-heading font-bold leading-tight">{title}</span>
              {price && (
                <span className="flex items-baseline gap-2 text-display font-bold leading-none">
                  {price}
                  {layout === "price-drop" && was && <s className="text-meta font-normal opacity-80">{was}</s>}
                </span>
              )}
              <span className="mt-1 self-center rounded-full bg-on-accent px-5 py-2 text-meta font-semibold text-band">See it</span>
            </div>
          </>
        )}
        {format === "reel" && video && <p className="absolute inset-x-0 bottom-0 line-clamp-3 bg-gradient-to-t from-band/80 to-transparent p-3 pt-10 text-meta text-on-accent [overflow-wrap:anywhere]">{text}</p>}
      </div>
      {!tall || format === "story" ? (
        <p className="line-clamp-[12] whitespace-pre-line px-3 py-3 text-meta [overflow-wrap:anywhere]">{text || "Your text appears here."}</p>
      ) : (
        !video && <p className="px-3 py-3 text-meta [overflow-wrap:anywhere]">{text || "Your text appears here."}</p>
      )}
      <p className="sr-only">{FORMAT_LABELS[format]} on {network}</p>
    </div>
  );
}
