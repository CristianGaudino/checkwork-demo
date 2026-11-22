import "server-only";

// The one outside service the site calls itself: the registration lookup on the trade-in and sell forms (Cartell). It is "connected" when
// its key is present; nothing here holds a secret. The lead email and the bot check show their true state and are never simulated.
// The demo shows the lookup working: with no key it answers with a sample car and sends nothing outside. A production site
// (APP_ENV=production) does not simulate unless SIMULATE_INTEGRATIONS=on, and SIMULATE_INTEGRATIONS=off turns it off anywhere.
export const simulating = () => {
  const v = process.env.SIMULATE_INTEGRATIONS;
  return v ? v !== "off" : process.env.APP_ENV !== "production"; // unset: simulate everywhere except a production site
};

export type Mode = "live" | "simulated" | "off";
export const regLookupMode = (): Mode => (process.env.CARTELL_API_KEY ? "live" : simulating() ? "simulated" : "off");
