# Changelog

All notable changes to Easy Notes are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-11-02

First public release.

### Features
- Notes and documents in folders and sub-folders (Notes and Documents each have their own folders).
- Notes with autosave, search, sort, pin to top, share and print / save as PDF.
- Upload PDFs and images or take a photo; PDF and image preview inside the app.
- Move items and folders; Trash with Undo and 30-day restore.
- Backup to a single JSON file (documents included) and restore with validation.
- Sample data: “Try with sample data” on the Welcome screen, “Load sample data” in Settings
  (fictional folders, 9 notes and 6 small documents generated in code).
- “Delete all data” in Settings, with a confirmation dialog.
- Offline support and installable PWA; light and dark mode.

### Fixed
- “Load sample data” in Settings shows a spinner, then a clear “Added …” message and a toast with
  a “View” button; the row no longer jumps while loading.
- The “Create new” sheet now always closes after uploading files or taking a photo.
- Messages (toasts) move to the top of the screen while a sheet or dialog is open, so they never cover it.
- Uploading files failed in Safari / WebKit private windows (IndexedDB refuses Blobs there);
  files are now stored in a compatible format automatically.
- Colour contrast of the Notes / Documents tabs and the “Empty Trash” button (light and dark mode).
- Heading order on the list screens, a page heading for the note editor, a keyboard-focusable
  document preview area, and a visible focus ring on the note title and text.

### Developer
- Unit tests for sample data, delete-all, generated PDF/PNG files and file storage.
- Playwright tests in Chromium, Firefox and WebKit: full user journey, keyboard focus, and
  axe-core accessibility checks on every screen and dialog in light and dark mode at 360–1440 px.
- CI runs lint, unit tests, build and browser tests; GitHub Pages deploy runs `npm run check` first.
- `documentation.html`, `LICENSE.txt` and this changelog for buyers.
