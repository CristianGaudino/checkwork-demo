"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { snapshotAction, sendAction, tapAction } from "@/app/dashboard/whatsapp/actions";
import { WhatsAppIcon } from "@/components/stock/icons";
import { addDays, dublinDay, fmtDate, fmtTime } from "@/lib/admin/format";
import { BUTTON_LABELS } from "@/lib/whatsapp/rules";
import type { Msg, View } from "@/lib/whatsapp/store";
import { SITE_NAME } from "@/lib/site";

// The dealer's WhatsApp, drawn as a phone: what the site sent them, the buttons under it, and a box to type in. Beside it, smaller, the
// buyer's phone for the lead last written to. Both are the real conversation (src/lib/whatsapp), so a tap here changes the lead.
const dayLabel = (t: number) => {
  const d = dublinDay(t);
  const today = dublinDay();
  return d === today ? "Today" : d === addDays(today, -1) ? "Yesterday" : fmtDate(t);
};

function Bubble({ m, mine, onTap, busy }: { m: Msg; mine: boolean; onTap?: (id: string, b: string) => void; busy: boolean }) {
  return (
    <li className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
      <div data-wa-bubble className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-meta shadow-sm ${mine ? "rounded-tr-none bg-wa-out" : "rounded-tl-none bg-wa-in"}`}>
        {m.photos && m.photos.length > 0 && (
          <ul className="mb-1.5 grid grid-cols-3 gap-1">
            {m.photos.map((src, i) => (
              <li key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a thumbnail in a mock phone, or a private signed link: not for the image optimiser */}
                <img src={src} alt={`Photo ${i + 1} of the car`} loading="lazy" className="aspect-square w-full rounded object-cover" />
              </li>
            ))}
          </ul>
        )}
        <p className="whitespace-pre-line break-words">{m.text}</p>
        {m.href && (
          <a href={m.href} className="mt-1 block font-medium text-wa-link underline underline-offset-2">
            Open
          </a>
        )}
        <p className="mt-0.5 text-right text-[0.6875rem] leading-none text-wa-ink/60">
          {m.via === "email" && <span>Sent by email instead. </span>}
          {fmtTime(m.at)}
        </p>
      </div>
      {onTap && m.buttons && m.buttons.length > 0 && (
        <ul aria-label="Quick replies" className="flex w-[85%] flex-col gap-1">
          {m.buttons.map((b) => (
            <li key={b}>
              <button type="button" disabled={busy} onClick={() => onTap(m.id, b)} className="min-h-10 w-full rounded-xl bg-wa-in px-3 text-center text-meta font-medium text-wa-link shadow-sm disabled:opacity-60">
                {BUTTON_LABELS[b]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Phone({ label, title, status, msgs, mine, small = false, onTap, onSend, busy }: { label: string; title: string; status: string; msgs: Msg[]; mine: Msg["from"]; small?: boolean; onTap?: (id: string, b: string) => void; onSend?: (t: string) => void; busy: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  useEffect(() => {
    const box = end.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [msgs.length]);
  return (
    <section aria-label={label} className={`mx-auto w-full overflow-hidden rounded-[2rem] border-[6px] border-ink bg-ink shadow-lift ring-1 ring-hairline ${small ? "max-w-64" : "max-w-88"}`}>
      <div className="flex items-center gap-2.5 bg-wa-bar px-3 py-2.5 text-white">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <WhatsAppIcon className="size-5 text-whatsapp" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-meta font-semibold leading-tight">{title}</p>
          <p className="truncate text-[0.6875rem] leading-tight opacity-80">{status}</p>
        </div>
      </div>
      <div data-wa-chat className={`overflow-y-auto bg-wa-chat p-2.5 text-wa-ink ${small ? "h-72" : "h-[30rem] max-sm:h-[26rem]"}`}>
        {msgs.length === 0 && <p className="pt-6 text-center text-meta opacity-70">No messages yet</p>}
        <ul className="flex flex-col gap-2">
          {msgs.map((m, i) => {
            const d = dayLabel(m.at);
            const head = i === 0 || dayLabel(msgs[i - 1].at) !== d;
            return (
              <li key={m.id} className="contents">
                {head && <p className="my-1 self-center rounded-md bg-wa-in px-2 py-0.5 text-[0.6875rem] opacity-90 shadow-sm">{d}</p>}
                <ul className="contents">
                  <Bubble m={m} mine={m.from === mine} onTap={onTap} busy={busy} />
                </ul>
              </li>
            );
          })}
        </ul>
        <div ref={end} />
      </div>
      {onSend && (
        <form
          className="flex items-center gap-2 bg-wa-bar px-2 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onSend(text);
            setText("");
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" placeholder="Message" maxLength={500} autoComplete="off" className="h-10 min-w-0 flex-1 rounded-full bg-wa-in px-4 text-body text-wa-ink placeholder:text-wa-ink/50" />
          <button type="submit" aria-label="Send" disabled={busy} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-whatsapp text-white disabled:opacity-60">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.5L15 12 3.39 13.9z" />
            </svg>
          </button>
        </form>
      )}
    </section>
  );
}

export function Phones({ initial }: { initial: View }) {
  const [view, setView] = useState(initial);
  const [busy, start] = useTransition();
  // The buyer's answer arrives a few seconds after the offer, so look often while one is on its way and now and then otherwise.
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) void snapshotAction().then(setView).catch(() => undefined);
    }, view.typing ? 2000 : 15000);
    return () => clearInterval(t);
  }, [view.typing]);
  const run = (go: () => Promise<View>) => start(async () => setView(await go()));
  return (
    <div className="flex flex-col gap-6">
      <Phone label="Your WhatsApp" title={SITE_NAME} status="Business account" msgs={view.staff} mine="staff" busy={busy} onTap={(id, b) => run(() => tapAction(id, b))} onSend={(t) => run(() => sendAction(t))} />
      <div className="flex flex-col gap-2">
        <p className="text-center text-meta text-text-2">What the buyer sees</p>
        <Phone label="The buyer's WhatsApp" title={view.buyerName || "A buyer"} status={view.typing && view.buyer.length > 0 ? "typing..." : "online"} msgs={view.buyer} mine="buyer" small busy={busy} />
      </div>
    </div>
  );
}
