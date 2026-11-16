"use client";

import { useKeptForm } from "@/components/admin/useKeptForm";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/Select";
import { Stepper, useStepHeading } from "@/components/leads/Stepper";
import { showToast } from "@/components/toast";
import { Field, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { CarPicker } from "@/components/admin/CarPicker";
import { SlotPicker } from "@/components/admin/SlotPicker";
import { addDriveAction, moveDriveAction, type DriveFormState } from "@/app/dashboard/test-drives/actions";
import type { CarCard } from "@/lib/admin/car-cards";
import { DRIVE_LIMITS } from "@/lib/admin/drives";

// What the slot picker is given (slotData on the server) and the length of a slot from Settings.
export type Slots = { days: string[]; taken: Record<string, string[]>; now: string; windowMin: number };

const STEPS = ["Car", "Time", "Customer"];
// The step a server error belongs to, so a refused booking opens where it can be fixed.
const stepOf = (e: Record<string, string>) => (e.carSlug ? 0 : e.date || e.time ? 1 : 2);

// A booking taken by phone or at the desk, in three steps: the car from photo cards, a free time from the picker (the car's other bookings
// and past times cannot be picked), then the customer and who takes them out. Every field stays in one form. The server checks it all
// again and refuses a clash; once booked, the diary opens on that day.
export function BookDriveForm({ cars, team, me, slots, initialCar }: { cars: CarCard[]; team: string[]; me: string; slots: Slots; initialCar: string }) {
  const router = useRouter();
  const start = cars.some((c) => c.slug === initialCar) ? initialCar : "";
  const [step, setStep] = useState(start ? 1 : 0);
  // A refused booking goes back to the step with the problem; a booking made opens the diary on its day.
  const [state, action, pending] = useKeptForm<DriveFormState>(async (prev, data) => {
    const r = await addDriveAction(prev, data);
    if (r?.errors) setStep(stepOf(r.errors));
    if (r?.done) {
      showToast(r.done);
      router.push(`/dashboard/test-drives?view=week&day=${r.day}`);
    }
    return r;
  }, undefined);
  const e = state?.errors ?? {};
  const [car, setCar] = useState(start);
  // The first open day is chosen to start with, so its times show at once.
  const [when, setWhen] = useState({ date: slots.days[0] ?? "", time: "" });

  const heading = useStepHeading(step);

  const picked = cars.find((c) => c.slug === car);
  return (
    <form {...action} noValidate className="flex max-w-3xl flex-col gap-5">
      <Stepper titles={STEPS} step={step} headingRef={heading} />
      <input type="hidden" name="carSlug" value={car} />

      <section hidden={step !== 0}>
        <CarPicker
          cars={cars}
          value={car}
          onPick={(slug) => {
            if (slug !== car) setWhen((w) => ({ date: w.date, time: "" })); // another car has other free times
            setCar(slug);
            setStep(1);
          }}
        />
        {e.carSlug && <p className="mt-2 text-meta text-destructive">{e.carSlug}</p>}
      </section>

      <section hidden={step !== 1} className="flex flex-col gap-4">
        {picked && <p className="text-body text-text-2">{picked.title}</p>}
        <SlotPicker days={slots.days} taken={slots.taken[car] ?? []} windowMin={slots.windowMin} now={slots.now} date={when.date} time={when.time} onChange={(date, time) => setWhen({ date, time })} errors={{ date: e.date, time: e.time }} />
      </section>

      <section hidden={step !== 2} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" error={e.name}>
          <input name="name" className={adminInput} autoComplete="off" maxLength={DRIVE_LIMITS.name} />
        </Field>
        <Field label="Phone" error={e.phone}>
          <input name="phone" type="tel" className={adminInput} autoComplete="off" maxLength={DRIVE_LIMITS.phone} />
        </Field>
        <Field label="Email (optional)" error={e.email}>
          <input name="email" type="email" className={adminInput} autoComplete="off" />
        </Field>
        <Field label="Who takes them out">
          <Select name="assignedTo" label="Who takes them out" defaultValue={team.includes(me) ? me : ""} options={[["", "Nobody yet"], ...team.map((t) => [t, t] as const)]} />
        </Field>
        <Field label="Notes (optional)" className="sm:col-span-2">
          <input name="notes" maxLength={DRIVE_LIMITS.notes} className={adminInput} />
        </Field>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className={adminButtonQuiet}>
            Back
          </button>
        )}
        {step === 1 && (
          <button type="button" disabled={!when.time} onClick={() => setStep(2)} className={`${adminButton} disabled:opacity-50`}>
            Next
          </button>
        )}
        {step === 2 && (
          <button type="submit" disabled={pending} className={adminButton}>
            {pending ? "Booking" : "Book test drive"}
          </button>
        )}
      </div>
    </form>
  );
}

// Moving a booking: a new free time for the same car, by the same rules as a new one.
export function MoveDriveForm({ id, carSlug, slots }: { id: string; carSlug: string; slots: Slots }) {
  const router = useRouter();
  const [when, setWhen] = useState({ date: "", time: "" });
  const [state, action, pending] = useKeptForm<DriveFormState>(async (prev, data) => {
    const r = await moveDriveAction(id, prev, data);
    if (r?.done) {
      showToast(r.done);
      setWhen({ date: "", time: "" });
      router.refresh();
    }
    return r;
  }, undefined);
  return (
    <form {...action} noValidate className="flex flex-col gap-4">
      <SlotPicker days={slots.days} taken={slots.taken[carSlug] ?? []} windowMin={slots.windowMin} now={slots.now} date={when.date} time={when.time} onChange={(date, time) => setWhen({ date, time })} errors={state?.errors} />
      <button type="submit" disabled={pending || !when.time} className={`${adminButton} self-start disabled:opacity-50`}>
        {pending ? "Moving" : "Move"}
      </button>
    </form>
  );
}
