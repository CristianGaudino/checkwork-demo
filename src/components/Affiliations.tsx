import Image from "next/image";
import { NEW_TAB, subTitle } from "@/components/ui";
import { AFFILIATIONS, BADGE_KINDS, affiliationsOf, type Affiliation, type AffiliationKind } from "@/lib/affiliations";

// The dealer's memberships and partners (src/lib/affiliations.ts). Every piece renders nothing while the list has none of its kinds, so the
// demo, whose list is empty, shows none of it. `list` is for the tests.

// A body's mark as it supplies it, never recoloured (its terms usually say so); its name where there is no logo.
function Mark({ a, className }: { a: Affiliation; className: string }) {
  return a.logo ? <Image src={a.logo.src} width={a.logo.width} height={a.logo.height} alt={a.name} unoptimized className={`${className} w-auto`} /> : <span className="text-body font-semibold">{a.name}</span>;
}

// A link to the body's page when there is one, so a buyer can check the claim there.
function Linked({ a, children, className = "" }: { a: Affiliation; children: React.ReactNode; className?: string }) {
  return a.href ? (
    <a href={a.href} {...NEW_TAB} className={`${className} transition-opacity hover:opacity-80`}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <span className={className}>{children}</span>
  );
}

// One quiet row of the standards the dealer is held to (SIMI, AA Approved): on the home page under the reasons to buy, and in the footer.
// They wrap rather than scroll, so none is ever cut off; a dealer has two or three, one short row.
export function AffiliationBadges({ size = "md", list = AFFILIATIONS }: { size?: "sm" | "md"; list?: readonly Affiliation[] }) {
  const shown = affiliationsOf(BADGE_KINDS, list);
  if (!shown.length) return null;
  return (
    <ul aria-label="Memberships" className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {shown.map((a) => (
        <li key={a.name}>
          <Linked a={a} className="flex min-h-11 items-center">
            <Mark a={a} className={size === "sm" ? "h-6" : "h-10"} />
          </Linked>
        </li>
      ))}
    </ul>
  );
}

// The About page's section: each one with what it means for the buyer.
export function AffiliationList({ list = AFFILIATIONS }: { list?: readonly Affiliation[] }) {
  if (!list.length) return null;
  return (
    <section id="memberships" className="flex flex-col gap-4">
      <h2 className={subTitle}>Memberships and partners</h2>
      <ul className="grid grid-cols-1 gap-4">
        {list.map((a) => (
          <li key={a.name} className="flex items-start gap-4 border-t border-hairline pt-4">
            {/* The logo beside it when there is one; without one the name below says it, once. */}
            {a.logo && (
              <span className="flex h-10 w-24 shrink-0 items-center">
                <Mark a={a} className="max-h-10" />
              </span>
            )}
            <span className="flex flex-col gap-1">
              <span className="text-body font-semibold">{a.name}</span>
              <span className="text-body text-text-2">{a.text}</span>
              {a.href && (
                <Linked a={a} className="text-meta font-medium text-text underline underline-offset-2">
                  {new URL(a.href).hostname.replace(/^www\./, "")}
                </Linked>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// One line on a page about one thing: who provides the warranty, who the finance is through. The dealer's own sentence follows the name.
export function AffiliationLine({ kind, lead, list = AFFILIATIONS }: { kind: AffiliationKind; lead: string; list?: readonly Affiliation[] }) {
  const shown = affiliationsOf([kind], list);
  if (!shown.length) return null;
  return (
    <p className="max-w-measure text-body text-text-2">
      {lead}{" "}
      {shown.map((a, i) => (
        <span key={a.name}>
          {i > 0 && (i === shown.length - 1 ? " and " : ", ")}
          <Linked a={a} className="font-medium text-text underline underline-offset-2">
            {a.name}
          </Linked>
        </span>
      ))}
      . {shown.length === 1 && shown[0].text}
    </p>
  );
}
