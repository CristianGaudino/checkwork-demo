import { card } from "@/components/ui";

// The map shows at once (the owner's choice). The box is sized from first paint, so nothing shifts when Google's frame arrives.
export function MapBox({ embedUrl, title }: { embedUrl: string; title: string }) {
  return (
    <div className={`aspect-photo overflow-hidden ${card} contrast-more:border-text`}>
      <iframe src={embedUrl} title={title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="size-full border-0" />
    </div>
  );
}
