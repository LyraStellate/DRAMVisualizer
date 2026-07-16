import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Cargo's build directory churns constantly during wasm rebuilds.
      ignored: ["**/wasm/target/**"],
    },
  },
});
