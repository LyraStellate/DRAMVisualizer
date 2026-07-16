import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages serves the app under /<repo>/; CI sets BASE_PATH.
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  server: {
    watch: {
      // Cargo's build directory churns constantly during wasm rebuilds.
      ignored: ["**/wasm/target/**"],
    },
  },
});
