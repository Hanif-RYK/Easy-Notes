import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { collectErrors, startWithSample } from "./helpers.js";

// The whole journey of a new user, in one go, in every browser.
test("sample data → notes → documents → trash → backup → restore → dark mode → offline", async ({ page, context }) => {
  const errors = collectErrors(page);
  const toast = page.locator("[aria-live=polite]").last();
  const folderButton = (name) => page.getByRole("button", { name: new RegExp(`^${name}\\b`) }).first();
  const summary = (label) => page.locator("dl > div").filter({ hasText: label }).locator("dd");

  // Welcome → sample data
  await startWithSample(page);
  await expect(folderButton("Personal")).toBeVisible();
  await expect(folderButton("Recipes")).toBeVisible();

  // Open a note and edit it
  await folderButton("Work").click();
  await expect(folderButton("Meetings")).toBeVisible();
  await page.getByRole("button", { name: /^Ideas for the newsletter/ }).click();
  await page.getByLabel("Note title").fill("Newsletter ideas");
  await page.getByLabel("Note text").press("End");
  await page.getByLabel("Note text").pressSequentially("\n- Add a reader poll");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("button", { name: /^Newsletter ideas/ })).toBeVisible();

  // Move it into a sub-folder
  await page.getByRole("button", { name: "Options for Newsletter ideas" }).click();
  await page.getByRole("button", { name: "Move to folder" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Projects" }).click();
  await expect(toast).toHaveText("Moved");
  await expect(page.getByRole("button", { name: /^Newsletter ideas/ })).toHaveCount(0);
  await folderButton("Projects").click();
  await expect(page.getByRole("button", { name: /^Newsletter ideas/ })).toBeVisible();

  // Delete and undo
  await page.getByRole("button", { name: "Options for Newsletter ideas" }).click();
  await page.getByRole("button", { name: "Move to Trash" }).click();
  await expect(page.getByRole("button", { name: /^Newsletter ideas/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: /^Newsletter ideas/ })).toBeVisible();

  // Delete again and restore it from the Trash
  await page.getByRole("button", { name: "Options for Newsletter ideas" }).click();
  await page.getByRole("button", { name: "Move to Trash" }).click();
  await page.getByRole("button", { name: /^Settings/ }).click();
  await page.getByRole("button", { name: /^Trash/ }).click();
  await page.getByRole("button", { name: "Restore Newsletter ideas" }).click();
  await expect(page.getByText("Trash is empty")).toBeVisible();
  await page.goto("./#/notes");
  await page.getByLabel("Search").fill("reader poll");
  await expect(page.getByRole("button", { name: /^Newsletter ideas/ })).toBeVisible();
  await page.getByLabel("Clear search").click();

  // Documents: PDF and image previews
  await page.getByRole("tab", { name: "Documents" }).click();
  await folderButton("Bills").click();
  await page.getByRole("button", { name: /^Electricity bill/ }).click();
  await expect(page.getByRole("img", { name: "Page 1 of 1" })).toBeVisible();
  await page.getByRole("button", { name: "Back to documents" }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await folderButton("ID cards").click();
  await page.getByRole("button", { name: /^Library card/ }).click();
  const image = page.getByRole("img", { name: "Library card.png" });
  await expect(image).toBeVisible();
  expect(await image.evaluate((img) => img.naturalWidth)).toBe(320);

  // Upload a file: the "Create new" sheet closes and the toast shows
  await page.getByRole("button", { name: "Back to documents" }).click();
  await page.getByRole("button", { name: "New", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload PDF or image" }).click();
  await (await chooser).setFiles({ name: "Passport scan.png", mimeType: "image/png", buffer: await readFile("public/icon-192.png") });
  await expect(toast).toHaveText("Document added");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Passport scan\.png/ })).toBeVisible();

  // Backup download
  await page.goto("./#/settings");
  await expect(summary("Notes")).toHaveText("9");
  await expect(summary("Documents")).toHaveText("7");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Download backup/ }).click();
  const backupPath = await (await download).path();
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  expect(backup.app).toBe("easy-notes");
  expect(backup.notes).toHaveLength(9);
  expect(backup.docs).toHaveLength(7);

  // Delete all data, then restore the backup
  await page.getByRole("button", { name: /^Delete all data/ }).click();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await expect(summary("Notes")).toHaveText("0");
  await expect(summary("Documents")).toHaveText("0");
  const restoreChooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Restore from backup" }).click();
  await (await restoreChooser).setFiles(backupPath);
  await page.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
  await expect(toast).toHaveText("Backup restored");
  await expect(summary("Notes")).toHaveText("9");
  await expect(summary("Documents")).toHaveText("7");

  // The restored PDF still opens
  await page.goto("./#/docs");
  await folderButton("Bills").click();
  await page.getByRole("button", { name: /^Internet bill/ }).click();
  await expect(page.getByRole("img", { name: "Page 1 of 1" })).toBeVisible();

  // Dark mode, kept after a reload
  await page.goto("./#/settings");
  await page.getByRole("switch", { name: "Dark mode" }).check();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);

  // Offline: the service worker serves the app
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // make sure the page is controlled by the service worker
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto("./#/notes");
  await page.reload();
  await expect(folderButton("Work")).toBeVisible();
  await folderButton("Recipes").click();
  await page.getByRole("button", { name: /^Lentil soup/ }).click();
  await expect(page.getByLabel("Note title")).toHaveValue("Lentil soup");
  await context.setOffline(false);

  expect(errors).toEqual([]);
});
