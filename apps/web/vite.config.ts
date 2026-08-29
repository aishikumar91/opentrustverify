import { defineConfig } from "vite";
import { otvWebVite } from "./vite.surface";

export default defineConfig(otvWebVite({ port: 4090 }));
