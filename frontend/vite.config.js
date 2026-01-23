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
    setupFiles: './src/setupTests.js',
    css: true,
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['tests/**/*'],
  },
})
