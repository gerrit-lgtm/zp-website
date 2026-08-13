import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    // media lives in public/ — never inline, never hash; the page references it by stable URL
    assetsInlineLimit: 4096,
    rollupOptions: {
      // cinematic.html (the scroll-scrubbed film) is retired — the file and its
      // src/main.js engine stay in the repo for reference but are not built.
      input: { main: 'index.html' },
    },
  },
  server: {
    port: 5173,
  },
});
