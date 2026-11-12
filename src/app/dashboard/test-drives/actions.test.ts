import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => null }) }));
const { assignDriveAction } = await import("./actions");
const { drivesStore, getSettings } = await import("@/lib/admin/collections");

describe("who takes a test drive out", () => {
  it("is someone on the team, or nobody; any other name is refused", async () => {
    const drive = (await drivesStore.list())[0];
    const name = (await getSettings()).team[1].name;
    await assignDriveAction(drive.id, name);
    expect((await drivesStore.get(drive.id))!.assignedTo).toBe(name);
    await assignDriveAction(drive.id, "Somebody Else");
    expect((await drivesStore.get(drive.id))!.assignedTo).toBe(name);
    await assignDriveAction(drive.id, "");
    expect((await drivesStore.get(drive.id))!.assignedTo).toBeUndefined();
  });
});
