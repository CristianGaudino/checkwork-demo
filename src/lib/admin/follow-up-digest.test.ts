import { describe, expect, it, vi } from "vitest";
import type { Lead, TeamMember } from "./collections";

vi.mock("server-only", () => ({}));
const { digestGroups } = await import("./follow-up-digest");

const team: TeamMember[] = [
  { id: "1", name: "Aoife", email: "aoife@x.ie", role: "Owner" },
  { id: "2", name: "Conor", email: "conor@x.ie", role: "Sales" },
  { id: "3", name: "Ciara", email: "ciara@x.ie", role: "Manager" },
  { id: "4", name: "Niamh", email: "niamh@x.ie", role: "Finance" },
];
const lead = (id: string, o: Partial<Lead>) => ({ id, status: "contacted", ...o }) as Lead;

describe("digestGroups", () => {
  it("sends each salesperson their own due follow-ups, and unassigned ones to owners and managers", () => {
    const g = digestGroups(
      [
        lead("mine", { assignedTo: "Conor", followUpOn: "2026-11-11" }),
        lead("late", { assignedTo: "Conor", followUpOn: "2026-11-01" }),
        lead("later", { assignedTo: "Conor", followUpOn: "2026-11-12" }),
        lead("nobody", { followUpOn: "2026-11-10" }),
        lead("gone", { assignedTo: "Someone who left", followUpOn: "2026-11-11" }),
        lead("won", { assignedTo: "Conor", followUpOn: "2026-11-01", status: "won" }),
      ],
      team,
      "2026-11-11",
    );
    expect(Object.fromEntries([...g].map(([k, v]) => [k, v.map((l) => l.id)]))).toEqual({ "conor@x.ie": ["mine", "late"], "aoife@x.ie": ["nobody", "gone"], "ciara@x.ie": ["nobody", "gone"] });
  });
  it("sends unassigned ones to the owners named on the server too, so a dealer with no team yet still gets them", () => {
    vi.stubEnv("ADMIN_OWNER_EMAILS", " Boss@X.ie ,aoife@x.ie");
    const g = digestGroups([lead("nobody", { followUpOn: "2026-11-10" })], [], "2026-11-11");
    expect([...g.keys()]).toEqual(["boss@x.ie", "aoife@x.ie"]);
    vi.unstubAllEnvs();
  });
});
