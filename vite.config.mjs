import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/RSSReddit/' : '/',
  plugins: [react()],
  server: {
    proxy: {
      '/r': {
        target: 'https://www.reddit.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.js',
  },
}));
