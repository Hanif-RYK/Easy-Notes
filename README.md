# Easy Notes

A simple app to keep your notes and documents (PDFs and photos) organised in folders.
Everything is stored privately in the browser on your device — no account or server needed.

## Features

- Folders and sub-folders (any depth); Notes and Documents each have their own folders
- Notes with autosave, search, sort and pin-to-top; share or print / save as PDF
- Upload PDFs and images (or take a photo on mobile); PDFs are shown inside the app on every device
- Trash: deleted items can be restored for 30 days (and there's an Undo right after deleting)
- Backup & restore: download everything as one file and restore it on any device
- Works offline and can be installed on the home screen (PWA)
- Light and dark mode; works on phone and desktop
- Sample data: "Try with sample data" on the Welcome screen; "Load sample data" and "Delete all data" in Settings
- Accessible: keyboard friendly, visible focus, labelled buttons, checked with axe-core in light and dark mode

**Full documentation:** open [`documentation.html`](documentation.html) in your browser (works offline) —
installation, customising the name, colours and icons, deployment, connecting a backend, licences and changelog.

## Development

Requires [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install     # install dependencies (first time only)
npm run dev     # start the dev server at http://localhost:5173
npm run lint    # check the code with ESLint
npm test        # run the unit tests (Vitest)
npm run build   # production build into the dist/ folder
npm run check   # lint + test + build, the same as CI
npm run test:e2e  # browser + accessibility tests in Chromium, Firefox and WebKit (Playwright)
```

Before the first `npm run test:e2e`, install the test browsers once: `npx playwright install`.

## Project structure

```
index.html              HTML entry
public/                 app icons
src/
  main.jsx              app bootstrap
  App.jsx               app state, data actions and routing
  index.css             Tailwind CSS setup and shared styles
  screens/              Welcome, Home, NoteEditor, DocViewer, Settings, Trash, LoadingScreen
  components/           Modal / dialogs, MoveDialog, PdfPreview, Toast, UpdateNotifier, ErrorBoundary, Logo
  hooks/useHashRoute.js tiny hash-based router
  lib/
    db.js               IndexedDB (notes, documents, folders and files)
    persistence.js      saves only changed records, with a crash-safe journal
    storage.js          loading, migrating older data, small settings
    folders.js          folder tree helpers
    trash.js            Trash rules (30 days)
    backup.js           backup file format, validation and restore
    sampleData.js       fictional sample folders, notes and documents
    sampleFiles.js      builds the tiny sample PDFs and PNGs in code
    install.js          "Install app" support
    __tests__/          unit tests
e2e/                    Playwright browser and accessibility tests
documentation.html      buyer documentation (open in a browser)
```

## How data is stored

Notes, documents and folders are stored in IndexedDB in the browser. Only records that
changed are written. Each batch of changes is also kept in a small journal in
localStorage until IndexedDB confirms it, so closing the app while typing never loses text.
Data from older versions (localStorage) is moved to IndexedDB automatically.

Browsers can clear website data, so use **Settings → Download backup** regularly.

## Deployment

- `.github/workflows/ci.yml` runs lint, unit tests, build and the Playwright tests for every pull request.
- `.github/workflows/deploy.yml` runs `npm run check` (lint, tests, build) and publishes to GitHub Pages on every push to `main`
  (**Settings → Pages → Source: GitHub Actions**).

The `dist/` folder can also be uploaded to any static host (Netlify, Vercel, etc.).

Serve the app over HTTPS so offline mode and "Install app" work.

## Licence

Commercial item — see [`LICENSE.txt`](LICENSE.txt) (Regular and Extended licence).
Open-source packages used by the app keep their own licences (React MIT, pdf.js Apache-2.0,
Lucide ISC, Inter OFL-1.1); see the Credits section in `documentation.html`.
Changes are listed in [`CHANGELOG.md`](CHANGELOG.md).
