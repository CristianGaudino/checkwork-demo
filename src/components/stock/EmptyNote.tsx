import Link from "next/link";
import { accentButton } from "@/components/ui";

// A plain message in place of a list: what happened, and optionally where to go next.
export function EmptyNote({ title, text, href, action }: { title: string; text: string; href?: string; action?: string }) {
  return (
    <div className="mt-8 flex flex-col items-start gap-2">
      <h2 className="text-heading font-semibold">{title}</h2>
      <p className="max-w-[50ch] text-body text-text-2">{text}</p>
      {href && action && (
        <Link href={href} className={`${accentButton} mt-2 inline-flex items-center`}>
          {action}
        </Link>
      )}
    </div>
  );
}
