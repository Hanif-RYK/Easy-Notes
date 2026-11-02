import { expect, test } from "@playwright/test";
import { collectErrors, expectNoAxeViolations, expectNoHorizontalScroll, setTheme, startWithSample } from "./helpers.js";

// Every screen and dialog, checked with axe-core in light and dark mode at
// phone, tablet and desktop widths. Run once per browser is enough for
// layout, so the full matrix only runs in Chromium.
const WIDTHS = [360, 390, 768, 1024, 1440];

const openFolder = (page, name) => page.getByRole("button", { name: new RegExp(`^${name}\\b`) }).first().click();

// Each step brings the app to a screen (or dialog) and returns a cleanup.
const SCREENS = [
  ["notes list", async () => {}],
  ["notes folder", async (page) => openFolder(page, "Work")],
  ["note editor", async (page) => {
    await openFolder(page, "Work");
    await page.getByRole("button", { name: /^Ideas for the newsletter/ }).click();
    await expect(page.getByLabel("Note title")).toBeVisible();
  }],
  ["note menu", async (page) => {
    await openFolder(page, "Work");
    await page.getByRole("button", { name: /^Ideas for the newsletter/ }).click();
    await page.getByRole("button", { name: "More options" }).click();
  }],
  ["create new sheet", async (page) => {
    await openFolder(page, "Work");
    await page.getByRole("button", { name: "New", exact: true }).click();
  }],
  ["filter sheet", async (page) => page.getByRole("button", { name: /^Filter and sort/ }).click()],
  ["item options", async (page) => {
    await openFolder(page, "Work");
    await page.getByRole("button", { name: "Options for Ideas for the newsletter" }).click();
  }],
  ["move dialog", async (page) => {
    await openFolder(page, "Work");
    await page.getByRole("button", { name: "Options for Ideas for the newsletter" }).click();
    await page.getByRole("button", { name: "Move to folder" }).click();
  }],
  ["new folder prompt", async (page) => page.getByRole("button", { name: "New folder" }).click()],
  ["search results", async (page) => page.getByLabel("Search").fill("soup")],
  ["documents list", async (page) => page.getByRole("tab", { name: "Documents" }).click()],
  ["documents folder", async (page) => {
    await page.getByRole("tab", { name: "Documents" }).click();
    await openFolder(page, "Bills");
  }],
  ["pdf preview", async (page) => {
    await page.getByRole("tab", { name: "Documents" }).click();
    await openFolder(page, "Bills");
    await page.getByRole("button", { name: /^Electricity bill/ }).click();
    await expect(page.getByRole("img", { name: /^Page 1 of 1/ })).toBeVisible();
  }],
  ["image preview", async (page) => {
    await page.getByRole("tab", { name: "Documents" }).click();
    await openFolder(page, "ID cards");
    await page.getByRole("button", { name: /^Library card/ }).click();
    await expect(page.getByRole("img", { name: "Library card.png" })).toBeVisible();
  }],
  ["settings", async (page) => page.getByRole("button", { name: /^Settings/ }).click()],
  ["delete all dialog", async (page) => {
    await page.getByRole("button", { name: /^Settings/ }).click();
    await page.getByRole("button", { name: /^Delete all data/ }).click();
  }],
  ["trash", async (page) => {
    await openFolder(page, "Work");
    const options = page.getByRole("button", { name: "Options for Ideas for the newsletter" });
    if (await options.count()) {
      await options.click();
      await page.getByRole("button", { name: "Move to Trash" }).click();
    }
    await page.goto("./#/trash");
    await expect(page.getByRole("button", { name: /^Restore Ideas/ })).toBeVisible();
  }],
];

test.describe("accessibility and layout", () => {
  test("welcome screen", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("./");
    for (const theme of ["light", "dark"]) {
      await setTheme(page, theme);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        await expectNoHorizontalScroll(page, `welcome ${theme} ${width}`);
        await expectNoAxeViolations(page, `welcome ${theme} ${width}`);
      }
    }
    expect(errors).toEqual([]);
  });

  for (const [name, open] of SCREENS) {
    test(name, async ({ page, browserName }) => {
      const errors = collectErrors(page);
      await startWithSample(page);
      const widths = browserName === "chromium" ? WIDTHS : [390];
      for (const theme of ["light", "dark"]) {
        await setTheme(page, theme);
        for (const width of widths) {
          await page.setViewportSize({ width, height: 800 });
          await page.goto("./#/notes");
          await expect(page.getByRole("button", { name: /^Work\b/ })).toBeVisible();
          await open(page);
          const label = `${name} ${theme} ${width}`;
          await expectNoHorizontalScroll(page, label);
          await expectNoAxeViolations(page, label);
          await page.keyboard.press("Escape");
        }
      }
      expect(errors).toEqual([]);
    });
  }
});
