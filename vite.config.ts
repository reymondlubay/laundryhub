import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose ENV from .env (e.g. ENV=Dev). Missing ENV = production (no banner).
  envPrefix: ['VITE_', 'ENV'],
})
