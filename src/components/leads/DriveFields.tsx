"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { takenDriveTimes } from "@/app/actions/drive";
import { DRIVE_TIME_TAKEN, driveDays, driveTimes } from "@/lib/leads/constants";
import { LIMITS } from "@/lib/leads/constants";
import { ContactFields, Field } from "./Field";
import type { FieldBinding } from "./LeadForm";
import { clock12, threeLetter } from "@/lib/format";

// "Tue 11 Nov", read at noon UTC so no time zone can move the day.
const dayLabel = (iso: string) => threeLetter(new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }));

const noop = () => () => {};

// A booking: a day we are open and a time on it, then contact details. The days are worked out in the browser (they depend on today), so
// the list is empty until the page loads; the server checks the choice again against the opening hours and the times the dashboard has booked.
// The form opens on the first day with a time and no time: the buyer picks one ("Pick a time" until then). An empty day would show the
// list's first day (Combobox) with no times under it. A chosen day that has none left says so and offers the next one.
export function DriveFields({ bind, carId }: { bind(name: string): FieldBinding; carId?: string }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false); // false on the server and first paint, so both match
  // The slots already booked for this car, asked once on the first touch of the form (the dialog's fields exist before it opens).
  const [taken, setTaken] = useState<string[]>([]);
  const asked = useRef(false);
  const ask = () => {
    if (asked.current || !carId) return;
    asked.current = true;
    takenDriveTimes(carId).then(setTaken, () => {});
  };
  const free = (d: string) => driveTimes(d).filter((t) => !taken.includes(`${d} ${t}`));
  const days = mounted ? driveDays().filter((d) => free(d).length > 0) : [];
  const day = bind("driveDate");
  const time = bind("driveTime");
  // The server refused the slot as just taken: ask again, so the picker moves off it.
  useEffect(() => {
    if (time.error !== DRIVE_TIME_TAKEN) return;
    asked.current = false;
    ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the refusal arrives
  }, [time.error]);
  const times = free(day.value);
  const next = days.find((d) => d > day.value && free(d).length) ?? days.find((d) => free(d).length);
  const pick = (d: string, t = free(d)[0] ?? "") => {
    day.onChange(d);
    time.onChange(t);
  };
  const first = days[0];
  useEffect(() => {
    if (first && !day.value) pick(first, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the days arrive or the day is cleared (a fresh form)
  }, [first, day.value]);
  // The chosen day or time turned out to be taken: the next day with a time if the day is full, and the buyer picks the time again (after a
  // refusal the message stays until they pick, the form's recheck keeps it while the field is empty).
  useEffect(() => {
    if (!day.value) return;
    if (!times.length) {
      if (next) pick(next, "");
    }
    else if (time.value && !times.includes(time.value)) time.onChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the answer arrives
  }, [taken]);
  return (
    <div className="contents" onFocusCapture={ask} onPointerDownCapture={ask}>
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
        <Field
          {...day}
          label="Day"
          options={(day.value && !days.includes(day.value) ? [day.value, ...days] : days).map((d) => ({ value: d, label: dayLabel(d) }))}
          onChange={(v) => pick(v, free(v).includes(time.value) ? time.value : "")}
        />
        {day.value && !times.length ? (
          <div className="flex flex-col gap-1">
            <p className="text-meta font-semibold">Time</p>
            <p className="text-body text-text-2">{next ? "No times left that day." : "No times free online. Call us to book."}</p>
            {next && (
              <button type="button" onClick={() => pick(next)} className="self-start text-body font-semibold text-accent-text underline underline-offset-4">
                Next available: {dayLabel(next)}, {clock12(free(next)[0])}
              </button>
            )}
          </div>
        ) : (
          // An empty time (a fresh form, a refusal) reads "Pick a time", not the list's first time (Combobox's fallback).
          <Field {...time} label="Time" options={[...(time.value ? [] : [{ value: "", label: "Pick a time" }]), ...times.map((t) => ({ value: t, label: clock12(t) }))]} />
        )}
      </div>
      <Field {...bind("message")} label="Anything we should know" optional multiline maxLength={LIMITS.message} />
      <ContactFields bind={bind} />
    </div>
  );
}
