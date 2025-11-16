import { defineConfig } from 'vite'
// no aliases currently
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Remove adapter alias; use native ECharts again
    }
  },
  // Serve static files from `public/`. We'll copy repo `assets/` → `public/assets` via npm scripts.
  publicDir: 'public',
  server: {
    port: parseInt(process.env.PORT || '5180'),
    strictPort: false,
    host: true,
    open: false, // Don't auto-open browser on Replit
    // Replit preview URLs are allowed via __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS env var in package.json
  },
  preview: {
    port: parseInt(process.env.PORT || '5190'),
    host: true,
  },
})
