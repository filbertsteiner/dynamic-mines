import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base: './' makes all asset URLs relative, so the build works both at the
// domain root (Vercel/Netlify) and under a subpath (GitHub Pages /dynamic-mines/).
export default defineConfig({
  base: './',
  plugins: [react()],
})
