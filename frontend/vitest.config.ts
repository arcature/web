import { defineConfig } from 'vitest/config';

// Unit tests for the plain TypeScript modules in src/lib. A standalone config
// rather than Astro's getViteConfig: these modules don't use astro:* virtual
// modules, and loading astro.config.mjs would fetch redirects from Sanity.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
