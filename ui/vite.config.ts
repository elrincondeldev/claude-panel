import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  base: "./",
  server: { fs: { allow: [".."] } }, // ../shared/protocol.ts lives outside the ui root
});
