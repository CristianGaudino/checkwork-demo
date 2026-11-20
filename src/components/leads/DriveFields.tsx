"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
// The form opens on the first day with a free time and that time: an empty value would show the list's first day (Combobox) with no
// times under it. A chosen day that has none left (its times were taken since) says so and offers the next one.
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
  const next = days.find((d) => d > day.value && free(d).length) ?? days.find((d) => free(d).length);
  const pick = (d: string, t = free(d)[0] ?? "") => {
    day.onChange(d);
    time.onChange(t);
  };
  const first = days[0];
  useEffect(() => {
    if (first && !day.value) pick(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the days arrive or the day is cleared (a fresh form)
  }, [first, day.value]);
  // The car's booked times arrive on the first focus, after the form chose a time: if that time is gone, move to the one the box now shows,
  // so what is sent is what the buyer sees.
  const gone = Boolean(day.value && time.value && times.length && !times.includes(time.value));
  useEffect(() => {
    if (gone) time.onChange(times[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the chosen time stops being free
  }, [gone]);
  return (
    <div className="contents" onFocus={ask}>
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
        <Field
          {...day}
          label="Day"
          options={(day.value && !days.includes(day.value) ? [day.value, ...days] : days).map((d) => ({ value: d, label: dayLabel(d) }))}
          onChange={(v) => pick(v, free(v).includes(time.value) ? time.value : undefined)}
        />
        {day.value && !times.length ? (
          <div className="flex flex-col gap-1">
            <p className="text-meta font-semibold">Time</p>
            <p className="text-body text-text-2">No times left that day.</p>
            {next && (
              <button type="button" onClick={() => pick(next)} className="self-start text-body font-semibold text-accent-text underline underline-offset-4">
                Next available: {dayLabel(next)}, {free(next)[0]}
              </button>
            )}
          </div>
        ) : (
          <Field {...time} label="Time" options={times.map((t) => ({ value: t, label: t }))} />
        )}
      </div>
      <Field {...bind("message")} label="Anything we should know" optional multiline maxLength={LIMITS.message} />
      <ContactFields bind={bind} />
    </div>
  );
}
