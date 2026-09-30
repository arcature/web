// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// Production prerenders every page (published content, images downloaded into
// the build). The preview stage renders every page on request so Sanity's
// Presentation tool can show drafts, and adds the draft-mode routes.
const isPreview = process.env.SANITY_PREVIEW === 'true';

/** @returns {import('astro').AstroIntegration} */
const sanityPreview = () => ({
  name: 'sanity-preview',
  hooks: {
    'astro:route:setup': ({ route }) => {
      route.prerender = false;
    },
    'astro:config:setup': ({ injectRoute }) => {
      injectRoute({ pattern: '/api/draft-mode/enable', entrypoint: './src/preview/draft-mode-enable.ts', prerender: false });
      injectRoute({ pattern: '/api/draft-mode/disable', entrypoint: './src/preview/draft-mode-disable.ts', prerender: false });
    },
  },
});

// https://astro.build/config
export default defineConfig({
  // Standalone so the Lambda wrapper (src/lambda.ts) can serve static files too.
  adapter: node({ mode: 'standalone' }),
  integrations: isPreview ? [sanityPreview()] : [],
  env: {
    schema: {
      PUBLIC_SANITY_PROJECT_ID: envField.string({ context: 'client', access: 'public' }),
      PUBLIC_SANITY_DATASET: envField.string({ context: 'client', access: 'public', default: 'production' }),
      PUBLIC_SANITY_STUDIO_URL: envField.string({
        context: 'client',
        access: 'public',
        default: 'https://maestro.sanity.studio',
      }),
      SANITY_API_READ_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  image: {
    domains: ['cdn.sanity.io'],
  },
  vite: {
    plugins: [tailwindcss()],
    // Lets production builds drop preview-only code (see Layout.astro).
    define: { 'import.meta.env.SANITY_PREVIEW': JSON.stringify(isPreview) },
  },
});
