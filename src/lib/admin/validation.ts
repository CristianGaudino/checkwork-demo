import { z } from "zod";
import { isIsoDay, isIsoMonth } from "./format";

// A form's day (YYYY-MM-DD) or month (YYYY-MM) that is a real one, with the message to show when it is not.
export const isoDay = (message: string) => z.string().refine(isIsoDay, message);
export const isoMonth = (message: string) => z.string().refine(isIsoMonth, message);

// What an admin form's action returns: nothing when it worked, or one message per box.
export type FormState = { errors?: Record<string, string> } | undefined;

// An empty box means "not given", never zero or an empty string.
export const blank = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : v);

// An amount in whole euros, from min up to max.
export const euros = (max: number, min = 1) => z.coerce.number({ message: "Enter the amount in whole euros" }).int("Enter the amount in whole euros").min(min, "Enter the amount in whole euros").max(max, "That amount looks too high");

// A form's problems as one message per box: the first message for each field, keyed by the field's name. What the admin forms show under each box.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}
