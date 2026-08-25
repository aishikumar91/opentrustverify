import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: { port: 4090, host: true },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  // Ensure workspace packages with NodeNext .js imports resolve in Vite
  optimizeDeps: {
    include: ["@noble/ed25519", "@noble/hashes"],
  },
});
