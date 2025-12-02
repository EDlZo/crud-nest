import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/cruds': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/companies': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/users': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/activities': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/deals': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/notes': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

// In development, proxy API requests to the Nest backend running on localhost:3000
// so the client can use relative paths (e.g. fetch('/cruds')) and avoid CORS.

