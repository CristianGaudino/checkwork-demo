"use client";

import { Select } from "@/components/Select";
import { useActionState } from "react";
import { Field, adminButton, adminInput } from "@/components/admin/kit";
import { addDriveAction, type DriveFormState } from "@/app/dashboard/test-drives/actions";

// A booking taken by phone or at the desk. The server checks every box and refuses a clash; this only draws the boxes and the messages.
export function AddDriveForm({ cars }: { cars: { slug: string; label: string }[] }) {
  const [state, action, pending] = useActionState<DriveFormState, FormData>(addDriveAction, undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" noValidate>
      <Field label="Name" error={e.name}>
        <input name="name" className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Phone" error={e.phone}>
        <input name="phone" type="tel" className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Email (optional)" error={e.email}>
        <input name="email" type="email" className={adminInput} autoComplete="off" />
      </Field>
      <Field label="Car" error={e.carSlug} className="sm:col-span-2 lg:col-span-1">
        <Select name="carSlug" options={[["", "Choose a car"], ...cars.map((c) => [c.slug, c.label] as const)]} />
      </Field>
      <Field label="Day" error={e.date}>
        <input name="date" type="date" className={adminInput} />
      </Field>
      <Field label="Time" error={e.time}>
        <input name="time" type="time" step={900} className={adminInput} />
      </Field>
      <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
        <input name="notes" maxLength={300} className={adminInput} />
      </Field>
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={pending} className={adminButton}>
          {pending ? "Booking" : "Add booking"}
        </button>
        {state?.done && (
          <p role="status" className="text-body text-better">
            {state.done}
          </p>
        )}
      </div>
    </form>
  );
}
