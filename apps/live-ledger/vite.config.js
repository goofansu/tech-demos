import { defineConfig } from "vite";
import { ledgerApi } from "./server/plugin.js";

const port = Number(process.env.PORT) || 8000;

export default defineConfig({
  plugins: [ledgerApi()],
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
