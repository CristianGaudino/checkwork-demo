import type { Car } from "@/lib/stock/types";

// The make and model step down a size on a phone when they would split a word: a long word ("Volkswagen") or a long name (a 40 character van).
export const longTitle = (car: Pick<Car, "make" | "model">) => {
  const name = `${car.make} ${car.model}`;
  return name.length > 24 || name.split(/\s+/).some((w) => w.length > 9);
};
