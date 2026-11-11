import { Mileage } from "@/components/Mileage";
import { FUEL_LABELS, GEARBOX_LABELS, type Car } from "@/lib/stock/types";

// "2016 · 104,800 km · Diesel · Manual", with the mileage in the buyer's chosen unit. carMeta (format.ts) is the plain-text twin for
// places that need a string (share text, structured data).
export function CarMeta({ car }: { car: Pick<Car, "year" | "mileageKm" | "fuel" | "gearbox"> }) {
  const parts: React.ReactNode[] = [
    car.year,
    car.mileageKm !== undefined && <Mileage km={car.mileageKm} />,
    car.fuel && FUEL_LABELS[car.fuel],
    car.gearbox && GEARBOX_LABELS[car.gearbox],
  ].filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {p}
        </span>
      ))}
    </>
  );
}

// One spec's value as the page shows it: the mileage follows the buyer's unit, everything else is the text from specRows.
export function FactValue({ car, label, value }: { car: Pick<Car, "mileageKm">; label: string; value: string }) {
  return label === "Mileage" && car.mileageKm !== undefined ? <Mileage km={car.mileageKm} /> : <>{value}</>;
}
