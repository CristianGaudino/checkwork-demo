import { describe, expect, it } from "vitest";
import { signPhotoPath } from "@/lib/leads/photos";
import { readUnsubscribeToken, unsubscribeParts, unsubscribeToken } from "./unsubscribe";

const S = "secret-a";

describe("unsubscribe tokens", () => {
  it("names the one record it was made for", async () => {
    expect(await readUnsubscribeToken(await unsubscribeToken({ kind: "newsletter", id: "sub-500" }, S), S)).toEqual({ kind: "newsletter", id: "sub-500" });
    expect(await readUnsubscribeToken(await unsubscribeToken({ kind: "alert", id: "real-3f9a1c2e" }, S), S)).toEqual({ kind: "alert", id: "real-3f9a1c2e" });
  });

  it("cannot be moved to another record or kind, and refuses a forged or foreign signature", async () => {
    const [k, , sig] = (await unsubscribeToken({ kind: "newsletter", id: "sub-500" }, S)).split(".");
    expect(await readUnsubscribeToken(`${k}.sub-501.${sig}`, S)).toBeNull(); // someone else's subscription
    expect(await readUnsubscribeToken(`a.sub-500.${sig}`, S)).toBeNull(); // the same id as an alert
    expect(await readUnsubscribeToken(`${k}.sub-500.${(sig[0] === "A" ? "B" : "A") + sig.slice(1)}`, S)).toBeNull();
    expect(await readUnsubscribeToken(`${k}.sub-500.${sig}`, "secret-b")).toBeNull();
    // A photo link's signature, made with the same secret, does not fit.
    const photo = new URL(await signPhotoPath("sub-500", S), "https://x.test");
    expect(await readUnsubscribeToken(`n.sub-500.${photo.searchParams.get("sig")}`, S)).toBeNull();
  });

  it("refuses anything malformed", async () => {
    for (const t of [undefined, 42, "", "n.sub-500", "x.sub-500.abc", "n.sub/500.abc", "n.a.b.c", "n".repeat(500)]) expect(await readUnsubscribeToken(t, S)).toBeNull();
    await expect(unsubscribeToken({ kind: "newsletter", id: "a.b" }, S)).rejects.toThrow();
  });

  it("is the same link every time for the same subscription, so every email to that person carries one link", async () => {
    const t = { kind: "alert" as const, id: "alert-400" };
    expect(await unsubscribeToken(t, S)).toBe(await unsubscribeToken(t, S));
    expect(await unsubscribeToken(t, S)).not.toBe(await unsubscribeToken({ kind: "alert", id: "alert-401" }, S));
  });

  it("gives each email its link and the List-Unsubscribe headers, with no email address in them", async () => {
    const p = await unsubscribeParts({ kind: "newsletter", id: "sub-500" }, S, "https://www.example.ie/");
    expect(p.url).toMatch(/^https:\/\/www\.example\.ie\/unsubscribe\?t=n\.sub-500\.[\w-]{43}$/);
    expect(p.headers["List-Unsubscribe"]).toBe(`<${p.url.replace("/unsubscribe?", "/unsubscribe/one-click?")}>`);
    expect(p.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(p.footer).toContain(p.url);
    expect(JSON.stringify(p)).not.toContain("@");
  });
});
