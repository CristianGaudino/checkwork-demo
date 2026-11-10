import type { z } from "zod";

// A form's problems as one message per box: the first message for each field, keyed by the field's name. What the admin forms show under each box.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}
