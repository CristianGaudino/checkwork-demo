import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
const { addTeamAction, removeTeamAction, saveLeadEmailsAction } = await import("./actions");
const { getSettings, leadsStore, settingsStore } = await import("@/lib/admin/collections");

const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());

describe("team settings", () => {
  beforeEach(async () => {
    await settingsStore.reset();
    await leadsStore.reset();
  });

  it("adds a person, and refuses the same name again whatever its case", async () => {
    expect((await addTeamAction(undefined, form({ name: "Sam reilly", email: "sam@example.com", role: "Sales" })))?.saved).toBe(true);
    expect((await getSettings()).team.map((t) => t.name)).toContain("Sam reilly");
    expect((await addTeamAction(undefined, form({ name: "sam reilly", email: "x@example.com", role: "Sales" })))?.errors?.name).toMatch(/already on the team/);
  });

  it("checks the email and the name", async () => {
    const r = await addTeamAction(undefined, form({ name: " ", email: "nope", role: "Sales" }));
    expect(Object.keys(r?.errors ?? {}).sort()).toEqual(["email", "name"]);
  });

  it("removing a person unassigns their leads, and the last person cannot be removed", async () => {
    const { team } = await getSettings();
    const leads = await leadsStore.list();
    const target = leads.find((l) => l.assignedTo)!;
    const member = team.find((t) => t.name === target.assignedTo)!;
    await removeTeamAction(member.id);
    expect((await getSettings()).team.some((t) => t.id === member.id)).toBe(false);
    expect((await leadsStore.get(target.id))!.assignedTo).toBeUndefined();
    for (const t of (await getSettings()).team.slice(1)) await removeTeamAction(t.id);
    const last = (await getSettings()).team;
    expect(last).toHaveLength(1);
    await removeTeamAction(last[0].id);
    expect((await getSettings()).team).toHaveLength(1);
  });
});

describe("lead emails", () => {
  beforeEach(() => settingsStore.reset());
  it("saves a list (lower case, no repeats), and an empty box goes back to the site's own address", async () => {
    expect((await saveLeadEmailsAction(undefined, form({ leadEmails: "A@example.com, b@example.com\na@example.com" })))?.saved).toBe(true);
    expect((await getSettings()).leadEmails).toEqual(["a@example.com", "b@example.com"]);
    await saveLeadEmailsAction(undefined, form({ leadEmails: "" }));
    expect((await getSettings()).leadEmails).toEqual([]);
  });
  it("refuses a bad address or more than five, and changes nothing", async () => {
    expect((await saveLeadEmailsAction(undefined, form({ leadEmails: "ok@example.com nope" })))?.errors?.leadEmails).toMatch(/not a valid email/);
    expect((await saveLeadEmailsAction(undefined, form({ leadEmails: "1@e.com 2@e.com 3@e.com 4@e.com 5@e.com 6@e.com" })))?.errors?.leadEmails).toMatch(/5 addresses or fewer/);
    expect((await getSettings()).leadEmails).toEqual([]);
  });
});
