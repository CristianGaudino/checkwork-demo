import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
// These act as the demo's roles (the demo bar's cookie), which count only on the demo deploy (src/lib/demo.ts, demoCookiesCount).
beforeEach(() => vi.stubEnv("APP_ENV", "demo"));

// The demo acts as the role in the demo bar's cookie (src/lib/permissions.ts); set per test, the owner by default.
let role: string | undefined;
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "checkwork-demo-role" && role ? { value: role } : undefined) }),
  headers: async () => ({ get: () => null }),
}));
const { addTeamAction, removeTeamAction, resetDemoAction, saveLeadEmailsAction, saveMarketingAction, saveNotificationsAction, saveTargetsAction, sendTestEmailAction, setRoleAction } = await import("./actions");
const { adminCars, saveCar } = await import("@/lib/admin/stock-admin");
const { getSettings, leadsStore, settingsStore } = await import("@/lib/admin/collections");
const { listActivity } = await import("@/lib/admin/activity");

const form = (o: Record<string, string>) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());

describe("team settings", () => {
  beforeEach(async () => {
    role = undefined;
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

  it("refuses the same email twice", async () => {
    expect((await addTeamAction(undefined, form({ name: "Someone new", email: "Conor@Example.com", role: "Sales" })))?.errors?.email).toMatch(/already on the team/);
  });

  it("removing a person unassigns their leads, and the last person cannot be removed", async () => {
    const leads = await leadsStore.list();
    const target = leads.find((l) => l.assignedTo && l.assignedTo !== "Aoife Brennan")!;
    const member = (await getSettings()).team.find((t) => t.name === target.assignedTo)!;
    await removeTeamAction(member.id);
    expect((await getSettings()).team.some((t) => t.id === member.id)).toBe(false);
    expect((await leadsStore.get(target.id))!.assignedTo).toBeUndefined();
    for (const t of (await getSettings()).team.filter((t) => t.role !== "Owner")) await removeTeamAction(t.id);
    const last = (await getSettings()).team;
    expect(last.map((t) => t.role)).toEqual(["Owner"]);
    await removeTeamAction(last[0].id);
    expect((await getSettings()).team).toHaveLength(1);
  });

  it("keeps an owner: the only owner cannot be demoted or removed", async () => {
    const owner = (await getSettings()).team.find((t) => t.role === "Owner")!;
    expect((await setRoleAction(owner.id, undefined, form({ role: "Sales" })))?.errors?.role).toMatch(/at least one owner/);
    await removeTeamAction(owner.id);
    expect((await getSettings()).team.some((t) => t.id === owner.id)).toBe(true);
  });

  it("a manager changes everyone but an owner, and cannot make anyone one", async () => {
    role = "Manager";
    const { team } = await getSettings();
    const sales = team.find((t) => t.role === "Sales")!;
    const owner = team.find((t) => t.role === "Owner")!;
    expect((await setRoleAction(sales.id, undefined, form({ role: "Finance" })))?.saved).toBe(true);
    // The activity history has it, by the manager, naming the team member (staff, not a customer).
    expect((await listActivity({}, 1, 1)).rows[0]).toMatchObject({ actor: "Ciara Walsh", area: "settings", summary: `Changed ${sales.name}'s role from Sales to Finance`, refLabel: sales.name });
    expect((await setRoleAction(sales.id, undefined, form({ role: "Owner" })))?.errors?.role).toMatch(/Only an owner/);
    expect((await setRoleAction(owner.id, undefined, form({ role: "Sales" })))?.errors?.role).toMatch(/Only an owner/);
    expect((await addTeamAction(undefined, form({ name: "New boss", email: "boss@example.com", role: "Owner" })))?.errors?.role).toMatch(/Only an owner/);
    await removeTeamAction(owner.id);
    expect((await getSettings()).team.find((t) => t.id === owner.id)?.role).toBe("Owner");
  });

  it("sales and finance cannot change the team or the settings", async () => {
    for (const r of ["Sales", "Finance"]) {
      role = r;
      const sales = (await getSettings()).team.find((t) => t.role === "Sales")!;
      expect((await addTeamAction(undefined, form({ name: "Sneaky", email: "sneaky@example.com", role: "Sales" })))?.errors?.role).toMatch(/owner or manager/);
      expect((await setRoleAction(sales.id, undefined, form({ role: "Manager" })))?.errors?.role).toMatch(/owner or manager/);
      await removeTeamAction(sales.id);
      expect((await saveTargetsAction(undefined, form({ leadSlaHours: "2", driveSlotMinutes: "30" })))?.errors?.leadSlaHours).toMatch(/owner or manager/);
    }
    expect((await getSettings()).team.map((t) => t.name)).not.toContain("Sneaky");
    expect((await getSettings()).team.filter((t) => t.role === "Manager")).toHaveLength(1); // nobody was promoted
    expect((await getSettings()).leadSlaHours).toBe(24);
  });
});

describe("lead emails", () => {
  beforeEach(() => {
    role = undefined;
    return settingsStore.reset();
  });
  it("records a change in the activity history, and not a save that changed nothing", async () => {
    const before = (await listActivity({ area: "settings" }, 1, 1)).total;
    await saveLeadEmailsAction(undefined, form({ leadEmails: "a@example.com" }));
    await saveLeadEmailsAction(undefined, form({ leadEmails: "a@example.com" }));
    const after = await listActivity({ area: "settings" }, 1, 1);
    expect(after.total).toBe(before + 1);
    expect(after.rows[0].summary).toBe("Changed who gets the lead emails");
  });

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

describe("reset demo data", () => {
  it("puts the records back, and the Reserved marks with them: only on the cars with a held deposit", async () => {
    vi.stubEnv("DEMO_RECORDS", "on");
    role = undefined; // the owner
    const car = (await adminCars()).find((c) => !c.soldAt && !c.reserved)!;
    const held = (await adminCars()).find((c) => c.reserved)!;
    await saveCar({ ...car, reserved: true });
    await saveCar({ ...held, reserved: undefined });
    await resetDemoAction();
    expect((await adminCars()).find((c) => c.id === car.id)?.reserved).toBeUndefined();
    expect((await adminCars()).find((c) => c.id === held.id)?.reserved).toBe(true);
  });
});

describe("the other settings", () => {
  beforeEach(async () => {
    role = undefined;
    await settingsStore.reset();
  });

  it("saves the slot length within its limits", async () => {
    expect((await saveTargetsAction(undefined, form({ leadSlaHours: "24", driveSlotMinutes: "10" })))?.errors?.driveSlotMinutes).toBe("At least 15 minutes");
    expect((await saveTargetsAction(undefined, form({ leadSlaHours: "24", driveSlotMinutes: "90" })))?.saved).toBe(true);
    expect((await getSettings()).driveSlotMinutes).toBe(90);
  });

  it("switches the morning follow-up email on and off", async () => {
    await saveNotificationsAction(undefined, form({}));
    expect((await getSettings()).notifications.followUps).toBe(false);
    await saveNotificationsAction(undefined, form({ followUps: "on" }));
    expect((await getSettings()).notifications.followUps).toBe(true);
  });

  it("keeps the marketing voice within its lengths", async () => {
    expect((await saveMarketingAction(undefined, form({ voice: "x".repeat(201), hashtags: "", signOff: "" })))?.errors).toBeDefined();
    expect((await saveMarketingAction(undefined, form({ voice: "Friendly", hashtags: "#cars", signOff: "See you soon" })))?.saved).toBe(true);
    expect((await getSettings()).marketing).toEqual({ voice: "Friendly", hashtags: "#cars", signOff: "See you soon" });
  });

  it("takes up to five lead email addresses, each once, and refuses a bad one", async () => {
    expect((await saveLeadEmailsAction(undefined, form({ leadEmails: "a@x.ie, A@x.ie\nb@x.ie" })))?.saved).toBe(true);
    expect((await getSettings()).leadEmails).toEqual(["a@x.ie", "b@x.ie"]);
    expect((await saveLeadEmailsAction(undefined, form({ leadEmails: "a@x.ie b@x.ie c@x.ie d@x.ie e@x.ie f@x.ie" })))?.errors?.leadEmails).toBe("Use 5 addresses or fewer");
    expect((await saveLeadEmailsAction(undefined, form({ leadEmails: "not-an-email" })))?.errors?.leadEmails).toMatch(/is not a valid email$/);
  });

  it("says when the test email cannot go (no email set up here)", async () => {
    expect((await sendTestEmailAction())?.errors?.test).toMatch(/^The test email did not go/);
  });

  it("refuses all of them for Sales", async () => {
    role = "Sales";
    for (const r of [await saveNotificationsAction(undefined, form({})), await saveMarketingAction(undefined, form({ voice: "x", hashtags: "", signOff: "" })), await sendTestEmailAction()]) expect(r?.saved).toBeFalsy();
  });
});

describe("removing a person", () => {
  it("gives their leads and test drives back to nobody", async () => {
    role = undefined;
    await settingsStore.reset();
    const { drivesStore } = await import("@/lib/admin/collections");
    const person = (await getSettings()).team.find((t) => t.role === "Sales")!;
    const drive = (await drivesStore.list())[0];
    await drivesStore.put({ ...drive, assignedTo: person.name });
    await removeTeamAction(person.id);
    expect((await drivesStore.get(drive.id))!.assignedTo).toBeUndefined();
  });
});
