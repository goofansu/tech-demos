import { defineConfig } from "vite";

const port = Number(process.env.PORT) || 8000;

export default defineConfig({
  server: {
    host: true,
    port,
    strictPort: true,
  },
  preview: {
    host: true,
    port,
    strictPort: true,
  },
});
