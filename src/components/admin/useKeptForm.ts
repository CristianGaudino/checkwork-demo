"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type RefObject } from "react";

type Refused = { errors?: Record<string, string>; error?: string } | undefined;
const refused = (s: Refused) => Boolean(s?.error || (s?.errors && Object.keys(s.errors).length));

// useActionState for a dashboard form that keeps what was typed when the server refuses it. React resets a form after a form action,
// even one that returned errors, so a wrong year would also undo the price just typed. This submits through onSubmit instead (as
// LeadForm does) and resets only after a save that went through, which is what React did before. Spread the props onto the <form>.
export function useKeptForm<S extends Refused>(action: (prev: S, data: FormData) => Promise<S>, initial: S, ref?: RefObject<HTMLFormElement | null>) {
  // The casts only restate S as Awaited<S>: a form state is never a promise.
  const [state, run, pending] = useActionState<S, FormData>(action as (prev: Awaited<S>, data: FormData) => Promise<S>, initial as Awaited<S>);
  const own = useRef<HTMLFormElement>(null);
  const form = ref ?? own;
  const sent = useRef(false);
  useEffect(() => {
    if (pending || !sent.current) return;
    sent.current = false;
    if (!refused(state)) form.current?.reset();
  }, [pending, state, form]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    sent.current = true;
    startTransition(() => run(data));
  };
  return [state, { ref: form, onSubmit }, pending] as const;
}
