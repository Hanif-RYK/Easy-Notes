import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// `base: "./"` keeps asset paths relative, so the build works on
// GitHub Pages sub-paths as well as on the root of any static host.
export default defineConfig({
  base: "./",
  // Support older phone browsers too (e.g. iPhones that aren't fully updated).
  build: {
    target: ["es2020", "chrome87", "safari14", "firefox78", "edge88"],
    chunkSizeWarningLimit: 1500, // the PDF viewer is large but only loaded when a PDF is opened
  },
  plugins: [
    react(),
    tailwindcss(),
    // Makes Easy Notes installable and lets it open without internet.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Easy Notes",
        short_name: "Easy Notes",
        description: "Keep your notes and documents organised in folders.",
        theme_color: "#4f46e5",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,mjs}"],
        // The PDF viewer's worker is large; allow it to be cached for offline use.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: "node",
  },
});
