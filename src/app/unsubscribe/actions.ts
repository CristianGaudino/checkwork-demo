"use server";

import { redirect } from "next/navigation";
import { readToken, unsubscribe } from "./apply";

// The page's one button. The token is checked again here: the form's hidden field is input from anyone.
export async function unsubscribeAction(data: FormData) {
  const t = await readToken(data.get("t"));
  const done = t ? await unsubscribe(t) : false;
  redirect(done ? `/unsubscribe?t=${encodeURIComponent(String(data.get("t")))}&done=1` : "/unsubscribe");
}
