// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';
import keystatic from '@keystatic/astro';

// The public site (AWS) is a plain static build. The Keystatic admin needs
// server routes, so it is only included in dev and in the Netlify admin build.
const isDev = process.argv.includes('dev');
const withAdmin = isDev || process.env.KEYSTATIC_ADMIN === 'true';

// https://astro.build/config
export default defineConfig({
  adapter: withAdmin && !isDev ? netlify() : undefined,
  integrations: withAdmin ? [react(), keystatic()] : [],
  vite: {
    plugins: [tailwindcss()],
  },
});
