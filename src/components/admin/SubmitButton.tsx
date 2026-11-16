"use client";

import { useFormStatus } from "react-dom";

// A submit button that cannot be tapped twice while its form is sending: a second tap would post twice (a second Facebook post, a second
// Google reply, a second note). Only inside a <form action>.
export function SubmitButton({ disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return <button type="submit" {...props} disabled={pending || disabled} />;
}
