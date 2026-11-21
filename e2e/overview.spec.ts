import { expect, test } from "@playwright/test";

// The overview is where the day starts: the main jobs as big buttons, and a to-do list whose buttons do the job in place.
test("the overview opens with the main jobs, and a test drive is confirmed from the to-do list, with Undo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  const jobs = page.getByRole("navigation", { name: "Quick actions" });
  for (const job of ["Add a car", "Book a test drive", "New post", "Reply to leads"]) await expect(jobs.getByRole("link", { name: new RegExp(`^${job}`) })).toBeVisible();
  const todo = page.getByRole("list", { name: "To do" });
  const confirm = todo.getByRole("button", { name: /^Confirm .+'s test drive$/ }).first();
  const name = (await confirm.getAttribute("aria-label"))!.replace(/^Confirm (.+)'s test drive$/, "$1");
  await confirm.click();
  const toast = page.getByTestId("toast");
  await expect(toast).toContainText(`${name}: Confirmed`);
  await expect(todo.getByRole("button", { name: `Confirm ${name}'s test drive` })).toHaveCount(0);
  await toast.getByRole("button", { name: "Undo" }).click(); // back as it was, for the other specs
  await expect(todo.getByRole("button", { name: `Confirm ${name}'s test drive` })).toBeVisible();
});

test("a new lead is called or answered from its row on the overview", async ({ page }) => {
  await page.goto("/dashboard");
  const leads = page.getByRole("region", { name: "Newest leads" });
  await expect(leads.getByRole("link", { name: /^Call / }).first()).toHaveAttribute("href", /^tel:/);
  await leads.getByRole("link", { name: /^Reply to / }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/leads\/[^/]+$/);
});
