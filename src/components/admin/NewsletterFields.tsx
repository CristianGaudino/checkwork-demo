"use client";

import { useState } from "react";
import { Field, adminInput } from "@/components/admin/kit";
import { AITextarea } from "@/components/admin/AIWriter";

// "Write your own" newsletter: the subject and the text, with the AI writer under the text. It fills the subject only while that is empty.
export function NewsletterFields() {
  const [subject, setSubject] = useState("");
  return (
    <>
      <Field label="Subject"><input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={adminInput} maxLength={120} /></Field>
      <div className="flex flex-col gap-1">
        <span className="text-meta font-semibold">Text</span>
        <AITextarea name="body" label="Text" task="newsletter" rows={6} maxLength={4000} request={() => ({ task: "newsletter" })} onSubject={(s) => setSubject((cur) => cur || s)} />
      </div>
    </>
  );
}
