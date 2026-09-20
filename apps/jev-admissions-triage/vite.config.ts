import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { evaluateApi } from "./server/evaluate";

const port = Number(process.env.PORT) || 8000;

export default defineConfig({
  plugins: [react(), tailwindcss(), evaluateApi()],
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  server: {
    host: true,
    port,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port,
    strictPort: true,
    allowedHosts: true,
  },
});
