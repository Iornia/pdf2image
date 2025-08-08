import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: replace /REPO_NAME/ with your repo name, e.g. /pdf-to-jpg/
export default defineConfig({
  plugins: [react()],
  base: 'pdf2image/'
})
