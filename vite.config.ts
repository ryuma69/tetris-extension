import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Chrome extensions load faster if files are small and unminified for debugging, 
    // but default production builds are standard and optimized.
    outDir: "dist",
    emptyOutDir: true,
  }
})
