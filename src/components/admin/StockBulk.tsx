"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/toast";
import { bulkStockAction } from "@/app/dashboard/stock/actions";
import { PRICE_DROP_MAX_PCT } from "@/lib/admin/stock-admin-pure";
import { fmtEur } from "@/lib/admin/format";
import { adminButton, adminInput, choicePill, dangerButton, rowButton } from "./kit";
import { CheckIcon, PercentIcon, TrashIcon } from "@/components/stock/icons";
import { ConfirmDialog } from "./ActButton";

// Several cars at once (#104), for our own stock. Each row has a tick box (StockPick) tied to this bar by the `form` attribute, so the
// table stays a server component. Until a car is ticked a line says what ticking does; then the bar names the cars ticked and offers
// each change with a line on what it does: drop the price by euros or a percentage, mark sold, or delete. Each asks once, in the same
// dialog as a single car's delete. The bar stays in view while the list scrolls, so cars further down can be ticked too.
const FORM = "stock-bulk";
type Op = "price" | "sold" | "delete";

export function StockPick({ id, name }: { id: string; name: string }) {
  return (
    <label className="relative z-10 -m-3 flex size-11 cursor-pointer items-center justify-center">
      {/* A label, so a tap anywhere in the 44px ring ticks the box (a span would swallow it, above the row's link). */}
      <input type="checkbox" form={FORM} name="ids" value={id} data-name={name} aria-label={`Select ${name}`} className="size-5 accent-accent" />
    </label>
  );
}

const boxes = () => [...document.querySelectorAll<HTMLInputElement>(`input[form="${FORM}"][name="ids"]`)];

export function StockBulk({ canDelete }: { canDelete: boolean }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const count = picked.length;
  const [op, setOp] = useState<Op | null>(null);
  const [unit, setUnit] = useState<"eur" | "pct">("eur");
  const [amount, setAmount] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const recount = () => setPicked(boxes().filter((b) => b.checked).map((b) => b.dataset.name ?? ""));
    document.addEventListener("change", recount);
    recount();
    return () => document.removeEventListener("change", recount);
  }, []);

  const setAll = (on: boolean) => {
    for (const b of boxes()) b.checked = on;
    setPicked(on ? boxes().map((b) => b.dataset.name ?? "") : []);
    if (!on) setOp(null);
  };
  const cars = count === 1 ? "1 car" : `${count} cars`;
  const drop = unit === "eur" ? fmtEur(Number(amount)) : `${amount}%`;
  const question = op === "price" ? `Drop the price of ${cars} by ${drop}?` : op === "sold" ? `Mark ${cars} sold?` : `Delete ${cars}?`;
  const text =
    op === "price" ? "The earlier price shows beside each new one on the website. Sold cars keep their price." : op === "sold" ? "They show as Sold on the website. Record each sale from its row. A car with a deposit held is left as it is." : "This cannot be undone. A car with a deposit held is left as it is.";

  const run = () =>
    start(async () => {
      const f = new FormData();
      for (const b of boxes()) if (b.checked) f.append("ids", b.value);
      f.set("op", op!);
      if (op === "price") {
        f.set("amount", amount);
        f.set("unit", unit);
      }
      const r = await bulkStockAction(f);
      if ("error" in r) return setError(r.error);
      setAll(false);
      setAmount("");
      router.refresh();
      const done = op === "price" ? "Price dropped on" : op === "sold" ? "Marked sold:" : "Deleted";
      showToast(`${done} ${r.changed === 1 ? "1 car" : `${r.changed} cars`}${r.skipped ? `. ${r.skipped} left as ${r.skipped === 1 ? "it was" : "they were"}` : ""}`);
    });
  const ask = (o: Op) => {
    setError("");
    setOp(o);
    if (o !== "price") setAsking(true);
  };
  const amountOk = /^\d+$/.test(amount) && Number(amount) >= 1 && (unit === "eur" || Number(amount) <= PRICE_DROP_MAX_PCT);

  // What is ticked, by name: three, then how many more.
  const names = picked.length > 3 ? `${picked.slice(0, 3).join(", ")} and ${picked.length - 3} more` : picked.join(", ");
  const choices: [Op, string, string, React.ReactNode][] = [
    ["price", "Drop the price", "Lower each price by euros or a percentage. The old price shows beside it.", <PercentIcon key="i" className="size-4" />],
    ["sold", "Mark sold", "Show them as Sold on the website. Record each sale after.", <CheckIcon key="i" className="size-4" />],
    ...(canDelete ? [["delete", "Delete", "Delete the cars, their costs and prep for good.", <TrashIcon key="i" className="size-4" />] as [Op, string, string, React.ReactNode]] : []),
  ];

  return (
    <>
      {count === 0 && <p className="text-meta text-text-2 max-sm:hidden">Tick cars in the list to drop their price, mark them sold or delete them together.</p>}
      <form id={FORM} onSubmit={(e) => (e.preventDefault(), amountOk && setAsking(true))} hidden={count === 0} className="z-30 sm:sticky sm:top-2 flex flex-col gap-3 rounded-card border border-accent bg-card p-4 shadow-lift lg:top-[5.5rem]">
      <div className="flex flex-wrap items-center gap-2">
        <p aria-live="polite" className="mr-auto flex min-w-0 flex-col">
          <span className="font-semibold">{count > 0 && `${cars} selected`}</span>
          <span className="line-clamp-1 text-meta text-text-2">{names}</span>
        </p>
        <button type="button" onClick={() => setAll(true)} className={rowButton}>Select all on this page</button>
        <button type="button" onClick={() => setAll(false)} className={rowButton}>Clear</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {choices.map(([o, label, what, icon]) => (
          <div key={o} className="flex flex-col gap-1">
            <button type="button" aria-pressed={o === "price" ? op === "price" : undefined} aria-describedby={`${FORM}-${o}`} onClick={() => ask(o)} className={`${choicePill(op === o && o === "price")} justify-center ${o === "delete" ? "text-bad" : ""}`}>
              {icon}
              {label}
            </button>
            <span id={`${FORM}-${o}`} className="px-1 text-meta text-text-2">{what}</span>
          </div>
        ))}
      </div>
      {op === "price" && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-meta font-semibold">Drop by</span>
            <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.trim())} className={`${adminInput} w-32`} />
          </label>
          <div role="group" aria-label="In" className="flex gap-1">
            <button type="button" aria-pressed={unit === "eur"} onClick={() => setUnit("eur")} className={choicePill(unit === "eur")}>€</button>
            <button type="button" aria-pressed={unit === "pct"} onClick={() => setUnit("pct")} className={choicePill(unit === "pct")}>%</button>
          </div>
          <button type="submit" disabled={!amountOk || pending} className={adminButton}>Drop the price</button>
        </div>
      )}
      {error && <p role="alert" className="text-meta text-destructive">{error}</p>}
      {asking && (
        <ConfirmDialog
          confirm={{ title: question, text, yes: op === "price" ? "Drop the price" : op === "sold" ? "Mark sold" : "Delete" }}
          yesClassName={op === "price" ? adminButton : dangerButton}
          onYes={run}
          onClose={() => setAsking(false)}
        />
      )}
      </form>
    </>
  );
}
