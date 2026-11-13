import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: el build funciona en la raíz de un dominio o en una subcarpeta (p. ej. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: true },
})
