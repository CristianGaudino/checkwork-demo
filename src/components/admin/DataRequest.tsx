"use client";

import { useKeptForm } from "@/components/admin/useKeptForm";
import { useState } from "react";
import { Field, Panel, adminButton, adminButtonQuiet, adminInput } from "@/components/admin/kit";
import { eraseAction, exportAction, findAction, type FindState } from "@/app/dashboard/data-requests/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

// Find what is held about a person, then send them a copy or erase it. The email or phone stays in the page, never in the address.
export function DataRequest() {
  const [state, find, pending] = useKeptForm<FindState>(findAction, undefined);
  // The tick is for the person on screen: a new search clears it.
  const [checkedFor, setCheckedFor] = useState<string>();
  const found = state?.groups;
  const checked = checkedFor !== undefined && checkedFor === state?.q;
  return (
    <>
      <Panel title="Find a person">
        <form {...find} className="flex flex-wrap items-start gap-3" noValidate>
          <Field label="Their email or phone number" error={state?.error} className="w-full sm:max-w-sm">
            <input name="q" defaultValue={state?.q ?? ""} autoComplete="off" className={adminInput} />
          </Field>
          <div className="sm:pt-6">
            <button type="submit" disabled={pending} className={adminButton}>
              {pending ? "Looking" : "Find"}
            </button>
          </div>
        </form>
      </Panel>
      {found && (
        <Panel title={state.total ? `What we hold: ${state.total === 1 ? "1 record" : `${state.total} records`}` : "Nothing held"}>
          {found.length === 0 ? (
            <p className="text-body text-text-2">Nothing matches {state.q}. Check it is the email or phone they gave us.</p>
          ) : (
            <>
              <dl className="flex flex-col gap-3">
                {found.map((g) => (
                  <div key={g.label}>
                    <dt className="text-meta font-medium text-text-2">{g.label}</dt>
                    {g.items.map((it, i) => (
                      <dd key={i} className="text-body">
                        {it}
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
              <div className="flex flex-col gap-4 border-t border-hairline pt-4">
                <button type="button" onClick={() => download(state.q!)} className={`${adminButtonQuiet} self-start`}>
                  Download a copy for them
                </button>
                <form action={eraseAction} className="flex flex-col items-start gap-3">
                  <input type="hidden" name="q" value={state.q} />
                  <label className="flex min-h-11 items-center gap-3 text-body">
                    <input type="checkbox" name="checked" checked={checked} onChange={(e) => setCheckedFor(e.target.checked ? state.q : undefined)} className="size-5 accent-accent" />
                    I have checked this is the person asking
                  </label>
                  <SubmitButton disabled={!checked} className="inline-flex h-11 items-center rounded-control border border-bad px-4 text-meta font-semibold text-bad disabled:opacity-50">
                    Erase everything above
                  </SubmitButton>
                </form>
              </div>
            </>
          )}
        </Panel>
      )}
    </>
  );
}

// The copy as a file the browser saves: made from the server's answer, so nothing about the person is ever in an address.
async function download(q: string) {
  const file = await exportAction(q);
  if (!file) return;
  const url = URL.createObjectURL(new Blob([file.json], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
  a.click();
  URL.revokeObjectURL(url);
}
