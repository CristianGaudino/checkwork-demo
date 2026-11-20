import { expect, test } from "@playwright/test";

// The WhatsApp panel (#178): the conversation, a tap and a typed price that update the lead, and the page gone without its module.
test("the page shows the dealer's conversation, with the buttons under an alert", async ({ page }) => {
  await page.goto("/dashboard/whatsapp");
  const phone = page.getByRole("region", { name: "Your WhatsApp" });
  await expect(phone.getByText(/wants (to sell their car|a price for a trade-in)/).first()).toBeVisible();
  await expect(phone.getByRole("button", { name: "Reply with a price" })).toBeVisible();
  await expect(phone.getByRole("button", { name: "Yes, it's available" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "What reaches your phone" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Staff phones" })).toBeVisible();
});

test("reply with a price: the lead gets the offer, and the buyer answers", async ({ page }) => {
  await page.goto("/dashboard/whatsapp");
  const phone = page.getByRole("region", { name: "Your WhatsApp" });
  await phone.getByRole("button", { name: "Reply with a price" }).click();
  await expect(phone.getByText(/What price do you want to offer/)).toBeVisible();
  await phone.getByLabel("Message").fill("nonsense");
  await phone.getByRole("button", { name: "Send" }).click();
  await expect(phone.getByText(/could not read that as a price/)).toBeVisible();
  await phone.getByLabel("Message").fill("€8.5k");
  await phone.getByRole("button", { name: "Send" }).click();
  await expect(phone.getByText(/I sent .* your offer of €8,500 by WhatsApp/)).toBeVisible();
  const buyer = page.getByRole("region", { name: "The buyer's WhatsApp" });
  await expect(buyer.getByText(/can offer you €8,500/)).toBeVisible();
  // The answer comes back a few seconds later, on both phones.
  await expect(buyer.getByText(/That sounds good/)).toBeVisible({ timeout: 20_000 });
  await expect(phone.getByText(/replied: "That sounds good/)).toBeVisible({ timeout: 20_000 });
  await phone.getByRole("link", { name: "Open" }).last().click();
  await expect(page.getByText("Offer sent by WhatsApp: €8,500").first()).toBeVisible();
});

test("without the WhatsApp module the page says it is not in the plan, and the owner can ask for it", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "checkwork-demo-modules", value: "dashboard", url: baseURL! }]);
  await page.goto("/dashboard/whatsapp");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not in your plan");
  await expect(page.getByText("Leads to your phone, and replies from WhatsApp that the site sends on.")).toBeVisible();
  await page.getByRole("button", { name: "Ask us to add WhatsApp" }).click();
  await expect(page.getByText("We have your request. Our reply will show in Help.")).toBeVisible();
});
