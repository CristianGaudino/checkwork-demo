import { ADJUSTS, type Adjust, type CarFacts, type FactsOf, type Task } from "./tasks";

// The demo's writer: no key, no cost. The same facts and button always give the same text, and it is built only from the facts it is
// given (the car's fields, the lead's message, the review). It never states a history, a warranty or a finance term, and never a figure
// the record does not hold. The real writer replaces this in write.ts.
const clean = (s: string) => s.replace(/\s*[\u2014\u2013]\s*/g, ", "); // the house style: no em or en dashes, whatever came back
const BR = "\n"; // a blank line between parts
const lines = (...l: (string | number | false | undefined)[]) => clean(l.filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n").trim());
const km = (c: CarFacts) => c.mileageKm !== undefined && `${c.mileageKm.toLocaleString("en-IE")} km`;
const specs = (c: CarFacts) => [c.year, km(c), c.fuel?.toLowerCase(), c.gearbox?.toLowerCase(), c.body, c.engineLitres && `${c.engineLitres.toFixed(1)} L`].filter(Boolean).join(", ");
const extras = (c: CarFacts) => [c.colour, c.doors && `${c.doors} doors`, c.seats && `${c.seats} seats`, c.owners && `${c.owners} ${c.owners === 1 ? "owner" : "owners"} on record`, c.nctExpiry && `NCT to ${c.nctExpiry}`].filter(Boolean).join(", ");
const kit = (c: CarFacts, n = 6) => (c.features?.length ? `Equipment includes ${c.features.slice(0, n).join(", ")}.` : "");
const tag = (s: string) => `#${s.replace(/[^A-Za-z0-9]/g, "")}`;

function post(f: FactsOf["post"], a: Adjust | undefined, current: string): string {
  const { car: c, voice, network, format } = f;
  const social = network === "Instagram" || network === "TikTok";
  const link = c.link && (social ? "Link in bio." : c.link);
  const price = c.price && `${c.price}.`;
  if (format === "story") {
    const head = { "just-in": "Just in", "price-drop": "Price drop" }[f.layout ?? "just-in"];
    const drop = f.layout === "price-drop" && c.was && c.price ? `Now ${c.price}, was ${c.was}.` : price;
    if (a === "shorter") return lines(`${head}: ${c.name}.`);
    if (a === "urgency") return lines(`${head}: ${c.name}.`, drop, "Message us today.");
    return lines(`${head}: ${c.name}.`, drop, "See it on our site.");
  }
  const lead = { post: "Just in", story: "Just in", reel: "Walkaround", carousel: "More photos" }[format];
  const base = [`${lead}: ${c.name}.`, specs(c) && `${specs(c)}.`, price, voice.signOff.trim(), link, network === "Facebook" ? "" : voice.hashtags.trim()];
  switch (a) {
    case "professional": return lines(`${c.name} is now available at ${f.dealer}.`, specs(c) && `${specs(c)}.`, price, "Please contact our team to arrange a viewing.", link);
    case "friendlier": return lines(`Look what just came in! ${c.name}.`, specs(c) && `${specs(c)}.`, price, "Pop in and say hello.", link);
    case "shorter": return lines(`${c.name}. ${c.price ?? ""}`.trim(), link);
    case "detail": return lines(...base.slice(0, 3), extras(c) && `${extras(c)}.`, kit(c), ...base.slice(3));
    case "urgency": {
      const ask = "Message us today to book a viewing.";
      const text = current || lines(...base);
      return text.includes(ask) ? text : lines(text, ask);
    }
    case "hashtags": {
      const tags = [...c.name.split(" ").filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2), c.body, "UsedCars"].filter(Boolean).map((t) => tag(t as string));
      const text = current || lines(...base);
      return text.includes(tags.join(" ")) ? text : lines(text, tags.join(" "));
    }
    default: return lines(...base);
  }
}

function newsletter(f: FactsOf["newsletter"], a: Adjust | undefined): string {
  const list = f.cars.map((c) => `- ${c.name}, ${c.price ?? "ask for the price"}. ${c.link ?? ""}`.trim());
  const sign = f.voice.signOff.trim();
  if (a === "shorter") return lines(...list, sign);
  if (a === "friendlier") return lines("Hi there!", `Here is what has just come in at ${f.dealer}.`, BR, ...list, BR, "Pop in and say hello.", sign);
  if (a === "professional") return lines("Dear subscriber,", `These cars are now available at ${f.dealer}.`, BR, ...list, BR, "Please contact us to arrange a viewing.", sign);
  return lines(`New in this week at ${f.dealer}:`, BR, ...list, BR, sign);
}

function description(f: FactsOf["carDescription"], a: Adjust | undefined): string {
  const c = f.car;
  const motor = [c.engineLitres && `${c.engineLitres.toFixed(1)} L`, c.fuel?.toLowerCase()].filter(Boolean).join(" ");
  const gear = c.gearbox ? `${c.gearbox.toLowerCase()} gearbox` : "";
  const drive = [motor && `${motor} engine`, gear].filter(Boolean).join(" with ");
  const engine = drive && `${drive}.`;
  const intro = `${c.name}${c.colour ? ` in ${c.colour.toLowerCase()}` : ""}${km(c) ? `, ${km(c)} on the clock` : ""}.`;
  const note = f.notes?.trim();
  switch (a) {
    case "shorter": return lines(intro);
    case "detail": return lines(intro, engine, extras(c) && `${extras(c)}.`, kit(c, 12), note);
    case "economy": return lines(intro, engine, "Ask us about running costs and we will go through them with you.", note);
    case "family": return lines(intro, `${[c.body, c.seats && `${c.seats} seats`, c.doors && `${c.doors} doors`].filter(Boolean).join(", ")}.`, "Come and see how it suits your family.", note);
    default: return lines(intro, engine, kit(c, 4), note);
  }
}

function leadReply(f: FactsOf["leadReply"], a: Adjust | undefined): string {
  const about = f.car ? ` about the ${f.car}` : "";
  const ask = f.kind === "Test drive" ? "We would be glad to set up a test drive. What day suits you?" : f.kind === "Trade-in" || f.kind === "Selling a car" ? "We will look at your car and come back to you with a valuation." : "We would be happy to help. What time suits you for a call?";
  switch (a) {
    case "formal": return lines(`Dear ${f.firstName},`, `Thank you for contacting ${f.dealer}${about}.`, ask, BR, "Yours sincerely,", f.dealer);
    case "friendlier": return lines(`Hi ${f.firstName}, thanks so much for getting in touch${about}!`, ask, BR, "Speak soon,", f.dealer);
    case "shorter": return lines(`Hi ${f.firstName}, thanks for your message${about}.`, ask);
    default: return lines(`Hi ${f.firstName},`, `Thank you for your message${about}.`, ask, BR, "Kind regards,", f.dealer);
  }
}

function reviewReply(f: FactsOf["reviewReply"], a: Adjust | undefined): string {
  const good = f.rating >= 4;
  if (a === "shorter") return lines(good ? `Thank you, ${f.firstName}.` : `Thank you for telling us, ${f.firstName}. We will be in touch.`, `The team at ${f.dealer}`);
  if (a === "apologetic" || !good) return lines(`Hi ${f.firstName}, we are sorry we did not get this right.`, "Thank you for telling us. Please call or visit us so we can look into it with you.", BR, `The team at ${f.dealer}`);
  return lines(`Thank you, ${f.firstName}, for the kind words.`, "We are glad you were happy with us.", BR, `The team at ${f.dealer}`);
}

export function mockText<T extends Task>(task: T, facts: FactsOf[T], adjust?: Adjust, current = ""): string {
  if (adjust && !Object.hasOwn(ADJUSTS, adjust)) adjust = undefined;
  switch (task) {
    case "post": return post(facts as FactsOf["post"], adjust, current);
    case "newsletter": return newsletter(facts as FactsOf["newsletter"], adjust);
    case "carDescription": return description(facts as FactsOf["carDescription"], adjust);
    case "leadReply": return leadReply(facts as FactsOf["leadReply"], adjust);
    default: return reviewReply(facts as FactsOf["reviewReply"], adjust);
  }
}
