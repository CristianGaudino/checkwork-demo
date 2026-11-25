import Link from "next/link";
import { TitleText } from "@/components/Feature";
import { CalculatorIcon, CarIcon, ShieldCheckIcon, SwapIcon } from "@/components/stock/icons";
import { WARRANTY } from "@/lib/site";
import { card } from "@/components/ui";

// The reasons to buy, each a link to the page that says more. The warranty line is the dealer's to confirm
// (DEALER_FACTS_CONFIRMED, which still fails a production deploy).
const ITEMS = [
  { Icon: ShieldCheckIcon, title: WARRANTY.title, text: `${WARRANTY.text} Longer cover is available.`, href: "/warranty" },
  { Icon: CalculatorIcon, title: "Finance", text: "Estimate a monthly payment online.", href: "/finance" },
  { Icon: SwapIcon, title: "Trade-ins", text: "Get a valuation on your car.", href: "/trade-in" },
  { Icon: CarIcon, title: "Test drives", text: "Book a time on any car.", href: "/test-drive" },
];

// A banner: one panel, an icon per reason. The cells carry their own padding (no negative margins), so a highlighted cell can never
// push its text past its box.
export function TrustStrip() {
  return (
    <section aria-label="Why buy from us" className={`overflow-hidden ${card}`}>
      <ul className="grid grid-cols-1 divide-y divide-hairline sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {ITEMS.map(({ Icon, title, text, href }) => (
          <li key={title} className="sm:max-lg:border-b sm:max-lg:border-hairline sm:max-lg:odd:border-r sm:max-lg:[&:nth-last-child(-n+2)]:border-b-0">
            <Link href={href} className="flex h-full min-h-11 items-start gap-4 p-5 transition-colors hover:bg-hairline/50 lg:flex-col lg:gap-3">
              <Icon className="size-5 shrink-0 text-text-2" />
              <TitleText title={title} text={text} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
