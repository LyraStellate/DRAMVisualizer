import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages serves the app under /<repo>/; CI sets BASE_PATH.
  base: process.env.BASE_PATH || "/",
  plugins: [react(), tsconfigPaths()],
  server: {
    watch: {
      // Cargo's build directory churns constantly during wasm rebuilds.
      ignored: ["**/wasm/target/**"],
    },
  },
});
