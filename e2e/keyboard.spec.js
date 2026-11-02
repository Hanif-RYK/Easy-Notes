import { expect, test } from "@playwright/test";
import { startWithSample } from "./helpers.js";

// Tabbing through a screen must always show where the focus is, and every
// button must have a name a screen reader can read.
async function expectVisibleFocusWhileTabbing(page, label, steps = 25) {
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      const ring = style.boxShadow && style.boxShadow !== "none";
      return { tag: el.tagName, name: el.getAttribute("aria-label") || el.textContent.trim().slice(0, 40), visible: outline || ring };
    });
    if (info) expect(info.visible, `${label}: focus not visible on ${info.tag} "${info.name}"`).toBe(true);
  }
}

test("keyboard focus is visible on the main screens", async ({ page }) => {
  await startWithSample(page);
  await expectVisibleFocusWhileTabbing(page, "notes list");
  await page.goto("./#/settings");
  await expectVisibleFocusWhileTabbing(page, "settings");
  await page.goto("./#/notes");
  await page.getByRole("button", { name: /^Shopping list/ }).click();
  await expectVisibleFocusWhileTabbing(page, "note editor", 8);
  await page.goto("./#/docs");
  await expectVisibleFocusWhileTabbing(page, "documents");
});

test("every button has an accessible name", async ({ page }) => {
  await startWithSample(page);
  for (const hash of ["#/notes", "#/docs", "#/settings", "#/trash"]) {
    await page.goto(`./${hash}`);
    await page.waitForTimeout(200);
    const unnamed = await page.$$eval("button", (buttons) =>
      buttons.filter((b) => !(b.getAttribute("aria-label") || b.textContent.trim() || b.title)).map((b) => b.outerHTML.slice(0, 80)),
    );
    expect(unnamed, hash).toEqual([]);
  }
});
