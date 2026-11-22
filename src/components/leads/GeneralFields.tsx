"use client";

import Link from "next/link";
import { useRef } from "react";
import { LIMITS } from "@/lib/leads/constants";
import { CHOICES, TOPICS, URGENCY_FOR, type TopicId } from "@/lib/leads/contact-topics";
import { count } from "@/lib/count-client";
import { readDraft, saveDraft } from "@/lib/leads/draft";
import { SITE_SLUG } from "@/lib/site";
import { secondaryButton } from "@/components/ui";
import { ContactFields, Field, tidyOnBlur } from "./Field";
import { tidyReg } from "@/lib/reg";
import type { FieldBinding, FormStep } from "./LeadForm";

// The guided contact form (#176), in three steps: what the buyer needs, a few taps about it, how to reach them. /service and /warranty
// start at step two with the topic already set (`fixed`), so their steps are CONTACT_STEPS without the first. The first is one question,
// so picking a topic moves on (`auto`); the others have several questions each, so they keep Next.
export const CONTACT_STEPS: FormStep[] = [
  { title: "What you need", auto: true, fields: ["topic"] }, // no check: picking a topic is the only way on
  { title: "A few questions", fields: ["carId", "timing", "hasTradeIn", "serviceNeed", "reg", "urgency", "boughtWhen", "concern", "message"] },
  { title: "Your details", fields: ["name", "phone", "email", "contactVia", "contactWhen", "consent"] },
];

const chip = "flex cursor-pointer items-center border border-control bg-card has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-on-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-text";

// One question as large taps: radios in a group, so a keyboard and a screen reader get it right. Nothing is required.
function Choice({ bind, label, options }: { bind: FieldBinding; label: string; options: readonly { value: string; label: string }[] }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-meta font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={`${chip} min-h-11 rounded-control px-4 text-body`}>
            <input type="radio" name={bind.name} value={o.value} checked={bind.value === o.value} onChange={() => bind.onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
const only = (key: keyof typeof CHOICES, values: string[]) => CHOICES[key].filter((o) => values.includes(o.value));

// Hands over to a form of its own, so there is one valuation form and not two. What is carried lands in that form's kept draft.
function Handover({ href, children, carry }: { href: string; children: React.ReactNode; carry?: { type: string; values: Record<string, string> } }) {
  return (
    <Link href={href} onClick={() => {
        // Added to what the buyer may already have typed on that form, never in place of it.
        const key = `${SITE_SLUG}:draft:${carry?.type}::${href}`;
        if (carry && Object.values(carry.values).some(Boolean)) saveDraft(key, { ...readDraft(key), ...carry.values });
      }} className={`inline-flex h-12 items-center justify-center px-5 ${secondaryButton}`}>
      {children}
    </Link>
  );
}

export function GeneralFields({ bind, step, advance, cars = [], fixed }: { bind(name: string): FieldBinding; step: number; advance(): void; cars?: [string, string][]; fixed?: TopicId }) {
  const at = fixed ? step + 1 : step; // the step in CONTACT_STEPS
  const topicBind = bind("topic");
  const topic = fixed ?? ((topicBind.value || undefined) as TopicId | undefined);
  const pick = (id: TopicId) => {
    if (id === topic) return;
    topicBind.onChange(id);
    count("contact-topic");
  };
  // Arrow keys move through the topics (the browser checks each one with a click) without leaving the step; a tap, a click, Space or Enter
  // picks one and moves on. Picking the one already chosen (after Back) moves on too.
  const arrowed = useRef(false);
  const carPick = [{ value: "", label: "Not sure yet" }, ...cars.map(([value, label]) => ({ value, label }))];
  const regBind = bind("reg");
  const reg = <Field {...regBind} onBlur={tidyOnBlur(regBind, tidyReg)} label="Registration" optional autoCapitalize="characters" spellCheck={false} maxLength={12} placeholder="191-KY-1234" enterKeyHint="next" />;
  // Every step stays in the form (hidden, not removed) so the send reads all of it; only the current one shows.
  return (
    <>
      {fixed ? (
        <input type="hidden" name="topic" value={fixed} />
      ) : (
        <fieldset
          hidden={at !== 0}
          onKeyDown={(e) => {
            arrowed.current = e.key.startsWith("Arrow");
          }}
          onKeyUp={() => {
            arrowed.current = false;
          }}
          className="flex flex-col gap-3"
        >
          <legend className="mb-3 text-body text-text-2">What can we help with?</legend>
          {/* Two across only when the form is wide enough (not the screen): beside the contact page's map a label would wrap to three lines. */}
          <div className="@container">
            <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
              {TOPICS.map((t) => (
                <label key={t.id} className={`${chip} min-h-14 rounded-card px-4 font-semibold`}>
                  <input
                    type="radio"
                    name="topic"
                    value={t.id}
                    checked={topic === t.id}
                    onChange={() => pick(t.id)}
                    onClick={() => arrowed.current || advance()}
                    // Space and Enter by hand: a browser gives no click for Space on the topic already checked, and Enter would be the form's own.
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      pick(t.id);
                      advance();
                    }}
                    className="sr-only"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          {topicBind.error && (
            <p role="alert" className="text-meta text-destructive">
              {topicBind.error}
            </p>
          )}
        </fieldset>
      )}
      <div hidden={at !== 1} className="flex flex-col gap-4">
        {topic === "buying" && (
          <>
            {cars.length > 0 && <Field {...bind("carId")} label="Which car?" optional options={carPick} />}
            <Choice bind={bind("timing")} label="When are you hoping to buy?" options={CHOICES.timing} />
            <Choice bind={bind("hasTradeIn")} label="Do you have a car to trade in?" options={CHOICES.hasTradeIn} />
            {bind("hasTradeIn").value === "yes" && (
              <div>
                <Handover href="/trade-in" carry={{ type: "trade_in", values: { carId: bind("carId").value } }}>
                  Value my car now
                </Handover>
              </div>
            )}
          </>
        )}
        {topic === "selling" && (
          <div className="flex flex-col gap-3">
            <p className="text-body text-text-2">Tell us about your car and we will come back with a price.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Handover href="/sell-your-car">Sell my car</Handover>
              <Handover href="/trade-in">Trade it in</Handover>
            </div>
          </div>
        )}
        {topic === "finance" && (
          <>
            {cars.length > 0 && <Field {...bind("carId")} label="Which car?" optional options={carPick} />}
            <div>
              <Handover href="/finance">Work out a payment</Handover>
            </div>
          </>
        )}
        {topic === "service" && (
          <>
            <Choice bind={bind("serviceNeed")} label="What does it need?" options={CHOICES.serviceNeed} />
            {reg}
            <Choice bind={bind("urgency")} label="When suits you?" options={only("urgency", URGENCY_FOR.service)} />
          </>
        )}
        {topic === "bought" && (
          <>
            {reg}
            <Choice bind={bind("boughtWhen")} label="When did you buy it?" options={CHOICES.boughtWhen} />
            <Choice bind={bind("concern")} label="What is the concern?" options={CHOICES.concern} />
            <Choice bind={bind("urgency")} label="How urgent is it?" options={only("urgency", URGENCY_FOR.bought)} />
          </>
        )}
        {topic === "other" && <Field {...bind("message")} label="How can we help?" required multiline maxLength={LIMITS.message} />}
      </div>
      <div hidden={at !== 2} className="flex flex-col gap-4">
        <ContactFields bind={bind} />
        <Choice bind={bind("contactVia")} label="How should we reach you?" options={CHOICES.contactVia} />
        <Choice bind={bind("contactWhen")} label="When is best?" options={CHOICES.contactWhen} />
        {topic !== "other" && <Field {...bind("message")} label="Anything else?" optional multiline maxLength={LIMITS.message} placeholder={topic === "service" ? "For example, the mileage or what you have noticed" : undefined} />}
      </div>
    </>
  );
}
