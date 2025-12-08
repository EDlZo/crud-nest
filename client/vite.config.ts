import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
  },
  appType: 'spa',
  server: {
    port: 5173,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
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
      '/users': {
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
      '/notification-settings': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/email': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

