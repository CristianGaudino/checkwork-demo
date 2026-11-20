import { ChevronDownIcon } from "@/components/stock/icons";

// Detail most people do not need every day, folded under a page's main figures and one tap away (Analytics, Reports).
export function MoreDetail({ children, label = "More detail" }: { children: React.ReactNode; label?: string }) {
  return (
    <details className="group flex flex-col">
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 text-body font-medium text-accent-text [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDownIcon aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 flex flex-col gap-6">{children}</div>
    </details>
  );
}
