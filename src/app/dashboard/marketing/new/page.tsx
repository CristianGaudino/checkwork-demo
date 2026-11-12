import Link from "next/link";
import { PageHeader, adminButtonQuiet } from "@/components/admin/kit";
import { PostComposer } from "@/components/admin/PostComposer";
import { carCards } from "@/lib/admin/car-cards";
import { postsStore } from "@/lib/admin/collections";
import { worthPosting } from "@/lib/admin/marketing";
import { adminCars } from "@/lib/admin/stock-admin";
import { isUsable } from "@/lib/integrations";
import { forSale } from "@/lib/stock/types";
import { composeAction, composerCarAction } from "../actions";

export const metadata = { title: "New post" };

// The composer on its own page, so the Marketing list stays short on a phone. ?car= starts on that car ("Write a post" on an idea).
export default async function Page({ searchParams }: { searchParams: Promise<{ car?: string }> }) {
  const sp = await searchParams;
  const [cars, posts] = await Promise.all([adminCars(), postsStore.list()]);
  const onSale = cars.filter(forSale).sort((a, b) => Number(b.id) - Number(a.id));
  // The cars worth a post come first, with the reason on their card.
  const ideas = new Map<string, string>(worthPosting(onSale, posts).map((i) => [i.car.slug, i.reason]));
  const cards = carCards([...onSale.filter((c) => ideas.has(c.slug)), ...onSale.filter((c) => !ideas.has(c.slug))], ideas);
  return (
    <>
      <PageHeader title="New post" text={isUsable("social") ? undefined : "Facebook and Instagram are not connected, so posts are kept as drafts."} actions={<Link href="/dashboard/marketing" className={adminButtonQuiet}>Marketing</Link>} />
      <PostComposer cars={cards} initialSlug={sp.car ?? ""} action={composeAction} load={composerCarAction} />
    </>
  );
}
