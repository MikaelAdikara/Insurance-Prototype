import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single self-contained index.html: opens offline straight from disk (file://), no server needed.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: "./",
});
