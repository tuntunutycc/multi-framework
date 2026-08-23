// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    ssr: {
      // Native addon — must not be bundled into the SSR graph
      external: ['better-sqlite3'],
    },
  },
});
