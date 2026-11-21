import { expect, test, type Page } from "@playwright/test";

// Marketing formats, the media library, the calendar and the AI writer (#177, #179). The AI is the demo's mock (no key, no cost) and publishing is
// simulated, so everything here runs without leaving the dashboard. The unit tests hold the rules (src/lib/ai, src/lib/admin/media-rules.test.ts).
async function startPost(page: Page, url = "/dashboard/marketing/new") {
  await page.goto(url);
  await page.getByRole("main").locator("li > button[aria-pressed]").nth(2).click();
  await expect(page.getByRole("heading", { name: /Step 2 of 4/ })).toBeFocused();
}
const next = (page: Page) => page.getByRole("button", { name: "Next" }).click();
const text = (page: Page) => page.getByRole("textbox", { name: "Text", exact: true });
// A 1 by 1 PNG: the browser reads it, shrinks it to a JPEG and sends it.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test("write a post with AI, adjust it, undo, and edit it: it is marked as AI and stays editable", async ({ page }) => {
  await startPost(page);
  await next(page);
  await expect(text(page)).not.toHaveValue("");
  await expect(page.getByText("AI draft")).toHaveCount(0);
  await page.getByRole("button", { name: "Write with AI" }).click();
  await expect(page.getByText("AI draft", { exact: true })).toBeVisible();
  const first = await text(page).inputValue();
  expect(first).toMatch(/^Just in: /);
  expect(first).not.toMatch(/[—–]/);
  await page.getByRole("button", { name: "Shorter" }).click();
  await expect(text(page)).not.toHaveValue(first);
  const short = await text(page).inputValue();
  expect(short.length).toBeLessThan(first.length);
  await page.getByRole("button", { name: "Add hashtags" }).click();
  await expect(text(page)).toHaveValue(/#\w+/);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(text(page)).toHaveValue(short);
  await text(page).fill(`${short} Ask for Aoife.`);
  await expect(page.getByText("AI draft, edited")).toBeVisible();
});

test("make a story from a car: pick the layout, see it drawn on the photo, and publish it", async ({ page }) => {
  await startPost(page);
  await page.getByRole("radio", { name: "Story" }).click();
  await expect(page.getByRole("radio", { name: "Reel or video" })).toBeVisible();
  await next(page);
  await page.getByRole("radio", { name: "Price drop" }).click();
  await expect(text(page)).toHaveValue(/^Price drop: /);
  await expect(page.getByRole("button", { name: "Add urgency" })).toHaveCount(0); // the buttons come with the first draft
  await page.getByRole("button", { name: "Write with AI" }).click();
  await expect(page.getByRole("button", { name: "Add urgency" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add hashtags" })).toHaveCount(0); // a story only gets the buttons that fit it
  await next(page);
  const preview = page.locator("[data-preview=story]");
  await expect(preview).toContainText("Price drop");
  await expect(preview).toContainText("See it");
  await page.getByRole("button", { name: "Get it ready for Facebook" }).click(); // a story is posted from the phone, so not "Post now"
  await expect(page.getByRole("status")).toContainText("Ready to post from your phone");
  await expect(page.getByRole("listitem").filter({ hasText: "Facebook story" }).first()).toBeVisible();
});

test("a story is prepared for the phone on Instagram, and a TikTok has no story", async ({ page }) => {
  await startPost(page);
  await page.getByRole("radio", { name: "Instagram" }).click();
  await page.getByRole("radio", { name: "Story" }).click();
  await expect(page.getByText("is made ready here and posted from your phone")).toBeVisible();
  await page.getByRole("radio", { name: "TikTok" }).click();
  await expect(page.getByRole("radio", { name: "Story" })).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "Post", exact: true })).toBeChecked();
});

test("upload a photo to the media library, tag it to a car, and use it in a carousel; the server refuses a file that is not a photo", async ({ page }) => {
  await page.goto("/dashboard/marketing?tab=media");
  await page.getByLabel("Car, if it belongs to one").selectOption({ index: 1 });
  const name = `e2e-forecourt-${Date.now()}.png`;
  await page.getByLabel("Add photos or videos").setInputFiles({ name, mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Added to your library")).toBeVisible();
  await expect(page.getByRole("img", { name: new RegExp(name.slice(0, -4)) })).toBeVisible();
  await page.getByLabel("Add photos or videos").setInputFiles({ name: "notes.png", mimeType: "image/png", buffer: Buffer.from("not a picture") });
  await expect(page.getByText("could not be added")).toBeVisible();
  // It is on offer when a carousel is made.
  await startPost(page);
  await page.getByRole("radio", { name: "Carousel" }).click();
  await next(page);
  await expect(page.getByRole("button", { name: "Add photo", exact: true }).first()).toBeVisible();
  await expect(page.getByText("Photos, 2 to 10")).toBeVisible();
});

test("a post that goes out shows on the calendar's week, and the week can move", async ({ page }) => {
  await startPost(page);
  await next(page);
  await expect(text(page)).not.toHaveValue("");
  await next(page);
  await page.getByRole("button", { name: /^Post to [A-Za-z]+ now$/ }).click();
  await expect(page.getByRole("status")).toContainText("Post published");
  await page.goto("/dashboard/marketing?tab=calendar");
  const week = page.getByRole("region", { name: "Week" });
  await expect(week.locator("[data-calendar-item]").first()).toBeVisible();
  await expect(week.getByRole("listitem").filter({ hasText: "Posted" }).first()).toBeVisible();
  await page.getByRole("link", { name: "Later" }).click();
  await expect(page).toHaveURL(/week=\d{4}-\d{2}-\d{2}/);
  await expect(week.getByText("Nothing set").first()).toBeVisible();
});

test("an idea offers a story as well as a post", async ({ page }) => {
  await page.goto("/dashboard/marketing");
  const story = page.getByRole("link", { name: "Make a story" }).first();
  if (await story.count()) {
    await story.click();
    await expect(page).toHaveURL(/format=story&layout=(just-in|price-drop)/);
    await page.getByRole("radio", { name: "Story" }).waitFor();
    await expect(page.getByRole("radio", { name: "Story" })).toBeChecked();
  }
});

test("write a car description, a lead reply and a review reply with AI", async ({ page }) => {
  await page.goto("/dashboard/stock/new");
  await page.getByLabel("Make").fill("Skoda");
  await page.getByLabel("Model").fill("Octavia");
  await page.getByLabel("Seats").fill("5");
  await page.getByRole("button", { name: "Write with AI" }).click();
  const description = page.getByRole("textbox", { name: "Description" });
  await expect(description).toHaveValue(/Skoda Octavia/);
  await page.getByRole("button", { name: "Highlight family use" }).click();
  await expect(description).toHaveValue(/5 seats/);
  await expect(page.getByText("AI draft", { exact: true })).toBeVisible();

  await page.goto("/dashboard/leads/lead-1000");
  await page.getByRole("button", { name: "Write with AI" }).click();
  const reply = page.getByRole("textbox", { name: "Reply draft" });
  await expect(reply).toHaveValue(/^Hi /);
  await page.getByRole("button", { name: "Friendlier" }).click();
  await expect(reply).toHaveValue(/thanks so much/);
  await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();

  await page.goto("/dashboard/reviews");
  await page.getByText(/^(Reply|Edit reply)$/).first().click();
  await page.getByRole("button", { name: "Write with AI" }).first().click();
  await expect(page.getByRole("textbox", { name: /^Reply to / }).first()).not.toHaveValue("");
  await expect(page.getByRole("button", { name: "More apologetic" }).first()).toBeVisible();
});

test("with the AI module off there is no AI anywhere; with Social off there are no posts, with only Newsletter the page is newsletters", async ({ page, context, baseURL }) => {
  const modules = (value: string) => context.addCookies([{ name: "checkwork-demo-modules", value, url: baseURL! }]);
  await modules("dashboard,social,newsletter,reviews");
  await startPost(page);
  await next(page);
  await expect(text(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Write with AI" })).toHaveCount(0);
  await page.goto("/dashboard/leads/lead-1000");
  await expect(page.getByRole("button", { name: "Write with AI" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Draft a reply" })).toHaveCount(0);

  await modules("dashboard,newsletter,ai");
  await page.goto("/dashboard/marketing");
  await expect(page).toHaveURL(/marketing/);
  await expect(page.getByRole("link", { name: "New post" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Calendar/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Write from the newest cars" })).toBeVisible();
  await page.goto("/dashboard/marketing/new");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Not in your plan");

  await modules("dashboard,ai");
  expect((await page.goto("/dashboard/marketing"))?.status()).toBe(404);
});
