"use client";

import { useId, useRef, useState, useTransition } from "react";
import { SparkleIcon } from "@/components/stock/icons";
import { press } from "@/components/ui";
import { SHOW_PRICING } from "@/lib/billing/rules";
import { writeAction } from "@/lib/ai/actions";
import { ADJUSTS, adjustsFor, type Adjust, type Task, type WriteRequest } from "@/lib/ai/tasks";
import type { PostFormat } from "@/lib/admin/networks";
import { adminButtonQuiet, adminInput } from "./kit";

const chip = `inline-flex min-h-11 items-center rounded-full border border-control bg-card px-4 text-meta font-medium disabled:opacity-50 ${press}`;
// With our pricing hidden the limit is not on Billing, so the message says where to ask.
const SAID = { limit: `The monthly AI limit is reached. Your text is unchanged.${SHOW_PRICING ? "" : " Ask us in Help to raise it."}`, failed: "Couldn't write that, try again. Your text is unchanged." };

// "Write with AI" for any text box (#179): a first draft from the record's facts, then buttons that rewrite it, Undo for one step back, and a
// label so AI text is never taken for the dealer's own. The box stays the host's own and stays editable. `request` is read when a button is
// pressed (the car form's boxes may have changed).
export function AIWriter({ task, request, text, onText, format }: { task: Task; request: () => WriteRequest | null; text: string; onText: (text: string, subject?: string) => void; format?: PostFormat }) {
  const [pending, start] = useTransition();
  const [said, setSaid] = useState("");
  const [ai, setAi] = useState<string | null>(null); // the last text AI wrote
  const [back, setBack] = useState<{ text: string; ai: string | null } | null>(null);
  const run = (adjust?: Adjust) => {
    const req = request();
    if (!req) return setSaid("Fill in the car's details first.");
    setSaid("");
    start(async () => {
      try {
        const r = await writeAction(req, adjust, text);
        if (!r.ok) return setSaid(SAID[r.reason]);
        setBack({ text, ai });
        setAi(r.text);
        onText(r.text, r.subject);
      } catch {
        setSaid(SAID.failed);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => run()} disabled={pending} aria-busy={pending} className={`${adminButtonQuiet} disabled:opacity-50`}>
          <SparkleIcon className="size-4 text-accent-text" />
          {pending ? "Writing" : ai === null ? "Write with AI" : "Write again"}
        </button>
        {back && !pending && (
          <button type="button" onClick={() => { onText(back.text); setAi(back.ai); setBack(null); }} className={chip}>
            Undo
          </button>
        )}
        {ai !== null && text.trim() !== "" && (
          <span className="inline-flex items-center gap-1.5 text-meta font-medium text-accent-text">
            <SparkleIcon className="size-4" />
            {text === ai ? "AI draft" : "AI draft, edited"}
          </span>
        )}
      </div>
      {ai !== null && (
        <div role="group" aria-label="Change the draft" className="flex flex-wrap gap-2">
          {adjustsFor(task, format).map((a) => (
            <button key={a} type="button" disabled={pending} onClick={() => run(a)} className={chip}>
              {ADJUSTS[a]}
            </button>
          ))}
        </div>
      )}
      <p aria-live="polite" className="min-h-0 text-meta text-text-2">{said}</p>
    </div>
  );
}

// A text box with the writer under it, for the places that have no state of their own (a form that posts the box by `name`). `request` is
// the ask, or (from a client component only) a function that gets the box, so the car form can read its sibling fields. `copy` adds a Copy button (a string names it), for a draft that is sent from somewhere else.
export function AITextarea({ id, name, label, defaultValue = "", rows = 5, maxLength, task, request, onSubject, copy = false }: { id?: string; name?: string; label: string; defaultValue?: string; rows?: number; maxLength?: number; task: Task; request: WriteRequest | ((box: HTMLTextAreaElement | null) => WriteRequest | null); onSubject?: (s: string) => void; copy?: boolean | string }) {
  const box = useRef<HTMLTextAreaElement>(null);
  const own = useId();
  id ??= own;
  const [text, setText] = useState(defaultValue);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  // A copy that fails says so: otherwise the dealer pastes whatever was copied before.
  const copyText = () => {
    const failed = () => { setCopied(false); setCopyError("Couldn't copy. Select the text and copy it."); };
    setCopyError("");
    if (!navigator.clipboard) return failed();
    navigator.clipboard.writeText(text).then(() => setCopied(true), failed);
  };
  return (
    <div className="flex flex-col gap-2">
      <label className="sr-only" htmlFor={id}>{label}</label>
      <textarea ref={box} id={id} name={name} rows={rows} maxLength={maxLength} value={text} onChange={(e) => { setText(e.target.value); setCopied(false); setCopyError(""); }} className={`${adminInput} h-auto py-2`} />
      <AIWriter task={task} text={text} request={() => (typeof request === "function" ? request(box.current) : request)} onText={(t, subject) => { setText(t); setCopied(false); setCopyError(""); if (subject) onSubject?.(subject); }} />
      {copy && text.trim() && (
        <>
          <button type="button" onClick={copyText} className={`${adminButtonQuiet} self-start`}>
            {copied ? "Copied" : copy === true ? "Copy" : copy}
          </button>
          <p aria-live="polite" className="text-meta text-bad">{copyError}</p>
        </>
      )}
    </div>
  );
}
