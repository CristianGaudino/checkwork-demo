import { z } from "zod";
import { isIsoDay, isIsoMonth } from "./format";

// A form's day (YYYY-MM-DD) or month (YYYY-MM) that is a real one, with the message to show when it is not.
export const isoDay = (message: string) => z.string().refine(isIsoDay, message);
export const isoMonth = (message: string) => z.string().refine(isIsoMonth, message);

// A form's problems as one message per box: the first message for each field, keyed by the field's name. What the admin forms show under each box.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}
