"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";
import { press } from "@/components/ui";
import { driveTimes } from "@/lib/leads/constants";
import { fmtDay } from "@/lib/admin/format";
import { firstOpen, slotState } from "@/lib/admin/slots";


// A test drive's day and time, picked rather than typed: a week of open days at a time, then that day's times. A time the car is already
// out, or that has gone, cannot be picked. `days` are the open days the server accepts; `taken` the car's other open bookings; `now` the
// time in Ireland. The server checks it all again (checkSlot). The choice goes in the form as `date` and `time`.
export function SlotPicker({ days, taken, windowMin, now, date, time, onChange, errors }: { days: string[]; taken: string[]; windowMin: number; now: string; date: string; time: string; onChange: (date: string, time: string) => void; errors?: { date?: string; time?: string } }) {
  const [week, setWeek] = useState(Math.max(0, Math.floor(days.indexOf(date) / 7)));
  const shown = days.slice(week * 7, week * 7 + 7);
  const times = date ? driveTimes(date) : [];
  const states = times.map((t) => [t, slotState(date, t, taken, windowMin, now)] as const);
  // A day with nothing left offers the next one that has a time (#238), and moves the week to it.
  const next = date ? firstOpen(days, taken, windowMin, now, date) : undefined;
  const go = (d: string, t: string) => (setWeek(Math.max(0, Math.floor(days.indexOf(d) / 7))), onChange(d, t));
  return (
    <div className="flex flex-col gap-5">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />
      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <legend className="text-meta font-medium">Day</legend>
          <span className="flex gap-1">
            <button type="button" aria-label="Earlier days" disabled={week === 0} onClick={() => setWeek(week - 1)} className={`inline-flex size-11 items-center justify-center rounded-control text-text-2 hover:bg-surface disabled:opacity-30 ${press}`}>
              <ChevronLeftIcon className="size-4" />
            </button>
            <button type="button" aria-label="Later days" disabled={(week + 1) * 7 >= days.length} onClick={() => setWeek(week + 1)} className={`inline-flex size-11 items-center justify-center rounded-control text-text-2 hover:bg-surface disabled:opacity-30 ${press}`}>
              <ChevronRightIcon className="size-4" />
            </button>
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {shown.map((d) => {
            const on = d === date;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={fmtDay(d)}
                onClick={() => onChange(d, "")}
                className={`flex min-h-16 flex-col items-center justify-center rounded-control border text-meta ${on ? "border-accent bg-accent text-on-accent" : "border-hairline bg-card"} ${press}`}
              >
                <span className={on ? "" : "text-text-2"}>{fmtDay(d, "weekday")}</span>
                <span className="text-body font-semibold tabular-nums">{fmtDay(d, "day")}</span>
                <span className={`text-[0.6875rem] ${on ? "" : "text-text-2"}`}>{fmtDay(d, "month")}</span>
              </button>
            );
          })}
        </div>
        {errors?.date && <p className="text-meta text-destructive">{errors.date}</p>}
      </fieldset>
      {date && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-meta font-medium">Time on {fmtDay(date)}</legend>
          {states.every(([, s]) => s !== "open") ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-body text-text-2">No time left that day.</p>
              {next && (
                <button type="button" onClick={() => go(next.date, next.time)} className="min-h-11 text-body font-semibold text-accent-text underline underline-offset-4">
                  Next available: {fmtDay(next.date)}, {next.time}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {states.map(([t, s]) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={t === time}
                  disabled={s !== "open"}
                  title={s === "taken" ? "The car is out then" : undefined}
                  onClick={() => onChange(date, t)}
                  className={`min-h-11 rounded-control border text-meta font-medium tabular-nums disabled:border-transparent disabled:bg-transparent disabled:text-text-2 disabled:line-through disabled:opacity-60 ${t === time ? "border-accent bg-accent text-on-accent" : "border-hairline bg-card"} ${press}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {errors?.time && <p className="text-meta text-destructive">{errors.time}</p>}
        </fieldset>
      )}
    </div>
  );
}
