import path from "path"
import react from "@vitejs/plugin-react"

import { defineConfig } from "vite"


 
export default defineConfig({
  
    server: {
      allowedHosts: ['5b96-103-99-197-236.ngrok-free.app'],
    },
  plugins: [react(),],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})