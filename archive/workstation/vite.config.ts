import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@pixdrift/i18n": path.resolve(__dirname, "../../packages/i18n/src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
