// The stock, by hand: one source of truth. build.mjs turns it into src/lib/stock/*.json and public/stock/.
//
// Photos come from the owner's open car photo dataset (US press photos, one folder, file name = title group + "_" + 3 letter id).
// A car lists its title group and the ids of the shots it uses, first shot first. The first is always the outside, front three quarter.
// Models are the dataset's US names where the Irish name differs (Escape is the Kuga, Fit is the Jazz, Metris is the Vito); the cars are the same.
//
// Prices are euro with VAT in (vans without), what a dealer in Ireland would ask. Mileage runs at 11 to 14k km a year.

const G = {
  yaris: "Toyota_Yaris_2015_15_15_100_15_4_66_59_155_30_FWD_5_2_2dr",
  rav4: "Toyota_RAV4_2017_25_17_170_25_4_72_67_183_nan_AWD_5_4_SUV",
  prius: "Toyota_Prius_2011_22_15_980_18_4_68_58_175_51_FWD_5_4_4dr",
  elantra: "Hyundai_Elantra_2014_21_17_140_18_4_69_56_179_27_FWD_5_4_4dr",
  tucson: "Hyundai_Tucson_2016_25_17_170_16_4_72_64_176_25_AWD_5_4_SUV",
  santafe: "Hyundai_Santa Fe_2015_31_18_290_33_6_74_66_193_18_AWD_7_4_SUV",
  rio: "Kia_Rio_2017_17_15_130_16_4_67_57_172_27_FWD_5_4_4dr",
  soul: "Kia_Soul_2019_22_18_200_16_4_70_63_163_26_FWD_5_4_4dr",
  sorento: "Kia_Sorento_2015_24_17_190_24_4_74_66_184_20_FWD_5_4_SUV",
  stinger: "Kia_Stinger_2019_35_18_250_20_4_73_55_190_21_AWD_5_4_4dr",
  civic: "Honda_Civic_2014_21_16_140_18_4_69_55_177_29_FWD_5_2_2dr",
  crv: "Honda_CR-V_2013_24_17_180_24_4_71_65_178_23_FWD_5_4_SUV",
  fit: "Honda_Fit_2011_15_15_110_15_4_66_60_161_28_FWD_5_4_4dr",
  fiesta: "Ford_Fiesta_2017_13_15_120_16_4_67_58_159_27_FWD_5_4_4dr",
  escape: "Ford_Escape_2019_24_17_160_25_4_72_66_178_21_FWD_5_4_SUV",
  ecosport: "Ford_Ecosport_2019_21_16_160_20_4_69_65_161_23_4WD_5_4_SUV",
  golf13: "Volkswagen_Golf_2013_25_18_200_20_4_70_57_165_24_FWD_5_2_2dr",
  passat: "Volkswagen_Passat_2019_29_19_170_20_4_72_58_191_25_FWD_5_4_4dr",
  beetle: "Volkswagen_Beetle_2019_23_17_170_20_4_71_58_168_26_FWD_4_2_2dr",
  leaf: "Nissan_Leaf_2019_29_16_140_nan_nan_70_61_176_nan_FWD_5_4_4dr",
  mazda3: "Mazda_MAZDA3_2011_17_16_140_20_4_69_57_180_24_FWD_5_4_4dr",
  bmw5: "BMW_5-Series_2012_46_17_240_20_4_73_57_193_23_RWD_5_4_4dr",
  x3: "BMW_X3_2011_36_17_240_30_6_74_65_183_19_AWD_5_4_SUV",
  a6: "Audi_A6_2011_53_18_300_30_6_73_58_194_18_AWD_5_4_Station Wagon",
  cclass: "Mercedes-Benz_C Class_2011_37_17_220_30_6_69_56_182_18_AWD_5_4_4dr",
  countryman: "MINI_Cooper Countryman_2019_28_17_130_15_3_71_61_169_22_AWD_5_4_SUV",
  clubman: "MINI_Clubman_2019_26_16_130_15_3_70_56_168_22_AWD_5_4_4dr",
  xc60: "Volvo_XC60_2011_42_20_300_30_6_74_67_182_17_AWD_5_4_SUV",
  xc90: "Volvo_XC90_2019_50_18_250_20_4_79_69_194_20_AWD_7_4_SUV",
  rrsport: "Land Rover_Range Rover Sport_2011_59_19_370_50_8_76_71_188_12_4WD_5_4_SUV",
  chr: "Toyota_C-HR_2019_21_17_140_20_4_70_61_171_27_FWD_5_4_SUV",
  corolla: "Toyota_Corolla_2019_18_15_130_18_4_69_57_183_28_FWD_5_4_4dr",
  niro: "Kia_Niro_2017_25_16_130_16_4_71_60_171_51_FWD_5_4_SUV",
  ioniq: "Hyundai_Ioniq_2019_30_16_110_nan_nan_71_57_176_nan_FWD_5_4_4dr",
  tiguan: "Volkswagen_Tiguan_2019_25_17_180_20_4_72_66_185_21_AWD_5_4_SUV",
  golf15: "Volkswagen_Golf_2015_20_15_170_18_4_70_57_167_25_FWD_5_2_2dr",
  ranger: "Ford_Ranger_2019_32_18_270_23_4_85_70_210_21_RWD_4_4_Pickup",
  metris: "Mercedes-Benz_Metris_2019_26_17_200_20_4_75_75_202_21_RWD_2_3_Van",
  transitw: "Ford_Transit Connect Wagon_2017_30_16_160_25_4_72_72_189_19_FWD_6_4_Van",
  transit: "Ford_Transit Connect Wagon_2019_31_16_160_20_4_72_71_190_nan_FWD_6_4_Van",
  nv200: "Nissan_NV200_2019_22_15_130_20_4_68_73_186_24_FWD_2_4_Van",
};
const P = (group, ids) => ids.split(" ").map((id) => `${G[group]}_${id}`);

// Equipment by trim level. Older cars get the equipment of their time (a CD player, no phone mirroring).
const BASE = ["Air Conditioning", "Central Locking", "Electric Windows", "Airbag", "Traction Control", "Isofix", "Electric Mirrors", "Bluetooth"];
const MID = ["Cruise Control", "Multi-function steering wheel", "Alloy wheels", "Fog Lamps", "Parking Sensors", "Daytime Running Lights", "Climate Control", "Stop/Start Button"];
const HIGH = ["Satellite Navigation", "Reversing Camera", "Keyless Entry", "Heated Front Seats", "Automatic Lights", "Automatic Wipers", "Leather steering wheel", "Dual Zone Climate Control", "Touch Screen Media Control", "LED headlights"];
const PREM = ["Full Leather", "Panoramic Sunroof", "Motorised Tailgate", "Sports Seats", "Tyre pressure monitor", "Xenon Lights", "Privacy Glass", "Wireless Smartphone Control"];
const NEWER = ["Reversing Camera", "LED headlights", "Touch Screen Media Control", "Wireless Smartphone Control", "Stop/Start Button", "USB connection (front)"];
const TIERS = { base: [BASE], mid: [BASE, MID], high: [BASE, MID, HIGH], prem: [BASE, MID, HIGH, PREM] };
const DEALER = ["History Checked", "Finance Checked", "Trade in accepted"];
const VAN = ["Air Conditioning", "Central Locking", "Electric Windows", "Airbag", "Bluetooth", "Cruise Control", "Speed limiter", "Rear parking sensors", "Reversing Camera", "Traction Control", "Multi-function steering wheel", "Daytime Running Lights"];

export function carFeatures({ tier, year, extra = [], condition, history }) {
  if (condition === "commercial") return [...VAN, ...extra];
  let f = TIERS[tier].flat();
  if (year < 2015) f = [...f.filter((x) => !NEWER.includes(x)), "CD Player"];
  f = [...f, ...extra];
  if (condition === "new") return [...f, "Manufacturer's warranty"];
  return [...f, ...(history ? ["Full Service History"] : []), ...DEALER];
}

// id, then the photos, then the facts. nct is the month the NCT runs to. sold is days ago.
const used = (id, group, ids, c) => ({ id: String(id), photos: P(group, ids), history: id % 2 === 0, doors: 5, seats: 5, ...c });
const fresh = (id, group, ids, c) => ({ id: String(id), photos: P(group, ids), condition: "new", vat: "inc", doors: 5, seats: 5, owners: 0, history: false, ...c });
const work = (id, group, ids, c) => ({ id: String(id), photos: P(group, ids), condition: "commercial", vat: "ex", fuel: "diesel", gearbox: "manual", owners: 0, ...c });

// Used cars. Two specs rely on this data: the newest (highest id) car has 5 or more photos and no price drop (carousel, car-page), and Mazda
// (sold 45 days ago) and Audi (sold 9 days ago) have no other car, so they are the expired-only and recently-sold-only makes (landing).
export const USED = [
  used(4710001, "fiesta", "Baq Gsj kOU snL", { make: "Ford", model: "Fiesta", variant: "1.0 EcoBoost Zetec", year: 2017, priceEur: 11450, mileageKm: 98400, fuel: "petrol", gearbox: "manual", bodyType: "Hatchback", engineLitres: 1, colour: "White", owners: 2, nct: "2027-03", maxSpeedMph: 117, zeroTo62Secs: 10.5, tier: "mid", sold: 1 }),
  used(4710002, "yaris", "OCl KBa hUY Afh", { make: "Toyota", model: "Yaris", variant: "1.33 VVT-i Sol", year: 2015, priceEur: 8450, mileageKm: 112300, fuel: "petrol", gearbox: "manual", bodyType: "Hatchback", engineLitres: 1.3, colour: "Red", doors: 3, owners: 2, nct: "2027-06", maxSpeedMph: 109, zeroTo62Secs: 11.7, tier: "mid" }),
  used(4710031, "tucson", "IsZ QgH MOE Msz RXR", { make: "Hyundai", model: "Tucson", variant: "1.7 CRDi Executive", year: 2016, priceEur: 17950, mileageKm: 104800, fuel: "diesel", gearbox: "manual", bodyType: "SUV", engineLitres: 1.7, colour: "Black", owners: 1, nct: "2027-08", maxSpeedMph: 109, zeroTo62Secs: 13.7, tier: "high" }),
  used(4710004, "golf13", "Mvl eZz DZS kFP", { make: "Volkswagen", model: "Golf", variant: "1.6 TDI Trendline", year: 2013, priceEur: 10950, mileageKm: 148200, fuel: "diesel", gearbox: "manual", bodyType: "Hatchback", engineLitres: 1.6, colour: "White", owners: 3, nct: "2027-01", maxSpeedMph: 118, zeroTo62Secs: 10.7, tier: "mid", sold: 4 }),
  used(4710005, "rav4", "kXt GLn aZZ fGR", { make: "Toyota", model: "RAV4", variant: "2.0 D-4D Luna", year: 2017, priceEur: 22950, mileageKm: 118600, fuel: "diesel", gearbox: "manual", bodyType: "SUV", engineLitres: 2, colour: "White", owners: 1, nct: "2027-10", maxSpeedMph: 112, zeroTo62Secs: 9.8, tier: "high", extra: ["Roof Rails"] }),
  used(4710006, "leaf", "ANt HiJ MKn bMh", { make: "Nissan", model: "Leaf", variant: "40 kWh Acenta", year: 2019, priceEur: 15950, mileageKm: 62400, fuel: "electric", gearbox: "automatic", bodyType: "Hatchback", colour: "Silver", owners: 1, nct: "2027-05", maxSpeedMph: 89, zeroTo62Secs: 7.9, tier: "high", extra: ["Heated Steering Wheel"] }),
  used(4710007, "escape", "AuB FpI Ibv aNd", { make: "Ford", model: "Kuga", variant: "1.5 TDCi Titanium", year: 2019, priceEur: 22950, mileageKm: 85100, fuel: "diesel", gearbox: "manual", bodyType: "SUV", engineLitres: 1.5, colour: "Silver", owners: 1, nct: "2027-09", maxSpeedMph: 114, zeroTo62Secs: 11.2, tier: "high", extra: ["Roof Rails"] }),
  used(4710008, "countryman", "xhs Edc OVL Rzk", { make: "MINI", model: "Countryman", variant: "2.0 Cooper D", year: 2019, priceEur: 24950, mileageKm: 71300, fuel: "diesel", gearbox: "automatic", bodyType: "SUV", engineLitres: 2, colour: "White", owners: 1, nct: "2027-07", maxSpeedMph: 126, zeroTo62Secs: 9.1, tier: "prem" }),
  used(4710009, "civic", "MVF PCb AVd", { make: "Honda", model: "Civic", variant: "1.8 i-VTEC ES", year: 2014, priceEur: 9950, wasPriceEur: 10450, mileageKm: 131500, fuel: "petrol", gearbox: "automatic", bodyType: "Saloon", engineLitres: 1.8, colour: "White", owners: 2, nct: "2027-02", maxSpeedMph: 127, zeroTo62Secs: 10.3, tier: "mid" }),
  used(4710010, "xc90", "YXw Irn Rxw", { make: "Volvo", model: "XC90", variant: "2.0 D5 AWD Momentum", year: 2019, priceEur: 32950, mileageKm: 92700, fuel: "diesel", gearbox: "automatic", bodyType: "SUV", engineLitres: 2, colour: "White", seats: 7, owners: 1, nct: "2027-11", maxSpeedMph: 137, zeroTo62Secs: 7.8, tier: "prem", reserved: true }), // reserved: a deposit is on it (the demo's seeded reservations, collections.ts)
  used(4710011, "rio", "pMC SWo RDL vLw", { make: "Kia", model: "Rio", variant: "1.4 CRDi EX", year: 2017, priceEur: 10950, mileageKm: 89600, fuel: "diesel", gearbox: "manual", bodyType: "Hatchback", engineLitres: 1.4, colour: "White", owners: 1, nct: "2027-04", maxSpeedMph: 109, zeroTo62Secs: 12.8, tier: "mid" }),
  used(4710012, "a6", "WqO GLz XAO dDU", { make: "Audi", model: "A6", variant: "2.0 TDI SE Avant", year: 2011, priceEur: 11450, mileageKm: 178400, fuel: "diesel", gearbox: "manual", bodyType: "Estate", engineLitres: 2, colour: "Grey", owners: 3, nct: "2027-03", maxSpeedMph: 143, zeroTo62Secs: 8.9, tier: "high", sold: 9 }),
  used(4710013, "soul", "BVY Cnx qed", { make: "Kia", model: "Soul", variant: "1.6 CRDi EX", year: 2019, priceEur: 15950, wasPriceEur: 16450, mileageKm: 82300, fuel: "diesel", gearbox: "manual", bodyType: "SUV", engineLitres: 1.6, colour: "Silver", owners: 1, nct: "2027-12", maxSpeedMph: 107, zeroTo62Secs: 11.5, tier: "mid", extra: ["Roof Rails"] }),
  used(4710014, "bmw5", "cgz SdA CSW", { make: "BMW", model: "5 Series", variant: "520d SE", year: 2012, priceEur: 11950, mileageKm: 156800, fuel: "diesel", gearbox: "automatic", bodyType: "Saloon", engineLitres: 2, colour: "Silver", owners: 2, nct: "2027-05", maxSpeedMph: 143, zeroTo62Secs: 8.1, tier: "high" }),
  used(4710015, "ecosport", "TaZ kTG jDc Wbj", { make: "Ford", model: "EcoSport", variant: "1.0 EcoBoost Titanium", year: 2019, priceEur: 16950, mileageKm: 61200, fuel: "petrol", gearbox: "manual", bodyType: "SUV", engineLitres: 1, colour: "Grey", owners: 1, nct: "2027-10", maxSpeedMph: 114, zeroTo62Secs: 11.9, tier: "high" }),
  used(4710016, "santafe", "qaZ eAI wrF YNd kem ElR", { make: "Hyundai", model: "Santa Fe", variant: "2.2 CRDi Executive", year: 2015, priceEur: 16950, wasPriceEur: 17950, mileageKm: 138700, fuel: "diesel", gearbox: "automatic", bodyType: "SUV", engineLitres: 2.2, colour: "Blue", seats: 7, owners: 2, nct: "2027-06", maxSpeedMph: 118, zeroTo62Secs: 9.9, tier: "high", story: "This Santa Fe has been with one family since it was registered and has been serviced every year at 15,000 km, with the invoices to show for it. The timing chain, brake discs and pads were done at 120,000 km and it has four good Michelin tyres. Inside it is clean and tidy: the seven seats fold flat, there is a full set of mats, and both keys are here. It has just had a full valet. Outside there is one small mark on the rear bumper, which we have photographed so you can see it before you visit. It drives straight and quiet with no warning lights, and the NCT is in date. You are welcome to bring a mechanic of your choice to look it over before you buy, and we will take your current car in part exchange." }),
  used(4710017, "prius", "Tlw ZUW aec MuW", { make: "Toyota", model: "Prius", variant: "1.8 VVT-i Hybrid Sol", year: 2011, priceEur: 7450, mileageKm: 142100, fuel: "hybrid", gearbox: "automatic", bodyType: "Hatchback", engineLitres: 1.8, colour: "White", owners: 3, nct: "2027-02", maxSpeedMph: 112, zeroTo62Secs: 10.4, tier: "mid", sold: 120 }),
  used(4710018, "cclass", "CGr SjB GOw LOk", { make: "Mercedes-Benz", model: "C-Class", variant: "C220 CDI BlueEFFICIENCY Avantgarde", year: 2011, priceEur: 10950, mileageKm: 164300, fuel: "diesel", gearbox: "automatic", bodyType: "Saloon", engineLitres: 2.1, colour: "Grey", owners: 3, nct: "2027-04", maxSpeedMph: 144, zeroTo62Secs: 8.7, tier: "high" }),
  used(4710019, "passat", "ppA JPD FXK gcL", { make: "Volkswagen", model: "Passat", variant: "2.0 TDI SE", year: 2019, priceEur: 20950, wasPriceEur: 21950, mileageKm: 108400, fuel: "diesel", gearbox: "automatic", bodyType: "Saloon", engineLitres: 2, colour: "Grey", owners: 1, nct: "2027-08", maxSpeedMph: 134, zeroTo62Secs: 8.2, tier: "high" }),
  used(4710020, "crv", "hVL lpK mEr IHt", { make: "Honda", model: "CR-V", variant: "2.2 i-DTEC SE", year: 2013, priceEur: 10450, mileageKm: 168900, fuel: "diesel", gearbox: "manual", bodyType: "SUV", engineLitres: 2.2, colour: "Brown", owners: 2, nct: "2027-01", maxSpeedMph: 118, zeroTo62Secs: 10.2, tier: "high" }),
  used(4710021, "clubman", "NzU LOm Fwb", { make: "MINI", model: "Clubman", variant: "1.5 Cooper", year: 2019, priceEur: 21450, mileageKm: 58600, fuel: "petrol", gearbox: "manual", bodyType: "Estate", engineLitres: 1.5, colour: "Grey", owners: 1, nct: "2027-09", maxSpeedMph: 132, zeroTo62Secs: 8.7, tier: "high" }),
  used(4710022, "mazda3", "AIv XtX QPk ELc", { make: "Mazda", model: "Mazda3", variant: "1.6 D Executive", year: 2011, priceEur: 6450, mileageKm: 172600, fuel: "diesel", gearbox: "manual", bodyType: "Saloon", engineLitres: 1.6, colour: "Silver", owners: 4, nct: "2027-03", maxSpeedMph: 118, zeroTo62Secs: 11.1, tier: "mid", sold: 45 }),
  used(4710023, "sorento", "MPD zPb DTX pyH", { make: "Kia", model: "Sorento", variant: "2.2 CRDi KX-2", year: 2015, priceEur: 15450, mileageKm: 142200, fuel: "diesel", gearbox: "manual", bodyType: "SUV", engineLitres: 2.2, colour: "Blue", seats: 7, owners: 2, nct: "2027-07", maxSpeedMph: 124, zeroTo62Secs: 9.6, tier: "high" }),
  used(4710024, "x3", "EQp SJK XWS", { make: "BMW", model: "X3", variant: "xDrive20d SE", year: 2011, priceEur: 10950, mileageKm: 168300, fuel: "diesel", gearbox: "automatic", bodyType: "SUV", engineLitres: 2, colour: "Red", owners: 3, nct: "2027-05", maxSpeedMph: 126, zeroTo62Secs: 8.5, tier: "high" }),
  used(4710025, "elantra", "FwM Grs hGi kQk", { make: "Hyundai", model: "Elantra", variant: "1.6 Deluxe", year: 2014, priceEur: 8950, mileageKm: 128300, fuel: "petrol", gearbox: "manual", bodyType: "Saloon", engineLitres: 1.6, colour: "White", owners: 2, nct: "2027-02", maxSpeedMph: 119, zeroTo62Secs: 10.5, tier: "mid" }),
  used(4710026, "stinger", "wkp gXu sRv idk", { make: "Kia", model: "Stinger", variant: "2.2 CRDi GT Line", year: 2019, priceEur: 26950, mileageKm: 88100, fuel: "diesel", gearbox: "automatic", bodyType: "Saloon", engineLitres: 2.2, colour: "Red", owners: 1, nct: "2027-11", maxSpeedMph: 143, zeroTo62Secs: 7.6, tier: "prem", reserved: true }),
  used(4710027, "xc60", "PXF IXD KQZ Xmk", { make: "Volvo", model: "XC60", variant: "D3 SE", year: 2011, priceEur: 10950, mileageKm: 171400, fuel: "diesel", gearbox: "manual", bodyType: "SUV", engineLitres: 2, colour: "Brown", owners: 3, nct: "2027-06", maxSpeedMph: 124, zeroTo62Secs: 9.9, tier: "high" }),
  used(4710028, "beetle", "kgh WcV egp BDd", { make: "Volkswagen", model: "Beetle", variant: "1.2 TSI Design", year: 2019, priceEur: 16950, mileageKm: 63200, fuel: "petrol", gearbox: "manual", bodyType: "Hatchback", engineLitres: 1.2, colour: "White", doors: 3, seats: 4, owners: 1, nct: "2027-12", maxSpeedMph: 112, zeroTo62Secs: 10.9, tier: "high" }),
  used(4710029, "rrsport", "Nmd ZMy Ddy", { make: "Land Rover", model: "Range Rover Sport", variant: "3.0 TDV6 HSE", year: 2011, priceEur: 14950, wasPriceEur: 15950, mileageKm: 189400, fuel: "diesel", gearbox: "automatic", bodyType: "SUV", engineLitres: 3, colour: "White", owners: 3, nct: "2027-04", maxSpeedMph: 130, zeroTo62Secs: 8.1, tier: "prem" }),
  used(4710030, "fit", "OSm KPK TZD", { make: "Honda", model: "Jazz", variant: "1.4 i-VTEC ES", year: 2011, priceEur: 5950, mileageKm: 125700, fuel: "petrol", gearbox: "manual", bodyType: "Hatchback", engineLitres: 1.4, colour: "Grey", owners: 3, nct: "2027-01", maxSpeedMph: 112, zeroTo62Secs: 11.5, tier: "mid" }),
];

// New cars: the franchise brands (src/lib/partners.ts). The photos are the newest in the dataset, so the year is this year's.
export const NEW = [
  fresh(5000001, "ioniq", "Akw DlM ElB lOs", { make: "Hyundai", model: "IONIQ", variant: "1.6 GDi Hybrid Premium", year: 2026, priceEur: 34995, mileageKm: 12, fuel: "hybrid", gearbox: "automatic", bodyType: "Hatchback", engineLitres: 1.6, colour: "White", maxSpeedMph: 115, zeroTo62Secs: 10.8, tier: "prem" }),
  fresh(5000002, "chr", "FYW fKT Xro vZc", { make: "Toyota", model: "C-HR", variant: "1.8 Hybrid Luna", year: 2026, priceEur: 36995, mileageKm: 8, fuel: "hybrid", gearbox: "automatic", bodyType: "SUV", engineLitres: 1.8, colour: "White", maxSpeedMph: 105, zeroTo62Secs: 11, tier: "high" }),
  fresh(5000003, "niro", "dwa GTr ega", { make: "Kia", model: "Niro", variant: "1.6 GDi Hybrid K3", year: 2026, priceEur: 36495, mileageKm: 15, fuel: "hybrid", gearbox: "automatic", bodyType: "SUV", engineLitres: 1.6, colour: "White", maxSpeedMph: 101, zeroTo62Secs: 11.5, tier: "high" }),
  fresh(5000004, "tiguan", "Jut Wvm cyR rdO", { make: "Volkswagen", model: "Tiguan", variant: "1.5 TSI Life", year: 2026, priceEur: 43450, mileageKm: 10, fuel: "petrol", gearbox: "automatic", bodyType: "SUV", engineLitres: 1.5, colour: "Blue", maxSpeedMph: 126, zeroTo62Secs: 9.1, tier: "high" }),
  fresh(5000005, "corolla", "UxA RtS SIs cgw", { make: "Toyota", model: "Corolla", variant: "1.8 Hybrid Sol", year: 2026, priceEur: 34495, mileageKm: 11, fuel: "hybrid", gearbox: "automatic", bodyType: "Saloon", engineLitres: 1.8, colour: "Brown", maxSpeedMph: 112, zeroTo62Secs: 10.9, tier: "high" }),
  fresh(5000006, "golf15", "IMB RZO iqB pKE", { make: "Volkswagen", model: "Golf", variant: "1.0 TSI Life", year: 2026, priceEur: 30995, mileageKm: 9, fuel: "petrol", gearbox: "manual", bodyType: "Hatchback", engineLitres: 1, colour: "Black", maxSpeedMph: 125, zeroTo62Secs: 10.5, tier: "mid" }),
];

// Vans and a pickup: priced without VAT, which a VAT-registered buyer can reclaim.
export const VANS = [
  work(5100001, "ranger", "fvo QuX PZo LTp", { make: "Ford", model: "Ranger", variant: "2.0 EcoBlue XLT Double Cab", year: 2026, priceEur: 38950, mileageKm: 25, bodyType: "Pickup", engineLitres: 2, colour: "White", doors: 4, seats: 5, maxSpeedMph: 109, zeroTo62Secs: 10.5, gearbox: "automatic", extra: ["Roof Rails"] }),
  work(5100002, "metris", "AEs Gkv fpW poa", { make: "Mercedes-Benz", model: "Vito", variant: "114 CDI Cargo Standard", year: 2026, priceEur: 28950, mileageKm: 8, bodyType: "Van", engineLitres: 2.1, colour: "White", doors: 4, seats: 2, maxSpeedMph: 109, zeroTo62Secs: 12.8 }),
  work(5100003, "metris", "JWE Sfx ShW wUf", { make: "Mercedes-Benz", model: "Vito Tourer", variant: "116 CDI Select 8 Seat", year: 2026, priceEur: 41950, mileageKm: 14, bodyType: "Van", engineLitres: 2.1, colour: "Grey", doors: 5, seats: 8, maxSpeedMph: 118, zeroTo62Secs: 11.4, gearbox: "automatic" }),
  work(5100004, "transit", "aHy Vxx lmw qVv", { make: "Ford", model: "Transit Connect", variant: "1.5 EcoBlue 100 Trend", year: 2026, priceEur: 22450, wasPriceEur: 23950, mileageKm: 20, bodyType: "Van", engineLitres: 1.5, colour: "Grey", doors: 5, seats: 5, maxSpeedMph: 107, zeroTo62Secs: 13.6 }),
  work(5100005, "nv200", "Wap dek Lae TDe", { make: "Nissan", model: "NV200", variant: "1.5 dCi Acenta", year: 2026, priceEur: 17950, wasPriceEur: 18950, mileageKm: 12, bodyType: "Van", engineLitres: 1.5, colour: "Black", doors: 4, seats: 2, maxSpeedMph: 96, zeroTo62Secs: 15.2 }),
  work(5100006, "transitw", "NwU PZA sOb", { make: "Ford", model: "Transit Connect", variant: "1.5 EcoBlue 100 Leader", year: 2026, priceEur: 21450, mileageKm: 18, bodyType: "Van", engineLitres: 1.5, colour: "White", doors: 5, seats: 5, maxSpeedMph: 107, zeroTo62Secs: 13.6 }),
];
