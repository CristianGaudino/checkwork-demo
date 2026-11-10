import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { accentButton } from "@/components/ui";

// A stand-in for a perspective that is still being built. Each page that uses it is replaced by the real one.
export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <InfoPage title={title} intro={text}>
      <Link href="/" className={`${accentButton} self-start px-5`}>
        Back to the site
      </Link>
    </InfoPage>
  );
}
