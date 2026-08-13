import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    // media lives in public/ — never inline, never hash; the page references it by stable URL
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: {
        // the scroll cinematic — the primary site
        main: 'index.html',
        // the static React CI hero, kept alongside at /hero for comparison
        hero: 'hero.html',
      },
    },
  },
  server: {
    port: 5173,
  },
});
