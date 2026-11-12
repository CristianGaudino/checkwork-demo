"use client";

import { useState } from "react";

// A car's first photo in a table row. A file that has gone (a photo renamed when the stock was rebuilt) leaves the plain photo box, never the
// browser's broken-image icon. An image can fail before the page's code starts, so it is checked when it mounts too, not only on its error.
export function CarThumb({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a local /stock file, sized by its box
    <img
      src={src}
      alt=""
      width={64}
      height={48}
      loading="lazy"
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true);
      }}
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  );
}
