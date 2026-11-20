"use client";

import { Combobox } from "@/components/Combobox";
import { useState } from "react";
import { IfModule } from "@/components/IfModule";
import { AlertIcon } from "@/components/stock/icons";
import { CONTACT_ERROR, COUNTRIES, LIMITS } from "@/lib/leads/constants";
import type { FieldBinding } from "./LeadForm";

// Inputs read as wells: ink inside a dialog or a card marked data-wells, card on a page (UI-SPEC Color).
const control = "w-full rounded-control border border-control bg-card text-body in-[dialog]:bg-surface in-data-wells:bg-surface aria-[invalid=true]:border-destructive";

type InputProps = Pick<React.InputHTMLAttributes<HTMLInputElement>, "type" | "autoComplete" | "autoCapitalize" | "spellCheck" | "placeholder" | "maxLength" | "enterKeyHint" | "inputMode" | "min">;

// One labelled control with its helper and error lines (UI-SPEC Form fields, Accessibility baseline).
// invalid and describedBy let ContactFields mark Phone with the one contact error that shows under Email.
export function Field({
  label,
  optional,
  required,
  helper,
  multiline,
  options,
  invalid,
  describedBy,
  suffix,
  prefix,
  id,
  name,
  value,
  onChange,
  error,
  ...input
}: FieldBinding &
  InputProps & { label: string; optional?: boolean; required?: boolean; helper?: string; multiline?: boolean; options?: { value: string; label: string }[]; invalid?: boolean; describedBy?: string; suffix?: string; prefix?: string }) {
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const suffixId = suffix ? `${id}-suffix` : undefined; // read with the field, so "km" is not lost to screen readers
  const prefixId = prefix ? `${id}-prefix` : undefined;
  const common = {
    id,
    name,
    value,
    "aria-invalid": error || invalid ? true : undefined,
    "aria-required": required ? true : undefined,
    "aria-describedby": [prefixId, suffixId, helperId, errorId, describedBy].filter(Boolean).join(" ") || undefined,
  };
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={`text-meta font-semibold ${required ? "required-mark" : ""}`}>
        {label}
        {optional && <span className="font-normal text-text-2"> (optional)</span>}
      </label>
      {options ? (
        <Combobox
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          options={options}
          invalid={Boolean(error || invalid)}
          required={required}
          describedBy={common["aria-describedby"]}
          className="pl-4 in-[dialog]:bg-surface in-data-wells:bg-surface"
        />
      ) : multiline ? (
        <textarea {...common} maxLength={input.maxLength} enterKeyHint="enter" onChange={(e) => onChange(e.target.value)} className={`${control} min-h-28 resize-none px-4 py-3`} />
      ) : suffix || prefix ? (
        <span className="relative">
          {prefix && (
            <span id={prefixId} className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-body text-text-2">
              {prefix}
            </span>
          )}
          <input {...common} {...input} onChange={(e) => onChange(e.target.value)} className={`${control} h-12 ${prefix ? "pl-9" : "pl-4"} ${suffix ? "pr-12" : "pr-4"}`} />
          {suffix && (
            <span id={suffixId} className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-meta text-text-2">
              {suffix}
            </span>
          )}
        </span>
      ) : (
        <input {...common} {...input} onChange={(e) => onChange(e.target.value)} className={`${control} h-12 px-4`} />
      )}
      {helper && (
        <p id={helperId} className="text-meta text-text-2">
          {helper}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

// A field's error: the alert icon first, so it reads as a problem without relying on colour.
export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 break-words text-meta text-destructive">
      <AlertIcon className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

// Name, then phone and email, at least one of which is needed (D-12).
export function ContactFields({ bind }: { bind(name: string): FieldBinding }) {
  const email = bind("email");
  const both = email.error === CONTACT_ERROR;
  // Phone and Email sit side by side once the form itself is wide enough (a container query, so a narrow dialog stays in one column).
  return (
    <div className="@container flex flex-col gap-4">
      <Field {...bind("name")} label="Name" required autoComplete="name" maxLength={LIMITS.name} enterKeyHint="next" />
      {/* The line sits with the pair it explains (tight below it, a larger gap above), not under Name. */}
      <div className="mt-2 flex flex-col gap-2">
        <p className="text-meta text-text-2">Add a phone number or an email, so we can reply.</p>
        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
          <PhoneField {...bind("phone")} invalid={both} describedBy={both ? `${email.id}-error` : undefined} />
          <Field {...email} label="Email" type="email" autoComplete="email" maxLength={LIMITS.email} enterKeyHint="next" />
        </div>
        <IfModule id="whatsapp">
          <WhatsAppOptIn {...bind("whatsappOptIn")} />
        </IfModule>
      </div>
    </div>
  );
}

// Optional, unticked: agreement to updates on WhatsApp, kept on the lead with the consent.
function WhatsAppOptIn({ id, name, value, onChange }: FieldBinding) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <input id={id} type="checkbox" role="switch" name={name} value="yes" checked={value === "yes"} onChange={(e) => onChange(e.target.checked ? "yes" : "")} className="size-5 shrink-0 accent-accent" />
      <label htmlFor={id} className="text-meta">
        Send me updates on WhatsApp
      </label>
    </div>
  );
}

// A country code and the number, kept in the form as one value ("+353 87 123 4567"), which is what the server checks and the dealer reads.
// Ireland is the default. A leading 0 is dropped as it is typed (087 becomes 87), the way the number is dialled from abroad.
function PhoneField({ id, name, value, onChange, error, invalid, describedBy }: FieldBinding & { invalid?: boolean; describedBy?: string }) {
  // Starts from the saved value, so a form that remounts (a step back and forward) keeps the country the buyer chose.
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>(() => COUNTRIES.find((c) => value.startsWith(`${c.dial} `)) ?? COUNTRIES[0]);
  const number = value.startsWith(`${country.dial} `) ? value.slice(country.dial.length).trim() : value;
  const set = (c: (typeof COUNTRIES)[number], n: string) => onChange(n ? `${c.dial} ${n}` : "");
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-meta font-semibold">
        Phone
      </label>
      <div className="flex gap-2">
        <div className="w-32 shrink-0">
          <Combobox
            id={`${id}-country`}
            label="Country code"
            value={country.code}
            options={COUNTRIES.map((c) => ({ value: c.code, label: `${c.code} ${c.dial}` }))}
            onChange={(code) => {
              const c = COUNTRIES.find((x) => x.code === code)!;
              setCountry(c);
              set(c, tidy(number, c.dial)); // a code half typed in the box ("+3") never stacks behind the new one
            }}
          />
        </div>
        {/* The full value is what the form sends (it is built from the page); the visible input holds only the number. */}
        <input type="hidden" name={name} value={value} />
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          enterKeyHint="next"
          maxLength={LIMITS.phone - 5}
          placeholder={country.example}
          value={number}
          aria-invalid={error || invalid ? true : undefined}
          aria-describedby={[errorId, describedBy].filter(Boolean).join(" ") || undefined}
          onChange={(e) => {
            // A number typed or pasted with its own code ("+353 87…" while PL is picked, or "00353…") switches the country. A code still
            // being typed ("+3") is kept as it is; any other "+" (a stray one before a local number) is dropped and the number read under
            // the country picked.
            const raw = e.target.value.trim().replace(/^00/, "+");
            const pasted = raw.startsWith("+") ? BY_DIAL.find((x) => raw.startsWith(x.dial)) : undefined;
            if (raw.startsWith("+") && !pasted && BY_DIAL.some((x) => x.dial.startsWith(raw))) return onChange(raw);
            const c = pasted ?? country;
            if (c !== country) setCountry(c);
            set(c, tidy(raw, c.dial));
          }}
          className={`${control} h-12 min-w-0 flex-1 px-4`}
        />
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

// Longest code first, so +353 is never read as a shorter code that starts the same way.
const BY_DIAL = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

// What was typed or pasted, as the number alone: no code (a pasted +353 is dropped), only digits, spaces, brackets and hyphens, and no leading 0.
function tidy(raw: string, dial: string) {
  const n = raw.trim().startsWith(dial) ? raw.trim().slice(dial.length) : raw;
  const clean = n.replace(/[^0-9 ()-]/g, "");
  return dial === "+1" ? clean : clean.replace(/^[ 0]+/, "");
}
