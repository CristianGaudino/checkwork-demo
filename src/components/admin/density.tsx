"use client";

import { createContext, useContext } from "react";

// The person's table density, set by the frame (AdminShell, which keeps it in a cookie) and switched from the tables (DensityToggle). The
// rows read it from `data-density` on the frame, in CSS only.
export const Density = createContext<{ compact: boolean; setCompact: (v: boolean) => void }>({ compact: false, setCompact: () => {} });
export const useDensity = () => useContext(Density);
