import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    // media lives in public/ — never inline, never hash; the page references it by stable URL
    assetsInlineLimit: 4096,
  },
  server: {
    port: 5173,
  },
});
