// What an Irish registration says on its own, with no lookup service: the year (and from 2013 which half of it) and the county.
// "191-KY-1234" is a car first registered in Kerry, January to June 2019. "08-D-12345" is Dublin, 2008. Pure, so it is tested and runs
// in the browser too. Anything that is not an Irish registration (a UK plate, a typo) gives null, never a guess.
const COUNTIES: Record<string, string> = {
  C: "Cork",
  CE: "Clare",
  CN: "Cavan",
  CW: "Carlow",
  D: "Dublin",
  DL: "Donegal",
  G: "Galway",
  KE: "Kildare",
  KK: "Kilkenny",
  KY: "Kerry",
  L: "Limerick",
  LD: "Longford",
  LH: "Louth",
  LK: "Limerick",
  LM: "Leitrim",
  LS: "Laois",
  MH: "Meath",
  MN: "Monaghan",
  MO: "Mayo",
  OY: "Offaly",
  RN: "Roscommon",
  SO: "Sligo",
  T: "Tipperary",
  TN: "Tipperary",
  TS: "Tipperary",
  W: "Waterford",
  WD: "Waterford",
  WH: "Westmeath",
  WX: "Wexford",
  WW: "Wicklow",
};

export type RegFacts = { reg: string; year: number; half?: 1 | 2; county: string };

export function parseIrishReg(raw: string, now = new Date()): RegFacts | null {
  const reg = raw.trim().toUpperCase().replace(/\s+/g, "-");
  const m = /^(\d{2})([12])?-?([A-Z]{1,2})-?(\d{1,6})$/.exec(reg);
  if (!m) return null;
  const [, yy, half, code, serial] = m;
  const county = COUNTIES[code];
  if (!county) return null;
  const year = Number(yy) >= 87 ? 1900 + Number(yy) : 2000 + Number(yy);
  // From 2013 the year carries a half (131, 132); before it there is none. A year in the future is a typo.
  if ((year >= 2013) !== Boolean(half) || year > now.getUTCFullYear()) return null;
  return { reg: `${yy}${half ?? ""}-${code}-${serial}`, year, ...(half && { half: Number(half) as 1 | 2 }), county };
}

// "Registered in Kerry, January to June 2019": the words the forms show under the box.
export const regSummary = (f: RegFacts) =>
  `Registered in ${f.county}, ${f.half === 1 ? "January to June " : f.half === 2 ? "July to December " : ""}${f.year}`;
