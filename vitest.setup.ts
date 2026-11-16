import { vi } from "vitest";

// The dashboard's actions ask src/lib/staff.ts who is there (a verified Access token). Unit tests of those actions are about what the
// action does, so here everyone is staff; src/lib/staff.test.ts tests the real check.
vi.mock("@/lib/staff", () => ({ requireStaff: async () => {}, staffIdentity: async () => ({ ok: true, email: "" }) }));
