import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import type { Lead } from "./collections";
import { countByStatus, filterLeads, parseLeadFilter } from "./leads";

const lead = (id: string, o: Partial<Lead> = {}): Lead => ({ id, type: "enquiry", status: "new", name: id, email: `${id}@example.com`, phone: "", message: "", source: "Website", notes: [], createdAt: Number(id.replace(/\D/g, "")) || 0, ...o });

describe("lead filters", () => {
  it("ignores values it does not know", () => {
    expect(parseLeadFilter({ status: "hacked", type: "nope", q: "  Ford  " })).toEqual({ status: undefined, type: undefined, q: "ford" });
    expect(parseLeadFilter({ status: "won", type: "finance" })).toMatchObject({ status: "won", type: "finance" });
    expect(parseLeadFilter({ q: "x".repeat(200) }).q).toHaveLength(60);
  });
  it("filters by status, type and text, newest first", () => {
    const leads = [lead("a1", { status: "won" }), lead("a2", { type: "finance", carTitle: "2019 Ford Focus" }), lead("a3", { message: "Is the Ford still here?" })];
    expect(filterLeads(leads, { q: "" }).map((l) => l.id)).toEqual(["a3", "a2", "a1"]);
    expect(filterLeads(leads, { status: "won", q: "" }).map((l) => l.id)).toEqual(["a1"]);
    expect(filterLeads(leads, { type: "finance", q: "" }).map((l) => l.id)).toEqual(["a2"]);
    expect(filterLeads(leads, { q: "ford" }).map((l) => l.id)).toEqual(["a3", "a2"]);
  });
  it("counts every status, including those with none", () => {
    expect(countByStatus([lead("a1"), lead("a2", { status: "lost" })])).toEqual({ new: 1, contacted: 0, appointment: 0, won: 0, lost: 1 });
  });
});
