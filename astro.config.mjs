// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import node from '@astrojs/node';
import keystatic from '@keystatic/astro';

// https://astro.build/config
export default defineConfig({
  // Pages are prerendered; only the Keystatic admin (/keystatic) and its API run on demand.
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), keystatic()],
  vite: {
    plugins: [tailwindcss()],
  },
});
