"use client";

import { Combobox } from "@/components/Combobox";

// A form drop-down from pairs of [value, label]: the site's own Combobox (typable on a desktop, a picker on a phone, a hidden input so a plain
// form still sends `name`). The dashboard forms use this in place of the browser's select.
export function Select({ options, ...rest }: Omit<React.ComponentProps<typeof Combobox>, "options"> & { options: readonly (readonly [string, string])[] }) {
  return <Combobox size="md" {...rest} options={options.map(([value, label]) => ({ value, label }))} />;
}
