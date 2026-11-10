import { pageTitle } from "@/components/ui";

// The title and the one line under it that every page opens with. `actions` (a call button, say) sit on the right, level with the title, from
// 1024px, and under it on a phone.
export function PageHeading({ title, intro, actions }: { title: string; intro?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className={actions ? "lg:flex lg:items-end lg:justify-between lg:gap-8" : undefined}>
      <div>
        <h1 className={pageTitle}>{title}</h1>
        {intro && <p className="mt-2 max-w-measure text-pretty text-body">{intro}</p>}
      </div>
      {actions && <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">{actions}</div>}
    </div>
  );
}
