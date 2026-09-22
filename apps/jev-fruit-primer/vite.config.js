import { defineConfig } from "vite";
import { evaluateApi } from "./server/evaluate.js";

const port = Number(process.env.PORT) || 8000;

export default defineConfig({
  plugins: [evaluateApi()],
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
