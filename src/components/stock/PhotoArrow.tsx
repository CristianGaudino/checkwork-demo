import { ChevronLeftIcon, ChevronRightIcon } from "@/components/stock/icons";
import { arrow, arrowEnd } from "@/components/stock/photo-load";

// The previous and next buttons on a photo (card, gallery, viewer). At the end of the row the button stays in place but goes quiet, so
// nothing shifts. `className` places it (left-2, right-4) and adds any hover reveal.
export function PhotoArrow({ dir, disabled, onClick, className = "" }: { dir: "previous" | "next"; disabled: boolean; onClick(): void; className?: string }) {
  const Icon = dir === "previous" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button type="button" aria-label={dir === "previous" ? "Previous photo" : "Next photo"} aria-disabled={disabled} onClick={() => !disabled && onClick()} className={`${arrow} ${className} ${disabled ? arrowEnd : ""}`}>
      <Icon />
    </button>
  );
}
