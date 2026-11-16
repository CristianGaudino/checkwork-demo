"use client";

import { useKeptForm } from "@/components/admin/useKeptForm";
import { useState } from "react";
import { Select } from "@/components/Select";
import { Field, adminButton, adminButtonQuiet, adminInput, choicePill } from "@/components/admin/kit";
import { sendFeedbackAction, sendHelpAction, type HelpState } from "@/app/dashboard/help/actions";
import { MESSAGE_MAX, type HelpType } from "@/lib/admin/help-rules";

// The message to us. "Something isn't working" asks for the steps and takes a screenshot. The server checks all of it again.
export function HelpForm({ types, first, from }: { types: HelpType[]; first: HelpType; from: string }) {
  const [state, run, pending] = useKeptForm<HelpState>(sendHelpAction, undefined);
  const [type, setType] = useState<string>(first);
  const errors = state?.errors ?? {};
  return (
    <form {...run} className="flex max-w-2xl flex-col gap-4" noValidate>
      <input type="hidden" name="from" value={from} />
      <Field label="What is it about?" error={errors.type}>
        <Select name="type" label="What is it about?" value={type} onChange={setType} options={types.map((t) => [t, t] as const)} />
      </Field>
      {type === "Something isn't working" && (
        <Field label="What were you doing, and what happened?" error={errors.steps}>
          <textarea name="steps" rows={3} maxLength={MESSAGE_MAX} className={`${adminInput} h-auto py-2`} />
        </Field>
      )}
      <Field label={type === "Something isn't working" ? "Anything else" : "Your message"} error={errors.message}>
        <textarea name="message" rows={4} maxLength={MESSAGE_MAX} className={`${adminInput} h-auto py-2`} />
      </Field>
      {type === "Something isn't working" && (
        <Field label="Screenshot (optional)" hint="Only add one if it shows no customer details" error={errors.screenshot}>
          <input name="screenshot" type="file" accept="image/jpeg,image/png,image/webp" className="text-body" />
        </Field>
      )}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={adminButton}>
          {pending ? "Sending" : "Send"}
        </button>
        {state?.saved && !pending && (
          <p role="status" className="text-meta text-ok">
            Sent. We will reply here.
          </p>
        )}
      </div>
    </form>
  );
}

// A small, skippable question, shown on the Help page only, and not again for a quarter once answered or skipped.
export function FeedbackForm() {
  const [score, setScore] = useState(0);
  return (
    <form action={sendFeedbackAction} className="flex flex-col gap-3">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-2 text-body font-semibold">How is the dashboard working for you?</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={`${choicePill(score === n)} cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2`}>
            <input type="radio" name="score" value={n} checked={score === n} onChange={() => setScore(n)} className="sr-only" />
            {n}
          </label>
        ))}
      </fieldset>
      <Field label="Anything to add? (optional)">
        <input name="note" maxLength={500} className={adminInput} />
      </Field>
      <div className="flex gap-3">
        <button type="submit" disabled={!score} className={adminButton}>
          Send
        </button>
        <button type="submit" name="skip" value="1" className={adminButtonQuiet}>
          Not now
        </button>
      </div>
    </form>
  );
}
