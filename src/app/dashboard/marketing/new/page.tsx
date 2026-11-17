import { PageHeader } from "@/components/admin/kit";
import { PostComposer } from "@/components/admin/PostComposer";
import { carCards } from "@/lib/admin/car-cards";
import { mediaStore, postsStore } from "@/lib/admin/collections";
import { POST_FORMATS, STORY_LAYOUTS } from "@/lib/admin/networks";
import { requireModule } from "@/lib/modules";
import { newestForSale, worthPosting } from "@/lib/admin/marketing";
import { adminCars } from "@/lib/admin/stock-admin";
import { isUsable } from "@/lib/integrations";
import { composeAction, composerCarAction } from "../actions";

export const metadata = { title: "New post" };

// The composer on its own page, so the Marketing list stays short on a phone. ?car= starts on that car ("Write a post" on an idea).
export default async function Page({ searchParams }: { searchParams: Promise<{ car?: string; format?: string; layout?: string }> }) {
  await requireModule("social");
  const sp = await searchParams;
  const [cars, posts, library] = await Promise.all([adminCars(), postsStore.list(), mediaStore.list()]);
  const onSale = newestForSale(cars);
  // The cars worth a post come first, with the reason on their card.
  const ideas = new Map<string, string>(worthPosting(onSale, posts).map((i) => [i.car.slug, i.reason]));
  const cards = carCards([...onSale.filter((c) => ideas.has(c.slug)), ...onSale.filter((c) => !ideas.has(c.slug))], ideas);
  return (
    <>
      <PageHeader title="New post" text={isUsable("social") ? undefined : "Facebook and Instagram are not connected, so posts are kept as drafts."} back={{ href: "/dashboard/marketing", label: "Marketing" }} />
      <PostComposer
        cars={cards}
        initialSlug={sp.car ?? ""}
        initialFormat={POST_FORMATS.find((f) => f === sp.format)}
        initialLayout={STORY_LAYOUTS.find((l) => l === sp.layout)}
        library={library.map(({ id, kind, src, name, durationSec, carSlug }) => ({ id, kind, src, name, durationSec, carSlug }))}
        action={composeAction}
        load={composerCarAction}
      />
    </>
  );
}
