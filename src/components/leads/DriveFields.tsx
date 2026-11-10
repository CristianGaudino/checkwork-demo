"use client";

import { useMemo, useSyncExternalStore } from "react";
import { driveDays, driveTimes } from "@/lib/leads/constants";
import { LIMITS } from "@/lib/leads/constants";
import { ContactFields, Field } from "./Field";
import type { FieldBinding } from "./LeadForm";

// "Tue 11 Nov", read at noon UTC so no time zone can move the day.
const dayLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const noop = () => () => {};

// A booking: a day we are open and a time on it, then contact details. The days are worked out in the browser (they depend on today), so
// the list is empty until the page loads; the server checks the choice again against the opening hours.
export function DriveFields({ bind }: { bind(name: string): FieldBinding }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false); // false on the server and first paint, so both match
  const days = useMemo(() => (mounted ? driveDays() : []), [mounted]);
  const day = bind("driveDate");
  const time = bind("driveTime");
  const times = driveTimes(day.value);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
        <Field
          {...day}
          label="Day"
          options={days.map((d) => ({ value: d, label: dayLabel(d) }))}
          onChange={(v) => {
            day.onChange(v);
            if (!driveTimes(v).includes(time.value)) time.onChange("");
          }}
        />
        <Field {...time} label="Time" options={times.map((t) => ({ value: t, label: t }))} />
      </div>
      <Field {...bind("message")} label="Anything we should know" optional multiline maxLength={LIMITS.message} />
      <ContactFields bind={bind} />
    </>
  );
}
