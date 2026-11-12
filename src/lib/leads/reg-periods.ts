// Irish registration periods: the year's last two digits, then 1 for January to June or 2 for July to December. A car ordered in the autumn
// for "271" is registered from January 2027. Shared by the website's order form and the dashboard, so both offer the same periods.
export const regPeriodOf = (day: string) => `${day.slice(2, 4)}${Number(day.slice(5, 7)) <= 6 ? 1 : 2}`;

// The period now and the next three: what a buyer can order for.
export function regPeriods(today: string): string[] {
  let [y, half] = [Number(today.slice(0, 4)), Number(today.slice(5, 7)) <= 6 ? 1 : 2];
  return Array.from({ length: 4 }, () => {
    const p = `${String(y).slice(2)}${half}`;
    [y, half] = half === 1 ? [y, 2] : [y + 1, 1];
    return p;
  });
}

export const regPeriodLabel = (p: string) => `${p}, ${p.endsWith("1") ? "January to June" : "July to December"} 20${p.slice(0, 2)}`;

// Today in Ireland, for the browser and the server alike.
export const irishToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Dublin" });
