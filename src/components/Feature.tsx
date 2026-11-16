import { subTitle } from "@/components/ui";

// The round tinted badge that holds a step number (or, on home, an icon that says what the item is).
export function IconBadge({ children, size = "md" }: { children: React.ReactNode; size?: "sm" | "md" }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-info-soft font-medium text-info ${size === "md" ? "size-12" : "size-10"}`}>{children}</span>
  );
}

// One reason or fact in a list: a short title and a line of text under a hairline, open on the page. No icon: the same few icons stood for
// different reasons on every page, which said nothing (docs/design-contract.md, inner pages second pass). Renders an <li>, so it goes in a <ul>.
export function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <li className="reveal border-t border-hairline pt-4">
      <TitleText title={title} text={text} />
    </li>
  );
}

// A titled group of reasons, in columns from 768px.
export function FeatureSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className={subTitle}>{title}</h2>
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">{children}</ul>
    </section>
  );
}

// A bold line and a quieter line under it: the title and text of a reason, a step or a fact.
export function TitleText({ title, text }: { title: string; text: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="text-body font-semibold">{title}</span>
      <span className="text-meta text-text-2">{text}</span>
    </span>
  );
}
