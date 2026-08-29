import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const webRoot = path.dirname(fileURLToPath(import.meta.url));

export function otvWebVite(opts: { port: number; open?: string; outDir?: string }) {
  return defineConfig({
    plugins: [react()],
    root: webRoot,
    envDir: webRoot,
    publicDir: path.join(webRoot, "public"),
    resolve: {
      alias: {
        "@": path.join(webRoot, "src"),
      },
    },
    server: { port: opts.port, host: true, open: opts.open },
    preview: { port: opts.port, host: true },
    build: {
      outDir: opts.outDir ?? path.join(webRoot, "dist"),
      emptyOutDir: true,
      sourcemap: true,
    },
  });
}
