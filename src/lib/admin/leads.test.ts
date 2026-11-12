import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import type { Lead } from "./collections";
import { SALES_LEAD_TYPES, countByStatus, filterLeads, isSalesLead, openWarrantyRequests, parseLeadFilter } from "./leads";

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
  it("finds a phone number however it was typed, and lists new leads past the reply target", () => {
    const H = 3_600_000;
    const leads = [lead("a1", { phone: "+353 87 123 4567", createdAt: 0 }), lead("a2", { createdAt: 30 * H }), lead("a3", { status: "contacted", createdAt: 0 })];
    expect(filterLeads(leads, { q: "087 123" }).map((l) => l.id)).toEqual(["a1"]);
    expect(filterLeads(leads, { q: "87 1234" }).map((l) => l.id)).toEqual(["a1"]);
    expect(filterLeads(leads, { q: "", late: true }, "", 24, 31 * H).map((l) => l.id)).toEqual(["a1"]);
    expect(parseLeadFilter({ due: "1", late: "1" })).toMatchObject({ due: true, late: undefined });
  });
  it("counts every status, including those with none", () => {
    expect(countByStatus([lead("a1"), lead("a2", { status: "lost" })])).toEqual({ new: 1, contacted: 0, appointment: 0, won: 0, lost: 1 });
  });
});

describe("warranty requests", () => {
  it("are not sales leads, and wait in Aftersales until a claim is opened from them or they are set aside", () => {
    const w = (id: string, o: Partial<Lead> = {}) => lead(id, { type: "warranty", ...o });
    const leads = [lead("l1"), w("w2"), w("w3"), w("w4", { status: "lost" }), w("w5")];
    expect(leads.filter(isSalesLead).map((l) => l.id)).toEqual(["l1"]);
    expect(SALES_LEAD_TYPES).not.toContain("warranty");
    expect(openWarrantyRequests(leads, [{ leadId: "w3" }, { leadId: undefined }]).map((l) => l.id)).toEqual(["w5", "w2"]); // newest first
  });
});
