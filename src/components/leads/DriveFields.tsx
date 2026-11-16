"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { takenDriveTimes } from "@/app/actions/drives";
import { driveDays, driveTimes } from "@/lib/leads/constants";
import { LIMITS } from "@/lib/leads/constants";
import { ContactFields, Field } from "./Field";
import type { FieldBinding } from "./LeadForm";
import { threeLetter } from "@/lib/admin/format";

// "Tue 11 Nov", read at noon UTC so no time zone can move the day.
const dayLabel = (iso: string) => threeLetter(new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }));

const noop = () => () => {};

// A booking: a day we are open and a time on it, then contact details. The days are worked out in the browser (they depend on today), so
// the list is empty until the page loads; the server checks the choice again against the opening hours. Times the car is already out are
// left out, by the dashboard's clash rule: asked for once, on the first focus, so a car page that never opens the form never asks.
export function DriveFields({ bind, carId }: { bind(name: string): FieldBinding; carId: string }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false); // false on the server and first paint, so both match
  const [taken, setTaken] = useState<Set<string>>();
  const asked = useRef(false);
  const ask = () => {
    if (asked.current) return;
    asked.current = true;
    takenDriveTimes(carId).then((t) => setTaken(new Set(t)), () => (asked.current = false));
  };
  const free = (d: string) => driveTimes(d).filter((t) => !taken?.has(`${d} ${t}`));
  const days = mounted ? driveDays().filter((d) => free(d).length > 0) : [];
  const day = bind("driveDate");
  const time = bind("driveTime");
  const times = free(day.value);
  return (
    <div className="contents" onFocus={ask}>
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
        <Field
          {...day}
          label="Day"
          options={days.map((d) => ({ value: d, label: dayLabel(d) }))}
          onChange={(v) => {
            day.onChange(v);
            if (!free(v).includes(time.value)) time.onChange("");
          }}
        />
        <Field {...time} label="Time" options={times.map((t) => ({ value: t, label: t }))} />
      </div>
      <Field {...bind("message")} label="Anything we should know" optional multiline maxLength={LIMITS.message} />
      <ContactFields bind={bind} />
    </div>
  );
}
