"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Field } from "@/components/leads/Field";
import { FinanceFields, termOptions } from "@/components/leads/FinanceFields";
import { LeadDialog } from "@/components/leads/LeadDialog";
import type { CarSummary } from "@/components/leads/LeadDialog";
import { LeadForm } from "@/components/leads/LeadForm";
import { Tween } from "@/components/Tween";
import { FINANCE, PRODUCT_LABELS, financeNotice, pcpEstimate, type FinanceProduct } from "@/lib/finance/finance.config";
import { financeable, quote } from "@/lib/finance/payment";
import { fmtEur } from "@/lib/stock/format";
import { ArrowRightIcon, InfoIcon } from "@/components/stock/icons";
import { accentButton, card, chip, press } from "@/components/ui";
import { count } from "@/lib/count-client";
import { noteFinance } from "@/lib/visit-note";

// Keystrokes that would not make a number are refused, so the fields only ever hold digits.
const WHOLE = /^\d{0,6}$/;
const take = (re: RegExp, set: (v: string) => void) => (v: string) => {
  v = v.replaceAll(",", "");
  if (re.test(v)) set(v);
};

export type FinanceCar = CarSummary & { priceEur: number };

// FIN-01, FIN-02, D-16. An estimate, worked out in the browser on each keystroke from quote(), with no request. The rate is the
// dealer's, set in finance.config.ts: the buyer picks a deposit and a term, never a rate. The real amount comes from the lender.
// `car` is a car page's own car: its price is fixed and the buyer can start an application for it. Without one (/finance) the buyer
// types a price for an estimate, and the way on is to choose a car: applications are made from a car page.
// With PCP on (FINANCE.pcp) the buyer also picks hire purchase or PCP; each has its own rate, terms and wording.
export function FinanceCalculator({ car }: { car?: FinanceCar }) {
  const uid = useId();
  const d = FINANCE.defaults;
  const [price, setPrice] = useState(String(d.priceEur));
  // A car cheaper than the default deposit starts at no deposit, so its page never opens on an error.
  const [deposit, setDeposit] = useState(String(car && car.priceEur <= d.depositEur ? 0 : d.depositEur));
  const [term, setTerm] = useState(String(d.termMonths));
  const [product, setProduct] = useState<FinanceProduct>("hp");
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<Record<string, string>>();
  const opener = useRef<HTMLButtonElement>(null);

  const priceEur = car ? car.priceEur : Number(price);
  const depositEur = Number(deposit); // blank is no deposit
  const priceError = !car && !(price !== "" && financeable(priceEur)) ? "Enter a price between €1,000 and €250,000." : undefined;
  const pcp = product === "pcp" && FINANCE.pcp;
  const q = pcp ? pcpEstimate(priceEur, depositEur, Number(term)) : quote(priceEur, depositEur, Number(term), d.aprPct);
  const final = q && "finalEur" in q ? q.finalEur : undefined;
  const depositError = priceError ? undefined : depositEur >= priceEur ? "Deposit must be less than the price." : pcp && !q ? "Deposit is too high for PCP. Lower it or choose hire purchase." : undefined;
  // Used once the buyer changes anything; from then the visit's note keeps the last monthly figure shown.
  const [used, setUsed] = useState(false);
  const touched = () => (count("finance"), setUsed(true));
  const monthly = q?.monthlyEur;
  useEffect(() => {
    if (used) noteFinance(monthly);
  }, [used, monthly]);
  const pick = (p: FinanceProduct) => {
    touched();
    setProduct(p);
    const terms = p === "pcp" && FINANCE.pcp ? FINANCE.pcp : { terms: FINANCE.terms, termMonths: d.termMonths };
    if (!terms.terms.includes(Number(term))) setTerm(String(terms.termMonths)); // a term the other product does not offer
  };

  const field = (name: string, value: string, onChange: (v: string) => void, error?: string) => ({ id: `${uid}-${name}`, name, value, onChange: (v: string) => (touched(), onChange(v)), error });

  return (
    <>
      {/* The inputs on the left and the result on the right from 1024px (the mockup); stacked below that. Each card keeps its own height. */}
      <div data-wells className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className={`flex flex-col gap-4 ${card} p-4 sm:p-6`}>
          <div className="grid grid-cols-1 gap-4">
            {FINANCE.pcp && (
              <div role="group" aria-label="Type of finance" className="flex flex-wrap gap-2">
                {(["hp", "pcp"] as const).map((p) => (
                  <button key={p} type="button" aria-pressed={product === p} onClick={() => pick(p)} className={chip(product === p)}>
                    {PRODUCT_LABELS[p]}
                  </button>
                ))}
              </div>
            )}
            {car ? (
              <div className="flex flex-col gap-1">
                <p className="text-meta font-semibold">Price</p>
                <p className="flex h-12 items-center font-semibold tabular-nums">{car.price}</p>
              </div>
            ) : (
              <Field {...field("price", price, take(WHOLE, setPrice), priceError)} label="Price" prefix="€" inputMode="numeric" autoComplete="off" />
            )}
            <Field {...field("deposit", deposit, take(WHOLE, setDeposit), depositError)} label="Deposit" prefix="€" inputMode="numeric" autoComplete="off" />
            <Field {...field("term", term, setTerm)} label="Term" options={termOptions(product)} />
            <p className="text-meta text-text-2">Worked out at an example rate of {pcp ? pcp.aprPct : d.aprPct}% APR. Your real rate is set by the lender.</p>
          </div>
        </div>
        <div className={`flex flex-col gap-4 ${card} p-4 sm:p-6`}>
          <div role="status" aria-live="polite" className="flex flex-col gap-2">
            {q ? (
              <>
                <p className="text-meta text-text-2">Estimated monthly payment</p>
                {/* Grows less than large text on a phone, as the page title does, so the amount stays inside the card whole. */}
                <p className="text-display font-semibold tabular-nums max-sm:[font-size:clamp(1.25rem,10vw,2rem)]">
                  About <Tween value={fmtEur(q.monthlyEur)} /><span className="text-body font-normal text-text-2"> a month</span>
                </p>
                <dl className="flex flex-col gap-1 text-meta">
                  {(
                    [
                      ["Amount borrowed", q.borrowedEur],
                      ...(final === undefined ? [] : [["Optional final payment", final]]),
                      ["Estimated interest", q.interestEur],
                      ["Total you repay", q.totalEur],
                      ["Total cost, with your deposit", q.totalEur + depositEur],
                    ] as [string, number][]
                  ).map(([label, value]) => (
                    <div key={label} className="flex flex-wrap justify-between gap-x-4">
                      <dt className="min-w-0 text-text-2">{label}</dt>
                      <dd className="ml-auto min-w-0 text-right tabular-nums">
                        <Tween value={fmtEur(value)} />
                      </dd>
                    </div>
                  ))}
                  {pcp && (
                    <div className="flex flex-wrap justify-between gap-x-4">
                      <dt className="min-w-0 text-text-2">Mileage allowance</dt>
                      <dd className="ml-auto min-w-0 text-right tabular-nums">{pcp.kmPerYear.toLocaleString("en-IE")} km a year</dd>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <p className="font-semibold">Check the figures you entered.</p>
            )}
          </div>
          {car ? (
            <button
              ref={opener}
              type="button"
              onClick={() => {
                setPrefill(FINANCE.pcp ? { product, deposit, term } : { deposit, term }); // a new object on each open refreshes just these fields in the form
                setOpen(true);
              }}
              className={`mt-auto flex h-12 w-full items-center justify-center gap-2 rounded-control border border-control bg-card px-6 font-semibold ${press}`}
            >
              Ask about finance
              <ArrowRightIcon className="size-5" />
            </button>
          ) : (
            <Link href="/used-cars" className={`mt-auto flex h-12 w-full items-center justify-center gap-2 text-center ${accentButton}`}>
              Select a car to enquire
              <ArrowRightIcon className="size-5" />
            </Link>
          )}
        </div>
      </div>
      {/* The lender's required wording, under both cards at a readable width. */}
      <p className="mt-4 flex max-w-measure items-start gap-2 text-meta text-text-2">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        {financeNotice(car?.priceEur, product)}
      </p>
      {car && (
        <LeadDialog
          title="Ask about finance"
          open={open}
          onClose={() => {
            setOpen(false);
            opener.current?.focus();
          }}
        >
          <LeadForm
            type="finance"
            car={car}
            variant="dialog"
            prefill={prefill}
            submitLabel="Send details"
            success={{ heading: "Thanks, we have your details.", body: "This isn't an approval. We'll contact you with the real amounts and the next steps." }}
          >
            {({ bind }) => <FinanceFields bind={bind} />}
          </LeadForm>
        </LeadDialog>
      )}
    </>
  );
}
