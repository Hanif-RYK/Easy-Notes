# Easy Notes

A simple app to keep your notes and documents (PDFs and photos) in one place.
Everything is stored privately in the browser on your device — no account or server needed.

## Features

- Notes with autosave, search, sort and pin-to-top
- Folders and sub-folders (any depth) for notes and documents, with move, rename and delete
- Upload PDFs and images (or take a photo on mobile), then view, rename, share or download them
- Print / save a note as PDF
- Light and dark mode
- Works on phone and desktop

## Development

Requires [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install     # install dependencies (first time only)
npm run dev     # start the dev server at http://localhost:5173
npm run build   # production build into the dist/ folder
npm run preview # preview the production build
```

## Project structure

```
index.html              HTML entry
src/
  main.jsx              app bootstrap
  App.jsx               app state, data actions and routing
  index.css             Tailwind CSS setup and shared styles
  screens/              Welcome, Home, NoteEditor, DocViewer
  components/           Modal / dialogs, MoveDialog, Toast, Logo
  hooks/useHashRoute.js tiny hash-based router
  lib/                  localStorage, IndexedDB, folder and formatting helpers
```

## Deployment

The workflow in `.github/workflows/deploy.yml` builds the app and publishes it to
GitHub Pages on every push to `main`. In the repository settings, set
**Settings → Pages → Build and deployment → Source** to **GitHub Actions**.

The `dist/` folder can also be uploaded to any static host (Netlify, Vercel, etc.).
