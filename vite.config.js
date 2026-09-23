import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tvn-tips/', // ⚠️ HIER DEIN REPO-NAME EINTRAGEN (mit Slashes)!
})
