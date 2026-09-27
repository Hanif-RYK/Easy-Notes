import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `base: "./"` keeps asset paths relative, so the build works on
// GitHub Pages sub-paths as well as on the root of any static host.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
