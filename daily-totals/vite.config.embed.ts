import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

/**
 * Build config for the embeddable bundle.
 *
 * Produces a single self-contained IIFE file (`embed/brc-daily-totals.js`) with
 * the CSS inlined (injected into the widget's Shadow DOM at runtime). Drop it on
 * any page with a `<div id="brc-daily-totals"></div>` and one <script> tag.
 *
 *   npm run build:embed
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "embed",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, "src/main.tsx"),
      name: "BRCDailyTotals",
      formats: ["iife"],
      fileName: () => "brc-daily-totals.js",
    },
  },
});
