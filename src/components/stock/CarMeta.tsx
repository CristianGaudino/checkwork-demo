import { ByUnit, Mileage } from "@/components/Mileage";
import type { SpecRow } from "@/lib/stock/format";
import { FUEL_LABELS, GEARBOX_LABELS, type Car } from "@/lib/stock/types";

// "2016 · 104,800 km · Diesel · Manual", with the mileage in the buyer's chosen unit.
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

// One spec as the page shows it: the mileage and the speeds follow the buyer's unit, everything else is the text from specRows.
export function FactValue({ car, label, value, miles }: { car: Pick<Car, "mileageKm"> } & SpecRow) {
  if (label === "Mileage" && car.mileageKm !== undefined) return <Mileage km={car.mileageKm} />;
  return miles ? <ByUnit km={value} miles={miles.value} /> : <>{value}</>;
}
export const FactLabel = ({ label, miles }: SpecRow) => (miles ? <ByUnit km={label} miles={miles.label} /> : <>{label}</>);
