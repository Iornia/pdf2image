import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: set the correct base path for GitHub Pages project site: '/<REPO_NAME>/'
export default defineConfig({
  plugins: [react()],
  base: '/pdf2image/'
})
