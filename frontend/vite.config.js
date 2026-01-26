import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@mui/material/Grid2': '@mui/material/Grid',
      // React 19 compatibility: redirect react-dom/test-utils to our shim
      'react-dom/test-utils': resolve(__dirname, 'src/app/react-test-utils-shim.js'),
    },
  },
  server: {
    proxy: {
      // Proxy all API requests to the backend server
      // This eliminates CORS issues in development
      // All routes from backend/app/api/router.py
      '/auth': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/users': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/healthz': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/ready': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/readyz': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/connections': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/templates': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/excel': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/reports': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/jobs': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/state': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/analyze': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/analytics': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/ai': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/nl2sql': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/enrichment': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/federation': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/recommendations': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/charts': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/summary': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/synthesis': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/docqa': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/docai': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/documents': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/spreadsheets': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/dashboards': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/connectors': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/workflows': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/export': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/design': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/knowledge': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/ingestion': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/search': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/visualization': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/agents': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/audit': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/excel-uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  optimizeDeps: {
    include: [
      '@mui/material/Grid',
      '@mui/icons-material/TaskAlt',
      '@mui/icons-material/Schema',
      '@mui/icons-material/SwapHoriz',
      '@mui/icons-material/CheckRounded',
      '@mui/icons-material/Search',
      '@mui/icons-material/RocketLaunch',
      '@mui/icons-material/OpenInNew',
      '@mui/icons-material/Download',
      '@mui/icons-material/FolderOpen',
      '@mui/icons-material/Replay',
      '@mui/x-date-pickers/LocalizationProvider',
      '@mui/x-date-pickers/DateTimePicker',
      '@mui/x-date-pickers/AdapterDayjs',
    ],
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/app/setupTests.js',
    css: true,
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['tests/**/*'],
    // Ensure development mode for React.act
    mode: 'development',
    server: {
      deps: {
        inline: ['react', 'react-dom', '@testing-library/react'],
      },
    },
  },
})
