import { expect, test } from "@playwright/test";
import { choose } from "./combo";

// Factory orders: the website takes a request; the dashboard places the order, it arrives into stock held for the buyer, and Mark sold
// hands it over. One made-up make, so no other test sees the car.
test("the New cars page leads to the order form", async ({ page }) => {
  await page.goto("/new-cars");
  await page.getByRole("link", { name: /Order one from the factory/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order a new car");
  await expect(page.getByLabel(/Registration you'd like/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send my order" })).toBeVisible();
});

test("an order is placed, arrives into stock held for the buyer, and is handed over by its sale", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard/orders/new");
  await page.getByLabel("Make", { exact: true }).fill("Zzorder");
  await page.getByLabel("Model", { exact: true }).fill("Tourer");
  await page.getByLabel("Price (€)").fill("41000");
  await page.getByLabel("Deposit (€, optional)").fill("1500");
  await choose(page.getByLabel("Deposit paid by"), /Card/);
  await page.getByLabel("Due").fill(new Date().toISOString().slice(0, 7));
  await page.getByLabel("Name", { exact: true }).fill("Rory Byrne");
  await page.getByLabel("Phone", { exact: true }).fill("+353 83 000 6666");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/dashboard\/orders\/order-/);
  await expect(page.getByRole("region", { name: "Where it is" })).toContainText("Ordered");

  await page.getByRole("button", { name: "On its way" }).click();
  await expect(page.getByRole("button", { name: "On its way" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Arrived" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "It has arrived" }).click(); // it cannot be stepped back, so it asks
  await page.getByRole("link", { name: "Hand over" }).click();
  await expect(page.getByText(/A deposit of €1,500 was paid on this car/)).toBeVisible();
  await page.getByRole("button", { name: "Mark sold" }).click();
  await expect(page.getByRole("status")).toContainText(/Sale recorded for/);

  // On the customer's page too.
  await page.goto("/dashboard/customers");
  await page.getByRole("link", { name: "Rory Byrne" }).first().click();
  await expect(page.getByRole("region", { name: "Factory orders" })).toContainText("Zzorder Tourer");
  await page.goto("/dashboard/orders?view=done");
  await expect(page.getByRole("row").filter({ hasText: "Zzorder Tourer" })).toContainText("Handed over");
});
