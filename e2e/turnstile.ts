import type { Page } from "@playwright/test";

// Stands in for Cloudflare's Turnstile script, so no spec ever calls Cloudflare. With pass, every render and reset
// issues a token the E2E fake backend accepts; without it, no token ever arrives (a failed bot check). With challenge, render
// draws a 71px box in the slot, the height of Cloudflare's visible challenge.
export async function stubTurnstile(page: Page, { pass = true, challenge = false }: { pass?: boolean; challenge?: boolean } = {}) {
  const script = `(() => {
    const widgets = {};
    let n = 0;
    const issue = (id) => ${pass} && setTimeout(() => widgets[id] && widgets[id].callback("e2e-token"));
    window.turnstile = {
      render(el, opts) {
        const id = "w" + ++n;
        widgets[id] = opts;
        if (${challenge}) {
          opts["before-interactive-callback"]?.();
          el.insertAdjacentHTML("beforeend", '<div data-testid="challenge" style="height:71px"></div>');
        }
        issue(id);
        return id;
      },
      reset(id) { issue(id); },
      remove(id) { delete widgets[id]; },
    };
  })();`;
  await page.route("https://challenges.cloudflare.com/**", (route) => route.fulfill({ contentType: "text/javascript", body: script }));
}
