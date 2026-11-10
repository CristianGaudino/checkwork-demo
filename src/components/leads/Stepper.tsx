import { CheckIcon } from "@/components/stock/icons";

// The progress of a stepped form. In a dialog and on a phone it is a row: a numbered dot per step joined by a line. On a form page from 1024px
// (`rail`) it is a column down the left, each step with its title. The current step's heading follows (it takes focus when the step changes,
// so `headingRef` is the form's). The list carries data-rail so the page layout can place it.
export function Stepper({ titles, step, headingRef, rail = false }: { titles: string[]; step: number; headingRef: React.Ref<HTMLHeadingElement>; rail?: boolean }) {
  const last = titles.length - 1;
  return (
    <>
      <ol data-rail aria-label="Progress" className={`flex items-center gap-2 ${rail ? "lg:flex-col lg:items-stretch lg:gap-0" : ""}`}>
        {titles.map((title, i) => (
          <li key={title} aria-current={i === step ? "step" : undefined} className={`flex flex-1 items-center gap-2 last:flex-none ${rail ? "lg:flex-none lg:flex-col lg:items-stretch lg:gap-0" : ""}`}>
            <span className="flex items-center gap-3">
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-meta font-semibold ${i < step ? "bg-accent text-on-accent" : i === step ? "bg-text text-ink" : "bg-hairline text-text-2"}`}>
                {i < step ? <CheckIcon className="size-4" /> : i + 1}
              </span>
              <span className={`hidden text-meta sm:block ${i === step ? "font-semibold" : "text-text-2"}`}>{title}</span>
            </span>
            {i < last && <span aria-hidden="true" className={`h-px flex-1 ${rail ? "lg:ml-4 lg:h-8 lg:w-px lg:flex-none" : ""} ${i < step ? "bg-accent" : "bg-hairline"}`} />}
          </li>
        ))}
      </ol>
      <h2 ref={headingRef} tabIndex={-1} className="text-heading font-semibold outline-none">
        <span className="text-text-2">
          Step {step + 1} of {titles.length}
        </span>{" "}
        {titles[step]}
      </h2>
    </>
  );
}
