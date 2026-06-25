import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base:'/',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  /*server: {
    proxy: {
      '/api': {
        target: 'http://172.17.5.70:7777',
        //target: 'http://192.168.5.117:7777',
        changeOrigin: true,
        secure: false,
        //rewrite: (path) => path.replace(/^\/api/, '') // Remove the /api prefix
      }
    }
  }*/
})
