import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";

/** Collects console errors and uncaught exceptions; check with expect(errors).toEqual([]). */
export function collectErrors(page) {
  const errors = [];
  page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}

/** Opens the app and starts it with the sample data from the Welcome screen. */
export async function startWithSample(page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Try with sample data" }).click();
  await expect(page.getByRole("button", { name: /^Work\b/ })).toBeVisible();
}

/** Switches the theme the same way the app stores it, then reloads. */
export async function setTheme(page, theme) {
  await page.evaluate((t) => localStorage.setItem("easy_notes_theme", t), theme);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
}

/** Fails with a readable list if axe finds any violation. */
export async function expectNoAxeViolations(page, label) {
  // Let entry animations finish so colours are final.
  await page.waitForTimeout(350);
  const { violations } = await new AxeBuilder({ page }).analyze();
  const summary = violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

/** The page must never scroll sideways. */
export async function expectNoHorizontalScroll(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `horizontal scroll on ${label}`).toBeLessThanOrEqual(0);
}
